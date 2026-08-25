'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColorPicker } from './ColorPicker';
import { ImageUploader, LocalImageItem } from './ImageUploader';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle2, ArrowRight, Plus, Eye, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { MOJO_TAXONOMY_CATEGORIES, getDefaultMojoCategory } from '@/lib/shopify/categories';

export function ProductForm() {
  const router = useRouter();
  const { success, error, warning } = useToast();

  // Form State
  const [modelTitle, setModelTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(getDefaultMojoCategory().id);
  const [selectedColor, setSelectedColor] = useState('Siyah');
  const [customColorHex, setCustomColorHex] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [images, setImages] = useState<LocalImageItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProductResult, setCreatedProductResult] = useState<{
    id: string;
    numericId: string;
    title: string;
    publicationWarning?: string;
  } | null>(null);

  // Dynamic preview title: "Luna Omuz Çantası - Krem"
  const previewTitle = modelTitle.trim()
    ? modelTitle.includes(' - ')
      ? modelTitle.trim()
      : `${modelTitle.trim()} - ${selectedColor}`
    : `Model Adı - ${selectedColor}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modelTitle.trim()) {
      error('Eksik Alan', 'Lütfen bir ürün adı (model) girin.');
      return;
    }
    if (!selectedColor.trim()) {
      error('Eksik Alan', 'Lütfen bir renk seçin.');
      return;
    }
    if (!price.trim()) {
      error('Eksik Alan', 'Lütfen ürün fiyatını girin.');
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('modelTitle', modelTitle.trim());
      formData.append('categoryId', selectedCategoryId);
      formData.append('colorName', selectedColor.trim());
      if (customColorHex) {
        formData.append('customColorHex', customColorHex);
      }
      formData.append('price', price.trim().replace(',', '.'));
      if (compareAtPrice.trim()) {
        formData.append('compareAtPrice', compareAtPrice.trim().replace(',', '.'));
      }
      formData.append('quantity', quantity.trim() || '0');
      if (sku.trim()) {
        formData.append('sku', sku.trim());
      }
      if (description.trim()) {
        formData.append('descriptionHtml', `<p>${description.trim().replace(/\n/g, '<br/>')}</p>`);
      }
      formData.append('status', status);

      // Append binary files
      images.forEach((item) => {
        formData.append('images', item.file);
      });

      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ürün oluşturulurken bir hata oluştu');
      }

      if (data.publicationWarning) {
        warning('Satış Kanalı Uyarısı', data.publicationWarning);
      } else {
        success('Ürün Oluşturuldu & Yayınlandı', `"${data.product.title}" Online Store ve POS kanallarına başarıyla yayınlandı.`);
      }

      setCreatedProductResult({
        id: data.product.id,
        numericId: data.product.numericId,
        title: data.product.title,
        publicationWarning: data.publicationWarning,
      });
    } catch (err) {
      error('Ürün Oluşturulamadı', err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setModelTitle('');
    setSelectedCategoryId(getDefaultMojoCategory().id);
    setSelectedColor('Siyah');
    setCustomColorHex('');
    setPrice('');
    setCompareAtPrice('');
    setQuantity('10');
    setSku('');
    setDescription('');
    setStatus('ACTIVE');
    setImages([]);
    setCreatedProductResult(null);
  };

  // Success State View
  if (createdProductResult) {
    return (
      <div className="card animate-fade-in" style={{ padding: 48, textAlign: 'center', maxWidth: 620, margin: '40px auto' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: createdProductResult.publicationWarning ? '#FEF3C7' : '#ECFDF5',
            color: createdProductResult.publicationWarning ? '#D97706' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h2 className="heading-xl" style={{ fontSize: 24, marginBottom: 8 }}>
          Ürün Shopify&apos;a Eklendi
        </h2>
        <p className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
          <strong>{createdProductResult.title}</strong> ürünü mağazanıza başarıyla yüklendi, stok ve şablon ayarları tamamlandı.
        </p>

        {createdProductResult.publicationWarning ? (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              color: '#B91C1C',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            ⚠️ <strong>Yayın Durumu:</strong> {createdProductResult.publicationWarning}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              color: '#15803D',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 24,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✓ Online Store ve Point of Sale kanallarında aktif (Kanallar: 2)
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link
            href={`/products/${createdProductResult.numericId}`}
            className="btn btn-primary btn-lg"
            style={{ gap: 8 }}
          >
            <Eye size={16} />
            <span>Ürünü Gör & Renk Ekle</span>
          </Link>

          <button
            type="button"
            onClick={handleResetForm}
            className="btn btn-secondary btn-lg"
            style={{ gap: 8 }}
          >
            <Plus size={16} />
            <span>Yeni Ürün Ekle</span>
          </button>

          <Link
            href="/products"
            className="btn btn-secondary btn-lg"
            style={{ gap: 8 }}
          >
            <span>Ürünler Listesine Dön</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 28, alignItems: 'start' }}>
        {/* Left Column: Product Info & Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Basic Info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="heading-md">Ürün Temel Bilgileri</h3>

            {/* Model Name */}
            <div>
              <label className="label">
                Ürün Adı (Model) <span style={{ color: '#F61F1F' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Pristine 3 Gözlü Çapraz Çanta"
                value={modelTitle}
                onChange={(e) => setModelTitle(e.target.value)}
                className="input-field"
                required
              />

              {/* Title Auto Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: '#6B7280',
                  backgroundColor: '#F9FAFB',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #F3F4F6',
                }}
              >
                <Sparkles size={13} color="#F61F1F" />
                <span>
                  Shopify Başlığı: <strong>{previewTitle}</strong>
                </span>
              </div>
            </div>

            {/* Category (Shopify Standard Taxonomy) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  Kategori <span style={{ color: '#F61F1F' }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Shopify Standart Taksonomisi</span>
              </div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="input-field"
                style={{ appearance: 'auto', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                {MOJO_TAXONOMY_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="label">Ürün Açıklaması</label>
              <textarea
                rows={4}
                placeholder="Ürünün malzeme, ebat ve genel özelliklerini yazın..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Card: Images */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 className="heading-md">Ürün Görselleri</h3>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                1. görsel kapak resmi, 2. görsel hover resmi olarak kullanılacaktır.
              </p>
            </div>

            <ImageUploader images={images} onChange={setImages} />
          </div>
        </div>

        {/* Right Column: Color, Price, Stock, Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Color Selection */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="heading-md">
                Ana Renk <span style={{ color: '#F61F1F' }}>*</span>
              </h3>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
                {selectedColor}
              </span>
            </div>

            <ColorPicker
              selectedColor={selectedColor}
              customHex={customColorHex}
              onChange={(colorName, hex) => {
                setSelectedColor(colorName);
                if (hex) setCustomColorHex(hex);
              }}
            />
          </div>

          {/* Card: Price & Stock */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="heading-md">Fiyat & Stok</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Price */}
              <div>
                <label className="label">
                  Fiyat (₺) <span style={{ color: '#F61F1F' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="1399"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              {/* Compare Price */}
              <div>
                <label className="label">İndirimsiz Fiyat (₺)</label>
                <input
                  type="text"
                  placeholder="1799"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Stock */}
              <div>
                <label className="label">
                  Stok Adedi <span style={{ color: '#F61F1F' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {/* SKU */}
              <div>
                <label className="label">SKU Kodu</label>
                <input
                  type="text"
                  placeholder="Otomatik Üretilir"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>
          </div>

          {/* Card: Publication Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 className="heading-md">Yayın Durumu</h3>

            <div style={{ display: 'flex', gap: 12 }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: status === 'ACTIVE' ? '1.5px solid #000000' : '1px solid var(--border-medium)',
                  backgroundColor: status === 'ACTIVE' ? '#F9FAFB' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <input
                  type="radio"
                  name="product_status"
                  checked={status === 'ACTIVE'}
                  onChange={() => setStatus('ACTIVE')}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div>Aktif</div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>
                    Online Store&apos;da yayınlanır
                  </div>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: status === 'DRAFT' ? '1.5px solid #000000' : '1px solid var(--border-medium)',
                  backgroundColor: status === 'DRAFT' ? '#F9FAFB' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <input
                  type="radio"
                  name="product_status"
                  checked={status === 'DRAFT'}
                  onChange={() => setStatus('DRAFT')}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div>Taslak</div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>
                    Gizli olarak kaydedilir
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.04em',
              backgroundColor: '#000000',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Shopify&apos;a Yükleniyor...</span>
              </>
            ) : (
              'Ürünü Oluştur'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
