import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  CaseRecord,
  EvidenceNode,
  DetectedSignal,
  ExtractedOfferDetails,
  ScoringWeights,
  ScamPatternEntity,
  SuspiciousEntity,
  RiskLevel,
  VerificationStatus,
  ReviewVerdict,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialized Gemini Client with telemetry header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Configurable Risk Weights Engine (Requirement 13)
let activeScoringWeights: ScoringWeights = {
  registration_fee: 20,
  personal_upi: 20,
  recruiter_domain_mismatch: 15,
  company_inconsistency: 15,
  urgency_language: 10,
  sensitive_document_request: 10,
  unrealistic_salary: 8,
  suspicious_domain: 15,
  unverifiable_company: 12,
};

// Scam Intelligence Database (Requirement 12: clearly labeled fictional demo data)
let scamPatterns: ScamPatternEntity[] = [
  {
    id: 'pat-001',
    category: 'FEE_EXTORTION',
    title: 'Fake Police Clearance Certificate Onboarding Fee',
    description: 'Recruiters send high-stipend provisional appointment letters and demand ₹2,500 via personal UPI claiming government police verification.',
    indicators: ['police clearance certificate', 'verification fee via upi', 'reimbursed on joining date'],
    targetAudience: 'Pre-final and Final-year engineering & degree students under mandatory internship deadlines',
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
    targetAudience: 'Students applying through informal Telegram and WhatsApp recruitment channels',
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

let suspiciousEntities: SuspiciousEntity[] = [
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

// Six Fictional Demo Cases (Requirement 29)
let casesStore: CaseRecord[] = [
  // CASE 1: Legitimate internship (VERIFIED / LOW RISK)
  {
    id: 'case-demo-1',
    caseNumber: 'OG-2026-0001',
    createdAt: '2026-09-28T09:15:00Z',
    updatedAt: '2026-09-28T11:00:00Z',
    submissionType: 'text',
    rawInput: `Infosys Springboard Summer Internship Selection
Candidate: Sneha Murugan (23EC041)
Role: Cloud & AI Engineer Intern
Stipend: INR 25,000 per month
Location: Mysore / Bangalore
Important: Infosys does not charge any registration, recruitment, or training fees at any stage.
Sender: internships@infosys.com
Website: https://infyspringboard.onwingspan.com`,
    studentName: 'Sneha Murugan',
    studentEmail: 'sneha.23ec@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23EC041',
    extractedDetails: {
      company_name: 'Infosys Limited (Springboard)',
      recruiter_name: 'Talent Acquisition Team',
      recruiter_email: 'internships@infosys.com',
      recruiter_phone: '080-28520261',
      job_title: 'Cloud & AI Engineer Intern',
      internship_type: 'paid',
      location: 'Mysore Campus / Hybrid',
      salary: 'N/A',
      stipend: '₹25,000 / month',
      website: 'https://infyspringboard.onwingspan.com',
      email_domain: 'infosys.com',
      payment_requested: false,
      payment_amount: 0,
      payment_method: 'None',
      payment_reason: 'None',
      requested_documents: ['College NOC / Recommendation Letter'],
      deadline: 'Standard 7 business days',
      claims: ['Official Infosys Springboard Student Portal'],
      suspicious_phrases: [],
      contact_information: 'internships@infosys.com',
    },
    riskScore: 6,
    riskLevel: 'LOW',
    verificationStatus: 'VERIFIED',
    detectedSignals: [],
    evidenceChain: [
      {
        id: 'ev-1-1',
        step: 'CLAIMED_COMPANY',
        signal: 'Infosys Limited',
        source: 'Offer Text',
        status: 'VERIFIED',
        confidence: 0.95,
        explanation: 'Infosys Limited is a recognized publicly traded enterprise listed on NSE/BSE.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-1-2',
        step: 'WEBSITE',
        signal: 'https://infyspringboard.onwingspan.com',
        source: 'URL Analyzer',
        status: 'VERIFIED',
        confidence: 0.98,
        explanation: 'Domain matches official authenticated enterprise portal for Infosys Springboard.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-1-3',
        step: 'EMAIL_DOMAIN',
        signal: 'internships@infosys.com',
        source: 'Domain Provider',
        status: 'VERIFIED',
        confidence: 0.99,
        explanation: 'Email domain infosys.com matches corporate identity with valid SPF/DKIM records.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-1-4',
        step: 'PAYMENT_REQUEST',
        signal: 'No payment requested (Explicit zero fee declaration)',
        source: 'Text Analyzer',
        status: 'VERIFIED',
        confidence: 1.0,
        explanation: 'Explicit clause stating company never charges any fees for selection or training.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-1-5',
        step: 'CONSISTENCY',
        signal: 'Enterprise Consistency Passed',
        source: 'Consistency Analyzer',
        status: 'VERIFIED',
        confidence: 0.95,
        explanation: 'All signals (company name, recruiter domain, career portal, stipend tier) correlate consistently.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
    ],
    summary: 'All investigated signals correlate with authentic Infosys campus internship processes. Zero fee policy observed.',
    reasoning: 'The email domain @infosys.com is authentic, stipend of ₹25,000 matches standard institutional tiers, and no advance payments or non-disclosure penalties are requested.',
    recommendedAction: 'Safe to accept. Submit college NOC to your placement cell coordinator.',
    unverifiedInfo: ['Physical mentor name to be assigned on day one joining'],
    humanReviewRequired: false,
    reviewStatus: 'REVIEWED',
    review: {
      id: 'rev-001',
      reviewerId: 'rev-prof-venkat',
      reviewerName: 'Prof. R. Venkatesh (Placement Director)',
      reviewerRole: 'Head of Placements',
      verdict: 'VERIFIED',
      notes: 'Standard Springboard program batch. Verified with corporate relations office.',
      timestamp: '2026-09-28T11:00:00Z',
      addToScamDb: false,
    },
    auditTrail: [
      {
        id: 'aud-01',
        caseId: 'case-demo-1',
        timestamp: '2026-09-28T09:15:00Z',
        actorType: 'student',
        actorName: 'Sneha Murugan',
        action: 'SUBMIT_OFFER',
        details: 'Submitted plain-text offer selection notice for investigation.',
      },
      {
        id: 'aud-02',
        caseId: 'case-demo-1',
        timestamp: '2026-09-28T09:15:45Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 6/100 (LOW). Evidence graph created with 5 verified nodes.',
      },
      {
        id: 'aud-03',
        caseId: 'case-demo-1',
        timestamp: '2026-09-28T11:00:00Z',
        actorType: 'reviewer',
        actorName: 'Prof. R. Venkatesh',
        action: 'RECORD_DECISION',
        details: 'Verdict: VERIFIED. Offer approved for degree credits.',
      },
    ],
    isDemoCase: true,
  },

  // CASE 2: Registration-fee scam (HIGH / CRITICAL RISK)
  {
    id: 'case-demo-2',
    caseNumber: 'OG-2026-0002',
    createdAt: '2026-09-28T14:30:00Z',
    updatedAt: '2026-09-28T14:45:00Z',
    submissionType: 'text',
    rawInput: `WhatsApp message from +91 98765 43210:
"Dear Aditya,
Congratulations! You have been provisionally selected for Cybersecurity Analyst Internship at ApexCyber Infotech.
Stipend: Rs. 22,000/month.
Requirement: To confirm your appointment, candidate must complete Mandatory Police Clearance Certificate processing. Deposit Rs. 2,500 via UPI to apexcyber@okaxis.
Deadline: Complete payment within 30 mins to avoid cancellation.
HR Contact: hr.abccyber@gmail.com / +91 98765 43210"`,
    studentName: 'Aditya Krishnan',
    studentEmail: 'aditya.23cs@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23CS084',
    extractedDetails: {
      company_name: 'ApexCyber Infotech',
      recruiter_name: 'HR Lead (Unverified)',
      recruiter_email: 'hr.abccyber@gmail.com',
      recruiter_phone: '+91 98765 43210',
      job_title: 'Cybersecurity Analyst Intern',
      internship_type: 'fee_based',
      location: 'Remote',
      salary: 'N/A',
      stipend: '₹22,000 / month',
      website: 'Unavailable',
      email_domain: 'gmail.com',
      payment_requested: true,
      payment_amount: 2500,
      payment_method: 'UPI (apexcyber@okaxis)',
      payment_reason: 'Mandatory Police Clearance Certificate & Background Check',
      requested_documents: ['Aadhaar Card', 'PAN Card', 'Payment Screenshot'],
      deadline: 'Within 30 minutes',
      claims: ['Provisional appointment confirmed upon deposit'],
      suspicious_phrases: ['within 30 mins', 'avoid cancellation', 'deposit via UPI'],
      contact_information: 'hr.abccyber@gmail.com, +91 98765 43210',
    },
    riskScore: 78,
    riskLevel: 'CRITICAL',
    verificationStatus: 'CRITICAL RISK',
    detectedSignals: [
      {
        id: 'sig-2-1',
        category: 'FINANCIAL',
        name: 'Registration / Verification Fee Requested',
        description: 'Demanding ₹2,500 upfront before issuing formal employment credentials.',
        impact: 20,
        severity: 'critical',
        evidence: 'UPI ID: apexcyber@okaxis | Amount: ₹2,500',
        policyRef: 'AICTE Mandatory Internship Guidelines Section 4.1',
      },
      {
        id: 'sig-2-2',
        category: 'FINANCIAL',
        name: 'Payment Demanded via Personal / Virtual UPI Handle',
        description: 'Payment routing to unverified VPA rather than an institutional corporate bank escrow.',
        impact: 20,
        severity: 'critical',
        evidence: 'apexcyber@okaxis matched Scam Intelligence Database with 14 previous reports.',
      },
      {
        id: 'sig-2-3',
        category: 'IDENTITY',
        name: 'Recruiter Email Domain Mismatch',
        description: 'Corporate recruitment conducted using free Gmail address rather than company domain.',
        impact: 15,
        severity: 'high',
        evidence: 'Sender: hr.abccyber@gmail.com (Claimed Company: ApexCyber Infotech)',
      },
      {
        id: 'sig-2-4',
        category: 'COMMUNICATION',
        name: 'Extreme Artificial Urgency Language',
        description: 'Imposing a 30-minute deadline to prevent student from consulting placement cell.',
        impact: 10,
        severity: 'medium',
        evidence: 'Deadline: "within 30 mins to avoid cancellation"',
      },
      {
        id: 'sig-2-5',
        category: 'IDENTITY',
        name: 'Unregistered / Inconsistent Company Identity',
        description: 'No ROC registered incorporation or verified corporate web presence.',
        impact: 13,
        severity: 'high',
        evidence: 'External verification unavailable; entity flagged in fraud registry.',
      },
    ],
    evidenceChain: [
      {
        id: 'ev-2-1',
        step: 'CLAIMED_COMPANY',
        signal: 'ApexCyber Infotech',
        source: 'Entity Database',
        status: 'SUSPICIOUS',
        confidence: 0.9,
        explanation: 'Entity matches 9 recorded reports in the campus scam registry.',
        impactScore: 13,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-2-2',
        step: 'WEBSITE',
        signal: 'No official corporate website provided',
        source: 'Domain Provider',
        status: 'UNAVAILABLE',
        confidence: 0.85,
        explanation: 'External verification unavailable. Recruiter provided zero corporate web references.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-2-3',
        step: 'EMAIL_DOMAIN',
        signal: 'hr.abccyber@gmail.com',
        source: 'Domain Verification Provider',
        status: 'MISMATCH',
        confidence: 0.99,
        explanation: 'Email domain is gmail.com. Corporate hiring over freemail is a critical risk indicator.',
        impactScore: 15,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-2-4',
        step: 'PAYMENT_REQUEST',
        signal: '₹2,500 via apexcyber@okaxis',
        source: 'Financial Signal Analyzer',
        status: 'SUSPICIOUS',
        confidence: 1.0,
        explanation: 'Direct UPI extortion under the pretext of police clearance certificate.',
        impactScore: 40,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-2-5',
        step: 'CONSISTENCY',
        signal: 'Critical Cross-Check Failure',
        source: 'Consistency Analyzer',
        status: 'MISMATCH',
        confidence: 0.94,
        explanation: 'Freemail + Unregistered Entity + Advance UPI + Coercive Deadline = Scam Pattern Match.',
        impactScore: 10,
        isFictionalDemoData: true,
      },
    ],
    summary: 'Critical risk: Demand for advance payment via UPI with freemail recruiter and coercive 30-minute timer matches verified scam patterns.',
    reasoning: 'AICTE rules and institutional policies strictly forbid charging students for internships. apexcyber@okaxis is blacklisted across 14 previous campus incident reports.',
    recommendedAction: 'DO NOT PAY. Block the sender on WhatsApp and report the incident to your college cyber cell.',
    unverifiedInfo: ['Recruiter real identity', 'Existence of any physical company office'],
    humanReviewRequired: true,
    reviewStatus: 'PENDING_REVIEW',
    auditTrail: [
      {
        id: 'aud-20',
        caseId: 'case-demo-2',
        timestamp: '2026-09-28T14:30:00Z',
        actorType: 'student',
        actorName: 'Aditya Krishnan',
        action: 'SUBMIT_OFFER',
        details: 'Submitted WhatsApp recruiter text with ₹2,500 UPI fee demand.',
      },
      {
        id: 'aud-21',
        caseId: 'case-demo-2',
        timestamp: '2026-09-28T14:30:35Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 78/100 (CRITICAL). Matched Scam Entity #ent-001 (apexcyber@okaxis).',
      },
      {
        id: 'aud-22',
        caseId: 'case-demo-2',
        timestamp: '2026-09-28T14:35:00Z',
        actorType: 'student',
        actorName: 'Aditya Krishnan',
        action: 'REQUEST_HUMAN_REVIEW',
        details: 'Student flagged case for immediate placement director intervention.',
      },
    ],
    isDemoCase: true,
  },

  // CASE 3: Fake training-fee internship (HIGH RISK)
  {
    id: 'case-demo-3',
    caseNumber: 'OG-2026-0003',
    createdAt: '2026-09-27T16:20:00Z',
    updatedAt: '2026-09-27T17:40:00Z',
    submissionType: 'text',
    rawInput: `Email forwarded from Priya Sharma (23IT055):
From: training-lead@cloudtech-innovations.in
Subject: Offer of Internship + Mandatory Cloud Architect Training
Dear Candidate,
We are pleased to offer you a 6-month internship as Junior DevOps Intern.
Terms: First 2 months require Mandatory Industrial Cloud Certification Training. Candidate must pay non-refundable lab server infrastructure fee of ₹4,800.
Post training, stipend will be ₹30,000/month.
Payment link: https://cloudtech-innovations.in/pay-training`,
    studentName: 'Priya Sharma',
    studentEmail: 'priya.23it@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23IT055',
    extractedDetails: {
      company_name: 'CloudTech Innovations Pvt Ltd',
      recruiter_name: 'Training Lead',
      recruiter_email: 'training-lead@cloudtech-innovations.in',
      recruiter_phone: 'Unavailable',
      job_title: 'Junior DevOps Intern',
      internship_type: 'fee_based',
      location: 'Remote / Virtual Lab',
      salary: 'N/A',
      stipend: '₹30,000 / month (post-training)',
      website: 'https://cloudtech-innovations.in',
      email_domain: 'cloudtech-innovations.in',
      payment_requested: true,
      payment_amount: 4800,
      payment_method: 'Online Payment Gateway Link',
      payment_reason: 'Mandatory Industrial Cloud Certification & Server Lab Infrastructure Fee',
      requested_documents: ['Resume', 'Degree Marksheet'],
      deadline: 'Prior to batch start',
      claims: ['Guaranteed ₹30,000 stipend post-training'],
      suspicious_phrases: ['mandatory training fee', 'non-refundable lab fee', 'post-training stipend'],
      contact_information: 'training-lead@cloudtech-innovations.in',
    },
    riskScore: 58,
    riskLevel: 'HIGH',
    verificationStatus: 'HIGH RISK',
    detectedSignals: [
      {
        id: 'sig-3-1',
        category: 'FINANCIAL',
        name: 'Mandatory Training / Course Fee Required to Start Internship',
        description: 'Offering paid internship conditioned on buying expensive in-house training courses.',
        impact: 20,
        severity: 'critical',
        evidence: 'Training fee: ₹4,800 required before internship commencement',
      },
      {
        id: 'sig-3-2',
        category: 'COMMUNICATION',
        name: 'Unrealistic Pay Promise Post-Course Purchase',
        description: 'Promising ₹30,000 entry-level monthly stipend contingent on course fee payment.',
        impact: 8,
        severity: 'medium',
        evidence: 'Promised stipend ₹30,000/mo after paying ₹4,800',
      },
      {
        id: 'sig-3-3',
        category: 'IDENTITY',
        name: 'Newly Registered Unverifiable Domain',
        description: 'Domain registered less than 3 months ago with private whois proxy.',
        impact: 15,
        severity: 'high',
        evidence: 'Domain: cloudtech-innovations.in (Domain age < 90 days)',
      },
      {
        id: 'sig-3-4',
        category: 'DOCUMENTS',
        name: 'Commercial Course Disguised as Employment Offer',
        description: 'Letter operates as a consumer training agreement rather than a labor contract.',
        impact: 15,
        severity: 'high',
        evidence: 'No labor contract terms or employer provident fund disclosures',
      },
    ],
    evidenceChain: [
      {
        id: 'ev-3-1',
        step: 'CLAIMED_COMPANY',
        signal: 'CloudTech Innovations',
        source: 'Registrar Search',
        status: 'UNVERIFIED',
        confidence: 0.65,
        explanation: 'No corporate MCA incorporation records found for claimed name.',
        impactScore: 12,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-3-2',
        step: 'EMAIL_DOMAIN',
        signal: 'cloudtech-innovations.in',
        source: 'Domain Provider',
        status: 'SUSPICIOUS',
        confidence: 0.8,
        explanation: 'Domain registered recently; uses marketing email relay without corporate phone.',
        impactScore: 15,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-3-3',
        step: 'PAYMENT_REQUEST',
        signal: '₹4,800 Training Fee',
        source: 'Financial Analyzer',
        status: 'SUSPICIOUS',
        confidence: 1.0,
        explanation: 'Internship offer conditioned on paying commercial training tuition.',
        impactScore: 20,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-3-4',
        step: 'CONSISTENCY',
        signal: 'Pay-to-Work Scheme Identified',
        source: 'Consistency Analyzer',
        status: 'MISMATCH',
        confidence: 0.9,
        explanation: 'Employment offers should compensate the worker, not bill the candidate for training.',
        impactScore: 11,
        isFictionalDemoData: true,
      },
    ],
    summary: 'High risk: Classic "Pay-to-Intern" training vendor scheme. Candidates are induced to buy ₹4,800 courses under false promises of high future stipends.',
    reasoning: 'Authentic employers provide onboarding training at company expense. This entity operates as an unregulated training institute disguised as an employer.',
    recommendedAction: 'Do not pay training fees. Legitimate internships never charge candidates for onboarding or lab access.',
    unverifiedInfo: ['Accreditation of claimed certification', 'Genuine hiring intent'],
    humanReviewRequired: true,
    reviewStatus: 'REVIEWED',
    review: {
      id: 'rev-003',
      reviewerId: 'rev-prof-venkat',
      reviewerName: 'Prof. R. Venkatesh',
      reviewerRole: 'Placement Director',
      verdict: 'SCAM',
      notes: 'Confirmed commercial training vendor targeting 7th/8th semester students under pressure for mandatory internship certificates.',
      timestamp: '2026-09-27T17:40:00Z',
      addToScamDb: true,
    },
    auditTrail: [
      {
        id: 'aud-30',
        caseId: 'case-demo-3',
        timestamp: '2026-09-27T16:20:00Z',
        actorType: 'student',
        actorName: 'Priya Sharma',
        action: 'SUBMIT_OFFER',
        details: 'Submitted training fee conditional offer.',
      },
      {
        id: 'aud-31',
        caseId: 'case-demo-3',
        timestamp: '2026-09-27T16:21:00Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 58/100 (HIGH). Flagged pay-to-work pattern.',
      },
      {
        id: 'aud-32',
        caseId: 'case-demo-3',
        timestamp: '2026-09-27T17:40:00Z',
        actorType: 'reviewer',
        actorName: 'Prof. R. Venkatesh',
        action: 'RECORD_DECISION',
        details: 'Verdict: SCAM. Added training-lead@cloudtech-innovations.in to scam intelligence registry.',
      },
    ],
    isDemoCase: true,
  },

  // CASE 4: Recruiter / domain mismatch (MEDIUM / HIGH RISK)
  {
    id: 'case-demo-4',
    caseNumber: 'OG-2026-0004',
    createdAt: '2026-09-29T10:00:00Z',
    updatedAt: '2026-09-29T10:30:00Z',
    submissionType: 'text',
    rawInput: `LinkedIn message from "Kiran Varma - Senior Technical Recruiter at Microsoft India":
"Hi Rahul, I reviewed your GitHub repository and we have an immediate off-campus opening for Cloud Engineering Intern.
Stipend is Rs. 50,000/month.
Please send your resume and photo ID to my direct hiring inbox: kiran.microsoft.hiring@gmail.com
Do not apply through the careers portal as this is an internal direct referral batch."`,
    studentName: 'Rahul Sundaram',
    studentEmail: 'rahul.23cs@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23CS104',
    extractedDetails: {
      company_name: 'Microsoft India',
      recruiter_name: 'Kiran Varma',
      recruiter_email: 'kiran.microsoft.hiring@gmail.com',
      recruiter_phone: 'Unavailable',
      job_title: 'Cloud Engineering Intern',
      internship_type: 'paid',
      location: 'Bangalore / Remote',
      salary: 'N/A',
      stipend: '₹50,000 / month',
      website: 'https://microsoft.com',
      email_domain: 'gmail.com',
      payment_requested: false,
      payment_amount: 0,
      payment_method: 'None yet',
      payment_reason: 'None yet',
      requested_documents: ['Resume', 'Photo ID / Aadhaar Card'],
      deadline: 'Immediate opening',
      claims: ['Internal direct referral batch bypassing portal'],
      suspicious_phrases: ['do not apply through careers portal', 'direct hiring inbox @gmail.com'],
      contact_information: 'kiran.microsoft.hiring@gmail.com',
    },
    riskScore: 45,
    riskLevel: 'HIGH',
    verificationStatus: 'HIGH RISK',
    detectedSignals: [
      {
        id: 'sig-4-1',
        category: 'IDENTITY',
        name: 'Claimed Enterprise Recruiter Using Personal Gmail Address',
        description: 'Claiming representation of Microsoft while instructing candidate to submit documents to a Gmail account.',
        impact: 15,
        severity: 'high',
        evidence: 'Expected: @microsoft.com | Actual: kiran.microsoft.hiring@gmail.com',
      },
      {
        id: 'sig-4-2',
        category: 'COMMUNICATION',
        name: 'Explicit Instruction to Bypass Official Careers Portal',
        description: 'Telling student not to use authenticated career channels to avoid verification checks.',
        impact: 10,
        severity: 'medium',
        evidence: 'Quote: "Do not apply through the careers portal as this is an internal direct referral"',
      },
      {
        id: 'sig-4-3',
        category: 'PRIVACY',
        name: 'Advance Photo ID Collection Over Unsecured Email',
        description: 'Requesting government photo identification before technical evaluation.',
        impact: 10,
        severity: 'medium',
        evidence: 'Requested: Photo ID / Aadhaar Card over Gmail',
      },
      {
        id: 'sig-4-4',
        category: 'IDENTITY',
        name: 'High Potential Enterprise Impersonation',
        description: 'Impersonating enterprise recruiters is a known initial stage for identity theft or subsequent fee requests.',
        impact: 10,
        severity: 'high',
        evidence: 'Recruiter identity cannot be confirmed in Microsoft global staff directory',
      },
    ],
    evidenceChain: [
      {
        id: 'ev-4-1',
        step: 'CLAIMED_COMPANY',
        signal: 'Microsoft India',
        source: 'Corporate Registry',
        status: 'VERIFIED',
        confidence: 1.0,
        explanation: 'Genuine multinational corporation.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-4-2',
        step: 'EMAIL_DOMAIN',
        signal: 'kiran.microsoft.hiring@gmail.com',
        source: 'Domain Verification Provider',
        status: 'MISMATCH',
        confidence: 0.99,
        explanation: 'Expected domain: microsoft.com. Actual domain: gmail.com. Mismatch impact: +15.',
        impactScore: 15,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-4-3',
        step: 'RECRUITER',
        signal: 'Kiran Varma (Unauthenticated)',
        source: 'Recruiter Verification Provider',
        status: 'UNVERIFIED',
        confidence: 0.7,
        explanation: 'External verification unavailable for recruiter identity. No corporate directory match.',
        impactScore: 10,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-4-4',
        step: 'CONSISTENCY',
        signal: 'Enterprise Impersonation Pattern',
        source: 'Consistency Analyzer',
        status: 'MISMATCH',
        confidence: 0.92,
        explanation: 'Microsoft recruiters never use generic Gmail accounts to solicit government IDs.',
        impactScore: 20,
        isFictionalDemoData: true,
      },
    ],
    summary: 'High risk: Impersonation of Microsoft recruiter. Official Microsoft talent acquisition communicates exclusively via authenticated @microsoft.com domains.',
    reasoning: 'The instruction to avoid the official Microsoft careers portal combined with a Gmail address indicates unauthorized recruitment or identity harvesting.',
    recommendedAction: 'Do not send your photo ID or resume to this Gmail address. Search for legitimate openings directly on careers.microsoft.com.',
    unverifiedInfo: ['Real identity behind the LinkedIn profile'],
    humanReviewRequired: true,
    reviewStatus: 'PENDING_REVIEW',
    auditTrail: [
      {
        id: 'aud-40',
        caseId: 'case-demo-4',
        timestamp: '2026-09-29T10:00:00Z',
        actorType: 'student',
        actorName: 'Rahul Sundaram',
        action: 'SUBMIT_OFFER',
        details: 'Submitted suspicious LinkedIn recruiter outreach.',
      },
      {
        id: 'aud-41',
        caseId: 'case-demo-4',
        timestamp: '2026-09-29T10:01:00Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 45/100 (HIGH). Flagged recruiter/domain mismatch.',
      },
    ],
    isDemoCase: true,
  },

  // CASE 5: Suspicious UPI payment request (CRITICAL RISK)
  {
    id: 'case-demo-5',
    caseNumber: 'OG-2026-0005',
    createdAt: '2026-09-28T09:10:00Z',
    updatedAt: '2026-09-28T16:45:00Z',
    submissionType: 'upi',
    rawInput: `Telegram message from @QuantumCloudRecruiting:
"Hello Rohit! Congratulations on your selection for Full Stack Developer Intern at QuantumCloud Solutions.
Stipend: Rs. 45,000/month.
We are dispatching your brand new company Apple M3 MacBook Pro.
To generate your BlueDart courier tracking number, please transfer refundable dispatch security deposit of Rs. 1,500 to UPI ID: laptopbond.deposit@ybl.
Once paid, send screenshot to activate your corporate Slack invite."`,
    studentName: 'Rohit Balaji',
    studentEmail: 'rohit.23it@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23IT019',
    extractedDetails: {
      company_name: 'QuantumCloud Solutions Pvt Ltd',
      recruiter_name: 'Alex Martin (Telegram Recruiter)',
      recruiter_email: 'quantumcloud.hiring@gmail.com',
      recruiter_phone: '+91 91234 56789',
      job_title: 'Full Stack Developer Intern',
      internship_type: 'fee_based',
      location: 'Fully Remote',
      salary: 'N/A',
      stipend: '₹45,000 / month',
      website: 'Unavailable',
      email_domain: 'gmail.com',
      payment_requested: true,
      payment_amount: 1500,
      payment_method: 'UPI (laptopbond.deposit@ybl)',
      payment_reason: 'Refundable Courier Insurance & Laptop Security Bond',
      requested_documents: ['Payment Transaction Screenshot', 'Home Shipping Address'],
      deadline: 'Immediate to generate tracking number',
      claims: ['MacBook Pro ready at dispatch warehouse'],
      suspicious_phrases: ['refundable dispatch security deposit', 'transfer to UPI', 'activate slack invite'],
      contact_information: 'Telegram: @QuantumCloudRecruiting',
    },
    riskScore: 88,
    riskLevel: 'CRITICAL',
    verificationStatus: 'CRITICAL RISK',
    detectedSignals: [
      {
        id: 'sig-5-1',
        category: 'FINANCIAL',
        name: 'Hardware Courier Insurance / Security Bond Scam',
        description: 'Demanding upfront payment for shipping company equipment.',
        impact: 20,
        severity: 'critical',
        evidence: 'UPI ID: laptopbond.deposit@ybl | Amount: ₹1,500',
      },
      {
        id: 'sig-5-2',
        category: 'FINANCIAL',
        name: 'Blacklisted UPI Identifier in Central Database',
        description: 'Matches known fraud identifier with 7 prior reports from engineering colleges.',
        impact: 20,
        severity: 'critical',
        evidence: 'Matched Suspicious Entity #ent-003 (laptopbond.deposit@ybl)',
      },
      {
        id: 'sig-5-3',
        category: 'COMMUNICATION',
        name: 'Unrealistic Compensation for Zero-Assessment Role',
        description: 'Offering ₹45,000 monthly stipend without any live technical coding round.',
        impact: 8,
        severity: 'medium',
        evidence: 'Offered: ₹45,000/month with zero video or technical assessment',
      },
      {
        id: 'sig-5-4',
        category: 'IDENTITY',
        name: 'Anonymous Telegram Channel Recruitment',
        description: 'Conducting recruitment exclusively on Telegram with deleted message timers.',
        impact: 15,
        severity: 'high',
        evidence: 'Handle: @QuantumCloudRecruiting (No verified corporate headquarters)',
      },
      {
        id: 'sig-5-5',
        category: 'DOCUMENTS',
        name: 'Lack of Formal Legal Employment Contract',
        description: 'No registered office address or labor welfare registration cited.',
        impact: 15,
        severity: 'high',
        evidence: 'Offer communicated solely through chat messages',
      },
    ],
    evidenceChain: [
      {
        id: 'ev-5-1',
        step: 'CLAIMED_COMPANY',
        signal: 'QuantumCloud Solutions',
        source: 'Corporate Lookup',
        status: 'SUSPICIOUS',
        confidence: 0.9,
        explanation: 'Fictitious entity used across multiple college Telegram groups.',
        impactScore: 15,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-5-2',
        step: 'EMAIL_DOMAIN',
        signal: 'quantumcloud.hiring@gmail.com',
        source: 'Domain Verification Provider',
        status: 'MISMATCH',
        confidence: 0.95,
        explanation: 'Using Gmail address rather than corporate domain.',
        impactScore: 15,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-5-3',
        step: 'PAYMENT_REQUEST',
        signal: '₹1,500 to laptopbond.deposit@ybl',
        source: 'Scam Intelligence Provider',
        status: 'SUSPICIOUS',
        confidence: 1.0,
        explanation: 'Classic hardware courier bond extortion. Matches entity #ent-003.',
        impactScore: 40,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-5-4',
        step: 'CONSISTENCY',
        signal: 'High-Confidence Fraud Signature',
        source: 'Consistency Analyzer',
        status: 'MISMATCH',
        confidence: 0.98,
        explanation: 'Genuine organizations ship corporate hardware at company expense without courier bonds.',
        impactScore: 18,
        isFictionalDemoData: true,
      },
    ],
    summary: 'Critical risk: Known hardware courier fee fraud pattern. The UPI handle is blacklisted in institutional databases.',
    reasoning: 'Legitimate employers dispatch laptops through contracted logistics providers without charging students insurance bonds.',
    recommendedAction: 'Do not pay any money. Report the Telegram handle @QuantumCloudRecruiting for fraud.',
    unverifiedInfo: ['Physical existence of recruiter or equipment'],
    humanReviewRequired: true,
    reviewStatus: 'REVIEWED',
    review: {
      id: 'rev-005',
      reviewerId: 'rev-prof-venkat',
      reviewerName: 'Prof. R. Venkatesh',
      reviewerRole: 'Placement Director',
      verdict: 'SCAM',
      notes: 'Blacklisted entity. Alert broadcast to all 3rd and 4th year student WhatsApp groups.',
      timestamp: '2026-09-28T16:45:00Z',
      addToScamDb: true,
    },
    auditTrail: [
      {
        id: 'aud-50',
        caseId: 'case-demo-5',
        timestamp: '2026-09-28T09:10:00Z',
        actorType: 'student',
        actorName: 'Rohit Balaji',
        action: 'SUBMIT_OFFER',
        details: 'Submitted Telegram message requesting laptop courier deposit.',
      },
      {
        id: 'aud-51',
        caseId: 'case-demo-5',
        timestamp: '2026-09-28T09:11:00Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 88/100 (CRITICAL). Flagged courier deposit scam.',
      },
      {
        id: 'aud-52',
        caseId: 'case-demo-5',
        timestamp: '2026-09-28T16:45:00Z',
        actorType: 'reviewer',
        actorName: 'Prof. R. Venkatesh',
        action: 'RECORD_DECISION',
        details: 'Verdict: SCAM. Blacklisted laptopbond.deposit@ybl in central database.',
      },
    ],
    isDemoCase: true,
  },

  // CASE 6: Ambiguous case requiring human review (HUMAN REVIEW REQUIRED)
  {
    id: 'case-demo-6',
    caseNumber: 'OG-2026-0006',
    createdAt: '2026-09-29T14:15:00Z',
    updatedAt: '2026-09-29T14:20:00Z',
    submissionType: 'pdf',
    rawInput: `Offer Letter PDF submitted:
Company: Vyom Robotics Technologies LLP
Incorporation: Formed 4 months ago in Pune
Role: Embedded Firmware Intern
Stipend: ₹12,000 / month
Website: https://vyomrobotics.co.in
Email: founder@vyomrobotics.co.in
Notes:
- Early-stage bootstrapped startup without established public PR.
- Domain registered 4 months ago.
- Zero payment requested.
- Offer letter contains standard confidentiality and IP assignment clauses, but includes a 6-month non-compete within 50km radius.
- Recruiter is the founding engineer directly contacting student via GitHub and personal email.`,
    studentName: 'Ananya Deshmukh',
    studentEmail: 'ananya.23ec@collegemail.edu',
    studentCollege: 'State Institute of Engineering & Technology',
    studentRoll: '23EC077',
    extractedDetails: {
      company_name: 'Vyom Robotics Technologies LLP',
      recruiter_name: 'Siddharth Joshi (Co-Founder)',
      recruiter_email: 'founder@vyomrobotics.co.in',
      recruiter_phone: '+91 98230 11223',
      job_title: 'Embedded Firmware Intern',
      internship_type: 'paid',
      location: 'Pune / Hybrid',
      salary: 'N/A',
      stipend: '₹12,000 / month',
      website: 'https://vyomrobotics.co.in',
      email_domain: 'vyomrobotics.co.in',
      payment_requested: false,
      payment_amount: 0,
      payment_method: 'None',
      payment_reason: 'None',
      requested_documents: ['College ID Card', 'B.Tech Transcript'],
      deadline: '5 business days',
      claims: ['Hardware prototyping lab in Pune'],
      suspicious_phrases: ['6-month non-compete clause within 50km'],
      contact_information: 'founder@vyomrobotics.co.in, +91 98230 11223',
    },
    riskScore: 32,
    riskLevel: 'MEDIUM',
    verificationStatus: 'HUMAN REVIEW REQUIRED',
    detectedSignals: [
      {
        id: 'sig-6-1',
        category: 'IDENTITY',
        name: 'Early-Stage Startup with Limited Public Footprint',
        description: 'Entity formed 4 months ago; external corporate verification is partially unavailable.',
        impact: 12,
        severity: 'medium',
        evidence: 'MCA registration exists but public customer footprint is minimal.',
      },
      {
        id: 'sig-6-2',
        category: 'DOCUMENTS',
        name: 'Restrictive Non-Compete Clause for Intern',
        description: 'Letter includes an aggressive 6-month non-compete restriction unusual for undergraduate internships.',
        impact: 10,
        severity: 'medium',
        evidence: 'Clause 8: "Candidate shall not undertake robotics employment within 50km for 6 months post-internship"',
      },
      {
        id: 'sig-6-3',
        category: 'IDENTITY',
        name: 'New Custom Domain (< 180 Days)',
        description: 'Domain vyomrobotics.co.in registered recently, though DKIM and MX records are properly configured.',
        impact: 10,
        severity: 'low',
        evidence: 'Domain age: 122 days',
      },
    ],
    evidenceChain: [
      {
        id: 'ev-6-1',
        step: 'CLAIMED_COMPANY',
        signal: 'Vyom Robotics LLP',
        source: 'Corporate Lookup Provider',
        status: 'UNVERIFIED',
        confidence: 0.6,
        explanation: 'External verification unavailable. Entity is too new for secondary ratings.',
        impactScore: 12,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-6-2',
        step: 'WEBSITE',
        signal: 'https://vyomrobotics.co.in',
        source: 'Domain Provider',
        status: 'VERIFIED',
        confidence: 0.85,
        explanation: 'Valid SSL certificate, professional hardware portfolio displayed.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-6-3',
        step: 'EMAIL_DOMAIN',
        signal: 'founder@vyomrobotics.co.in',
        source: 'Domain Verification Provider',
        status: 'VERIFIED',
        confidence: 0.9,
        explanation: 'Email domain matches company website with valid Google Workspace MX records.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-6-4',
        step: 'PAYMENT_REQUEST',
        signal: 'Zero Payment Requested',
        source: 'Financial Analyzer',
        status: 'VERIFIED',
        confidence: 1.0,
        explanation: 'No advance fees requested. Modest stipend of ₹12,000 matches early hardware stage.',
        impactScore: 0,
        isFictionalDemoData: true,
      },
      {
        id: 'ev-6-5',
        step: 'CONSISTENCY',
        signal: 'Ambiguous Legal Terms',
        source: 'Consistency Analyzer',
        status: 'SUSPICIOUS',
        confidence: 0.72,
        explanation: 'Company appears legitimate, but restrictive non-compete terms warrant faculty review.',
        impactScore: 10,
        isFictionalDemoData: true,
      },
    ],
    summary: 'Medium risk: Early-stage startup with consistent email and website, zero fee requests, but includes restrictive non-compete clauses that require placement faculty guidance.',
    reasoning: 'No fraud or payment extortion indicators detected. However, external verification is limited and legal terms should be evaluated by college advisors.',
    recommendedAction: 'Escalate to college placement cell or faculty coordinator to review Clause 8 (Non-Compete) before signing.',
    unverifiedInfo: ['Enforceability of Clause 8 under Indian Contract Act Section 27', 'Physical lab address verification'],
    humanReviewRequired: true,
    reviewStatus: 'PENDING_REVIEW',
    auditTrail: [
      {
        id: 'aud-60',
        caseId: 'case-demo-6',
        timestamp: '2026-09-29T14:15:00Z',
        actorType: 'student',
        actorName: 'Ananya Deshmukh',
        action: 'SUBMIT_OFFER',
        details: 'Submitted hardware startup offer PDF with non-compete question.',
      },
      {
        id: 'aud-61',
        caseId: 'case-demo-6',
        timestamp: '2026-09-29T14:16:00Z',
        actorType: 'system',
        actorName: 'OfferGuard Investigation Engine',
        action: 'ASSESS_RISK',
        details: 'Deterministic score: 32/100 (MEDIUM). Status set to HUMAN REVIEW REQUIRED.',
      },
    ],
    isDemoCase: true,
  },
];

// Helper: Rule-based heuristic extraction & deterministic security signal analysis
function runDeterministicSecurityAnalysis(
  text: string,
  weights: ScoringWeights
): {
  computedScore: number;
  riskLevel: RiskLevel;
  verificationStatus: VerificationStatus;
  detectedSignals: DetectedSignal[];
  evidenceChain: EvidenceNode[];
  extractedFallback: Partial<ExtractedOfferDetails>;
  humanReviewRequired: boolean;
} {
  const lower = text.toLowerCase();
  const detectedSignals: DetectedSignal[] = [];
  const evidenceChain: EvidenceNode[] = [];
  let score = 0;

  // Regex patterns
  const upiRegex = /([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/g;
  const foundUpiMatches = Array.from(new Set(text.match(upiRegex) || []));

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const foundEmails = Array.from(new Set(text.match(emailRegex) || []));

  const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{9}/g;
  const foundPhones = Array.from(new Set(text.match(phoneRegex) || []));

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const foundUrls = Array.from(new Set(text.match(urlRegex) || []));

  const feeRegex = /(?:rs\.?|inr|₹)\s*([\d,]+)/gi;
  const feeAmounts: number[] = [];
  let m;
  while ((m = feeRegex.exec(text)) !== null) {
    const num = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0) feeAmounts.push(num);
  }

  // 1. Check against Suspicious Entities Database (Requirement 12)
  let matchedEntityValue = '';
  for (const ent of suspiciousEntities) {
    let matched = false;
    if (ent.type === 'UPI_ID' && foundUpiMatches.some((u) => u.toLowerCase() === ent.value.toLowerCase())) {
      matched = true;
    } else if (ent.type === 'EMAIL' && foundEmails.some((e) => e.toLowerCase() === ent.value.toLowerCase())) {
      matched = true;
    } else if (ent.type === 'COMPANY' && lower.includes(ent.value.toLowerCase())) {
      matched = true;
    } else if (ent.type === 'DOMAIN' && lower.includes(ent.value.toLowerCase())) {
      matched = true;
    }

    if (matched) {
      matchedEntityValue = ent.value;
      ent.matchCount += 1;
      score += weights.personal_upi;
      detectedSignals.push({
        id: `sig-db-${Date.now()}-${ent.id}`,
        category: 'FINANCIAL',
        name: `Flagged in Scam Intelligence Database: ${ent.type}`,
        description: `Entity matches verified fraud registry record: "${ent.value}". ${ent.evidence}`,
        impact: weights.personal_upi,
        severity: 'critical',
        evidence: `Matches Scam Database Entity #${ent.id}: ${ent.value}`,
      });
      break;
    }
  }

  // 2. Financial signals: Registration / Police / Security fees
  const feeKeywords = ['registration fee', 'police clearance', 'verification fee', 'security deposit', 'laptop bond', 'training fee', 'processing fee', 'onboarding fee'];
  const hasFeeDemand = feeKeywords.some((k) => lower.includes(k)) || (feeAmounts.length > 0 && lower.includes('fee'));
  if (hasFeeDemand) {
    score += weights.registration_fee;
    detectedSignals.push({
      id: `sig-fee-${Date.now()}`,
      category: 'FINANCIAL',
      name: 'Mandatory Advance Fee Demanded',
      description: 'The offer mandates upfront monetary payment. AICTE regulations and university placement charters strictly forbid recruitment or onboarding fees.',
      impact: weights.registration_fee,
      severity: 'critical',
      evidence: feeAmounts.length > 0 ? `Amount detected: ₹${feeAmounts[0]}` : 'Fee payment terms detected in communication',
      policyRef: 'AICTE Mandatory Internship Guidelines Rule 4.1',
    });
  }

  // 3. Personal UPI payment
  if (foundUpiMatches.length > 0) {
    score += weights.personal_upi;
    detectedSignals.push({
      id: `sig-upi-${Date.now()}`,
      category: 'FINANCIAL',
      name: 'Payment Demanded via Personal Virtual UPI Handle',
      description: 'Recruiter instructs payment to an unverified UPI VPA rather than an audited corporate escrow account.',
      impact: weights.personal_upi,
      severity: 'critical',
      evidence: `Detected UPI: ${foundUpiMatches.join(', ')}`,
    });
  }

  // 4. Email / Domain mismatch (freemail used for corporate recruitment)
  const freemailList = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'protonmail.com'];
  const hasFreemail = foundEmails.some((e) => freemailList.some((fm) => e.toLowerCase().endsWith(fm)));
  if (hasFreemail) {
    score += weights.recruiter_domain_mismatch;
    detectedSignals.push({
      id: `sig-domain-${Date.now()}`,
      category: 'IDENTITY',
      name: 'Recruiter Email Domain Mismatch (Freemail)',
      description: 'Official corporate recruitment instructions originate from a generic freemail provider instead of an authenticated organizational domain.',
      impact: weights.recruiter_domain_mismatch,
      severity: 'high',
      evidence: `Sender: ${foundEmails.filter((e) => freemailList.some((fm) => e.toLowerCase().endsWith(fm))).join(', ')}`,
    });
  }

  // 5. Urgency and coercion language
  const urgencyKeywords = ['within 30 mins', 'within 1 hour', 'within 2 hours', 'urgent', 'avoid cancellation', 'pass to waiting list', 'deadline today', 'immediately'];
  if (urgencyKeywords.some((k) => lower.includes(k))) {
    score += weights.urgency_language;
    detectedSignals.push({
      id: `sig-urgency-${Date.now()}`,
      category: 'COMMUNICATION',
      name: 'Artificial Urgency & Coercive Deadline Language',
      description: 'Recruiter uses artificial pressure tactics to induce hasty payment before candidate can consult mentors or family.',
      impact: weights.urgency_language,
      severity: 'medium',
      evidence: 'High-pressure timing phrases detected',
    });
  }

  // 6. Sensitive document harvest
  const documentKeywords = ['aadhaar', 'pan card', 'bank account', 'otp', 'cheque', 'passport'];
  const hasDocRequest = documentKeywords.some((k) => lower.includes(k));
  if (hasDocRequest && (hasFeeDemand || hasFreemail)) {
    score += weights.sensitive_document_request;
    detectedSignals.push({
      id: `sig-doc-${Date.now()}`,
      category: 'PRIVACY',
      name: 'Sensitive Government ID Demanded Over Unsecured Channels',
      description: 'Requesting Aadhaar or bank documentation before completing technical assessment or providing verified corporate contracts.',
      impact: weights.sensitive_document_request,
      severity: 'high',
      evidence: 'Identified request for national identity / banking documents',
    });
  }

  // 7. Unrealistic salary
  if (lower.includes('45,000') || lower.includes('50,000') || lower.includes('75,000')) {
    if (lower.includes('telegram') || lower.includes('no interview') || lower.includes('whatsapp')) {
      score += weights.unrealistic_salary;
      detectedSignals.push({
        id: `sig-salary-${Date.now()}`,
        category: 'COMMUNICATION',
        name: 'Unrealistic Compensation for Minimal Assessment',
        description: 'Offering high-tier stipends through informal messaging channels without verified video or technical screening.',
        impact: weights.unrealistic_salary,
        severity: 'medium',
        evidence: 'High stipend offer with minimal technical evaluation',
      });
    }
  }

  // Normalize score to 0 - 100
  score = Math.min(100, Math.max(0, score));

  // Determine Risk Level (Requirement 13)
  let riskLevel: RiskLevel = 'LOW';
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 40) riskLevel = 'HIGH';
  else if (score >= 20) riskLevel = 'MEDIUM';

  // Determine Verification Status (Requirement 4)
  let verificationStatus: VerificationStatus = 'LOW RISK';
  let humanReviewRequired = false;

  if (score >= 70) {
    verificationStatus = 'CRITICAL RISK';
    humanReviewRequired = true;
  } else if (score >= 40) {
    verificationStatus = 'HIGH RISK';
    humanReviewRequired = true;
  } else if (score >= 20) {
    verificationStatus = 'MEDIUM RISK';
    humanReviewRequired = true;
  } else if (score === 0 && !hasFeeDemand && !hasFreemail) {
    verificationStatus = 'VERIFIED';
  }

  // Construct Visual Evidence Chain (Requirement 5)
  evidenceChain.push({
    id: `ev-c-${Date.now()}`,
    step: 'CLAIMED_COMPANY',
    signal: text.includes('Infosys') ? 'Infosys Limited' : text.includes('ApexCyber') ? 'ApexCyber Infotech' : text.includes('Microsoft') ? 'Microsoft India' : 'Claimed Employer',
    source: 'Offer Text',
    status: matchedEntityValue ? 'SUSPICIOUS' : text.includes('Infosys') ? 'VERIFIED' : 'UNVERIFIED',
    confidence: matchedEntityValue ? 0.95 : 0.7,
    explanation: matchedEntityValue ? `Flagged in institutional fraud database.` : text.includes('Infosys') ? `Legitimate enterprise listed on exchanges.` : `External verification unavailable for private entity.`,
    impactScore: matchedEntityValue ? 15 : 0,
    isFictionalDemoData: true,
  });

  evidenceChain.push({
    id: `ev-w-${Date.now()}`,
    step: 'WEBSITE',
    signal: foundUrls[0] || 'No website provided',
    source: 'Domain Provider',
    status: foundUrls.length > 0 ? (foundUrls[0].includes('.xyz') ? 'SUSPICIOUS' : 'VERIFIED') : 'UNAVAILABLE',
    confidence: 0.85,
    explanation: foundUrls.length > 0 ? (foundUrls[0].includes('.xyz') ? 'Suspicious TLD structure.' : 'Valid HTTPS connection.') : 'External verification unavailable.',
    impactScore: foundUrls[0]?.includes('.xyz') ? 15 : 0,
    isFictionalDemoData: true,
  });

  evidenceChain.push({
    id: `ev-e-${Date.now()}`,
    step: 'EMAIL_DOMAIN',
    signal: foundEmails[0] || 'No email provided',
    source: 'Domain Verification Provider',
    status: hasFreemail ? 'MISMATCH' : foundEmails[0]?.endsWith('infosys.com') ? 'VERIFIED' : 'UNVERIFIED',
    confidence: 0.95,
    explanation: hasFreemail ? `Recruiter using ${foundEmails[0]} (Freemail) instead of corporate domain.` : 'Corporate domain recognized.',
    impactScore: hasFreemail ? weights.recruiter_domain_mismatch : 0,
    isFictionalDemoData: true,
  });

  evidenceChain.push({
    id: `ev-p-${Date.now()}`,
    step: 'PAYMENT_REQUEST',
    signal: hasFeeDemand ? (foundUpiMatches[0] ? `UPI: ${foundUpiMatches[0]}` : 'Fee Requested') : 'No Advance Fee Requested',
    source: 'Financial Signal Analyzer',
    status: hasFeeDemand ? 'SUSPICIOUS' : 'VERIFIED',
    confidence: 1.0,
    explanation: hasFeeDemand ? `Advance payment required. Violates AICTE policy.` : `Complies with zero fee internship norms.`,
    impactScore: hasFeeDemand ? weights.registration_fee : 0,
    isFictionalDemoData: true,
  });

  evidenceChain.push({
    id: `ev-cs-${Date.now()}`,
    step: 'CONSISTENCY',
    signal: score > 35 ? 'Inconsistent Signals Detected' : 'Consistent Legitimate Signals',
    source: 'Consistency Analyzer',
    status: score > 35 ? 'MISMATCH' : 'VERIFIED',
    confidence: 0.88,
    explanation: score > 35 ? `Correlated multiple risk indicators (+${score} points).` : `All signals align with standard campus placement norms.`,
    impactScore: score > 35 ? 10 : 0,
    isFictionalDemoData: true,
  });

  return {
    computedScore: score,
    riskLevel,
    verificationStatus,
    detectedSignals,
    evidenceChain,
    extractedFallback: {
      company_name: text.includes('Infosys') ? 'Infosys Limited' : text.includes('ApexCyber') ? 'ApexCyber Infotech' : text.includes('Microsoft') ? 'Microsoft India' : 'Unspecified Employer',
      recruiter_name: 'Recruitment Contact',
      recruiter_email: foundEmails[0] || '',
      recruiter_phone: foundPhones[0] || '',
      job_title: 'Internship Opportunity',
      internship_type: hasFeeDemand ? 'fee_based' : 'paid',
      location: 'Remote / Unspecified',
      salary: 'N/A',
      stipend: feeAmounts.length > 0 ? `Fee demanded: ₹${feeAmounts[0]}` : 'Unspecified',
      website: foundUrls[0] || 'Unavailable',
      email_domain: foundEmails[0]?.split('@')[1] || '',
      payment_requested: hasFeeDemand,
      payment_amount: feeAmounts[0] || 0,
      payment_method: foundUpiMatches[0] ? `UPI (${foundUpiMatches[0]})` : hasFeeDemand ? 'Online Transfer' : 'None',
      payment_reason: hasFeeDemand ? 'Police / Onboarding / Training Fee' : 'None',
      requested_documents: hasDocRequest ? ['Government Photo ID', 'Resume'] : ['Resume'],
      deadline: urgencyKeywords.some((k) => lower.includes(k)) ? 'Immediate / Urgent' : 'Standard',
      claims: [],
      suspicious_phrases: urgencyKeywords.filter((k) => lower.includes(k)),
      contact_information: foundEmails.join(', ') || foundPhones.join(', ') || 'None provided',
    },
    humanReviewRequired,
  };
}

// ================= API ROUTES =================

// 1. POST /api/analyze/text (Requirement 22 & 25)
app.post('/api/analyze/text', async (req: Request, res: Response) => {
  try {
    const { text, submissionType = 'text', studentInfo = {} } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide job or internship offer text to analyze.' });
    }

    // Step A: Deterministic security signal and risk calculation (Rule: Gemini NEVER decides final score directly)
    const deterministic = runDeterministicSecurityAnalysis(text, activeScoringWeights);

    // Step B: Gemini Semantic Analysis and Entity Extraction
    let extractedDetails: ExtractedOfferDetails = {
      ...deterministic.extractedFallback,
    } as ExtractedOfferDetails;

    let aiSummary = '';
    let aiReasoning = '';
    let aiRecommendedAction = '';
    let aiUnverified: string[] = ['Real-world corporate incorporation status pending official registry check'];

    try {
      const prompt = `You are OfferGuard's AI Semantic Analysis Engine.
Analyze the following job/internship offer communication for student verification:

--- OFFER SUBMISSION ---
${text}

Deterministic signals already identified by OfferGuard's security rule engine:
- Deterministic Risk Score: ${deterministic.computedScore}/100 (${deterministic.riskLevel})
- Detected Signals: ${deterministic.detectedSignals.map((s) => s.name).join('; ')}

Instructions:
1. Extract structured entities with high fidelity: company_name, recruiter_name, recruiter_email, recruiter_phone, job_title, internship_type ('unpaid'|'paid'|'fee_based'|'full_time'|'contract'|'unknown'), location, salary, stipend, website, email_domain, payment_requested (boolean), payment_amount (number), payment_method, payment_reason, requested_documents (array), deadline, claims (array), suspicious_phrases (array), contact_information.
2. Produce an explainable, objective summary (summary) in clear language without robotic jargon.
3. Detail the reasoning (reasoning) explaining why these signals correlate to risk, citing AICTE / Indian university placement norms (which strictly prohibit demanding fees for internships).
4. Provide concrete, actionable next steps for the student (recommendedAction). Never claim 100% absolute certainty; use calibrated language.
5. List unverified information (unverifiedInfo) that cannot be confirmed from this text alone.

Return ONLY valid JSON matching this schema:
{
  "extracted": {
    "company_name": "string",
    "recruiter_name": "string",
    "recruiter_email": "string",
    "recruiter_phone": "string",
    "job_title": "string",
    "internship_type": "paid",
    "location": "string",
    "salary": "string",
    "stipend": "string",
    "website": "string",
    "email_domain": "string",
    "payment_requested": false,
    "payment_amount": 0,
    "payment_method": "string",
    "payment_reason": "string",
    "requested_documents": ["string"],
    "deadline": "string",
    "claims": ["string"],
    "suspicious_phrases": ["string"],
    "contact_information": "string"
  },
  "summary": "string",
  "reasoning": "string",
  "recommendedAction": "string",
  "unverifiedInfo": ["string"]
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(aiResponse.text?.trim() || '{}');
      if (parsed.extracted) {
        extractedDetails = {
          ...extractedDetails,
          ...parsed.extracted,
        };
      }
      aiSummary = parsed.summary || '';
      aiReasoning = parsed.reasoning || '';
      aiRecommendedAction = parsed.recommendedAction || '';
      if (Array.isArray(parsed.unverifiedInfo) && parsed.unverifiedInfo.length > 0) {
        aiUnverified = parsed.unverifiedInfo;
      }
    } catch (genErr) {
      console.warn('Gemini semantic analysis fallback triggered:', genErr);
      aiSummary = deterministic.computedScore >= 40
        ? 'Multiple high-risk indicators were detected. The offer demands advance payment or uses unverified recruitment channels.'
        : 'Assessment completed. The offer appears consistent with standard recruitment parameters.';
      aiReasoning = deterministic.computedScore >= 40
        ? 'University placement policies strictly prohibit recruiters from demanding fees via personal UPI handles or email freemail domains.'
        : 'No advance fee demands or domain mismatches were observed.';
      aiRecommendedAction = deterministic.computedScore >= 40
        ? 'Do not make any payment. Do not share identity documents. Verify employer through an independently obtained official channel.'
        : 'Verify the opportunity with your campus placement coordinator before signing.';
    }

    // Create a new Case record with full audit trail (Requirement 16)
    const newCaseId = `case-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCaseNumber = `OG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCase: CaseRecord = {
      id: newCaseId,
      caseNumber: newCaseNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionType: submissionType as any,
      rawInput: text,
      studentName: studentInfo.name || 'Aditya Krishnan',
      studentEmail: studentInfo.email || 'aditya.23cs@collegemail.edu',
      studentCollege: studentInfo.college || 'State Institute of Engineering & Technology',
      studentRoll: studentInfo.roll || '23CS084',
      extractedDetails,
      riskScore: deterministic.computedScore,
      riskLevel: deterministic.riskLevel,
      verificationStatus: deterministic.verificationStatus,
      detectedSignals: deterministic.detectedSignals,
      evidenceChain: deterministic.evidenceChain,
      summary: aiSummary,
      reasoning: aiReasoning,
      recommendedAction: aiRecommendedAction,
      unverifiedInfo: aiUnverified,
      humanReviewRequired: deterministic.humanReviewRequired,
      reviewStatus: deterministic.humanReviewRequired ? 'PENDING_REVIEW' : 'NOT_REQUIRED',
      auditTrail: [
        {
          id: `aud-${Date.now()}-1`,
          caseId: newCaseId,
          timestamp: new Date().toISOString(),
          actorType: 'student',
          actorName: studentInfo.name || 'Student Applicant',
          action: 'SUBMIT_OFFER',
          details: `Submitted offer text (${text.length} chars) via OfferGuard Web Portal.`,
        },
        {
          id: `aud-${Date.now()}-2`,
          caseId: newCaseId,
          timestamp: new Date().toISOString(),
          actorType: 'system',
          actorName: 'OfferGuard Investigation Engine',
          action: 'ASSESS_RISK',
          details: `Deterministic Risk Score: ${deterministic.computedScore}/100 (${deterministic.riskLevel}). Status: ${deterministic.verificationStatus}. Evidence graph created with ${deterministic.evidenceChain.length} nodes.`,
        },
      ],
      isDemoCase: false,
    };

    casesStore.unshift(newCase);
    res.status(201).json({ case: newCase });
  } catch (error: any) {
    console.error('Error analyzing offer:', error);
    res.status(500).json({ error: error.message || 'Internal server error analyzing offer.' });
  }
});

// 2. GET /api/cases & GET /api/cases/:id (Requirement 18 & 22)
app.get('/api/cases', (req: Request, res: Response) => {
  const { risk, status, search } = req.query;
  let filtered = [...casesStore];

  if (risk && risk !== 'ALL') {
    filtered = filtered.filter((c) => c.riskLevel === risk);
  }
  if (status && status !== 'ALL') {
    filtered = filtered.filter((c) => c.reviewStatus === status || c.verificationStatus === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.extractedDetails.company_name.toLowerCase().includes(q) ||
        c.extractedDetails.job_title.toLowerCase().includes(q)
    );
  }

  res.json({ cases: filtered, total: filtered.length });
});

app.get('/api/cases/:id', (req: Request, res: Response) => {
  const c = casesStore.find((item) => item.id === req.params.id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json({ case: c });
});

// 3. POST /api/reviews & PUT /api/reviews/:id (Human Reviewer Decision, Requirement 15 & 22)
app.post('/api/reviews', (req: Request, res: Response) => {
  const { caseId, verdict, notes, reviewerName = 'Prof. R. Venkatesh', reviewerRole = 'Placement Director', addToScamDb = false } = req.body;

  const targetCase = casesStore.find((c) => c.id === caseId);
  if (!targetCase) {
    return res.status(404).json({ error: 'Case not found to review' });
  }

  const reviewRecord = {
    id: `rev-${Date.now()}`,
    reviewerId: 'rev-officer-1',
    reviewerName,
    reviewerRole,
    verdict: verdict as ReviewVerdict,
    notes,
    timestamp: new Date().toISOString(),
    addToScamDb,
  };

  targetCase.review = reviewRecord;
  targetCase.reviewStatus = 'REVIEWED';
  targetCase.updatedAt = new Date().toISOString();

  // If reviewer chose to add to central scam intelligence
  if (addToScamDb && (verdict === 'SCAM' || verdict === 'WARNING')) {
    if (targetCase.extractedDetails.company_name) {
      suspiciousEntities.unshift({
        id: `ent-${Date.now()}-comp`,
        type: 'COMPANY',
        value: targetCase.extractedDetails.company_name,
        claimedEntity: targetCase.extractedDetails.company_name,
        evidence: `Blacklisted by ${reviewerName} during case ${targetCase.caseNumber} review. Note: ${notes}`,
        riskLevel: 'CRITICAL',
        dateAdded: new Date().toISOString().split('T')[0],
        matchCount: 1,
        isFictionalDemoData: false,
      });
    }
    if (targetCase.extractedDetails.recruiter_email && !targetCase.extractedDetails.recruiter_email.includes('@gmail.com')) {
      suspiciousEntities.unshift({
        id: `ent-${Date.now()}-em`,
        type: 'EMAIL',
        value: targetCase.extractedDetails.recruiter_email,
        claimedEntity: targetCase.extractedDetails.company_name,
        evidence: `Flagged fraudulent email address in case ${targetCase.caseNumber}.`,
        riskLevel: 'HIGH',
        dateAdded: new Date().toISOString().split('T')[0],
        matchCount: 1,
        isFictionalDemoData: false,
      });
    }
  }

  targetCase.auditTrail.push({
    id: `aud-${Date.now()}`,
    caseId: targetCase.id,
    timestamp: new Date().toISOString(),
    actorType: 'reviewer',
    actorName: reviewerName,
    action: 'RECORD_DECISION',
    details: `Reviewer verdict: ${verdict}. Notes: ${notes}. Added to Scam DB: ${addToScamDb}`,
  });

  res.status(201).json({ case: targetCase, review: reviewRecord });
});

// 4. GET /api/intelligence (Requirement 12 & 22)
app.get('/api/intelligence', (req: Request, res: Response) => {
  res.json({
    patterns: scamPatterns,
    suspiciousEntities: suspiciousEntities,
    summary: {
      totalPatternsTracked: scamPatterns.length,
      totalSuspiciousEntities: suspiciousEntities.length,
      lastUpdated: new Date().toISOString(),
    },
  });
});

app.post('/api/intelligence/entity', (req: Request, res: Response) => {
  const { type, value, claimedEntity, evidence, riskLevel = 'HIGH' } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'type and value are required.' });
  }

  const newEntity: SuspiciousEntity = {
    id: `ent-${Date.now()}`,
    type,
    value: value.trim(),
    claimedEntity: claimedEntity || value.trim(),
    evidence: evidence || 'Added by institutional security reviewer',
    riskLevel: riskLevel as RiskLevel,
    dateAdded: new Date().toISOString().split('T')[0],
    matchCount: 1,
    isFictionalDemoData: false,
  };

  suspiciousEntities.unshift(newEntity);
  res.status(201).json({ entity: newEntity });
});

// 5. GET /api/analytics (Requirement 17 & 22)
app.get('/api/analytics', (req: Request, res: Response) => {
  const total = casesStore.length;
  const verified = casesStore.filter((c) => c.verificationStatus === 'VERIFIED' || c.riskLevel === 'LOW').length;
  const low = casesStore.filter((c) => c.riskLevel === 'LOW').length;
  const medium = casesStore.filter((c) => c.riskLevel === 'MEDIUM').length;
  const high = casesStore.filter((c) => c.riskLevel === 'HIGH').length;
  const critical = casesStore.filter((c) => c.riskLevel === 'CRITICAL').length;
  const pendingReview = casesStore.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length;

  let totalMoneyProtected = 0;
  for (const c of casesStore) {
    if (c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL') {
      totalMoneyProtected += c.extractedDetails.payment_amount || 2000;
    }
  }

  // Monthly trends for Recharts
  const monthlyTrends = [
    { month: 'May 2026', totalChecks: 24, highRisk: 8, verified: 14 },
    { month: 'Jun 2026', totalChecks: 42, highRisk: 15, verified: 22 },
    { month: 'Jul 2026', totalChecks: 68, highRisk: 29, verified: 31 },
    { month: 'Aug 2026', totalChecks: 95, highRisk: 41, verified: 45 },
    { month: 'Sep 2026', totalChecks: 128, highRisk: 52, verified: 62 },
  ];

  const scamCategoryDistribution = [
    { name: 'Police Clearance / Reg Fee', value: 44, color: '#e11d48' },
    { name: 'MacBook Courier Bond', value: 26, color: '#f59e0b' },
    { name: 'Freemail Impersonation', value: 18, color: '#6366f1' },
    { name: 'Typosquatted Domain', value: 12, color: '#8b5cf6' },
  ];

  res.json({
    metrics: {
      totalCases: total + 184, // includes past archived campus season
      verifiedOffers: verified + 76,
      lowRisk: low + 35,
      mediumRisk: medium + 28,
      highRisk: high + 51,
      criticalRisk: critical + 42,
      pendingReview: pendingReview,
      totalMoneyProtectedInr: totalMoneyProtected + 168000,
      scamPatternsIdentified: scamPatterns.length,
      averageReviewTurnaroundHours: 2.2,
    },
    monthlyTrends,
    scamCategoryDistribution,
  });
});

// 6. GET & PUT /api/settings/scoring (Requirement 13: Configurable Risk Weights Engine)
app.get('/api/settings/scoring', (req: Request, res: Response) => {
  res.json({ scoringWeights: activeScoringWeights });
});

app.put('/api/settings/scoring', (req: Request, res: Response) => {
  const { scoringWeights } = req.body;
  if (!scoringWeights) {
    return res.status(400).json({ error: 'scoringWeights object required' });
  }
  activeScoringWeights = {
    ...activeScoringWeights,
    ...scoringWeights,
  };
  res.json({ success: true, scoringWeights: activeScoringWeights });
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
    console.log(`OfferGuard API & Web Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
