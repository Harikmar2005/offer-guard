import { dbRun, dbGet, dbAll } from '../database/connection';
import {
  CaseRecord,
  EvidenceNode,
  DetectedSignal,
  ExtractedOfferDetails,
  AuditLogEntry,
  ReviewDecision,
} from '../src/types';

export class CaseRepository {
  static async save(caseRecord: CaseRecord): Promise<void> {
    // 1. Insert or replace case
    await dbRun(
      `INSERT OR REPLACE INTO cases 
       (id, case_number, submission_type, raw_input, student_name, student_email, student_college, student_roll,
        risk_score, risk_level, verification_status, summary, reasoning, recommended_action, unverified_info_json,
        human_review_required, review_status, is_demo_case, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseRecord.id,
        caseRecord.caseNumber,
        caseRecord.submissionType,
        caseRecord.rawInput,
        caseRecord.studentName,
        caseRecord.studentEmail,
        caseRecord.studentCollege,
        caseRecord.studentRoll,
        caseRecord.riskScore,
        caseRecord.riskLevel,
        caseRecord.verificationStatus,
        caseRecord.summary,
        caseRecord.reasoning,
        caseRecord.recommendedAction,
        JSON.stringify(caseRecord.unverifiedInfo || []),
        caseRecord.humanReviewRequired ? 1 : 0,
        caseRecord.reviewStatus,
        caseRecord.isDemoCase ? 1 : 0,
        caseRecord.createdAt,
        caseRecord.updatedAt,
      ]
    );

    // 2. Extracted details
    if (caseRecord.extractedDetails) {
      const ed = caseRecord.extractedDetails;
      await dbRun(
        `INSERT OR REPLACE INTO extracted_details
         (id, case_id, company_name, recruiter_name, recruiter_email, recruiter_phone, job_title, internship_type,
          location, salary, stipend, website, email_domain, payment_requested, payment_amount, payment_method,
          payment_reason, requested_documents_json, deadline, claims_json, suspicious_phrases_json, contact_information)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ed-${caseRecord.id}`,
          caseRecord.id,
          ed.company_name,
          ed.recruiter_name,
          ed.recruiter_email,
          ed.recruiter_phone,
          ed.job_title,
          ed.internship_type,
          ed.location,
          ed.salary,
          ed.stipend,
          ed.website,
          ed.email_domain,
          ed.payment_requested ? 1 : 0,
          ed.payment_amount || 0,
          ed.payment_method,
          ed.payment_reason,
          JSON.stringify(ed.requested_documents || []),
          ed.deadline,
          JSON.stringify(ed.claims || []),
          JSON.stringify(ed.suspicious_phrases || []),
          ed.contact_information,
        ]
      );
    }

    // 3. Investigation
    const invId = `inv-${caseRecord.id}`;
    await dbRun(
      `INSERT OR REPLACE INTO investigations (id, case_id, engine_version, created_at)
       VALUES (?, ?, ?, ?)`,
      [invId, caseRecord.id, '2.4.0', caseRecord.createdAt]
    );

    // 4. Evidence nodes
    await dbRun('DELETE FROM evidence WHERE case_id = ?', [caseRecord.id]);
    for (const ev of caseRecord.evidenceChain || []) {
      await dbRun(
        `INSERT INTO evidence 
         (id, investigation_id, case_id, step, signal, source, status, confidence, explanation, impact_score, is_fictional_demo_data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.id,
          invId,
          caseRecord.id,
          ev.step,
          ev.signal,
          ev.source,
          ev.status,
          ev.confidence,
          ev.explanation,
          ev.impactScore,
          ev.isFictionalDemoData ? 1 : 0,
          caseRecord.createdAt,
        ]
      );
    }

    // 5. Risk signals
    await dbRun('DELETE FROM risk_signals WHERE case_id = ?', [caseRecord.id]);
    for (const sig of caseRecord.detectedSignals || []) {
      await dbRun(
        `INSERT INTO risk_signals
         (id, investigation_id, case_id, category, name, description, impact, severity, evidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sig.id,
          invId,
          caseRecord.id,
          sig.category,
          sig.name,
          sig.description,
          sig.impact,
          sig.severity,
          sig.evidence,
          caseRecord.createdAt,
        ]
      );
    }

    // 6. Review record if present
    if (caseRecord.review) {
      const rev = caseRecord.review;
      await dbRun(
        `INSERT OR REPLACE INTO reviews
         (id, case_id, reviewer_id, reviewer_name, reviewer_role, verdict, notes, add_to_scam_db, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rev.id,
          caseRecord.id,
          rev.reviewerId,
          rev.reviewerName,
          rev.reviewerRole,
          rev.verdict,
          rev.notes,
          rev.addToScamDb ? 1 : 0,
          rev.timestamp,
        ]
      );
    }

