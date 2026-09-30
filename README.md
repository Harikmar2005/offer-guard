# OfferGuard
### Verify Before You Apply.

**OfferGuard** is an AI-powered employment offer verification and recruitment-fraud intelligence platform designed to protect college students, final-year undergraduates, and entry-level job seekers from predatory internship scams, fake job offers, and fee-extortion schemes.

Rather than acting as a binary "fake job classifier", OfferGuard operates as an **investigative workbench**:
```
SUBMIT OFFER → EXTRACT INFORMATION → INVESTIGATE → CROSS-CHECK EVIDENCE → ASSESS RISK → EXPLAIN FINDINGS → RECOMMEND ACTION → ESCALATE UNCERTAIN CASES → STORE CASE KNOWLEDGE
```

---

## Technical Stack & Architecture

- **Backend Runtime**: Node.js v22 + Express (TypeScript)
- **Database Engine**:
  > **Note on Database**: **SQLite is used for the current MVP.** PostgreSQL is planned and recommended for high-scale enterprise production deployment. Full SQLAlchemy relational models are also cataloged in `models/sqlalchemy_models.py` for Python/PostgreSQL environments.
  - Persistent relational **SQLite** (`offerguard.db`) via `sql.js` / WebAssembly engine with automatic filesystem serialization (`fs.writeFileSync`), relational table schema, and pre-seeded intelligence.
- **Frontend**: React 19 (Vite 8), TypeScript, Tailwind CSS v4, Lucide React icons, Recharts for institutional analytics.
- **AI Engine**: Google Gemini 3.8 Flash (`@google/genai`) for multi-modal OCR (PDF/image inspection), entity extraction, and grounded conversational Q&A without hallucinatory legal claims.
- **Security & RBAC**: Real JWT authentication (`jsonwebtoken`), password hashing (`bcryptjs`), and server-side authorization enforcement (`STUDENT`, `REVIEWER`, `ADMIN`).
- **Network Verification Providers**: Real DNS MX lookup (`dns.promises.resolveMx`), DNS A-record resolution, Indian UPI VPA syntax validator, consumer freemail detector, and threat blacklist matcher.

---

## Evidence Semantics: Critical Distinction

A foundational architectural principle of OfferGuard is that:
$$\text{DOMAIN EXISTS} \neq \text{COMPANY IS LEGITIMATE}$$

A fraudulent actor can easily register `infosys-careers.com` or `microsoft-recruit.xyz`, configure valid Cloudflare DNS A records, and set up Google Workspace / Zoho mail servers.
- **Domain Verification Provider**: Reports `EXISTS` with valid A/MX records. This evaluates *technical transport infrastructure only*.
- **Company Verification Provider**: Reports `UNVERIFIED` or `UNAVAILABLE` unless the employer is independently verified through accredited registries (e.g., MCA CIN verification, institutional university partnership).
- **Recruiter Verification Provider**: Detects discrepancies between the recruiter's email domain and the claimed company, flagging consumer freemails (`@gmail.com`) or typosquatted domains.

The Evidence Chain reflects this nuance using a 6-tier status taxonomy:
- `VERIFIED`: Confirmed against authoritative record or policy.
- `MISMATCH`: Direct contradiction (e.g., claimed corporate employer using consumer freemail).
- `SUSPICIOUS`: High-risk indicators (e.g., personal UPI handle demanding fees, high-abuse TLDs).
- `UNVERIFIED`: Information stated in the offer, but not independently verified.
- `UNAVAILABLE`: Authoritative registry was not reachable or not connected in this environment.
- `CONTRADICTORY`: Direct logical impossibility (e.g., email domain has no mail servers configured).

---

## Relational Database Schema & Entities

The relational database architecture is defined across 10 core entities:

1. **`users`**:
   - `id`, `email`, `password_hash`, `name`, `role` (`STUDENT` | `REVIEWER` | `ADMIN`), `college`, `created_at`
2. **`cases`**:
   - `id`, `case_number`, `user_id`, `submission_type`, `raw_input`, `student_name`, `student_email`, `student_college`, `student_roll`, `risk_score`, `risk_level`, `verification_status`, `summary`, `reasoning`, `recommended_action`, `unverified_info_json`, `human_review_required`, `review_status`, `is_demo_case`, `created_at`, `updated_at`
3. **`extracted_details`**:
   - `id`, `case_id`, `company_name`, `recruiter_name`, `recruiter_email`, `recruiter_phone`, `job_title`, `internship_type`, `location`, `salary`, `stipend`, `website`, `email_domain`, `payment_requested`, `payment_amount`, `payment_method`, `payment_reason`, `requested_documents_json`, `deadline`, `claims_json`, `suspicious_phrases_json`, `contact_information`
4. **`investigations`**:
   - `id`, `case_id`, `engine_version`, `created_at`
5. **`evidence`**:
   - `id`, `investigation_id`, `case_id`, `step`, `signal`, `source`, `status`, `confidence`, `explanation`, `impact_score`, `is_fictional_demo_data`, `created_at`
6. **`risk_signals`**:
   - `id`, `investigation_id`, `case_id`, `category`, `name`, `description`, `impact`, `severity`, `evidence`, `created_at`
7. **`domains`**:
   - `id`, `domain_name`, `mx_records_json`, `has_valid_mx`, `is_freemail`, `is_blacklisted`, `checked_at`
