export type RiskLevel = 'GREEN' | 'AMBER' | 'RED';

export interface ScamEntity {
  id: string;
  entity_type: 'company' | 'phone' | 'email' | 'upi_id' | 'domain' | 'keyword_pattern';
  value: string;
  evidence: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  createdBy: string;
  dateAdded: string;
  matchCount: number;
}

export interface RequestedFee {
  amount: number;
  reason: string;
  upi_id?: string;
}

export interface ExtractedOfferDetails {
  company_name: string;
  role_title: string;
  stipend_amount: string;
  salary_currency: string;
  location: string;
  recruiter_name: string;
  recruiter_email: string;
  recruiter_phone: string;
  upi_ids: string[];
  requested_fees: RequestedFee[];
  job_links: string[];
  platforms_mentioned: string[];
  deadlines_or_pressure: boolean;
  internship_type: 'unpaid' | 'paid' | 'fee_based' | 'unknown';
}

export interface RedFlag {
  title: string;
  explanation: string;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  policy_ref?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_type: 'student' | 'system' | 'reviewer' | 'admin';
  actor_name: string;
  action: string;
  details: string;
}

export interface ChecklistAnswer {
  question_id: string;
  question_text: string;
  student_answer: string;
  concern_level: 'safe' | 'warning' | 'critical';
}

export interface ReviewerChecklist {
  company_website_verified: { status: 'pass' | 'concern' | 'na'; notes: string };
  domain_matches_official: { status: 'pass' | 'concern' | 'na'; notes: string };
  fee_request_prohibited: { status: 'pass' | 'concern' | 'na'; notes: string };
  official_documentation_verified: { status: 'pass' | 'concern' | 'na'; notes: string };
  stipend_scope_reasonable: { status: 'pass' | 'concern' | 'na'; notes: string };
}

export interface ReviewerDecision {
  verdict: 'approved_safe' | 'approved_with_reservations' | 'warn_high_risk' | 'blacklist_scam';
  decision_summary: string;
  reviewer_name: string;
  timestamp: string;
  addToScamDb: boolean;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_roll: string;
  student_department: string;
  student_college: string;
  channel: 'whatsapp' | 'telegram' | 'web_portal';
  status: 'draft' | 'analyzed' | 'escalated_pending_review' | 'resolved_safe' | 'resolved_warned' | 'resolved_blacklisted' | 'privacy_anonymized';
  extracted_details: ExtractedOfferDetails;
  risk_score: number;
  risk_level: RiskLevel;
  red_flags: RedFlag[];
  green_flags: string[];
  explanation_en: string;
  explanation_ta: string;
  explanation_hi: string;
  recommended_action: string;
  raw_input_text: string;
  attached_files?: Array<{ name: string; type: string; size: string; previewText?: string }>;
  checklist_answers: ChecklistAnswer[];
  reviewer_checklist?: ReviewerChecklist;
  reviewer_decision?: ReviewerDecision;
  audit_trail: AuditLog[];
}

export interface AnalyticsMetrics {
  totalChecks: number;
  activeCases: number;
  highRiskIntercepted: number;
  amberCautionFlags: number;
  verifiedSafeOffers: number;
  resolvedByReviewers: number;
  totalMoneyProtectedInr: number;
  scamEntitiesTracked: number;
  averageReviewTimeHours: number;
}
