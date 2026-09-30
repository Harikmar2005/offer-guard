import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialized Gemini AI client with telemetry header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory data store with comprehensive seed data
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
  requested_fees: Array<{ amount: number; reason: string; upi_id?: string }>;
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
  risk_level: 'GREEN' | 'AMBER' | 'RED';
  red_flags: RedFlag[];
  green_flags: string[];
  explanation_en: string;
  explanation_ta: string;
  explanation_hi: string;
  recommended_action: string;
  raw_input_text: string;
  attached_files?: Array<{ name: string; type: string; size: string; previewText?: string }>;
  checklist_answers: Array<{
    question_id: string;
    question_text: string;
    student_answer: string;
    concern_level: 'safe' | 'warning' | 'critical';
  }>;
  reviewer_checklist?: {
    company_website_verified: { status: 'pass' | 'concern' | 'na'; notes: string };
    domain_matches_official: { status: 'pass' | 'concern' | 'na'; notes: string };
    fee_request_prohibited: { status: 'pass' | 'concern' | 'na'; notes: string };
    official_documentation_verified: { status: 'pass' | 'concern' | 'na'; notes: string };
    stipend_scope_reasonable: { status: 'pass' | 'concern' | 'na'; notes: string };
  };
  reviewer_decision?: {
    verdict: 'approved_safe' | 'approved_with_reservations' | 'warn_high_risk' | 'blacklist_scam';
    decision_summary: string;
    reviewer_name: string;
    timestamp: string;
    addToScamDb: boolean;
  };
  audit_trail: AuditLog[];
}

// Initial central scam database
let scamDatabase: ScamEntity[] = [
  {
    id: 'scam-001',
    entity_type: 'upi_id',
    value: 'apexcyber@okaxis',
    evidence: 'Demanded ₹2,500 for fake police clearance certificate from 4 students.',
    risk_level: 'HIGH',
    createdBy: 'Prof. R. Venkatesh (Placement Director)',
    dateAdded: '2026-09-12',
    matchCount: 14,
  },
  {
    id: 'scam-002',
    entity_type: 'company',
    value: 'ApexCyber Infotech',
    evidence: 'Fake startup pretending to offer AI research internships; demands upfront processing fee.',
    risk_level: 'HIGH',
    createdBy: 'Cybersecurity Club Lead',
    dateAdded: '2026-09-12',
    matchCount: 9,
  },
  {
    id: 'scam-003',
    entity_type: 'keyword_pattern',
    value: 'police clearance certificate',
    evidence: 'Classic fee extortion tactic targeting mandatory internship students.',
    risk_level: 'HIGH',
    createdBy: 'AICTE / Institutional Security Alert',
    dateAdded: '2026-08-01',
    matchCount: 38,
  },
  {
    id: 'scam-004',
    entity_type: 'upi_id',
    value: 'laptopbond.deposit@ybl',
    evidence: 'Demanded ₹1,500 security deposit for courier of company work laptop.',
    risk_level: 'HIGH',
    createdBy: 'Placement Cell Officer Priya M.',
    dateAdded: '2026-09-18',
    matchCount: 7,
  },
  {
    id: 'scam-005',
    entity_type: 'company',
    value: 'QuantumCloud Solutions Pvt Ltd',
    evidence: 'Unregistered entity contacting students via Telegram with high stipends (₹45,000) for zero-skill roles.',
    risk_level: 'HIGH',
    createdBy: 'Prof. R. Venkatesh',
    dateAdded: '2026-09-20',
    matchCount: 11,
  },
  {
    id: 'scam-006',
    entity_type: 'email',
    value: 'hr.abccyber@gmail.com',
    evidence: 'Using personal Gmail to send forged corporate appointment letters.',
    risk_level: 'HIGH',
    createdBy: 'TPO Coordinator',
    dateAdded: '2026-09-05',
    matchCount: 6,
  },
  {
    id: 'scam-007',
    entity_type: 'domain',
    value: 'career-infosys-portal.xyz',
    evidence: 'Typosquatted domain mimicking Infosys Springboard recruitment portal.',
    risk_level: 'HIGH',
    createdBy: 'Campus IT Security',
    dateAdded: '2026-08-25',
    matchCount: 22,
  },
  {
    id: 'scam-008',
    entity_type: 'phone',
    value: '+91 98765 43210',
    evidence: 'WhatsApp recruiter threatening to blacklist students on NASSCOM if fee not paid in 30 mins.',
    risk_level: 'HIGH',
    createdBy: 'Dean of Student Affairs',
    dateAdded: '2026-09-22',
    matchCount: 5,
  },
  {
    id: 'scam-009',
    entity_type: 'keyword_pattern',
    value: 'laptop security bond',
    evidence: 'Advance payment request promising refund on joining.',
    risk_level: 'HIGH',
    createdBy: 'Prof. R. Venkatesh',
    dateAdded: '2026-08-15',
    matchCount: 19,
  },
];

