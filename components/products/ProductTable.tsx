'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductSummary } from '@/lib/shopify/products';
import { PriceEditor } from './PriceEditor';
import { BulkPriceModal } from './BulkPriceModal';
import { Image as ImageIcon, ExternalLink, ChevronRight, Layers, DollarSign } from 'lucide-react';

interface ProductTableProps {
  products: ProductSummary[];
  loading?: boolean;
  onRefresh: () => void;
}

export function ProductTable({ products, loading = false, onRefresh }: ProductTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));
  const isAllSelected = products.length > 0 && selectedIds.length === products.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            padding: '12px 20px',
            backgroundColor: '#18181B',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {selectedIds.length}
            </span>
            <span>ürün seçildi</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="btn btn-sm"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontWeight: 700,
                gap: 6,
              }}
            >
              <DollarSign size={13} />
              <span>Seçili Ürünlere Fiyat Uygula</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{ fontSize: 12, color: '#A1A1AA', padding: '4px 8px', textDecoration: 'underline' }}
            >
              Seçimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 44, paddingLeft: 20 }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </th>
              <th style={{ width: 68 }}>Görsel</th>
              <th>Ürün & Renk</th>
              <th style={{ width: 170 }}>Fiyat</th>
              <th style={{ width: 110 }}>Stok</th>
              <th style={{ width: 110 }}>Durum</th>
              <th style={{ width: 130, textAlign: 'right', paddingRight: 20 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        border: '3px solid #E5E7EB',
                        borderTopColor: '#000000',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Shopify ürünleri yükleniyor...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Layers size={32} color="#D1D5DB" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Ürün Bulunamadı</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>
                      Arama kriterlerinizi değiştirebilir veya yeni ürün ekleyebilirsiniz.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr
                    key={product.id}
                    style={{
                      backgroundColor: isSelected ? '#F9FAFB' : undefined,
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ paddingLeft: 20 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(product.id, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>

                    {/* Image Thumbnail */}
                    <td>
                      <div
                        style={{
                          width: 48,
                          height: 64,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: '#F3F4F6',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={18} color="#9CA3AF" />
                        )}
                      </div>
                    </td>

                    {/* Product Name, SKU, Color */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Link
                          href={`/products/${product.numericId}`}
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#111827',
                            lineHeight: 1.3,
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#F61F1F')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#111827')}
                        >
                          {product.title}
                        </Link>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {product.colorName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: product.swatchColor || '#CCCCCC',
                                  border: '1px solid rgba(0,0,0,0.15)',
                                }}
                              />
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#4B5563' }}>
                                {product.colorName}
                              </span>
                            </div>
                          )}

                          {product.sku && (
                            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Price Editor */}
                    <td>
                      <PriceEditor
                        productId={product.id}
                        variantId={product.variantId}
                        initialPrice={product.price}
                        currencyCode={product.currencyCode}
                        onPriceUpdated={onRefresh}
                      />
                    </td>

                    {/* Stock */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: product.totalInventory > 0 ? '#10B981' : '#EF4444',
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                          {product.totalInventory}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`badge ${product.status === 'ACTIVE' ? 'badge-active' : 'badge-draft'}`}>
                        {product.status === 'ACTIVE' ? 'Aktif' : 'Taslak'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', paddingRight: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {product.onlineStoreUrl && (
                          <a
                            href={product.onlineStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 8px', color: '#6B7280' }}
                            title="Mağazada İncele"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}

                        <Link
                          href={`/products/${product.numericId}`}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 4, fontWeight: 600 }}
                        >
                          <span>Düzenle</span>
                          <ChevronRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Price Modal */}
      <BulkPriceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedProducts={selectedProducts}
        onComplete={() => {
          setSelectedIds([]);
          onRefresh();
        }}
      />
    </div>
  );
}