    // 7. Audit events
    await dbRun('DELETE FROM audit_events WHERE case_id = ?', [caseRecord.id]);
    for (const aud of caseRecord.auditTrail || []) {
      await dbRun(
        `INSERT INTO audit_events
         (id, case_id, timestamp, actor_type, actor_name, action, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [aud.id, caseRecord.id, aud.timestamp, aud.actorType, aud.actorName, aud.action, aud.details]
      );
    }
  }

  static async findById(id: string): Promise<CaseRecord | undefined> {
    const c = await dbGet<any>('SELECT * FROM cases WHERE id = ?', [id]);
    if (!c) return undefined;
    return this.hydrateCase(c);
  }

  static async list(filters?: { risk?: string; status?: string; search?: string; studentEmail?: string }): Promise<CaseRecord[]> {
    let sql = 'SELECT * FROM cases WHERE 1=1';
    const params: any[] = [];

    if (filters?.risk && filters.risk !== 'ALL') {
      sql += ' AND risk_level = ?';
      params.push(filters.risk);
    }

    if (filters?.status && filters.status !== 'ALL') {
      sql += ' AND (review_status = ? OR verification_status = ?)';
      params.push(filters.status, filters.status);
    }

    if (filters?.studentEmail) {
      sql += ' AND student_email = ?';
      params.push(filters.studentEmail);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await dbAll<any>(sql, params);
    const results: CaseRecord[] = [];

    for (const r of rows) {
      const hydrated = await this.hydrateCase(r);
      if (filters?.search && typeof filters.search === 'string') {
        const q = filters.search.toLowerCase();
        const matches =
          hydrated.caseNumber.toLowerCase().includes(q) ||
          hydrated.studentName.toLowerCase().includes(q) ||
          hydrated.extractedDetails.company_name.toLowerCase().includes(q) ||
          hydrated.extractedDetails.job_title.toLowerCase().includes(q);
        if (!matches) continue;
      }
      results.push(hydrated);
    }

    return results;
  }

  private static async hydrateCase(c: any): Promise<CaseRecord> {
    // Extracted details
    const edRow = await dbGet<any>('SELECT * FROM extracted_details WHERE case_id = ?', [c.id]);
    const extractedDetails: ExtractedOfferDetails = edRow
      ? {
          company_name: edRow.company_name,
          recruiter_name: edRow.recruiter_name || '',
          recruiter_email: edRow.recruiter_email || '',
          recruiter_phone: edRow.recruiter_phone || '',
          job_title: edRow.job_title,
          internship_type: edRow.internship_type || 'paid',
          location: edRow.location || '',
          salary: edRow.salary || '',
          stipend: edRow.stipend || '',
          website: edRow.website || '',
          email_domain: edRow.email_domain || '',
          payment_requested: Boolean(edRow.payment_requested),
          payment_amount: Number(edRow.payment_amount || 0),
          payment_method: edRow.payment_method || 'None',
          payment_reason: edRow.payment_reason || 'None',
          requested_documents: JSON.parse(edRow.requested_documents_json || '[]'),
          deadline: edRow.deadline || '',
          claims: JSON.parse(edRow.claims_json || '[]'),
          suspicious_phrases: JSON.parse(edRow.suspicious_phrases_json || '[]'),
          contact_information: edRow.contact_information || '',
        }
      : ({} as ExtractedOfferDetails);

    // Evidence
    const evRows = await dbAll<any>('SELECT * FROM evidence WHERE case_id = ? ORDER BY impact_score DESC', [c.id]);
    const evidenceChain: EvidenceNode[] = evRows.map((r) => ({
      id: r.id,
      step: r.step,
      signal: r.signal,
      source: r.source,
      status: r.status,
      confidence: r.confidence,
      explanation: r.explanation,
      impactScore: r.impact_score,
      isFictionalDemoData: Boolean(r.is_fictional_demo_data),
    }));

    // Signals
    const sigRows = await dbAll<any>('SELECT * FROM risk_signals WHERE case_id = ? ORDER BY impact DESC', [c.id]);
    const detectedSignals: DetectedSignal[] = sigRows.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      description: r.description,
      impact: r.impact,
      severity: r.severity,
      evidence: r.evidence,
    }));

    // Review
    const revRow = await dbGet<any>('SELECT * FROM reviews WHERE case_id = ?', [c.id]);
    const review: ReviewDecision | undefined = revRow
      ? {
          id: revRow.id,
          reviewerId: revRow.reviewer_id,
          reviewerName: revRow.reviewer_name,
          reviewerRole: revRow.reviewer_role,
          verdict: revRow.verdict,
          notes: revRow.notes,
          timestamp: revRow.timestamp,
          addToScamDb: Boolean(revRow.add_to_scam_db),
        }
      : undefined;

    // Audit trail
    const audRows = await dbAll<any>('SELECT * FROM audit_events WHERE case_id = ? ORDER BY timestamp ASC', [c.id]);
    const auditTrail: AuditLogEntry[] = audRows.map((r) => ({
      id: r.id,
      caseId: r.case_id,
      timestamp: r.timestamp,
      actorType: r.actor_type,
      actorName: r.actor_name,
      action: r.action,
      details: r.details,
    }));

    return {
      id: c.id,
      caseNumber: c.case_number,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      submissionType: c.submission_type,
      rawInput: c.raw_input,
      studentName: c.student_name,
      studentEmail: c.student_email,
      studentCollege: c.student_college,
      studentRoll: c.student_roll,
      extractedDetails,
      riskScore: c.risk_score,
      riskLevel: c.risk_level,
      verificationStatus: c.verification_status,
      detectedSignals,
      evidenceChain,
      summary: c.summary,
      reasoning: c.reasoning,
      recommendedAction: c.recommended_action,
      unverifiedInfo: JSON.parse(c.unverified_info_json || '[]'),
      humanReviewRequired: Boolean(c.human_review_required),
      reviewStatus: c.review_status,
      review,
      auditTrail,
      isDemoCase: Boolean(c.is_demo_case),
    };
  }

  static async seedDemoCases(demoCases: CaseRecord[]): Promise<void> {
    const existing = await dbGet<{ count: number }>('SELECT count(*) as count FROM cases');
    if (!existing || existing.count === 0) {
      console.log('Seeding initial demo cases into persistent SQLite database...');
      for (const dc of demoCases) {
        await this.save(dc);
      }
      console.log(`Successfully stored ${demoCases.length} demo cases in SQLite.`);
    }
  }
}
