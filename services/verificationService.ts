import dns from 'dns';
import { dbGet, dbRun } from '../database/connection';
import { IntelligenceRepository } from '../repositories/intelligenceRepository';
import { EvidenceNode, DetectedSignal, ScoringWeights } from '../src/types';

// Common free/disposable mail providers that corporate recruiters should NOT use
const FREEMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'yopmail.com',
  'tempmail.com',
  'mailinator.com',
  'guerrillamail.com',
]);

// Well-known valid Indian UPI bank handles
const KNOWN_UPI_HANDLES = new Set([
  'okaxis',
  'okhdfcbank',
  'okicici',
  'oksbi',
  'paytm',
  'ybl',
  'ibl',
  'axl',
  'sbi',
  'apl',
  'upi',
  'icici',
  'federal',
  'postbank',
  'barodampay',
  'kotak',
  'indus',
  'idfcbank',
]);

export interface DnsCheckResult {
  domain: string;
  hasValidMx: boolean;
  mxRecords: string[];
  hasValidA: boolean;
  isFreemail: boolean;
  error?: string;
}

export interface UpiCheckResult {
  rawUpi: string;
  isValidSyntax: boolean;
  handle: string;
  isKnownBankHandle: boolean;
  isFlaggedInBlacklist: boolean;
  matchedBlacklistEvidence?: string;
}

export interface VerificationSignalsResult {
  dnsResults: DnsCheckResult[];
  upiResults: UpiCheckResult[];
  evidenceNodes: EvidenceNode[];
  detectedSignals: DetectedSignal[];
  scoreContribution: number;
}

