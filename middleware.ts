import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'mojo_admin_session';
const DEFAULT_SECRET = 'mojo_default_session_secret_key_32_chars_long!';

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret.padEnd(32, '!').slice(0, 32));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internal files, favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|webp|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public auth endpoints
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // Verify session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const secretKey = getSecretKey();
      const { payload } = await jwtVerify(sessionCookie, secretKey, {
        algorithms: ['HS256'],
      });
      if (payload.authenticated === true && payload.role === 'admin') {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and accessing login page
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