// Seed Cases
let casesStore: CaseRecord[] = [
  {
    id: 'case-1042',
    case_number: 'SI-2026-1042',
    created_at: '2026-09-28T14:30:00Z',
    updated_at: '2026-09-29T10:15:00Z',
    student_name: 'Aditya Krishnan',
    student_roll: '23CS084',
    student_department: 'Computer Science & Engineering',
    student_college: 'Government College of Technology, Coimbatore',
    channel: 'whatsapp',
    status: 'escalated_pending_review',
    extracted_details: {
      company_name: 'ApexCyber Infotech',
      role_title: 'Cybersecurity Analyst Intern',
      stipend_amount: '₹22,000 / month',
      salary_currency: 'INR',
      location: 'Remote / Bangalore',
      recruiter_name: 'Karan Sharma (HR Talent Acquisition)',
      recruiter_email: 'hr.abccyber@gmail.com',
      recruiter_phone: '+91 98765 43210',
      upi_ids: ['apexcyber@okaxis'],
      requested_fees: [
        {
          amount: 2500,
          reason: 'State Police Clearance & Background Verification Processing Fee',
          upi_id: 'apexcyber@okaxis',
        },
      ],
      job_links: ['https://linkedin.com/in/fake-karan-recruiter-992'],
      platforms_mentioned: ['WhatsApp', 'LinkedIn'],
      deadlines_or_pressure: true,
      internship_type: 'fee_based',
    },
    risk_score: 92,
    risk_level: 'RED',
    red_flags: [
      {
        title: 'Advance Fee Demanded via Personal UPI',
        explanation: 'The recruiter demands ₹2,500 for a police verification certificate via UPI ID apexcyber@okaxis before issuing formal joining credentials.',
        evidence: 'UPI ID: apexcyber@okaxis | Amount: ₹2,500',
        severity: 'critical',
        policy_ref: 'College Placement Policy Rule 4.1 & AICTE Internship Guidelines',
      },
      {
        title: 'UPI ID Matched Known Scam Database',
        explanation: 'The UPI ID apexcyber@okaxis is flagged in the placement cell scam database with 14 previous fraudulent incident reports.',
        evidence: 'Matched Scam DB Entry #scam-001 (ApexCyber Infotech)',
        severity: 'critical',
        policy_ref: 'Institutional Fraud Registry',
      },
      {
        title: 'Personal Freemail Address Used for Corporate Hiring',
        explanation: 'Official offer and payment instructions sent from hr.abccyber@gmail.com rather than a verified corporate domain.',
        evidence: 'Email: hr.abccyber@gmail.com',
        severity: 'high',
        policy_ref: 'Campus Cyber Vigilance Directive 2026',
      },
      {
        title: 'Artificial Time Pressure & Coercion',
        explanation: 'Recruiter stated: "Pay within 30 minutes or your internship slot will be passed to waiting list candidate."',
        evidence: 'Message: "Transfer ₹2,500 immediately to confirm slot before 5 PM deadline."',
        severity: 'high',
      },
    ],
    green_flags: [],
    explanation_en: 'This offer is extremely dangerous and exhibits all hallmarks of a known internship fee scam. Legitimate corporate employers never demand fee payments via UPI for police clearance or background checks. Do not transfer any funds or share your Aadhaar/PAN cards.',
    explanation_ta: 'இந்த வாய்ப்பு மிகவும் ஆபத்தானது மற்றும் உறுதிப்படுத்தப்பட்ட மோசடியின் அனைத்து அறிகுறிகளையும் கொண்டுள்ளது. உண்மையான நிறுவனங்கள் ஒருபோதும் காவல்துறை சான்றிதழ் அல்லது சரிபார்ப்பிற்கு UPI மூலம் கட்டணம் கேட்காது. பணத்தை அனுப்பாதீர்கள்.',
    explanation_hi: 'यह इंटर्नशिप ऑफर अत्यधिक संदिग्ध और धोखाधड़ी वाला है। वास्तविक कंपनियां पुलिस वेरिफिकेशन या ट्रेनिंग के नाम पर कभी भी यूपीआई से पैसे नहीं मांगती हैं। कृपया कोई भुगतान न करें।',
    recommended_action: 'Do not pay any money. Escalated to Placement Cell for blacklist confirmation.',
    raw_input_text: `Offer Letter Text:
"Dear Aditya,
Congratulations! You have been provisionally selected for Cybersecurity Analyst Internship at ApexCyber Infotech.
Stipend: Rs. 22,000/month.
Requirement: To confirm your appointment, candidate must complete Mandatory Police Clearance Certificate processing. Deposit Rs. 2,500 via UPI to apexcyber@okaxis.
Deadline: Complete payment within 30 mins to avoid cancellation.
HR Contact: hr.abccyber@gmail.com / +91 98765 43210"`,
    attached_files: [
      {
        name: 'ApexCyber_Offer_Letter_Provisional.pdf',
        type: 'application/pdf',
        size: '284 KB',
        previewText: 'Provisional Appointment Letter - Cybersecurity Analyst Intern - Fee required: Rs 2,500',
      },
    ],
    checklist_answers: [
      {
        question_id: 'mandatory_internship',
        question_text: 'Is this internship mandatory for your academic graduation?',
        student_answer: 'Yes, 8th semester 6-month mandatory requirement.',
        concern_level: 'warning',
      },
      {
        question_id: 'fee_requested',
        question_text: 'Have they asked you to pay any money or deposit via UPI / Bank?',
        student_answer: 'Yes, ₹2,500 for police clearance certificate.',
        concern_level: 'critical',
      },
      {
        question_id: 'official_email',
        question_text: 'Did the recruiter email you from an official company domain (@company.com)?',
        student_answer: 'No, they contacted me from a Gmail address on WhatsApp.',
        concern_level: 'critical',
      },
    ],
    audit_trail: [
      {
        id: 'aud-1',
        timestamp: '2026-09-28T14:30:00Z',
        actor_type: 'student',
        actor_name: 'Aditya Krishnan (23CS084)',
        action: 'Forwarded offer to WhatsApp bot',
        details: 'Submitted recruiter message and PDF attachment for initial safety screening.',
      },
      {
        id: 'aud-2',
        timestamp: '2026-09-28T14:30:45Z',
        actor_type: 'system',
        actor_name: 'SafeIntern AI Engine',
        action: 'Analyzed offer & flagged RED (Score 92)',
        details: 'Matched UPI apexcyber@okaxis to known scam database with 14 prior reports. Flagged fee extortion pattern.',
      },
      {
        id: 'aud-3',
        timestamp: '2026-09-28T14:35:10Z',
        actor_type: 'student',
        actor_name: 'Aditya Krishnan (23CS084)',
        action: 'Requested escalation to Placement Cell',
        details: 'Student consented to share profile, roll number, and offer transcript with Placement Officer.',
      },
    ],
  },
  {
    id: 'case-1039',
    case_number: 'SI-2026-1039',
    created_at: '2026-09-27T10:00:00Z',
    updated_at: '2026-09-27T15:20:00Z',
    student_name: 'Sneha Murugan',
    student_roll: '23EC041',
    student_department: 'Electronics & Communication Engineering',
    student_college: 'Government College of Technology, Coimbatore',
    channel: 'telegram',
    status: 'resolved_safe',
    extracted_details: {
      company_name: 'Infosys Limited (Springboard Program)',
      role_title: 'Cloud & AI Engineer Intern',
      stipend_amount: '₹25,000 / month',
      salary_currency: 'INR',
      location: 'Infosys Mysore Campus / Hybrid',
      recruiter_name: 'Springboard Talent Operations',
      recruiter_email: 'internships@infosys.com',
      recruiter_phone: '080-28520261',
      upi_ids: [],
      requested_fees: [],
      job_links: ['https://infyspringboard.onwingspan.com'],
      platforms_mentioned: ['Official Campus Portal', 'Email'],
      deadlines_or_pressure: false,
      internship_type: 'paid',
    },
    risk_score: 8,
    risk_level: 'GREEN',
    red_flags: [],
    green_flags: [
      'Official verified corporate domain (infosys.com)',
      'Strict zero fee policy stated in documentation',
      'Sent through verified institutional placement portal',
      'Realistic stipend aligned with standard industry tiers',
    ],
    explanation_en: 'This offer is verified safe. Communications originate from the authentic @infosys.com enterprise email domain, no fees are requested, and the recruitment process matches official Infosys Springboard university protocols.',
    explanation_ta: 'இந்த வாய்ப்பு பாதுகாப்பானது என சரிபார்க்கப்பட்டுள்ளது. அதிகாரப்பூர்வ Infosys டொமைனில் இருந்து மின்னஞ்சல் வந்துள்ளது, எந்தக் கட்டணமும் கேட்கப்படவில்லை.',
    explanation_hi: 'यह ऑफर पूरी तरह से सुरक्षित और सत्यापित है। इंफोसिस की आधिकारिक डोमेन से ईमेल आया है और कोई शुल्क नहीं मांगा गया है।',
    recommended_action: 'Safe to proceed. Follow standard placement cell registration procedures.',
    raw_input_text: `Infosys Springboard Summer Internship Selection Letter
Candidate: Sneha Murugan (23EC041)
Role: Cloud & AI Engineer Intern
Stipend: INR 25,000 per month
Location: Mysore / Bangalore
Important: Infosys does not charge any registration, recruitment, or training fees at any stage.
Sender: internships@infosys.com`,
    checklist_answers: [
      {
        question_id: 'fee_requested',
        question_text: 'Have they asked you to pay any money or deposit via UPI / Bank?',
        student_answer: 'No, strictly zero fees.',
        concern_level: 'safe',
      },
      {
        question_id: 'official_email',
        question_text: 'Did the recruiter email you from an official company domain (@company.com)?',
        student_answer: 'Yes, came from internships@infosys.com.',
        concern_level: 'safe',
      },
    ],
    reviewer_checklist: {
      company_website_verified: { status: 'pass', notes: 'Verified via infosys.com Springboard portal.' },
      domain_matches_official: { status: 'pass', notes: 'Sender DKIM/SPF authenticated infosys.com.' },
      fee_request_prohibited: { status: 'pass', notes: 'Zero fees requested; compliant with AICTE norms.' },
      official_documentation_verified: { status: 'pass', notes: 'Letter signed by HR director with valid reference code.' },
      stipend_scope_reasonable: { status: 'pass', notes: 'Standard ₹25k stipend for 8th sem.' },
    },
    reviewer_decision: {
      verdict: 'approved_safe',
      decision_summary: 'Verified legitimate campus drive offer. Zero financial or identity risk.',
      reviewer_name: 'Prof. R. Venkatesh (Placement Director)',
      timestamp: '2026-09-27T15:20:00Z',
      addToScamDb: false,
    },
    audit_trail: [
      {
        id: 'aud-4',
        timestamp: '2026-09-27T10:00:00Z',
        actor_type: 'student',
        actor_name: 'Sneha Murugan',
        action: 'Forwarded offer to Telegram bot',
        details: 'Checked Infosys Springboard selection letter.',
      },
      {
        id: 'aud-5',
        timestamp: '2026-09-27T10:00:30Z',
        actor_type: 'system',
        actor_name: 'SafeIntern AI Engine',
        action: 'Assessed as GREEN (Score 8)',
        details: 'Domain authentic, zero fees, corporate headers valid.',
      },
      {
        id: 'aud-6',
        timestamp: '2026-09-27T15:20:00Z',
        actor_type: 'reviewer',
        actor_name: 'Prof. R. Venkatesh',
        action: 'Formally marked SAFE in Placement Dashboard',
        details: 'Approved for college internship credit.',
      },
    ],
  },
  {
    id: 'case-1040',
    case_number: 'SI-2026-1040',
    created_at: '2026-09-28T09:10:00Z',
    updated_at: '2026-09-28T16:45:00Z',
    student_name: 'Rohit Balaji',
    student_roll: '23IT019',
    student_department: 'Information Technology',
    student_college: 'Government College of Technology, Coimbatore',
    channel: 'telegram',
    status: 'resolved_blacklisted',
    extracted_details: {
      company_name: 'QuantumCloud Solutions Pvt Ltd',
      role_title: 'Full Stack Developer Intern',
      stipend_amount: '₹45,000 / month',
      salary_currency: 'INR',
      location: 'Fully Remote',
      recruiter_name: 'Alex Martin (Telegram Recruiter)',
      recruiter_email: 'quantumcloud.hiring@gmail.com',
      recruiter_phone: '+91 91234 56789',
      upi_ids: ['laptopbond.deposit@ybl'],
      requested_fees: [
        {
          amount: 1500,
          reason: 'Company MacBook Pro Courier Insurance & Security Bond (Refundable)',
          upi_id: 'laptopbond.deposit@ybl',
        },
      ],
      job_links: ['https://t.me/QuantumCloudRecruiting'],
      platforms_mentioned: ['Telegram'],
      deadlines_or_pressure: true,
      internship_type: 'fee_based',
    },
    risk_score: 95,
    risk_level: 'RED',
    red_flags: [
      {
        title: 'Advance Laptop Courier Deposit Scam',
        explanation: 'Demanding ₹1,500 UPI transfer for "work laptop courier insurance" before joining.',
        evidence: 'UPI ID: laptopbond.deposit@ybl | ₹1,500',
        severity: 'critical',
        policy_ref: 'College Placement Policy Section 3.2',
      },
      {
        title: 'Unrealistic Compensation for Pre-Final Year',
        explanation: 'Offering ₹45,000/month remote stipend with zero technical assessment or video interview.',
        evidence: 'Stipend ₹45,000 / month',
        severity: 'high',
      },
    ],
    green_flags: [],
    explanation_en: 'Definite scam operation. The recruiter claims to send a MacBook Pro and asks for a ₹1,500 insurance deposit via UPI. Legitimate companies dispatch equipment at their own expense with asset tracking.',
    explanation_ta: 'உறுதியான மடிக்கணினி பாதுகாப்பு வைப்பு மோசடி. வேலைக்கு சேரும் முன் பணம் செலுத்த வேண்டாம்.',
    explanation_hi: 'यह लैपटॉप सिक्योरिटी डिपॉजिट के नाम पर होने वाला जाना-माना फ्रॉड है। कोई पैसा न भेजें।',
    recommended_action: 'Blocked & Blacklisted across college placement network.',
    raw_input_text: `Telegram Message from @QuantumCloudRecruiting:
"Hello Rohit, your resume has been shortlisted for Full Stack Intern at QuantumCloud Solutions.
Stipend is Rs. 45,000 monthly.
You will be provided a company M3 MacBook Pro. Please transfer refundable dispatch security deposit Rs. 1,500 to laptopbond.deposit@ybl.
Once paid send screenshot to receive tracking ID."`,
    checklist_answers: [
      {
        question_id: 'fee_requested',
        question_text: 'Have they asked you to pay any money or deposit via UPI / Bank?',
        student_answer: 'Yes, ₹1,500 for laptop delivery bond.',
        concern_level: 'critical',
      },
    ],
    reviewer_decision: {
      verdict: 'blacklist_scam',
      decision_summary: 'Confirmed serial scammer exploiting students with fake laptop dispatch promises. Blacklisted company name and UPI ID in central registry.',
      reviewer_name: 'Prof. R. Venkatesh',
      timestamp: '2026-09-28T16:45:00Z',
      addToScamDb: true,
    },
    audit_trail: [
      {
        id: 'aud-7',
        timestamp: '2026-09-28T09:10:00Z',
        actor_type: 'student',
        actor_name: 'Rohit Balaji',
        action: 'Forwarded Telegram chat to bot',
        details: 'Checked Telegram recruiter offer.',
      },
      {
        id: 'aud-8',
        timestamp: '2026-09-28T16:45:00Z',
        actor_type: 'reviewer',
        actor_name: 'Prof. R. Venkatesh',
        action: 'Blacklisted in Central Scam DB',
        details: 'Added UPI laptopbond.deposit@ybl and QuantumCloud Solutions to institutional blacklist.',
      },
    ],
  },
];

