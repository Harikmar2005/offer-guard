import { dbRun, dbGet, dbAll } from '../database/connection';
import { ScamPatternEntity, SuspiciousEntity } from '../src/types';

export class IntelligenceRepository {
  static async getScamPatterns(): Promise<ScamPatternEntity[]> {
    const rows = await dbAll<any>('SELECT * FROM scam_patterns ORDER BY report_count DESC');
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      indicators: JSON.parse(r.indicators_json || '[]'),
      targetAudience: r.target_audience,
      riskLevel: r.risk_level,
      dateLogged: r.date_logged,
      reportCount: r.report_count,
      isFictionalDemoData: Boolean(r.is_fictional_demo_data),
    }));
  }

  static async addScamPattern(pattern: ScamPatternEntity): Promise<void> {
    await dbRun(
      `INSERT OR REPLACE INTO scam_patterns 
       (id, category, title, description, indicators_json, target_audience, risk_level, date_logged, report_count, is_fictional_demo_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pattern.id,
        pattern.category,
        pattern.title,
        pattern.description,
        JSON.stringify(pattern.indicators || []),
        pattern.targetAudience,
        pattern.riskLevel,
        pattern.dateLogged,
        pattern.reportCount,
        pattern.isFictionalDemoData ? 1 : 0,
      ]
    );
  }

  static async getSuspiciousEntities(): Promise<SuspiciousEntity[]> {
    const rows = await dbAll<any>('SELECT * FROM suspicious_entities ORDER BY match_count DESC, date_added DESC');
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      value: r.value,
      claimedEntity: r.claimed_entity,
      evidence: r.evidence,
      riskLevel: r.risk_level,
      dateAdded: r.date_added,
      matchCount: r.match_count,
      isFictionalDemoData: Boolean(r.is_fictional_demo_data),
    }));
  }

  static async addSuspiciousEntity(entity: SuspiciousEntity): Promise<void> {
    await dbRun(
      `INSERT OR REPLACE INTO suspicious_entities 
       (id, type, value, claimed_entity, evidence, risk_level, date_added, match_count, is_fictional_demo_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.type,
        entity.value,
        entity.claimedEntity,
        entity.evidence,
        entity.riskLevel,
        entity.dateAdded,
        entity.matchCount,
        entity.isFictionalDemoData ? 1 : 0,
      ]
    );
  }

  static async incrementEntityMatch(id: string): Promise<void> {
    await dbRun('UPDATE suspicious_entities SET match_count = match_count + 1 WHERE id = ?', [id]);
  }

  static async seedDefaultIntelligence(): Promise<void> {
    const existingP = await dbGet<{ count: number }>('SELECT count(*) as count FROM scam_patterns');
    if (!existingP || existingP.count === 0) {
      const defaultPatterns: ScamPatternEntity[] = [
        {
          id: 'pat-001',
          category: 'FEE_EXTORTION',
          title: 'Fake Police Clearance Certificate Onboarding Fee',
          description: 'Recruiters send high-stipend provisional appointment letters and demand ₹2,500 via personal UPI claiming government police verification.',
          indicators: ['police clearance certificate', 'verification fee via upi', 'reimbursed on joining date'],
          targetAudience: 'Pre-final and Final-year engineering students under mandatory internship deadlines',
          riskLevel: 'CRITICAL',
          dateLogged: '2026-08-15',
          reportCount: 38,
          isFictionalDemoData: true,
        },
        {
          id: 'pat-002',
          category: 'EQUIPMENT_BOND',
          title: 'MacBook/Laptop Courier Insurance Security Deposit',
          description: 'Promising remote high-paying internship with MacBook Pro dispatched, asking for ₹1,500 - ₹3,000 courier security bond.',
          indicators: ['macbook courier bond', 'dispatch security deposit', 'refundable hardware insurance'],
          targetAudience: 'Students applying through informal Telegram and WhatsApp channels',
          riskLevel: 'HIGH',
          dateLogged: '2026-09-02',
          reportCount: 22,
          isFictionalDemoData: true,
        },
        {
          id: 'pat-003',
          category: 'IMPERSONATION',
          title: 'Executive Talent Impersonation using Freemail Accounts',
          description: 'Posing as genuine corporate talent leads (e.g. Infosys, Microsoft, TCS) using personal @gmail.com or @outlook.com addresses.',
          indicators: ['hr.<company>@gmail.com', 'careers.<company>@outlook.com', 'no corporate DKIM'],
          targetAudience: 'Off-campus LinkedIn applicants',
          riskLevel: 'HIGH',
          dateLogged: '2026-07-29',
          reportCount: 45,
          isFictionalDemoData: true,
        },
        {
          id: 'pat-004',
          category: 'TYPOSQUAT_DOMAIN',
          title: 'Typosquatted Lookalike Corporate Career Subdomains',
          description: 'Directing students to mimic sites like "careers-infosys-portal.xyz" collecting payment and identity cards.',
          indicators: ['.xyz domain', '.top domain', 'unofficial registrar', 'lookalike URL'],
          targetAudience: 'Mass messaging SMS/WhatsApp groups',
          riskLevel: 'CRITICAL',
          dateLogged: '2026-09-10',
          reportCount: 19,
          isFictionalDemoData: true,
        },
        {
          id: 'pat-005',
          category: 'SENSITIVE_DATA_HARVEST',
          title: 'Pre-Interview Identity Document & Banking Harvester',
          description: 'Demanding immediate submission of Aadhaar, PAN card, and cancelled cheque before any technical evaluation.',
          indicators: ['aadhaar upload before interview', 'bank details for provisional badge', 'unencrypted google form'],
          targetAudience: 'First-time job seekers without prior HR experience',
          riskLevel: 'MEDIUM',
          dateLogged: '2026-08-20',
          reportCount: 14,
          isFictionalDemoData: true,
        },
      ];
      for (const p of defaultPatterns) {
        await this.addScamPattern(p);
      }
    }

    const existingE = await dbGet<{ count: number }>('SELECT count(*) as count FROM suspicious_entities');
    if (!existingE || existingE.count === 0) {
      const defaultEntities: SuspiciousEntity[] = [
        {
          id: 'ent-001',
          type: 'UPI_ID',
          value: 'apexcyber@okaxis',
          claimedEntity: 'ApexCyber Infotech',
          evidence: 'Reported by 14 students for demanding ₹2,500 police clearance fee',
          riskLevel: 'CRITICAL',
          dateAdded: '2026-09-12',
          matchCount: 14,
          isFictionalDemoData: true,
        },
        {
          id: 'ent-002',
          type: 'COMPANY',
          value: 'ApexCyber Infotech',
          claimedEntity: 'ApexCyber Infotech',
          evidence: 'Unregistered entity claiming to be an AI security startup in Bangalore',
          riskLevel: 'CRITICAL',
          dateAdded: '2026-09-12',
          matchCount: 9,
          isFictionalDemoData: true,
        },
        {
          id: 'ent-003',
          type: 'UPI_ID',
          value: 'laptopbond.deposit@ybl',
          claimedEntity: 'QuantumCloud Solutions',
          evidence: 'Demanded ₹1,500 courier fee for fictitious MacBook Pro',
          riskLevel: 'HIGH',
          dateAdded: '2026-09-18',
          matchCount: 7,
          isFictionalDemoData: true,
        },
        {
          id: 'ent-004',
          type: 'EMAIL',
          value: 'hr.abccyber@gmail.com',
          claimedEntity: 'ABC Cyber Solutions',
          evidence: 'Sending forged PDF appointment letters from free Gmail account',
          riskLevel: 'HIGH',
          dateAdded: '2026-09-05',
          matchCount: 12,
          isFictionalDemoData: true,
        },
        {
          id: 'ent-005',
          type: 'DOMAIN',
          value: 'career-infosys-portal.xyz',
          claimedEntity: 'Infosys Limited',
          evidence: 'Phishing domain spoofing Infosys campus drive testing engine',
          riskLevel: 'CRITICAL',
          dateAdded: '2026-08-25',
          matchCount: 22,
          isFictionalDemoData: true,
        },
      ];
      for (const e of defaultEntities) {
        await this.addSuspiciousEntity(e);
      }
    }
  }
}
