'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlusCircle, Package, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { ProductSummary } from '@/lib/shopify/products';

export default function HomePage() {
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [activeProducts, setActiveProducts] = useState<number | null>(null);
  const [recentProducts, setRecentProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await fetch('/api/products?first=10');
        if (res.ok) {
          const data = await res.json();
          const items: ProductSummary[] = data.products || [];
          setTotalProducts(items.length);
          setActiveProducts(items.filter((p) => p.status === 'ACTIVE').length);
          setRecentProducts(items.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Welcome Banner */}
        <div>
          <h1 className="heading-xl">MOJO Ürün Yönetimi</h1>
          <p className="text-muted" style={{ fontSize: 15, marginTop: 4 }}>
            Ürünlerinizi Shopify&apos;a yükleyin ve fiyatlarını hızlıca yönetin.
          </p>
        </div>

        {/* 2 Primary Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Action 1: New Product */}
          <Link
            href="/products/new"
            className="card"
            style={{
              padding: '32px 28px',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 180,
              cursor: 'pointer',
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlusCircle size={24} color="#FFFFFF" />
              </div>
              <ArrowRight size={20} color="#9CA3AF" />
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                + Yeni Ürün Ekle
              </div>
              <div style={{ fontSize: 13, color: '#A1A1AA' }}>
                Renk, fiyat, stok ve görselleriyle yeni ürün oluşturun.
              </div>
            </div>
          </Link>

          {/* Action 2: View Products */}
          <Link
            href="/products"
            className="card"
            style={{
              padding: '32px 28px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 180,
              cursor: 'pointer',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
              border: '1.5px solid #E5E7EB',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={24} color="#111827" />
              </div>
              <ArrowRight size={20} color="#9CA3AF" />
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#111827', marginBottom: 4 }}>
                Ürünleri Gör & Fiyat Yönet
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Mevcut ürünleri listeleyin, fiyatları tek tıkla güncelleyin.
              </div>
            </div>
          </Link>
        </div>

        {/* Minimal Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Total Products */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} color="#111827" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Toplam Ürün
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                {loading ? '...' : totalProducts ?? 0}
              </div>
            </div>
          </div>

          {/* Active Products */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Aktif Ürün
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                {loading ? '...' : activeProducts ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Recent Products Strip */}
        {recentProducts.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#F61F1F" />
                <h3 className="heading-md">Son Eklenen / Güncellenen Ürünler</h3>
              </div>
              <Link href="/products" style={{ fontSize: 12, fontWeight: 700, color: '#111827', textDecoration: 'underline' }}>
                Tümünü Gör
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {recentProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.numericId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#FAFAFA',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 52,
                      borderRadius: 4,
                      overflow: 'hidden',
                      backgroundColor: '#E5E7EB',
                      flexShrink: 0,
                    }}
                  >
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>

                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', marginTop: 2 }}>
                      {p.formattedPrice}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