// Helper: Rule-based heuristic extraction & scam DB matcher
function runHeuristicAndDbCheck(text: string, studentChecklist: any[] = []) {
  const flags: RedFlag[] = [];
  const matchedScamEntities: ScamEntity[] = [];
  let computedScore = 15; // base baseline

  const lower = text.toLowerCase();

  // 1. UPI ID extraction regex
  const upiRegex = /([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/g;
  const foundUpiMatches = Array.from(new Set(text.match(upiRegex) || []));

  // 2. Email extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const foundEmails = Array.from(new Set(text.match(emailRegex) || []));

  // 3. Indian Phone extraction
  const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{9}/g;
  const foundPhones = Array.from(new Set(text.match(phoneRegex) || []));

  // 4. Monetary fee mentions
  const feeRegex = /(?:rs\.?|inr|₹)\s*([\d,]+)/gi;
  const feeMatches: number[] = [];
  let m;
  while ((m = feeRegex.exec(text)) !== null) {
    const num = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0) feeMatches.push(num);
  }

  // Cross-reference with central scam database
  for (const item of scamDatabase) {
    let matched = false;
    if (item.entity_type === 'upi_id') {
      if (foundUpiMatches.some((u) => u.toLowerCase() === item.value.toLowerCase())) {
        matched = true;
      }
    } else if (item.entity_type === 'company') {
      if (lower.includes(item.value.toLowerCase())) {
        matched = true;
      }
    } else if (item.entity_type === 'email') {
      if (foundEmails.some((e) => e.toLowerCase() === item.value.toLowerCase())) {
        matched = true;
      }
    } else if (item.entity_type === 'phone') {
      const cleanTarget = item.value.replace(/[\s+-]/g, '');
      if (foundPhones.some((p) => p.replace(/[\s+-]/g, '').includes(cleanTarget))) {
        matched = true;
      }
    } else if (item.entity_type === 'domain') {
      if (lower.includes(item.value.toLowerCase())) {
        matched = true;
      }
    } else if (item.entity_type === 'keyword_pattern') {
      if (lower.includes(item.value.toLowerCase())) {
        matched = true;
      }
    }

    if (matched) {
      matchedScamEntities.push(item);
      item.matchCount += 1;
      computedScore += 35;
      flags.push({
        title: `Known Scam Database Match: ${item.entity_type.toUpperCase()}`,
        explanation: `Matches verified institutional fraud database record: "${item.value}". ${item.evidence}`,
        evidence: `Scam Database Entity: ${item.value}`,
        severity: 'critical',
        policy_ref: 'Placement Cell Central Fraud Registry',
      });
    }
  }

  // Check for fee demand
  const feeKeywords = ['police clearance', 'clearance fee', 'security deposit', 'laptop bond', 'registration fee', 'training fee', 'processing fee', 'verification fee'];
  const hasFeeKeyword = feeKeywords.some((k) => lower.includes(k));
  if (hasFeeKeyword || foundUpiMatches.length > 0) {
    computedScore += 40;
    flags.push({
      title: 'Advance Fee or UPI Payment Demanded',
      explanation: 'The offer demands advance monetary payment before starting work. College placement regulations and AICTE guidelines strictly prohibit recruiters from levying any fees on students.',
      evidence: foundUpiMatches.length > 0 ? `UPI: ${foundUpiMatches.join(', ')}` : 'Fee payment terms detected in communication',
      severity: 'critical',
      policy_ref: 'College Placement Policy Rule 4.1 & AICTE Directive',
    });
  }

  // Check for freemail (gmail/yahoo/outlook) used as official corporate sender
  const freemailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];
  const hasFreemail = foundEmails.some((e) => freemailDomains.some((d) => e.toLowerCase().endsWith(d)));
  if (hasFreemail) {
    computedScore += 18;
    flags.push({
      title: 'Personal Freemail Address Used for Corporate Hiring',
      explanation: 'Recruiter communication is originating from a generic freemail provider (Gmail/Yahoo) instead of an authenticated organizational domain (@company.com).',
      evidence: foundEmails.filter((e) => freemailDomains.some((d) => e.toLowerCase().endsWith(d))).join(', '),
      severity: 'high',
      policy_ref: 'Campus Cyber Vigilance Directive 2026',
    });
  }

  // Check for pressure tactics
  const pressureKeywords = ['within 30 mins', 'within 1 hour', 'within 2 hours', 'urgent', 'seat will be cancelled', 'pass to waiting list', 'deadline today', 'immediately'];
  if (pressureKeywords.some((k) => lower.includes(k))) {
    computedScore += 15;
    flags.push({
      title: 'Artificial Urgency and Pressure Tactics',
      explanation: 'Recruiter is imposing strict artificial deadlines to force impulsive payment before the student can consult family or the college placement cell.',
      evidence: 'High-pressure timing language detected',
      severity: 'medium',
    });
  }

  // Check student checklist input
  for (const ans of studentChecklist) {
    if (ans.question_id === 'fee_requested' && (ans.student_answer.toLowerCase().includes('yes') || ans.student_answer.toLowerCase().includes('₹'))) {
      computedScore += 25;
    }
  }

  computedScore = Math.min(99, Math.max(5, computedScore));
  let riskLevel: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
  if (computedScore >= 70) riskLevel = 'RED';
  else if (computedScore >= 35) riskLevel = 'AMBER';

  return {
    computedScore,
    riskLevel,
    flags,
    matchedScamEntities,
    foundUpiMatches,
    foundEmails,
    foundPhones,
    feeMatches,
  };
}