export class VerificationService {
  /**
   * Real DNS MX & A lookup using Node.js dns.promises
   */
  static async checkDomainDns(domain: string): Promise<DnsCheckResult> {
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const isFreemail = FREEMAIL_DOMAINS.has(cleanDomain);

    let mxRecords: string[] = [];
    let hasValidMx = false;
    let hasValidA = false;
    let error: string | undefined;

    try {
      const mx = await dns.promises.resolveMx(cleanDomain);
      if (mx && mx.length > 0) {
        hasValidMx = true;
        mxRecords = mx.map((m) => m.exchange);
      }
    } catch (e: any) {
      error = e.code || e.message;
    }

    try {
      const a = await dns.promises.resolve4(cleanDomain);
      if (a && a.length > 0) {
        hasValidA = true;
      }
    } catch {
      // ignore
    }

    // Cache or record domain lookup in SQLite database
    try {
      await dbRun(
        `INSERT OR REPLACE INTO domains (id, domain_name, mx_records_json, has_valid_mx, is_freemail, is_blacklisted, checked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `dom-${cleanDomain}`,
          cleanDomain,
          JSON.stringify(mxRecords),
          hasValidMx ? 1 : 0,
          isFreemail ? 1 : 0,
          0,
          new Date().toISOString(),
        ]
      );
    } catch {
      // non-fatal
    }

    return {
      domain: cleanDomain,
      hasValidMx,
      mxRecords,
      hasValidA,
      isFreemail,
      error,
    };
  }

  /**
   * Check UPI format and match with database blacklist
   */
  static async checkUpi(upiId: string): Promise<UpiCheckResult> {
    const clean = upiId.trim().toLowerCase();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    const isValidSyntax = upiRegex.test(clean);
    const parts = clean.split('@');
    const handle = parts.length === 2 ? parts[1] : '';
    const isKnownBankHandle = KNOWN_UPI_HANDLES.has(handle);

    // Cross-reference with database blacklist
    const blacklistMatches = await dbGet<any>(
      `SELECT * FROM suspicious_entities WHERE type = 'UPI_ID' AND LOWER(value) = ?`,
      [clean]
    );

    let isFlaggedInBlacklist = false;
    let matchedBlacklistEvidence: string | undefined;

    if (blacklistMatches) {
      isFlaggedInBlacklist = true;
      matchedBlacklistEvidence = blacklistMatches.evidence;
      // Increment hit counter in SQLite
      await IntelligenceRepository.incrementEntityMatch(blacklistMatches.id);
    }

    return {
      rawUpi: upiId,
      isValidSyntax,
      handle,
      isKnownBankHandle,
      isFlaggedInBlacklist,
      matchedBlacklistEvidence,
    };
  }

  /**
   * Run comprehensive real verification pipeline over extracted details and text
   */
  static async runVerificationPipeline(params: {
    extractedEmails: string[];
    extractedUrls: string[];
    extractedUpis: string[];
    companyName: string;
    weights: ScoringWeights;
  }): Promise<VerificationSignalsResult> {
    const evidenceNodes: EvidenceNode[] = [];
    const detectedSignals: DetectedSignal[] = [];
    let scoreContribution = 0;

    // 1. Process Recruiter Emails & Real DNS Checks
    const dnsResults: DnsCheckResult[] = [];
    for (const email of params.extractedEmails.slice(0, 2)) {
      const parts = email.split('@');
      if (parts.length === 2) {
        const domain = parts[1];
        const dnsRes = await this.checkDomainDns(domain);
        dnsResults.push(dnsRes);

        if (dnsRes.isFreemail) {
          scoreContribution += params.weights.recruiter_domain_mismatch;
          detectedSignals.push({
            id: `sig-free-${Date.now()}`,
            category: 'RECRUITER_DOMAIN',
            name: `Recruiter Uses Free/Disposable Mail Provider (${dnsRes.domain})`,
            description: `Recruitment communication sent from personal/free email rather than corporate domain.`,
            impact: params.weights.recruiter_domain_mismatch,
            severity: 'high',
            evidence: `Sender address: ${email}. Real corporations issue authenticated enterprise email addresses for campus hiring.`,
          });

          evidenceNodes.push({
            id: `ev-dns-${Date.now()}`,
            step: 'EMAIL_DOMAIN',
            signal: email,
            source: 'Network DNS & Mail Provider Check',
            status: 'MISMATCH',
            confidence: 0.98,
            explanation: `Recruiter domain (${domain}) is a consumer freemail service with no institutional employment binding.`,
            impactScore: params.weights.recruiter_domain_mismatch,
            isFictionalDemoData: false,
          });
        } else if (!dnsRes.hasValidMx) {
          // Domain has no MX records! Fake or non-functional domain
          scoreContribution += params.weights.suspicious_domain;
          detectedSignals.push({
            id: `sig-nomx-${Date.now()}`,
            category: 'RECRUITER_DOMAIN',
            name: `Email Domain Has No Valid Mail Exchanger (MX) Records`,
            description: `DNS MX check failed for ${dnsRes.domain}. The domain cannot receive mail.`,
            impact: params.weights.suspicious_domain,
            severity: 'critical',
            evidence: `DNS lookup error: ${dnsRes.error || 'No MX records returned from public DNS resolvers.'}`,
          });

          evidenceNodes.push({
            id: `ev-nomx-${Date.now()}`,
            step: 'EMAIL_DOMAIN',
            signal: email,
            source: 'Public DNS MX Resolution Provider',
            status: 'CONTRADICTORY',
            confidence: 0.99,
            explanation: `Network DNS query confirmed ${domain} has no configured mail servers.`,
            impactScore: params.weights.suspicious_domain,
            isFictionalDemoData: false,
          });
        } else {
          // Valid corporate MX
          evidenceNodes.push({
            id: `ev-v-mx-${Date.now()}`,
            step: 'EMAIL_DOMAIN',
            signal: email,
            source: 'Network DNS Provider',
            status: 'VERIFIED',
            confidence: 0.92,
            explanation: `Domain ${domain} has active MX servers (${dnsRes.mxRecords.slice(0, 2).join(', ')}).`,
            impactScore: 0,
            isFictionalDemoData: false,
          });
        }
      }
    }

    // 2. Process Website URL checks
    for (const url of params.extractedUrls.slice(0, 2)) {
      try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        const domain = u.hostname;
        const dnsRes = await this.checkDomainDns(domain);
        dnsResults.push(dnsRes);

        // Check suspicious TLDs
        const isSuspiciousTld = ['.xyz', '.top', '.buzz', '.work', '.click', '.tk', '.ml'].some((tld) =>
          domain.endsWith(tld)
        );

        if (isSuspiciousTld) {
          scoreContribution += params.weights.suspicious_domain;
          detectedSignals.push({
            id: `sig-tld-${Date.now()}`,
            category: 'DOMAIN_REPUTATION',
            name: `Suspicious High-Abuse Top-Level Domain (${domain})`,
            description: `Domain uses cheap or disposable TLD frequently utilized in spoofing campaigns.`,
            impact: params.weights.suspicious_domain,
            severity: 'high',
            evidence: `Domain ${domain} matches high-risk cyber abuse heuristics.`,
          });

          evidenceNodes.push({
            id: `ev-url-${Date.now()}`,
            step: 'WEBSITE',
            signal: url,
            source: 'Domain Reputation Provider',
            status: 'SUSPICIOUS',
            confidence: 0.88,
            explanation: `Domain utilizes a disposable/high-abuse TLD structure.`,
            impactScore: params.weights.suspicious_domain,
            isFictionalDemoData: false,
          });
        } else if (dnsRes.hasValidA) {
          evidenceNodes.push({
            id: `ev-url-ok-${Date.now()}`,
            step: 'WEBSITE',
            signal: url,
            source: 'DNS A-Record Provider',
            status: 'VERIFIED',
            confidence: 0.85,
            explanation: `Domain ${domain} successfully resolves to public web infrastructure.`,
            impactScore: 0,
            isFictionalDemoData: false,
          });
        }
      } catch {
        // invalid URL format
      }
    }

    // 3. Process UPI IDs & Blacklist
    const upiResults: UpiCheckResult[] = [];
    for (const upi of params.extractedUpis) {
      const upiCheck = await this.checkUpi(upi);
      upiResults.push(upiCheck);

      if (upiCheck.isFlaggedInBlacklist) {
        scoreContribution += params.weights.personal_upi + 10;
        detectedSignals.push({
          id: `sig-upi-bl-${Date.now()}`,
          category: 'FINANCIAL',
          name: `CRITICAL: UPI Handle Flagged in Central Scam Intelligence Database`,
          description: `UPI ID ${upi} matches previously recorded fraud incidents.`,
          impact: params.weights.personal_upi + 10,
          severity: 'critical',
          evidence: upiCheck.matchedBlacklistEvidence || 'Recorded fraud recipient in placement registry',
        });

        evidenceNodes.push({
          id: `ev-upi-bl-${Date.now()}`,
          step: 'PAYMENT_REQUEST',
          signal: `UPI: ${upi}`,
          source: 'Scam Intelligence Database Match',
          status: 'CONTRADICTORY',
          confidence: 1.0,
          explanation: `Blacklisted entity. Known extortion endpoint reported by students.`,
          impactScore: params.weights.personal_upi + 10,
          isFictionalDemoData: false,
        });
      } else if (upiCheck.isValidSyntax) {
        scoreContribution += params.weights.personal_upi;
        detectedSignals.push({
          id: `sig-upi-req-${Date.now()}`,
          category: 'FINANCIAL',
          name: `Personal UPI Payment Handle Required (${upi})`,
          description: `Recruitment requests transfer to peer/merchant UPI handle.`,
          impact: params.weights.personal_upi,
          severity: 'critical',
          evidence: `UPI ID: ${upi}. Direct violation of AICTE zero-fee internship regulations.`,
        });

        evidenceNodes.push({
          id: `ev-upi-req-${Date.now()}`,
          step: 'PAYMENT_REQUEST',
          signal: `UPI: ${upi}`,
          source: 'Financial Signal Analyzer',
          status: 'SUSPICIOUS',
          confidence: 0.98,
          explanation: `Personal or unverified UPI transfer demanded.`,
          impactScore: params.weights.personal_upi,
          isFictionalDemoData: false,
        });
      }
    }

    return {
      dnsResults,
      upiResults,
      evidenceNodes,
      detectedSignals,
      scoreContribution,
    };
  }
}
