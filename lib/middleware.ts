import { NextRequest } from 'next/server';
import { verifyToken } from './auth';

export function getAuthUser(request: NextRequest): { userId: string } | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}
