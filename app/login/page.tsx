'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { success, error } = useToast();

  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      error('Şifre Gerekli', 'Lütfen yönetici şifrenizi girin.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Geçersiz şifre.');
      }

      success('Giriş Başarılı', 'Yönetim paneline yönlendiriliyorsunuz...');
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      error('Giriş Yapılamadı', err instanceof Error ? err.message : 'Hatalı şifre.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label className="label">Yönetici Şifresi</label>
        <div style={{ position: 'relative' }}>
          <Lock
            size={16}
            color="#9CA3AF"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 38 }}
            autoFocus
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary btn-lg"
        style={{
          width: '100%',
          gap: 8,
          padding: '13px',
          fontSize: 14,
          fontWeight: 700,
          backgroundColor: '#000000',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Giriş Yapılıyor...</span>
          </>
        ) : (
          <>
            <span>Giriş Yap</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        padding: 20,
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#000000',
              marginBottom: 8,
            }}
          >
            <span>MOJO</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F61F1F' }} />
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            Ürün Yönetim Paneli
          </h1>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
            Devam etmek için yönetici şifrenizi girin
          </p>
        </div>

        {/* Suspense-wrapped form */}
        <Suspense
          fallback={
            <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer Security Badge */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            color: '#9CA3AF',
          }}
        >
          <ShieldCheck size={14} color="#10B981" />
          <span>Shopify Admin API Güvenli Bağlantısı</span>
        </div>
      </div>
    </div>
  );
}
