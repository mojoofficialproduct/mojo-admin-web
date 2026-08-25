'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Home, Package, PlusCircle } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Ana Sayfa',
      href: '/',
      icon: Home,
      exact: true,
    },
    {
      label: 'Ürünler',
      href: '/products',
      icon: Package,
      exact: false,
      badge: null,
    },
    {
      label: 'Yeni Ürün',
      href: '/products/new',
      icon: PlusCircle,
      exact: true,
      highlight: true,
    },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 24px 20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#000000',
            }}
          >
            MOJO
          </span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F61F1F' }} />
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6B7280',
          }}
        >
          Product & Price Studio
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 10,
                  transition: 'all var(--transition-fast)',
                  backgroundColor: isActive ? '#000000' : '#18181B',
                  color: '#FFFFFF',
                  border: '1px solid #000000',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Icon size={16} color="#FFFFFF" />
                <span>+ Yeni Ürün Ekle</span>
              </a>
            );
          }

          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                transition: 'all var(--transition-fast)',
                backgroundColor: isActive ? '#F3F4F6' : 'transparent',
                color: isActive ? '#000000' : '#4B5563',
                border: isActive ? '1px solid #E5E7EB' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.color = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4B5563';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} color={isActive ? '#000000' : '#6B7280'} />
                <span>{item.label}</span>
              </div>
            </a>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 11,
          color: '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Shopify v2026-07</span>
        <span style={{ fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
          Bağlı
        </span>
      </div>
    </aside>
  );
}
