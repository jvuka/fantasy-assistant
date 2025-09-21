import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set');
}

const secret = new TextEncoder().encode(SESSION_SECRET);

export interface SessionData {
  state?: string;
  code_verifier?: string;
  returnTo?: string;
  access_token?: string;
  refresh_token?: string;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('fantasy-assistant-session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, secret);
    return payload as SessionData;
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const payload = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // 1 hour expiry
    .sign(secret);

  const cookieStore = cookies();
  cookieStore.set('fantasy-assistant-session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete('fantasy-assistant-session');
}