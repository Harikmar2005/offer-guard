export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY VERIFIED'
  | 'LOW RISK'
  | 'MEDIUM RISK'
  | 'HIGH RISK'
  | 'CRITICAL RISK'
  | 'UNABLE TO VERIFY'
  | 'HUMAN REVIEW REQUIRED';

export type TechnicalDomainStatus = 'EXISTS' | 'DOES_NOT_EXIST' | 'UNAVAILABLE';
export type CompanyVerificationStatus = 'VERIFIED' | 'INCONSISTENT' | 'SUSPICIOUS' | 'UNVERIFIED' | 'UNAVAILABLE';
export type RecruiterVerificationStatus = 'VERIFIED' | 'INCONSISTENT' | 'SUSPICIOUS' | 'UNVERIFIED' | 'UNAVAILABLE';
export type EvidenceStatus = 'VERIFIED' | 'MISMATCH' | 'SUSPICIOUS' | 'UNVERIFIED' | 'UNAVAILABLE' | 'CONTRADICTORY';

export type ReviewVerdict =
  | 'VERIFIED'
  | 'WARNING'
  | 'SCAM'
  | 'NEEDS MORE INFORMATION'
  | 'INCONCLUSIVE'
  | 'REQUIRES_MORE_INFO'
  | 'VERIFIED_LEGITIMATE';

export type UserRole = 'STUDENT' | 'REVIEWER' | 'ADMIN';

export interface ProviderResult<TStatus = string> {
  status: TStatus;
  confidence: number;
  source: string;
  evidence: string;
  explanation: string;
}

export interface EvidenceNode {
  id: string;
  step:
    | 'CLAIMED_COMPANY'
    | 'WEBSITE'
    | 'EMAIL_DOMAIN'
    | 'RECRUITER'
    | 'JOB_POSTING'
    | 'OFFER_LETTER'
    | 'PAYMENT_REQUEST'
    | 'CONSISTENCY';
  signal: string;
  source: string;
  status: 'VERIFIED' | 'MISMATCH' | 'SUSPICIOUS' | 'UNVERIFIED' | 'UNAVAILABLE' | 'CONTRADICTORY';
  confidence: number; // 0.0 - 1.0
  explanation: string;
  impactScore: number; // positive adds to risk score
  evidenceText?: string;
  isFictionalDemoData?: boolean;
}

export interface DetectedSignal {
  id: string;
  category:
    | 'FINANCIAL'
    | 'COMMUNICATION'
    | 'IDENTITY'
    | 'DOCUMENTS'
    | 'PRIVACY'
    | 'RECRUITER_DOMAIN'
    | 'DOMAIN_REPUTATION';
  name: string;
  description: string;
  impact: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  policyRef?: string;
}

export interface ExtractedOfferDetails {
  company_name: string;
  recruiter_name: string;
  recruiter_email: string;
  recruiter_phone: string;
  job_title: string;
  internship_type: 'unpaid' | 'paid' | 'fee_based' | 'full_time' | 'contract' | 'unknown';
  location: string;
  salary: string;
  stipend: string;
  website: string;
  email_domain: string;
  payment_requested: boolean;
  payment_amount: number;
  payment_method: string;
  payment_reason: string;
  requested_documents: string[];
  deadline: string;
  claims: string[];
  suspicious_phrases: string[];
  contact_information: string;
}

export interface ScoringWeights {
  registration_fee: number;
  personal_upi: number;
  recruiter_domain_mismatch: number;
  company_inconsistency: number;
  urgency_language: number;
  sensitive_document_request: number;
  unrealistic_salary: number;
  suspicious_domain: number;
  unverifiable_company: number;
}

export interface AuditEvent {
  id: string;
  caseId: string;
  timestamp: string;
  actorType: 'student' | 'system' | 'reviewer' | 'admin';
  actorName: string;
  action: string;
  details: string;
}

export type AuditLogEntry = AuditEvent;

export interface ReviewRecord {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  verdict: ReviewVerdict;
  notes: string;
  attachedEvidenceNotes?: string;
  timestamp: string;
  addToScamDb: boolean;
}

export type ReviewDecision = ReviewRecord;

export interface CaseRecord {
  id: string;
  caseNumber: string;
  createdAt: string;
  updatedAt: string;
  submissionType: 'text' | 'pdf' | 'screenshot' | 'url' | 'upi' | 'document' | 'letter';
  rawInput: string;
  studentName: string;
  studentEmail: string;
  studentCollege: string;
  studentRoll: string;
  extractedDetails: ExtractedOfferDetails;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  verificationStatus: VerificationStatus;
  detectedSignals: DetectedSignal[];
  evidenceChain: EvidenceNode[];
  summary: string;
  reasoning: string;
  recommendedAction: string;
  unverifiedInfo: string[];
  humanReviewRequired: boolean;
  reviewStatus: 'PENDING_REVIEW' | 'REVIEWED' | 'NOT_REQUIRED';
  review?: ReviewRecord;
  auditTrail: AuditEvent[];
  isDemoCase?: boolean;
}

export interface ScamPatternEntity {
  id: string;
  category:
    | 'FEE_EXTORTION'
    | 'IMPERSONATION'
    | 'UNREALISTIC_STIPEND'
    | 'EQUIPMENT_BOND'
    | 'TYPOSQUAT_DOMAIN'
    | 'SENSITIVE_DATA_HARVEST';
  title: string;
  description: string;
  indicators: string[];
  targetAudience: string;
  riskLevel: RiskLevel;
  dateLogged: string;
  reportCount: number;
  isFictionalDemoData?: boolean;
}

export interface SuspiciousEntity {
  id: string;
  type: 'COMPANY' | 'RECRUITER' | 'DOMAIN' | 'UPI_ID' | 'PHONE' | 'EMAIL';
  value: string;
  claimedEntity?: string;
  evidence: string;
  riskLevel: RiskLevel;
  dateAdded: string;
  matchCount: number;
  isFictionalDemoData?: boolean;
}
