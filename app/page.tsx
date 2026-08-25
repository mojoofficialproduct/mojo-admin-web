'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlusCircle, Package, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { ProductSummary } from '@/lib/shopify/products';

export default function HomePage() {
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [activeProducts, setActiveProducts] = useState<number | null>(null);
  const [draftProducts, setDraftProducts] = useState<number | null>(null);
  const [recentProducts, setRecentProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await fetch('/api/products?first=50');
        if (res.ok) {
          const data = await res.json();
          const items: ProductSummary[] = data.products || [];
          setTotalProducts(items.length);
          setActiveProducts(items.filter((p) => p.status === 'ACTIVE').length);
          setDraftProducts(items.filter((p) => p.status === 'DRAFT').length);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1240, margin: '0 auto' }}>
        {/* Welcome Header */}
        <div>
          <h1 className="heading-xl">MOJO Ürün Yönetimi</h1>
          <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Ürünlerinizi Shopify&apos;a yükleyin ve fiyatlarını anlık olarak yönetin.
          </p>
        </div>

        {/* 2 Primary Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {/* Action 1: New Product */}
          <Link
            href="/products/new"
            className="card"
            style={{
              padding: '28px 24px',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 165,
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
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlusCircle size={22} color="#FFFFFF" />
              </div>
              <ArrowRight size={18} color="#9CA3AF" />
            </div>

            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                + Yeni Ürün Ekle
              </div>
              <div style={{ fontSize: 13, color: '#A1A1AA' }}>
                Kategori, renk, fiyat, stok ve görselleriyle yeni ürün oluşturun.
              </div>
            </div>
          </Link>

          {/* Action 2: View Products */}
          <Link
            href="/products"
            className="card"
            style={{
              padding: '28px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 165,
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
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={22} color="#111827" />
              </div>
              <ArrowRight size={18} color="#9CA3AF" />
            </div>

            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: '#111827', marginBottom: 4 }}>
                Ürünleri Gör & Fiyat Yönet
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Mevcut ürünleri listeleyin, fiyatları tek tıkla güncelleyin.
              </div>
            </div>
          </Link>
        </div>

        {/* 3 Real Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* Total Products */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
            <div
              style={{
                width: 40,
                height: 40,
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Toplam Ürün
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                {loading ? '...' : totalProducts ?? 0}
              </div>
            </div>
          </div>

          {/* Active Products */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
            <div
              style={{
                width: 40,
                height: 40,
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Aktif Ürün
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                {loading ? '...' : activeProducts ?? 0}
              </div>
            </div>
          </div>

          {/* Draft Products */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#FFFBEB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Taslak Ürün
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                {loading ? '...' : draftProducts ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Recent Products Strip */}
        {recentProducts.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#F61F1F" />
                <h3 className="heading-md">Son Eklenen / Güncellenen Ürünler</h3>
              </div>
              <Link href="/products" style={{ fontSize: 12, fontWeight: 700, color: '#111827', textDecoration: 'underline' }}>
                Tümünü Gör
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
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
                      width: 48,
                      height: 60,
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

                  <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#111827',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3,
                      }}
                    >
                      {p.title}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', marginTop: 4 }}>
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
