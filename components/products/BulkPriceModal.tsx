'use client';

import React, { useState } from 'react';
import { X, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { formatPriceTRY, ProductSummary } from '@/lib/shopify/products';
import { useToast } from '@/components/ui/Toast';

interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: ProductSummary[];
  onComplete: () => void;
}

export function BulkPriceModal({
  isOpen,
  onClose,
  selectedProducts,
  onComplete,
}: BulkPriceModalProps) {
  const { success, error } = useToast();
  const [newPrice, setNewPrice] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const validProducts = selectedProducts.filter((p) => Boolean(p.variantId));
  const cleanPrice = parseFloat(newPrice.replace(',', '.'));
  const isValidPrice = !isNaN(cleanPrice) && cleanPrice > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPrice) {
      error('Geçersiz Fiyat', 'Lütfen geçerli bir tutar girin.');
      return;
    }

    if (!isConfirmed) {
      setIsConfirmed(true);
      return;
    }

    try {
      setIsUpdating(true);
      const items = validProducts.map((p) => ({
        productId: p.id,
        variantId: p.variantId as string,
        price: cleanPrice.toString(),
      }));

      const res = await fetch('/api/products/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Toplu güncelleme başarısız oldu');
      }

      success(
        'Toplu fiyat güncellendi',
        `${data.successCount} ürünün fiyatı ${formatPriceTRY(cleanPrice)} olarak ayarlandı.`
      );
      onComplete();
      onClose();
    } catch (err) {
      error('Toplu güncelleme hatası', err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi');
    } finally {
      setIsUpdating(false);
      setIsConfirmed(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} color="#111827" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Toplu Fiyat Güncelle</h3>
              <p style={{ fontSize: 12, color: '#6B7280' }}>
                {validProducts.length} seçili ürünün fiyatını eşitleyin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ color: '#9CA3AF', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isConfirmed ? (
            <>
              <div>
                <label className="label">Seçili Ürünlere Yeni Fiyat Uygula (₺)</label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 700,
                      color: '#6B7280',
                    }}
                  >
                    ₺
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Örn: 1499"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: 32, fontSize: 16, fontWeight: 700 }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Selected summary */}
              <div
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FAFAFA',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {validProducts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                      {p.title}
                    </span>
                    <span style={{ color: '#6B7280' }}>
                      {p.formattedPrice}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!isValidPrice}
                  className="btn btn-primary"
                  style={{ fontSize: 13 }}
                >
                  Devam Et
                </button>
              </div>
            </>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <AlertCircle size={20} color="#F61F1F" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Onay Gerekiyor</div>
                  <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4, lineHeight: 1.4 }}>
                    <strong>{validProducts.length}</strong> ürünün fiyatı{' '}
                    <strong>{formatPriceTRY(cleanPrice)}</strong> olarak güncellenecek.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmed(false)}
                  disabled={isUpdating}
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-danger"
                  style={{ fontSize: 13, minWidth: 120 }}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Güncelleniyor...</span>
                    </>
                  ) : (
                    'Onayla ve Güncelle'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
