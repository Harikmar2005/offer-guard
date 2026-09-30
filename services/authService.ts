import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRepository, DbUser } from '../repositories/userRepository';
import { UserRole } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'offerguard-secure-secret-token-key-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  college: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export class AuthService {
  static generateToken(user: DbUser | AuthenticatedUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        college: user.college,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static async register(params: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    college?: string;
  }): Promise<{ user: AuthenticatedUser; token: string }> {
    const existing = await UserRepository.findByEmail(params.email.toLowerCase().trim());
    if (existing) {
      throw new Error('A user with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const newUser: DbUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: params.email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: params.name.trim(),
      role: params.role || 'STUDENT',
      college: params.college || null,
      created_at: new Date().toISOString(),
    };

    await UserRepository.create(newUser);
    const authUser: AuthenticatedUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      college: newUser.college,
    };

    return {
      user: authUser,
      token: this.generateToken(authUser),
    };
  }

  static async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const user = await UserRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      college: user.college,
    };

    return {
      user: authUser,
      token: this.generateToken(authUser),
    };
  }

  static async demoSwitch(role: UserRole): Promise<{ user: AuthenticatedUser; token: string }> {
    const users = await UserRepository.list();
    let target = users.find((u) => u.role === role);

    if (!target) {
      // Create if missing
      const pass = await bcrypt.hash('OfferGuard#2026', 10);
      const created: DbUser = {
        id: `usr-${role.toLowerCase()}-${Date.now()}`,
        email: `${role.toLowerCase()}@offerguard.edu`,
        password_hash: pass,
        name: role === 'STUDENT' ? 'Sneha Murugan' : role === 'REVIEWER' ? 'Prof. R. Venkatesh' : 'Admin User',
        role: role,
        college: 'State Institute of Engineering & Technology',
        created_at: new Date().toISOString(),
      };
      await UserRepository.create(created);
      target = created;
    }

    const authUser: AuthenticatedUser = {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      college: target.college,
    };

    return {
      user: authUser,
      token: this.generateToken(authUser),
    };
  }
}

// Authentication Middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If no token, check if role header was provided as fallback for convenience in demo
    const roleHeader = req.headers['x-user-role'] as UserRole;
    if (roleHeader) {
      req.user = {
        id: `usr-header-${roleHeader.toLowerCase()}`,
        email: `${roleHeader.toLowerCase()}@offerguard.edu`,
        name: roleHeader === 'REVIEWER' ? 'Prof. R. Venkatesh' : roleHeader === 'ADMIN' ? 'System Admin' : 'Student Applicant',
        role: roleHeader,
        college: 'State Institute of Engineering & Technology',
      };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required. Missing authorization token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authorization token.' });
    }
    req.user = decodedUser as AuthenticatedUser;
    next();
  });
}

// RBAC Middleware
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role "${req.user.role}" does not have permission for this action. Required: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
