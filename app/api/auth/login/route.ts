import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: 'Geçersiz şifre.' }, { status: 401 });
    }

    await createSession();

    return NextResponse.json({ success: true, message: 'Giriş başarılı' });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Giriş işlemi sırasında hata oluştu.' }, { status: 500 });
  }
}
