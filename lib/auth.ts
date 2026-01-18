import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string, name: string): Promise<User> {
  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(password);
  const user: User = {
    id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    name,
    createdAt: new Date().toISOString(),
  };

  db.createUser(user);
  return { ...user, password: '' }; // Don't return password
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const user = db.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user.id);
  return { user: { ...user, password: '' }, token };
}
