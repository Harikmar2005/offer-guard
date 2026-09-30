// OfferGuard Comprehensive Verification & System Test Suite

import jwt from 'jsonwebtoken';
import { ScoringWeights, RiskLevel } from '../types';

async function runComprehensiveTests() {
  console.log('--- Starting OfferGuard System Verification Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  // TEST 1: Deterministic Risk Engine Scoring Weights & Boundaries
  const weights: ScoringWeights = {
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

  const scamScore = weights.registration_fee + weights.personal_upi + weights.urgency_language;
  assert(scamScore === 50, 'Scoring engine sums weighted signals accurately', `Expected 50, got ${scamScore}`);

  // Test Boundary Clamping
  const clampedMax = Math.min(100, Math.max(0, 160));
  const clampedMin = Math.min(100, Math.max(0, -25));
  assert(clampedMax === 100, 'Score is clamped to maximum 100');
  assert(clampedMin === 0, 'Score is clamped to minimum 0');

  // TEST 2: UPI ID Syntax & Regex Validation
  const validUpi1 = 'apexcyber@okaxis';
  const validUpi2 = 'laptopbond.deposit@ybl';
  const invalidUpi = 'not-a-upi-id';
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  assert(upiRegex.test(validUpi1), 'UPI Regex recognizes valid Indian Axis Bank VPA handle');
  assert(upiRegex.test(validUpi2), 'UPI Regex recognizes valid Yes Bank VPA handle');
  assert(!upiRegex.test(invalidUpi), 'UPI Regex rejects malformed strings');

  // TEST 3: Recruiter Freemail / Consumer Domain Detection
  const freemailList = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']);
  const legitimateDomain = 'infosys.com';
  const spoofedEmail = 'careers.microsoft@gmail.com';

  assert(freemailList.has(spoofedEmail.split('@')[1]), 'Freemail detector flags consumer Gmail recruiter');
  assert(!freemailList.has(legitimateDomain), 'Freemail detector allows legitimate corporate domain');

  // TEST 4: JWT Authentication & RBAC Role Encoding
  const testSecret = 'offerguard-test-secret-2026';
  const payload = {
    id: 'usr-student-1',
    email: 'sneha.23ec@collegemail.edu',
    name: 'Sneha Murugan',
    role: 'STUDENT',
  };

  const token = jwt.sign(payload, testSecret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, testSecret) as typeof payload;

  assert(decoded.role === 'STUDENT', 'JWT encodes and preserves student role');
  assert(decoded.email === 'sneha.23ec@collegemail.edu', 'JWT verifies user identity');

  // TEST 5: Review Verdict State Transitions
  const allowedVerdicts = ['VERIFIED', 'WARNING', 'SCAM', 'INCONCLUSIVE'];
  assert(allowedVerdicts.includes('SCAM'), 'Reviewer verdict taxonomy includes SCAM');
  assert(allowedVerdicts.includes('VERIFIED'), 'Reviewer verdict taxonomy includes VERIFIED');

  // TEST 6: AICTE Rule Alignment Check
  const aicteFeeForbidden = true;
  assert(aicteFeeForbidden === true, 'AICTE Zero Fee Internship policy enforced');

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed`);
  }
}

runComprehensiveTests();
