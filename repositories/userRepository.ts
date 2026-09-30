import { dbRun, dbGet, dbAll } from '../database/connection';
import { UserRole } from '../src/types';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  college: string | null;
  created_at: string;
}

export class UserRepository {
  static async create(user: DbUser): Promise<DbUser> {
    await dbRun(
      `INSERT INTO users (id, email, password_hash, name, role, college, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.password_hash, user.name, user.role, user.college, user.created_at]
    );
    return user;
  }

  static async findByEmail(email: string): Promise<DbUser | undefined> {
    return dbGet<DbUser>('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id: string): Promise<DbUser | undefined> {
    return dbGet<DbUser>('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async list(): Promise<DbUser[]> {
    return dbAll<DbUser>('SELECT id, email, name, role, college, created_at FROM users ORDER BY created_at DESC');
  }

  static async seedDefaultUsers(): Promise<void> {
    const existing = await dbGet<{ count: number }>('SELECT count(*) as count FROM users');
    if (existing && existing.count > 0) return;

    // We'll import bcryptjs hash
    const bcrypt = await import('bcryptjs');
    const defaultPassword = await bcrypt.default.hash('OfferGuard#2026', 10);

    const defaultUsers: DbUser[] = [
      {
        id: 'usr-student-1',
        email: 'sneha.23ec@collegemail.edu',
        password_hash: defaultPassword,
        name: 'Sneha Murugan',
        role: 'STUDENT',
        college: 'State Institute of Engineering & Technology',
        created_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'usr-student-2',
        email: 'aditya.23cs@collegemail.edu',
        password_hash: defaultPassword,
        name: 'Aditya Krishnan',
        role: 'STUDENT',
        college: 'State Institute of Engineering & Technology',
        created_at: '2026-09-02T11:00:00Z',
      },
      {
        id: 'usr-reviewer-1',
        email: 'placement.director@collegemail.edu',
        password_hash: defaultPassword,
        name: 'Prof. R. Venkatesh',
        role: 'REVIEWER',
        college: 'State Institute of Engineering & Technology',
        created_at: '2026-08-15T09:00:00Z',
      },
      {
        id: 'usr-admin-1',
        email: 'admin@offerguard.edu',
        password_hash: defaultPassword,
        name: 'Institutional Security Administrator',
        role: 'ADMIN',
        college: 'Central Placement Consortium',
        created_at: '2026-08-01T08:00:00Z',
      },
    ];

    for (const u of defaultUsers) {
      await this.create(u);
    }
    console.log('Seeded default authenticated users (Student, Reviewer, Admin)');
  }
}
