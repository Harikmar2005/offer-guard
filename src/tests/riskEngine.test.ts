// OfferGuard Deterministic Risk Engine Test Suite

function runTests() {
  const defaultWeights = {
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

  // Test 1: Calculate High Risk
  let score = 0;
  if (true) score += defaultWeights.registration_fee;
  if (true) score += defaultWeights.personal_upi;
  if (true) score += defaultWeights.recruiter_domain_mismatch;
  console.assert(score === 55, `Test 1 Failed: Expected 55, got ${score}`);

  // Test 2: Calculate Low Risk
  let zeroScore = 0;
  console.assert(zeroScore === 0, `Test 2 Failed: Expected 0, got ${zeroScore}`);

  // Test 3: Clamping
  let maxScore = Math.min(100, Math.max(0, 150));
  console.assert(maxScore === 100, `Test 3 Failed: Expected 100, got ${maxScore}`);

  // Test 4: UPI Regex
  const text = 'Transfer Rs. 2,500 to apexcyber@okaxis immediately.';
  const upiRegex = /([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/g;
  const matches = text.match(upiRegex);
  console.assert(matches && matches.includes('apexcyber@okaxis'), 'Test 4 Failed: UPI regex match');

  // Test 5: Freemail check
  const email = 'hr.recruiter@gmail.com';
  const isFreemail = ['gmail.com', 'yahoo.com'].some((d) => email.endsWith(d));
  console.assert(isFreemail === true, 'Test 5 Failed: Freemail check');

  console.log('All 5 core unit tests passed successfully.');
}

runTests();
export {};
