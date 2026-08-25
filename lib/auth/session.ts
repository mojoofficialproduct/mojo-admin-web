import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'mojo_admin_session';
const DEFAULT_SECRET = 'mojo_default_session_secret_key_32_chars_long!';

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret.padEnd(32, '!').slice(0, 32));
}

export interface SessionPayload {
  authenticated: boolean;
  role: 'admin';
  createdAt: number;
  expiresAt: number;
}

export async function createSession(): Promise<string> {
  const secretKey = getSecretKey();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

  const token = await new SignJWT({
    authenticated: true,
    role: 'admin',
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  let sessionToken = token;
  if (!sessionToken) {
    const cookieStore = await cookies();
    sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!sessionToken) return null;

  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(sessionToken, secretKey, {
      algorithms: ['HS256'],
    });

    if (payload.authenticated === true && payload.role === 'admin') {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await verifySession();
  return session !== null;
}
