import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '..', 'offerguard.db');

let sqlDb: SqlJsDatabase | null = null;

// Helper to save sqlite database to disk
function saveToDisk() {
  if (!sqlDb) return;
  try {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err: any) {
    console.error('Error saving SQLite database to disk:', err.message);
  }
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (sqlDb) return sqlDb;

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(fileBuffer);
      console.log(`Loaded existing OfferGuard SQLite database from: ${dbPath}`);
    } catch {
      sqlDb = new SQL.Database();
      console.log('Created fresh OfferGuard SQLite database.');
    }
  } else {
    sqlDb = new SQL.Database();
    console.log(`Created new OfferGuard SQLite database at: ${dbPath}`);
  }

  return sqlDb;
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  saveToDisk();
  return { changes: 1 };
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, params);
  return rows[0];
}

export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

// Initialize tables and seed initial data
export async function initializeDatabase() {
  await getDb();

  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      college TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Cases table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      user_id TEXT,
      submission_type TEXT NOT NULL,
      raw_input TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_email TEXT NOT NULL,
      student_college TEXT NOT NULL,
      student_roll TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      summary TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      unverified_info_json TEXT NOT NULL,
      human_review_required INTEGER NOT NULL,
      review_status TEXT NOT NULL,
      is_demo_case INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Extracted details table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS extracted_details (
      id TEXT PRIMARY KEY,
      case_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      recruiter_name TEXT,
      recruiter_email TEXT,
      recruiter_phone TEXT,
      job_title TEXT NOT NULL,
      internship_type TEXT,
      location TEXT,
      salary TEXT,
      stipend TEXT,
      website TEXT,
      email_domain TEXT,
      payment_requested INTEGER NOT NULL DEFAULT 0,
      payment_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      payment_reason TEXT,
      requested_documents_json TEXT,
      deadline TEXT,
      claims_json TEXT,
      suspicious_phrases_json TEXT,
      contact_information TEXT
    );
  `);

  // Investigations table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      case_id TEXT UNIQUE NOT NULL,
      engine_version TEXT NOT NULL DEFAULT '2.4.0',
      created_at TEXT NOT NULL
    );
  `);

  // Evidence table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      investigation_id TEXT,
      case_id TEXT NOT NULL,
      step TEXT NOT NULL,
      signal TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      confidence REAL NOT NULL,
      explanation TEXT NOT NULL,
      impact_score INTEGER NOT NULL,
      is_fictional_demo_data INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Risk signals table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS risk_signals (
      id TEXT PRIMARY KEY,
      investigation_id TEXT,
      case_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      impact INTEGER NOT NULL,
      severity TEXT NOT NULL,
      evidence TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Companies directory
  await dbRun(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      cin_number TEXT,
      registration_status TEXT,
      verified_source TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Recruiters directory
  await dbRun(`
    CREATE TABLE IF NOT EXISTS recruiters (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'UNVERIFIED',
      created_at TEXT NOT NULL
    );
  `);

  // Domains directory
  await dbRun(`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      domain_name TEXT UNIQUE NOT NULL,
      mx_records_json TEXT,
      has_valid_mx INTEGER NOT NULL DEFAULT 0,
      is_freemail INTEGER NOT NULL DEFAULT 0,
      is_blacklisted INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT NOT NULL
    );
  `);

  // Scam patterns table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS scam_patterns (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      indicators_json TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      date_logged TEXT NOT NULL,
      report_count INTEGER NOT NULL DEFAULT 1,
      is_fictional_demo_data INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Suspicious entities table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS suspicious_entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      claimed_entity TEXT NOT NULL,
      evidence TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      date_added TEXT NOT NULL,
      match_count INTEGER NOT NULL DEFAULT 0,
      is_fictional_demo_data INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Reviews table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      case_id TEXT UNIQUE NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      verdict TEXT NOT NULL,
      notes TEXT NOT NULL,
      add_to_scam_db INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );
  `);

  // Audit events table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL
    );
  `);

  // Scoring weights configuration table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS scoring_weights (
      id TEXT PRIMARY KEY,
      weights_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  console.log('OfferGuard relational SQLite tables verified and initialized.');
}