8. **`scam_patterns`**:
   - `id`, `category`, `title`, `description`, `indicators_json`, `target_audience`, `risk_level`, `date_logged`, `report_count`, `is_fictional_demo_data`
9. **`suspicious_entities`**:
   - `id`, `type` (`UPI_ID`, `COMPANY`, `EMAIL`, `DOMAIN`), `value`, `claimed_entity`, `evidence`, `risk_level`, `date_added`, `match_count`, `is_fictional_demo_data`
10. **`reviews`**:
    - `id`, `case_id`, `reviewer_id`, `reviewer_name`, `reviewer_role`, `verdict` (`VERIFIED`, `WARNING`, `SCAM`, `INCONCLUSIVE`), `notes`, `add_to_scam_db`, `timestamp`
11. **`audit_events`**:
    - `id`, `case_id`, `timestamp`, `actor_type`, `actor_name`, `action`, `details`

---

## Real Verification Providers & Heuristics

1. **DNS & Mail Exchanger (MX) Verification**:
   - Executes real DNS queries via Node.js `dns.promises.resolveMx(domain)` to determine if recruiter domains possess valid mail servers.
   - Flags domains without MX records (`CONTRADICTORY`) and high-abuse disposable TLDs (`.xyz`, `.top`, `.click`, `.buzz`).
2. **Freemail / Impersonation Check**:
   - Identifies recruiters operating over public webmail (`@gmail.com`, `@yahoo.com`, `@outlook.com`) while claiming Fortune 500 or corporate enterprise identity.
3. **UPI VPA Format & Blacklist Matcher**:
   - Validates Indian Virtual Payment Address (VPA) syntax against recognized bank handles (`@okhdfcbank`, `@okaxis`, `@paytm`, `@ybl`, `@upi`).
   - Cross-references recipient UPI handles against persistent database blacklist in `suspicious_entities`.
4. **Document & Image Forensic OCR**:
   - Supports uploading PDF offer letters and PNG/JPG recruiter chat screenshots.
   - Leverages Gemini Multimodal AI vision to extract text, identify seals, signatures, and embedded UPI QR codes.
5. **AICTE Zero-Fee Norm Enforcer**:
   - Enforces AICTE Mandatory Internship Policy Section 4.1: any upfront fee (police clearance, training, hardware bond) directly triggers CRITICAL risk flags.

---

## Role-Based Access Control (RBAC)

All authorization rules are enforced strictly on the server:

- **`STUDENT`**:
  - Submits messages, documents, or job links for verification.
  - Can only view their **own** submitted cases and reports (student data isolation).
  - Can escalate ambiguous cases to placement cell reviewers.
  - Cannot record official verdicts, modify intelligence databases, or alter scoring parameters.
- **`REVIEWER` (Placement Director / Faculty)**:
  - Accesses the Human-in-the-Loop decision console.
  - Reviews flagged cases across all students, inspects evidence graphs, and records official institutional determinations (`VERIFIED`, `WARNING`, `SCAM`).
  - Promotes fraudulent entities into the central campus threat intelligence registry.
- **`ADMIN`**:
  - Tunes deterministic scoring weights via the Scoring Rules manager.
  - Oversees institutional analytics, savings metrics, and cross-batch threat intelligence.

---

## Verified Demo Cases Included

OfferGuard includes 6 rich demo cases pre-seeded in the database:

1. **Case 1 (OG-2026-0001)**: *Infosys Springboard* — Legitimate offer, verified corporate domain (`infosys.com`), explicit zero fee policy, low risk (Score: 6/100, VERIFIED).
2. **Case 2 (OG-2026-0002)**: *ApexCyber Infotech* — Fake Police Clearance Fee extortion (₹2,500 via UPI `apexcyber@okaxis` with 30-minute urgency timer; Score: 78/100, CRITICAL RISK).
3. **Case 3 (OG-2026-0003)**: *CloudTech Solutions* — Pay-to-work training scheme demanding ₹4,800 bootcamp fee with false refund promise (Score: 71/100, HIGH RISK).
4. **Case 4 (OG-2026-0004)**: *Microsoft India Spoof* — Recruiter impersonation from `@gmail.com` soliciting Aadhaar government ID pre-interview (Score: 64/100, HIGH RISK).
5. **Case 5 (OG-2026-0005)**: *QuantumCloud Solutions* — Remote MacBook courier transit insurance deposit scam via Telegram (₹1,500 deposit; Score: 82/100, CRITICAL RISK).
6. **Case 6 (OG-2026-0006)**: *Vyom Robotics LLP* — Authentic hardware startup with aggressive non-compete clause, requiring faculty review (Score: 32/100, HUMAN REVIEW REQUIRED).

---

## Running Tests

Run the automated verification test suite:

```bash
npm test
```

This executes 30 comprehensive automated tests covering:
- Deterministic score weighting and clamp boundaries (0–100)
- Evidence semantics distinction (Domain resolution != Corporate legitimacy)
- UPI VPA regex validation and bank handle recognition
- Freemail provider detection and corporate spoofing checks
- JWT role authentication, student data isolation, and RBAC permission enforcement
- Tampered and expired JWT rejection
- Reviewer verdict taxonomy and AICTE policy compliance assertions

---

## Starting the Application

```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Run automated test suite
npm test
```

Database file `offerguard.db` is automatically created, persisted, and maintained in the root directory.
