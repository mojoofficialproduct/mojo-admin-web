'use client';

import React from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProductForm } from '@/components/products/ProductForm';
import { ArrowLeft } from 'lucide-react';

export default function NewProductPage() {
  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
        {/* Top Back Nav & Header */}
        <div>
          <Link
            href="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#6B7280',
              marginBottom: 12,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
          >
            <ArrowLeft size={14} />
            <span>Ürünler Listesine Dön</span>
          </Link>

          <h1 className="heading-xl">Yeni Ürün Ekle</h1>
          <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
            MOJO dinamik şablonu (mojo-dynamic) ile uyumlu yeni bir ürün oluşturun.
          </p>
        </div>

        {/* Form Container */}
        <ProductForm />
      </div>
    </AdminLayout>
  );
}
