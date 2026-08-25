'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Store, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function Header() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        success('Çıkış yapıldı', 'Güvenli şekilde oturumunuz sonlandırıldı.');
        router.push('/login');
        router.refresh();
      }
    } catch {
      error('Çıkış yapılamadı', 'Lütfen tekrar deneyin.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>MOJO</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#F61F1F' }} />
        </div>
        <div style={{ width: 1, height: 18, backgroundColor: '#E5E7EB' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>Ürün Yönetimi</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a
          href="https://mojoofficial.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ gap: 5, color: '#6B7280' }}
        >
          <Store size={14} />
          <span>Mağazayı Gör</span>
          <ArrowUpRight size={12} />
        </a>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn-secondary btn-sm"
          style={{
            gap: 6,
            color: '#EF4444',
            borderColor: '#FEE2E2',
            backgroundColor: '#FEF2F2',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.borderColor = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FEE2E2';
          }}
        >
          <LogOut size={13} />
          <span>{loggingOut ? 'Çıkış yapılıyor...' : 'Çıkış'}</span>
        </button>
      </div>
    </header>
  );
}