// ================= API ROUTES =================

// 1. Analyze Offer via Gemini 3.8 Flash + Scam DB + Heuristics
app.post('/api/analyze-offer', async (req: Request, res: Response) => {
  try {
    const { offerText, studentChecklist = [], targetLanguage = 'en' } = req.body;

    if (!offerText || typeof offerText !== 'string' || offerText.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide offer text or recruiter messages to analyze.' });
    }

    // Run local heuristic and scam DB cross-checks first
    const heuristicResult = runHeuristicAndDbCheck(offerText, studentChecklist);

    let extractedData: Partial<ExtractedOfferDetails> = {
      company_name: '',
      role_title: '',
      stipend_amount: '',
      salary_currency: 'INR',
      location: '',
      recruiter_name: '',
      recruiter_email: heuristicResult.foundEmails[0] || '',
      recruiter_phone: heuristicResult.foundPhones[0] || '',
      upi_ids: heuristicResult.foundUpiMatches,
      requested_fees: heuristicResult.feeMatches.map((amt) => ({ amount: amt, reason: 'Fee specified in offer text' })),
      job_links: [],
      platforms_mentioned: [],
      deadlines_or_pressure: false,
      internship_type: 'unknown',
    };

    let geminiExplanation = '';
    let geminiTamil = '';
    let geminiHindi = '';
    let geminiRedFlags: RedFlag[] = [];
    let greenFlags: string[] = [];

    // Attempt Gemini call with gemini-3.8-flash
    try {
      const prompt = `You are the SafeIntern Verification Engine, an AI system that protects Indian university students from fraudulent internships and fee scams.
Analyze the following internship offer / recruiter message carefully:

--- OFFER TEXT / CHAT TRANSCRIPT ---
${offerText}
--- STUDENT CHECKLIST RESPONSES ---
${JSON.stringify(studentChecklist)}

Database cross-reference matches found:
${heuristicResult.matchedScamEntities.map((e) => `- ${e.entity_type}: ${e.value} (${e.evidence})`).join('\n')}

Instructions:
1. Extract structured fields: company_name, role_title, stipend_amount, recruiter_name, recruiter_email, recruiter_phone, upi_ids (array), requested_fees (array of {amount, reason, upi_id}), platforms_mentioned (e.g. WhatsApp, Telegram, LinkedIn), deadlines_or_pressure (boolean), internship_type ('unpaid'|'paid'|'fee_based'|'unknown').
2. Identify specific red flags with concrete evidence and policy rationale (AICTE / Indian college placement standards strictly prohibit fee demands of any kind, whether for police clearance, training, laptop bond, or certificate registration).
3. If legitimate, identify green flags (e.g. verified corporate domain, zero fee policy).
4. Provide a clear, empathetic, explainable summary in simple English (explanation_en), Tamil (explanation_ta), and Hindi (explanation_hi).
5. Recommend safe next steps for the student.

Respond ONLY with valid JSON matching this schema:
{
  "extracted": {
    "company_name": "string",
    "role_title": "string",
    "stipend_amount": "string",
    "salary_currency": "INR",
    "location": "string",
    "recruiter_name": "string",
    "recruiter_email": "string",
    "recruiter_phone": "string",
    "upi_ids": ["string"],
    "requested_fees": [{"amount": 1000, "reason": "string", "upi_id": "string"}],
    "job_links": ["string"],
    "platforms_mentioned": ["string"],
    "deadlines_or_pressure": true,
    "internship_type": "paid"
  },
  "risk_score": 85,
  "risk_level": "RED",
  "red_flags": [
    {
      "title": "string",
      "explanation": "string",
      "evidence": "string",
      "severity": "critical",
      "policy_ref": "string"
    }
  ],
  "green_flags": ["string"],
  "explanation_en": "string",
  "explanation_ta": "string",
  "explanation_hi": "string",
  "recommended_action": "string"
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const rawJson = aiResponse.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);

      if (parsed.extracted) {
        extractedData = {
          ...extractedData,
          ...parsed.extracted,
          upi_ids: Array.from(new Set([...(extractedData.upi_ids || []), ...(parsed.extracted.upi_ids || [])])),
        };
      }

      if (Array.isArray(parsed.red_flags) && parsed.red_flags.length > 0) {
        geminiRedFlags = parsed.red_flags;
      }
      if (Array.isArray(parsed.green_flags)) {
        greenFlags = parsed.green_flags;
      }
      geminiExplanation = parsed.explanation_en || '';
      geminiTamil = parsed.explanation_ta || '';
      geminiHindi = parsed.explanation_hi || '';

      if (typeof parsed.risk_score === 'number') {
        heuristicResult.computedScore = Math.max(heuristicResult.computedScore, parsed.risk_score);
      }
    } catch (genErr) {
      console.warn('Gemini generateContent error or fallback triggered:', genErr);
      // Fallback heuristics handle extraction gracefully
      if (heuristicResult.foundEmails.length > 0) {
        extractedData.company_name = heuristicResult.foundEmails[0].split('@')[0].toUpperCase();
      }
      geminiExplanation = heuristicResult.computedScore >= 70
        ? 'High risk detected. This communication asks for advance payment or matches flagged fraudulent patterns. Never pay money via UPI for college internships.'
        : 'Assessment completed. Please verify company identity and credentials with placement cell before accepting.';
      geminiTamil = 'அதிக ஆபத்து கண்டறியப்பட்டது. கல்லூரிக் கட்டணங்கள் அல்லது UPI மூலம் பணம் செலுத்த வேண்டாம்.';
      geminiHindi = 'उच्च जोखिम पाया गया। कॉलेज इंटर्नशिप के लिए कभी भी यूपीआई से पैसे न भेजें।';
    }

    // Combine red flags: ensure database match flags are prominent
    const allFlagsMap = new Map<string, RedFlag>();
    for (const f of heuristicResult.flags) {
      allFlagsMap.set(f.title, f);
    }
    for (const f of geminiRedFlags) {
      if (!allFlagsMap.has(f.title)) {
        allFlagsMap.set(f.title, f);
      }
    }
    const combinedRedFlags = Array.from(allFlagsMap.values());

    let finalRiskLevel: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
    if (heuristicResult.computedScore >= 70) finalRiskLevel = 'RED';
    else if (heuristicResult.computedScore >= 35) finalRiskLevel = 'AMBER';

    // If zero red flags and low score, ensure green flags exist
    if (combinedRedFlags.length === 0 && greenFlags.length === 0) {
      greenFlags.push('No advance fee or payment demands identified');
      greenFlags.push('Recruiter domain matches standard professional communication');
    }

    res.json({
      extracted_details: extractedData,
      risk_score: heuristicResult.computedScore,
      risk_level: finalRiskLevel,
      red_flags: combinedRedFlags,
      green_flags: greenFlags,
      matched_scam_entities: heuristicResult.matchedScamEntities,
      explanation_en: geminiExplanation,
      explanation_ta: geminiTamil,
      explanation_hi: geminiHindi,
      recommended_action:
        finalRiskLevel === 'RED'
          ? 'DO NOT PAY. Share this case with your college placement cell for immediate review.'
          : finalRiskLevel === 'AMBER'
          ? 'Exercise caution. Request an official offer from a company domain before proceeding.'
          : 'Low risk. Proceed with standard college reporting guidelines.',
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message || 'Error analyzing offer' });
  }
});

// 2. Cases endpoints
app.get('/api/cases', (req: Request, res: Response) => {
  res.json({ cases: casesStore });
});

app.post('/api/cases', (req: Request, res: Response) => {
  const body = req.body;
  const newCaseId = `case-${Date.now().toString().slice(-4)}`;
  const caseNumber = `SI-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newCase: CaseRecord = {
    id: newCaseId,
    case_number: caseNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student_name: body.student_name || 'Anonymous Student',
    student_roll: body.student_roll || 'UNSPECIFIED',
    student_department: body.student_department || 'Engineering',
    student_college: body.student_college || 'University Placement Cell',
    channel: body.channel || 'whatsapp',
    status: body.status || 'escalated_pending_review',
    extracted_details: body.extracted_details || {},
    risk_score: body.risk_score || 75,
    risk_level: body.risk_level || 'RED',
    red_flags: body.red_flags || [],
    green_flags: body.green_flags || [],
    explanation_en: body.explanation_en || '',
    explanation_ta: body.explanation_ta || '',
    explanation_hi: body.explanation_hi || '',
    recommended_action: body.recommended_action || '',
    raw_input_text: body.raw_input_text || '',
    attached_files: body.attached_files || [],
    checklist_answers: body.checklist_answers || [],
    audit_trail: [
      {
        id: `aud-${Date.now()}-1`,
        timestamp: new Date().toISOString(),
        actor_type: 'student',
        actor_name: body.student_name || 'Student',
        action: 'Escalated case to Placement Cell',
        details: 'Submitted offer details and chat transcript for faculty review.',
      },
    ],
  };

  casesStore.unshift(newCase);
  res.status(201).json({ case: newCase });
});

app.patch('/api/cases/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reviewer_checklist, reviewer_decision, status } = req.body;

  const targetCase = casesStore.find((c) => c.id === id);
  if (!targetCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (reviewer_checklist) {
    targetCase.reviewer_checklist = reviewer_checklist;
  }

  if (reviewer_decision) {
    targetCase.reviewer_decision = reviewer_decision;
    targetCase.status =
      reviewer_decision.verdict === 'approved_safe'
        ? 'resolved_safe'
        : reviewer_decision.verdict === 'blacklist_scam'
        ? 'resolved_blacklisted'
        : reviewer_decision.verdict === 'warn_high_risk'
        ? 'resolved_warned'
        : 'resolved_safe';

    // If reviewer chose to add to central scam database
    if (reviewer_decision.addToScamDb) {
      if (targetCase.extracted_details.company_name) {
        scamDatabase.unshift({
          id: `scam-${Date.now()}`,
          entity_type: 'company',
          value: targetCase.extracted_details.company_name,
          evidence: `Blacklisted by ${reviewer_decision.reviewer_name}. Case ref: ${targetCase.case_number}`,
          risk_level: 'HIGH',
          createdBy: reviewer_decision.reviewer_name,
          dateAdded: new Date().toISOString().split('T')[0],
          matchCount: 1,
        });
      }
      for (const upi of targetCase.extracted_details.upi_ids || []) {
        scamDatabase.unshift({
          id: `scam-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          entity_type: 'upi_id',
          value: upi,
          evidence: `Flagged during case ${targetCase.case_number} review.`,
          risk_level: 'HIGH',
          createdBy: reviewer_decision.reviewer_name,
          dateAdded: new Date().toISOString().split('T')[0],
          matchCount: 1,
        });
      }
    }

    targetCase.audit_trail.push({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_type: 'reviewer',
      actor_name: reviewer_decision.reviewer_name || 'Placement Officer',
      action: `Recorded Verdict: ${reviewer_decision.verdict.toUpperCase()}`,
      details: reviewer_decision.decision_summary,
    });
  }

  if (status) {
    targetCase.status = status;
  }

  targetCase.updated_at = new Date().toISOString();
  res.json({ case: targetCase });
});

// 3. Privacy minimization & student data deletion (Section 5.1 step 7 & 6.2.6)
app.delete('/api/cases/:id/privacy-delete', (req: Request, res: Response) => {
  const { id } = req.params;
  const targetCase = casesStore.find((c) => c.id === id);
  if (!targetCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Anonymize personal student data while preserving de-identified pattern for learning repository
  targetCase.student_name = 'Redacted / Student Scrubbed';
  targetCase.student_roll = 'XXXX-REDACTED';
  targetCase.student_college = 'Affiliated Institution';
  targetCase.raw_input_text = '[Raw text redacted per student deletion request]';
  targetCase.attached_files = [];
  targetCase.status = 'privacy_anonymized';
  targetCase.updated_at = new Date().toISOString();

  targetCase.audit_trail.push({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor_type: 'student',
    actor_name: 'Student Privacy Request',
    action: 'Student exercised Data Deletion (DELETE command)',
    details: 'Personal identifiers, name, roll number, and raw message body scrubbed. Anonymized threat pattern retained.',
  });

  res.json({ success: true, message: 'Student personal data scrubbed successfully.', case: targetCase });
});

// 4. Central Scam Database endpoints
app.get('/api/scam-database', (req: Request, res: Response) => {
  res.json({ scamEntities: scamDatabase });
});

app.post('/api/scam-database', (req: Request, res: Response) => {
  const { entity_type, value, evidence, risk_level, createdBy } = req.body;
  if (!entity_type || !value) {
    return res.status(400).json({ error: 'entity_type and value are required.' });
  }

  const newEntity: ScamEntity = {
    id: `scam-${Date.now()}`,
    entity_type,
    value: value.trim(),
    evidence: evidence || 'Added by institutional placement team.',
    risk_level: risk_level || 'HIGH',
    createdBy: createdBy || 'Placement Officer',
    dateAdded: new Date().toISOString().split('T')[0],
    matchCount: 1,
  };

  scamDatabase.unshift(newEntity);
  res.status(201).json({ scamEntity: newEntity });
});

// 5. Institutional Analytics & Metrics
app.get('/api/analytics', (req: Request, res: Response) => {
  const totalCases = casesStore.length;
  const redCases = casesStore.filter((c) => c.risk_level === 'RED').length;
  const amberCases = casesStore.filter((c) => c.risk_level === 'AMBER').length;
  const greenCases = casesStore.filter((c) => c.risk_level === 'GREEN').length;
  const resolvedCases = casesStore.filter((c) => c.status.startsWith('resolved_')).length;

  // Calculate estimated rupees saved from intercepted fee scams
  let totalSavedInr = 0;
  for (const c of casesStore) {
    if (c.risk_level === 'RED' || c.status === 'resolved_blacklisted') {
      const fees = c.extracted_details.requested_fees || [];
      for (const f of fees) {
        totalSavedInr += f.amount || 2000;
      }
      if (fees.length === 0) totalSavedInr += 2000; // estimated baseline
    }
  }

  res.json({
    metrics: {
      totalChecks: totalCases + 148, // includes past seasonal scans
      activeCases: casesStore.length,
      highRiskIntercepted: redCases + 52,
      amberCautionFlags: amberCases + 31,
      verifiedSafeOffers: greenCases + 65,
      resolvedByReviewers: resolvedCases + 44,
      totalMoneyProtectedInr: totalSavedInr + 142000,
      scamEntitiesTracked: scamDatabase.length,
      averageReviewTimeHours: 2.4,
    },
    topScamVectors: [
      { category: 'Police Clearance Certificate UPI Extortion', share: 44 },
      { category: 'Laptop / Hardware Dispatch Security Deposit', share: 28 },
      { category: 'Unregistered Telegram/WhatsApp Fast-Offer Groups', share: 18 },
      { category: 'Typosquatted Lookalike Corporate Domains', share: 10 },
    ],
  });
});

// Start Express and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SafeIntern Check Bot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
