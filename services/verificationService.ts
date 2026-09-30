import dns from 'dns';
import { dbGet, dbRun } from '../database/connection';
import { IntelligenceRepository } from '../repositories/intelligenceRepository';
import {
  EvidenceNode,
  DetectedSignal,
  ScoringWeights,
  ProviderResult,
  TechnicalDomainStatus,
  CompanyVerificationStatus,
  RecruiterVerificationStatus,
} from '../src/types';

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
  technicalStatus: TechnicalDomainStatus;
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
  providerResults: {
    domain?: DnsCheckResult;
    company?: ProviderResult<CompanyVerificationStatus>;
    upi?: UpiCheckResult[];
  };
}

/**
 * Technical Domain Verification Provider
 * Strictly checks DNS A & MX resolution and evaluates protocol existence.
 * NEVER conflates domain existence with company legitimacy.
 */
export class DomainVerificationProvider {
  static async verifyDomain(domain: string): Promise<ProviderResult<TechnicalDomainStatus> & { checkResult: DnsCheckResult }> {
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

    let technicalStatus: TechnicalDomainStatus = 'EXISTS';
    if (!hasValidMx && !hasValidA) {
      technicalStatus = error === 'ENOTFOUND' || error === 'NODATA' ? 'DOES_NOT_EXIST' : 'UNAVAILABLE';
    }

    // Persist domain check
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

    const checkResult: DnsCheckResult = {
      domain: cleanDomain,
      technicalStatus,
      hasValidMx,
      mxRecords,
      hasValidA,
      isFreemail,
      error,
    };

    return {
      status: technicalStatus,
      confidence: technicalStatus === 'EXISTS' ? 0.95 : 0.8,
      source: 'Network DNS Resolver',
      evidence: `A-Record: ${hasValidA ? 'Resolves' : 'None'}, MX-Servers: ${mxRecords.length > 0 ? mxRecords.slice(0, 2).join(', ') : 'None'}`,
      explanation: technicalStatus === 'EXISTS'
        ? `Domain ${cleanDomain} technically resolves to active host/mail infrastructure. Note: Domain existence does not establish company legitimacy.`
        : `Domain ${cleanDomain} could not be resolved to valid web/mail DNS records.`,
      checkResult,
    };
  }
}

/**
 * Independent Company Verification Provider
 * Evaluates whether claimed employer identity is independently confirmed.
 * If authoritative corporate registry check is not available, explicitly returns UNAVAILABLE.
 * NEVER marks company as VERIFIED purely because a domain resolves.
 */
export class CompanyVerificationProvider {
  static async verifyCompany(params: {
    companyName: string;
    domainResult?: DnsCheckResult;
  }): Promise<ProviderResult<CompanyVerificationStatus>> {
    const { companyName } = params;
    const clean = companyName.trim();

    if (!clean || clean.toLowerCase() === 'unspecified employer') {
      return {
        status: 'UNAVAILABLE',
        confidence: 0.5,
        source: 'Corporate Registry Directory',
        evidence: 'No specific employer name provided in offer submission.',
        explanation: 'Company name was omitted or unclear in the communication.',
      };
    }

    // Check blacklist entities
    const blacklisted = await dbGet<any>(
      `SELECT * FROM suspicious_entities WHERE type = 'COMPANY' AND LOWER(value) = ?`,
      [clean.toLowerCase()]
    );

    if (blacklisted) {
      return {
        status: 'SUSPICIOUS',
        confidence: 0.95,
        source: 'Campus Fraud Intelligence Registry',
        evidence: blacklisted.evidence,
        explanation: `Company "${clean}" matches recorded suspicious recruitment incidents in the intelligence registry.`,
      };
    }

    // Check pre-registered verified directory (e.g. established enterprise partners)
    const knownCompany = await dbGet<any>(
      `SELECT * FROM companies WHERE LOWER(name) = ?`,
      [clean.toLowerCase()]
    );

    if (knownCompany && knownCompany.registration_status === 'VERIFIED') {
      return {
        status: 'VERIFIED',
        confidence: 0.95,
        source: knownCompany.verified_source || 'Corporate Registry (MCA/BSE)',
        evidence: `CIN: ${knownCompany.cin_number || 'Official Incorporation Verified'}`,
        explanation: `Corporate identity independently cross-referenced with accredited corporate directory.`,
      };
    }

    // Authoritative external registry is not connected in this runtime environment
    return {
      status: 'UNAVAILABLE',
      confidence: 0.7,
      source: 'National Corporate Registry',
      evidence: 'Authoritative external registry query was not completed.',
      explanation: `Independent external corporate registry verification is currently unavailable for "${clean}". Domain technical resolution does NOT prove corporate legitimacy.`,
    };
  }
}

/**
 * Recruiter Identity Verification Provider
 * Evaluates recruiter credentials, email channel, and enterprise domain alignment.
 */
