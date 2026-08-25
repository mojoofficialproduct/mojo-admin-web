'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, Edit2, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatPriceTRY } from '@/lib/shopify/products';

interface PriceEditorProps {
  productId: string;
  variantId?: string;
  initialPrice: string;
  currencyCode?: string;
  onPriceUpdated?: (newPrice: string) => void;
}

export function PriceEditor({
  productId,
  variantId,
  initialPrice,
  currencyCode = 'TRY',
  onPriceUpdated,
}: PriceEditorProps) {
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(initialPrice);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPrice(initialPrice);
    setPriceInput(initialPrice);
  }, [initialPrice]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const cleanNum = parseFloat(priceInput.replace(',', '.'));
    if (isNaN(cleanNum) || cleanNum < 0) {
      error('Geçersiz fiyat', 'Lütfen geçerli bir tutar girin.');
      return;
    }

    if (!variantId) {
      error('Hata', 'Ürün varyant kimliği bulunamadı.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/products/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          price: cleanNum.toString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fiyat güncellenemedi');
      }

      const updated = data.updatedPrice || cleanNum.toFixed(2);
      setCurrentPrice(updated);
      setPriceInput(updated);
      setIsEditing(false);
      success('Fiyat güncellendi.', `Yeni fiyat: ${formatPriceTRY(updated, currencyCode)}`);
      onPriceUpdated?.(updated);
    } catch (err) {
      error('Fiyat güncellenemedi', err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setPriceInput(currentPrice);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#FFFFFF',
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid #000000',
          width: 'fit-content',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', paddingLeft: 4 }}>₺</span>
        <input
          ref={inputRef}
          type="text"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          style={{
            width: 80,
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontWeight: 700,
            color: '#111827',
            padding: '4px 0',
          }}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: 4,
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Kaydet (Enter)"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>

        <button
          type="button"
          onClick={() => {
            setPriceInput(currentPrice);
            setIsEditing(false);
          }}
          disabled={isSaving}
          style={{
            padding: 4,
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="İptal (Esc)"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        margin: '-4px -8px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F3F4F6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title="Fiyatı hızlı düzenlemek için tıklayın"
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
        {formatPriceTRY(currentPrice, currencyCode)}
      </span>
      <Edit2 size={12} color="#9CA3AF" />
    </div>
  );
}
