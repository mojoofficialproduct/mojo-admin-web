'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProductSearch } from '@/components/products/ProductSearch';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductSummary } from '@/lib/shopify/products';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ProductsPage() {
  const { error } = useToast();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadProducts = useCallback(async (search = '', status = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (status && status !== 'ALL') params.set('status', status);
      params.set('first', '50');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Ürünler alınamadı');
      }

      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Products load error:', err);
      error('Yükleme Hatası', 'Shopify ürün listesi getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(searchTerm, statusFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, loadProducts]);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="heading-xl">Ürünler</h1>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
              Shopify mağazanızdaki ürünleri inceleyin ve fiyatlarını hızlıca güncelleyin.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => loadProducts(searchTerm, statusFilter)}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, color: '#4B5563' }}
              title="Yenile"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Yenile</span>
            </button>

            <Link
              href="/products/new"
              className="btn btn-primary"
              style={{ gap: 6, fontWeight: 700 }}
            >
              <PlusCircle size={15} />
              <span>Yeni Ürün Ekle</span>
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <ProductSearch
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
        />

        {/* Products Table */}
        <ProductTable
          products={products}
          loading={loading}
          onRefresh={() => loadProducts(searchTerm, statusFilter)}
        />
      </div>
    </AdminLayout>
  );
}