export class RecruiterVerificationProvider {
  static async verifyRecruiter(params: {
    recruiterEmail?: string;
    recruiterPhone?: string;
    companyName: string;
    domainResult?: DnsCheckResult;
  }): Promise<ProviderResult<RecruiterVerificationStatus>> {
    const { recruiterEmail, companyName, domainResult } = params;

    if (!recruiterEmail) {
      return {
        status: 'UNAVAILABLE',
        confidence: 0.5,
        source: 'Recruitment Channel Analyzer',
        evidence: 'No official recruiter email address was identified.',
        explanation: 'Offer communication lacks verifiable recruiter contact credentials.',
      };
    }

    const cleanEmail = recruiterEmail.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';

    // Check blacklist
    const blacklisted = await dbGet<any>(
      `SELECT * FROM suspicious_entities WHERE type = 'EMAIL' AND LOWER(value) = ?`,
      [cleanEmail]
    );

    if (blacklisted) {
      return {
        status: 'SUSPICIOUS',
        confidence: 0.99,
        source: 'Campus Fraud Intelligence Registry',
        evidence: blacklisted.evidence,
        explanation: `Recruiter email ${cleanEmail} is flagged in the placement fraud registry.`,
      };
    }

    if (domainResult?.isFreemail || FREEMAIL_DOMAINS.has(domain)) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.95,
        source: 'Enterprise Identity Analyzer',
        evidence: `Sender uses consumer freemail (@${domain}) while claiming to represent ${companyName || 'corporate employer'}.`,
        explanation: `Recruitment communication sent from consumer/free webmail rather than authenticated enterprise infrastructure.`,
      };
    }

    if (domainResult && domainResult.technicalStatus === 'DOES_NOT_EXIST') {
      return {
        status: 'INCONSISTENT',
        confidence: 0.98,
        source: 'DNS Resolution Provider',
        evidence: `Domain @${domain} has no valid MX or A records.`,
        explanation: `Recruiter domain does not exist or cannot receive mail.`,
      };
    }

    return {
      status: 'UNVERIFIED',
      confidence: 0.8,
      source: 'Corporate Directory',
      evidence: `Email @${domain} resolves technically, but individual recruiter credentials are not independently bound to HR roster.`,
      explanation: `Recruiter domain is technically active, but specific individual identity remains unverified without internal directory confirmation.`,
    };
  }
}

/**
 * Comprehensive Verification Service aggregating all providers
 */
export class VerificationService {
  static async checkDomainDns(domain: string): Promise<DnsCheckResult> {
    const res = await DomainVerificationProvider.verifyDomain(domain);
    return res.checkResult;
  }

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

    // 1. Process Recruiter Emails & Domain Verification Provider
    const dnsResults: DnsCheckResult[] = [];
    let primaryDomainResult: DnsCheckResult | undefined;

    for (const email of params.extractedEmails.slice(0, 2)) {
      const parts = email.split('@');
      if (parts.length === 2) {
        const domain = parts[1];
        const domainVerify = await DomainVerificationProvider.verifyDomain(domain);
        const dnsRes = domainVerify.checkResult;
        dnsResults.push(dnsRes);
        if (!primaryDomainResult) primaryDomainResult = dnsRes;

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
        } else if (dnsRes.technicalStatus === 'DOES_NOT_EXIST') {
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
          // Domain technically resolves
          evidenceNodes.push({
            id: `ev-v-mx-${Date.now()}`,
            step: 'EMAIL_DOMAIN',
            signal: email,
            source: 'Domain Verification Provider',
            status: 'VERIFIED',
            confidence: 0.92,
            explanation: `Domain ${domain} technically resolves with active MX servers. Note: Technical domain validity does not prove corporate legitimacy.`,
            impactScore: 0,
            isFictionalDemoData: false,
          });
        }

        // Recruiter Verification Provider
        const recruiterVerify = await RecruiterVerificationProvider.verifyRecruiter({
          recruiterEmail: email,
          companyName: params.companyName,
          domainResult: dnsRes,
        });

        evidenceNodes.push({
          id: `ev-rec-${Date.now()}`,
          step: 'RECRUITER',
          signal: `Recruiter: ${email}`,
          source: recruiterVerify.source,
          status: recruiterVerify.status === 'INCONSISTENT' ? 'MISMATCH' : recruiterVerify.status === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'UNVERIFIED',
          confidence: recruiterVerify.confidence,
          explanation: recruiterVerify.explanation,
          impactScore: recruiterVerify.status === 'INCONSISTENT' ? 10 : 0,
          isFictionalDemoData: false,
        });
      }
    }

    // 2. Process Website URLs
    for (const url of params.extractedUrls.slice(0, 2)) {
      try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        const domain = u.hostname;
        const dnsVerify = await DomainVerificationProvider.verifyDomain(domain);
        const dnsRes = dnsVerify.checkResult;
        dnsResults.push(dnsRes);

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
            explanation: `Domain ${domain} technically resolves to web infrastructure. Technical resolution does not establish company legitimacy.`,
            impactScore: 0,
            isFictionalDemoData: false,
          });
        }
      } catch {
        // invalid URL format
      }
    }

    // 3. Independent Company Verification Provider (Crucial Phase 4 & 5 separation)
    const compVerify = await CompanyVerificationProvider.verifyCompany({
      companyName: params.companyName,
      domainResult: primaryDomainResult,
    });

    evidenceNodes.unshift({
      id: `ev-comp-${Date.now()}`,
      step: 'CLAIMED_COMPANY',
      signal: params.companyName || 'Target Employer',
      source: compVerify.source,
      status: compVerify.status === 'VERIFIED' ? 'VERIFIED' : compVerify.status === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'UNAVAILABLE',
      confidence: compVerify.confidence,
      explanation: compVerify.explanation,
      impactScore: compVerify.status === 'SUSPICIOUS' ? 25 : 0,
      isFictionalDemoData: false,
    });

    // 4. Process UPI IDs & Blacklist
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
          evidence: `UPI ID: ${upi}. Upfront payment requests are treated as a high-risk recruitment signal.`,
        });

        evidenceNodes.push({
          id: `ev-upi-req-${Date.now()}`,
          step: 'PAYMENT_REQUEST',
          signal: `UPI: ${upi}`,
          source: 'Financial Signal Analyzer',
          status: 'SUSPICIOUS',
          confidence: 0.98,
          explanation: `Personal or unverified UPI transfer demanded. Upfront payment requests are treated as a high-risk recruitment signal.`,
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
      providerResults: {
        domain: primaryDomainResult,
        company: compVerify,
        upi: upiResults,
      },
    };
  }
}
