'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ColorPicker } from '@/components/products/ColorPicker';
import { ImageUploader, LocalImageItem } from '@/components/products/ImageUploader';
import { PriceEditor } from '@/components/products/PriceEditor';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  Package,
  Layers,
  Loader2,
  X,
  ImageOff,
} from 'lucide-react';
import { formatPriceTRY } from '@/lib/shopify/products';
import { getColorSwatch, parseMojoProductTitle } from '@/lib/shopify/mojo';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { success, error } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Sibling Color Modal State
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('Krem');
  const [customColorHex, setCustomColorHex] = useState('');
  const [colorPrice, setColorPrice] = useState('');
  const [colorStock, setColorStock] = useState('10');
  const [colorSku, setColorSku] = useState('');
  const [colorImages, setColorImages] = useState<LocalImageItem[]>([]);
  const [isCreatingColor, setIsCreatingColor] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${resolvedParams.id}`);
      if (!res.ok) {
        throw new Error('Ürün yüklenemedi');
      }
      const data = await res.json();
      setProduct(data.product);
      if (data.product?.variants?.nodes?.[0]?.price) {
        setColorPrice(data.product.variants.nodes[0].price);
      }
    } catch (err) {
      console.error('Product load error:', err);
      error('Yükleme Hatası', 'Ürün detayı Shopify üzerinden alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, error]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleDelete = async () => {
    if (!confirm(`"${product?.title}" ürününü Shopify'dan tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/products/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Silme işlemi başarısız oldu');
      }

      success('Ürün Silindi', 'Ürün başarıyla kaldırıldı.');
      router.push('/products');
    } catch (err) {
      error('Silme Hatası', err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi');
      setIsDeleting(false);
    }
  };

  const handleCreateSiblingColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) {
      error('Renk Seçimi Gerekli', 'Lütfen geçerli bir renk seçin.');
      return;
    }

    if (colorImages.length === 0) {
      error('Görsel Gerekli', 'Yeni renk için en az 1 ürün görseli eklemelisiniz.');
      return;
    }

    try {
      setIsCreatingColor(true);

      const formData = new FormData();
      formData.append('colorName', newColorName.trim());
      if (customColorHex) {
        formData.append('customColorHex', customColorHex);
      }
      if (colorPrice.trim()) {
        formData.append('price', colorPrice.trim().replace(',', '.'));
      }
      formData.append('quantity', colorStock.trim() || '0');
      if (colorSku.trim()) {
        formData.append('sku', colorSku.trim());
      }

      colorImages.forEach((img) => {
        formData.append('images', img.file);
      });

      const res = await fetch(`/api/products/${resolvedParams.id}/color`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Renk eklenemedi');
      }

      success('Yeni Renk Eklendi', `"${data.product.title}" oluşturuldu ve kardeş renk olarak bağlandı.`);
      setIsColorModalOpen(false);
      setColorImages([]);
      loadProduct();
    } catch (err) {
      error('Renk Eklenemedi', err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setIsCreatingColor(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#6B7280' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid #E5E7EB',
              borderTopColor: '#000000',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün yükleniyor...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 500, margin: '40px auto' }}>
          <Layers size={36} color="#D1D5DB" style={{ margin: '0 auto 12px auto' }} />
          <h2 className="heading-lg">Ürün Bulunamadı</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 24 }}>
            İstediğiniz ürün Shopify üzerinde bulunamadı veya silinmiş olabilir.
          </p>
          <Link href="/products" className="btn btn-primary">
            Ürünler Listesine Dön
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const defaultVariant = product.variants?.nodes?.[0];
  const parsed = parseMojoProductTitle(product.title, product.customColorNameMetafield?.value);
  const currentColor = product.customColorNameMetafield?.value || parsed.colorName || 'Standart';
  const currentHex = product.customSwatchColorMetafield?.value || getColorSwatch(currentColor);
  const siblingProducts = product.customColorProductsMetafield?.references?.nodes || [];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Top Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Link
            href="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#6B7280',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
          >
            <ArrowLeft size={14} />
            <span>Ürünler Listesine Dön</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {product.onlineStoreUrl && (
              <a
                href={product.onlineStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ gap: 6, color: '#4B5563' }}
              >
                <ExternalLink size={13} />
                <span>Storefront&apos;ta Aç</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-danger btn-sm"
              style={{ gap: 6 }}
            >
              <Trash2 size={13} />
              <span>{isDeleting ? 'Siliniyor...' : 'Ürünü Sil'}</span>
            </button>
          </div>
        </div>

        {/* Product Overview Header */}
        <div
          className="card"
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto',
            gap: 24,
            alignItems: 'center',
            padding: 24,
          }}
        >
          {/* Main Cover Image */}
          <div
            style={{
              width: 120,
              height: 150,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#F3F4F6',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            {product.featuredImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.featuredImage.url}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 4 }}>
                <Package size={28} />
                <span style={{ fontSize: 10 }}>Görsel Yok</span>
              </div>
            )}
          </div>

          {/* Core Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${product.status === 'ACTIVE' ? 'badge-active' : 'badge-draft'}`}>
                {product.status === 'ACTIVE' ? 'Aktif' : 'Taslak'}
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                Şablon: {product.templateSuffix || 'mojo-dynamic'}
              </span>
              {product.category?.name && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#4B5563',
                    backgroundColor: '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  Kategori: {product.category.name}
                </span>
              )}
            </div>

            <h1 className="heading-lg" style={{ fontSize: 22, marginTop: 2 }}>
              {product.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
              {/* Color Swatch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: currentHex,
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  {currentColor}
                </span>
              </div>

              {/* SKU */}
              {defaultVariant?.sku && (
                <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                  SKU: {defaultVariant.sku}
                </span>
              )}

              {/* Stock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: (product.totalInventory ?? 0) > 0 ? '#10B981' : '#EF4444',
                  }}
                />
                <span>Stok: {product.totalInventory ?? 0} adet</span>
              </div>
            </div>
          </div>

          {/* Price Quick Editor */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fiyat
            </span>
            <PriceEditor
              productId={product.id}
              variantId={defaultVariant?.id}
              initialPrice={defaultVariant?.price || '0'}
              onPriceUpdated={loadProduct}
            />
          </div>
        </div>

        {/* Sibling Colors Section */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="heading-md">Model Renk Seçenekleri ({siblingProducts.length > 0 ? siblingProducts.length : 1})</h2>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                Mağazada aynı modelin diğer renk alternatifleri olarak gösterilen bağlı ürünler.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setColorImages([]);
                setIsColorModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ gap: 6, fontWeight: 700 }}
            >
              <Plus size={14} />
              <span>+ Yeni Renk Ekle</span>
            </button>
          </div>

          {/* Sibling Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {siblingProducts.length > 0 ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              siblingProducts.map((sibling: any) => {
                const sColor = sibling.customColorNameMetafield?.value || parseMojoProductTitle(sibling.title).colorName || 'Renk';
                const sHex = sibling.customSwatchColorMetafield?.value || getColorSwatch(sColor);
                const isCurrent = sibling.id === product.id;
                const hasImage = Boolean(sibling.featuredImage?.url);

                return (
                  <Link
                    key={sibling.id}
                    href={`/products/${sibling.id.split('/').pop()}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: isCurrent ? '2px solid #000000' : '1px solid var(--border-subtle)',
                      backgroundColor: isCurrent ? '#F9FAFB' : '#FFFFFF',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 60,
                        borderRadius: 4,
                        overflow: 'hidden',
                        backgroundColor: '#F3F4F6',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sibling.featuredImage.url}
                          alt={sibling.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#9CA3AF' }}>
                          <ImageOff size={16} />
                          <span style={{ fontSize: 8, fontWeight: 600 }}>Görsel Yok</span>
                        </div>
                      )}
                    </div>

                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: sHex,
                            border: '1px solid rgba(0,0,0,0.15)',
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sColor}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#F61F1F', textTransform: 'uppercase' }}>
                            (Mevcut)
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        {sibling.variants?.nodes?.[0]?.price
                          ? formatPriceTRY(sibling.variants.nodes[0].price)
                          : '—'}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '24px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: 13,
                }}
              >
                Bu model şu anda tek renklidir. &quot;+ Yeni Renk Ekle&quot; butonuna basarak kardeş renk varyantları oluşturabilirsiniz.
              </div>
            )}
          </div>
        </div>

        {/* Product Media Gallery */}
        {product.media?.nodes && product.media.nodes.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="heading-md">Ürün Görselleri ({product.media.nodes.length})</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {product.media.nodes.map((item: any, idx: number) => {
                const imgUrl = item.image?.url;
                if (!imgUrl) return null;
                const roleTag = idx === 0 ? '1 · Kapak' : idx === 1 ? '2 · Hover' : `${idx + 1} · Galeri`;

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid #000000' : '1px solid #E5E7EB',
                      paddingTop: '130%',
                      backgroundColor: '#F3F4F6',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={item.alt || product.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: idx === 0 ? '#000000' : 'rgba(0,0,0,0.6)',
                        color: '#FFFFFF',
                      }}
                    >
                      {roleTag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Sibling Color */}
      {isColorModalOpen && (
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
          onClick={() => setIsColorModalOpen(false)}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
              padding: 28,
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 className="heading-lg" style={{ fontSize: 18 }}>Yeni Renk Ekle</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  <strong>{parsed.modelTitle || product.title}</strong> için kardeş renk ürünü oluşturun
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                style={{ color: '#9CA3AF', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSiblingColor} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Color Picker */}
              <div>
                <label className="label">Renk Seçimi *</label>
                <ColorPicker
                  selectedColor={newColorName}
                  customHex={customColorHex}
                  onChange={(cName, hex) => {
                    setNewColorName(cName);
                    if (hex) setCustomColorHex(hex);
                  }}
                />
              </div>

              {/* Price & Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Fiyat (₺) *</label>
                  <input
                    type="text"
                    placeholder="1399"
                    value={colorPrice}
                    onChange={(e) => setColorPrice(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">Stok Adedi *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={colorStock}
                    onChange={(e) => setColorStock(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="label">SKU Kodu (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Otomatik Üretilir"
                  value={colorSku}
                  onChange={(e) => setColorSku(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Images (REQUIRED) */}
              <div>
                <label className="label">Yeni Rengin Görselleri *</label>
                <ImageUploader images={colorImages} onChange={setColorImages} />
                {colorImages.length === 0 && (
                  <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginTop: 6 }}>
                    * Yeni renk için en az 1 ürün görseli ekleyin.
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsColorModalOpen(false)}
                  disabled={isCreatingColor}
                  className="btn btn-secondary"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={isCreatingColor || colorImages.length === 0}
                  className="btn btn-primary"
                  style={{ minWidth: 150 }}
                >
                  {isCreatingColor ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Oluşturuluyor...</span>
                    </>
                  ) : (
                    'Rengi Oluştur & Bağla'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
