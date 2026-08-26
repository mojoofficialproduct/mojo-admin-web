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
  Edit3,
  Check,
  Save,
  Sparkles,
} from 'lucide-react';
import { formatPriceTRY } from '@/lib/shopify/products';
import { getColorSwatch, parseMojoProductTitle } from '@/lib/shopify/mojo';
import { MOJO_TAXONOMY_CATEGORIES, getDefaultMojoCategory } from '@/lib/shopify/categories';

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

  // Edit Mode State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [collectionsList, setCollectionsList] = useState<Array<{ id: string; title: string; handle: string }>>([]);
  const [editCollectionIds, setEditCollectionIds] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProductFeatures, setEditProductFeatures] = useState('');
  const [editCategory, setEditCategory] = useState(getDefaultMojoCategory().id);
  const [editPrice, setEditPrice] = useState('');
  const [editCompareAtPrice, setEditCompareAtPrice] = useState('');
  const [editStock, setEditStock] = useState('0');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');

  // Initial Edit Values for Dirty Tracking
  const [initialEditValues, setInitialEditValues] = useState<{
    title: string;
    description: string;
    productFeatures: string;
    category: string;
    collectionIds: string[];
    price: string;
    compareAtPrice: string;
    stock: string;
    sku: string;
    barcode: string;
    tags: string;
    status: 'ACTIVE' | 'DRAFT';
  }>({
    title: '',
    description: '',
    productFeatures: '',
    category: getDefaultMojoCategory().id,
    collectionIds: [],
    price: '',
    compareAtPrice: '',
    stock: '0',
    sku: '',
    barcode: '',
    tags: '',
    status: 'ACTIVE',
  });

  // New Sibling Color Modal State
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('Bordo');
  const [customColorHex, setCustomColorHex] = useState('');
  const [colorPrice, setColorPrice] = useState('');
  const [colorCompareAtPrice, setColorCompareAtPrice] = useState('');
  const [colorStock, setColorStock] = useState('10');
  const [colorSku, setColorSku] = useState('');
  const [colorBarcode, setColorBarcode] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [colorProductFeatures, setColorProductFeatures] = useState('');
  const [colorCategory, setColorCategory] = useState(getDefaultMojoCategory().id);
  const [colorCollectionIds, setColorCollectionIds] = useState<string[]>([]);
  const [colorProductType, setColorProductType] = useState('Çanta');
  const [colorTags, setColorTags] = useState('çanta, kadın');
  const [colorWeight, setColorWeight] = useState('');
  const [colorStatus, setColorStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
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
      const p = data.product;
      setProduct(p);

      try {
        const colRes = await fetch('/api/collections');
        if (colRes.ok) {
          const colData = await colRes.json();
          if (colData.collections) setCollectionsList(colData.collections);
        }
      } catch (colErr) {
        console.warn('Koleksiyonlar yüklenemedi:', colErr);
      }

      const prodColIds: string[] = p?.collections?.nodes?.map((c: { id: string }) => c.id) || [];
      const firstVar = p?.variants?.nodes?.[0];
      const initialPrice = firstVar?.price || '';
      const initialCompareAt = firstVar?.compareAtPrice || '';
      const initialSku = firstVar?.sku || '';
      const initialBarcode = firstVar?.barcode || '';
      const initialTitle = p?.title || '';
      const initialDesc = p?.descriptionHtml ? p.descriptionHtml.replace(/<[^>]*>?/gm, '') : '';
      const initialCat = p?.category?.id || getDefaultMojoCategory().id;
      const initialStock = p?.totalInventory !== undefined ? String(p.totalInventory) : '0';
      const initialStatus = (p?.status as 'ACTIVE' | 'DRAFT') || 'ACTIVE';
      const initialTags = p?.tags ? (Array.isArray(p.tags) ? p.tags.join(', ') : String(p.tags)) : '';
      const initialFeatures = p?.customProductFeaturesMetafield?.value || '';

      setEditTitle(initialTitle);
      setEditDescription(initialDesc);
      setEditProductFeatures(initialFeatures);
      setEditCategory(initialCat);
      setEditCollectionIds(prodColIds);
      setEditPrice(initialPrice);
      setEditCompareAtPrice(initialCompareAt);
      setEditStock(initialStock);
      setEditSku(initialSku);
      setEditBarcode(initialBarcode);
      setEditStatus(initialStatus);
      setEditTags(initialTags);

      setInitialEditValues({
        title: initialTitle,
        description: initialDesc,
        productFeatures: initialFeatures,
        category: initialCat,
        collectionIds: prodColIds,
        price: initialPrice,
        compareAtPrice: initialCompareAt,
        stock: initialStock,
        sku: initialSku,
        barcode: initialBarcode,
        tags: initialTags,
        status: initialStatus,
      });

      setColorPrice(initialPrice);
      setColorCompareAtPrice(initialCompareAt);
      setColorCategory(initialCat);
      setColorCollectionIds(prodColIds);
      setColorProductType(p?.productType || 'Çanta');
      setColorDescription(initialDesc);
      setColorProductFeatures(initialFeatures);
      setColorTags(initialTags);
      setColorStock(initialStock);
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

  // Dirty state tracking for edit form
  const isEditDirty =
    editTitle !== initialEditValues.title ||
    editDescription !== initialEditValues.description ||
    editProductFeatures !== initialEditValues.productFeatures ||
    editCategory !== initialEditValues.category ||
    editPrice !== initialEditValues.price ||
    editCompareAtPrice !== initialEditValues.compareAtPrice ||
    editStock !== initialEditValues.stock ||
    editSku !== initialEditValues.sku ||
    editBarcode !== initialEditValues.barcode ||
    editTags !== initialEditValues.tags ||
    editStatus !== initialEditValues.status ||
    JSON.stringify(editCollectionIds.slice().sort()) !== JSON.stringify(initialEditValues.collectionIds.slice().sort());

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditDirty) return;

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/products/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          descriptionHtml: editDescription.trim() ? `<p>${editDescription.trim().replace(/\n/g, '<br/>')}</p>` : '',
          productFeatures: editProductFeatures.trim(),
          categoryId: editCategory,
          collectionIds: editCollectionIds,
          price: editPrice.trim().replace(',', '.'),
          compareAtPrice: editCompareAtPrice.trim() ? editCompareAtPrice.trim().replace(',', '.') : undefined,
          quantity: editStock.trim() || '0',
          sku: editSku.trim(),
          barcode: editBarcode.trim(),
          tags: editTags.trim(),
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Güncelleme başarısız');
      }

      success('Bilgiler Güncellendi', 'Ürün detayları Shopify üzerinde başarıyla güncellendi.');
      setIsEditingInfo(false);
      loadProduct();
    } catch (err) {
      error('Güncelleme Hatası', err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setIsSavingEdit(false);
    }
  };

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

  const handlePrefillFromSource = () => {
    if (!product) return;
    const firstVar = product.variants?.nodes?.[0];
    if (firstVar?.price) setColorPrice(firstVar.price);
    if (firstVar?.compareAtPrice) setColorCompareAtPrice(firstVar.compareAtPrice);
    if (product.totalInventory !== undefined) setColorStock(String(product.totalInventory));
    if (product.descriptionHtml) setColorDescription(product.descriptionHtml.replace(/<[^>]*>?/gm, ''));
    if (product.customProductFeaturesMetafield?.value) setColorProductFeatures(product.customProductFeaturesMetafield.value);
    if (product.category?.id) setColorCategory(product.category.id);
    const prodColIds: string[] = product?.collections?.nodes?.map((c: { id: string }) => c.id) || [];
    setColorCollectionIds(prodColIds);
    if (product.productType) setColorProductType(product.productType);
    if (product.tags) setColorTags(Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags));
    if (firstVar?.barcode) setColorBarcode(firstVar.barcode);
    if (product.status) setColorStatus(product.status);
    success('Bilgiler Dolduruldu', 'Kaynak ürün bilgileri form alanlarına aktarıldı. İstediğiniz alanları özelleştirebilirsiniz.');
  };

  const handleOpenColorModal = () => {
    setColorImages([]);
    if (product) {
      const firstVar = product.variants?.nodes?.[0];
      if (firstVar?.price) setColorPrice(firstVar.price);
      if (firstVar?.compareAtPrice) setColorCompareAtPrice(firstVar.compareAtPrice);
      if (product.category?.id) setColorCategory(product.category.id);
      const prodColIds: string[] = product?.collections?.nodes?.map((c: { id: string }) => c.id) || [];
      setColorCollectionIds(prodColIds);
      if (product.productType) setColorProductType(product.productType);
      if (product.descriptionHtml) setColorDescription(product.descriptionHtml.replace(/<[^>]*>?/gm, ''));
      if (product.customProductFeaturesMetafield?.value) setColorProductFeatures(product.customProductFeaturesMetafield.value);
      if (product.tags) setColorTags(Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags));
      if (product.totalInventory !== undefined) setColorStock(String(product.totalInventory));
      setColorSku('');
      setColorBarcode('');
      setColorWeight('');
      setColorStatus('ACTIVE');
    }
    setIsColorModalOpen(true);
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
      if (colorCompareAtPrice.trim()) {
        formData.append('compareAtPrice', colorCompareAtPrice.trim().replace(',', '.'));
      }
      formData.append('quantity', colorStock.trim() || '0');
      if (colorSku.trim()) {
        formData.append('sku', colorSku.trim());
      }
      if (colorBarcode.trim()) {
        formData.append('barcode', colorBarcode.trim());
      }
      if (colorDescription.trim()) {
        const html = colorDescription
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            if (line.startsWith('• ') || line.startsWith('- ')) {
              return `<li>${line.slice(2).trim()}</li>`;
            }
            return `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>`;
          })
          .join('');
        formData.append('descriptionHtml', html || `<p>${colorDescription.trim()}</p>`);
      }
      if (colorProductFeatures.trim()) {
        formData.append('productFeatures', colorProductFeatures.trim());
      }
      if (colorCategory) {
        formData.append('categoryId', colorCategory);
      }
      if (colorCollectionIds.length > 0) {
        colorCollectionIds.forEach((cid) => {
          formData.append('collectionIds', cid);
        });
        formData.append('collectionIdsJson', JSON.stringify(colorCollectionIds));
      }
      if (colorProductType.trim()) {
        formData.append('productType', colorProductType.trim());
      }
      if (colorTags.trim()) {
        formData.append('tags', colorTags.trim());
      }
      if (colorWeight.trim()) {
        formData.append('weight', colorWeight.trim().replace(',', '.'));
      }
      formData.append('status', colorStatus);

      // Append binary files
      colorImages.forEach((item) => {
        formData.append('images', item.file);
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
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, color: isEditingInfo ? '#000000' : '#4B5563', borderColor: isEditingInfo ? '#000000' : undefined }}
            >
              <Edit3 size={13} />
              <span>{isEditingInfo ? 'Düzenlemeyi Kapat' : 'Bilgileri Düzenle'}</span>
            </button>

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

        {/* Inline Edit Form (When Active) */}
        {isEditingInfo && (
          <form onSubmit={handleSaveEdit} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, border: '2px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} color="#111827" />
                <h2 className="heading-md" style={{ fontSize: 16 }}>Ürün Bilgilerini Düzenle</h2>
              </div>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Değişiklikler anında Shopify&apos;a kaydedilir</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Ürün Başlığı</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Kategori</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="input-field"
                >
                  {MOJO_TAXONOMY_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Satış Fiyatı (TRY)</label>
                <input
                  type="text"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Karşılaştırma Fiyatı</label>
                <input
                  type="text"
                  placeholder="Opsiyonel"
                  value={editCompareAtPrice}
                  onChange={(e) => setEditCompareAtPrice(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Stok Adedi</label>
                <input
                  type="number"
                  min="0"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">SKU</label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Barkod</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label">Ürün Açıklaması</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  Ürün Özellikleri (custom.mojo_product_features)
                </label>
                <span style={{ fontSize: 11, color: '#F61F1F', fontWeight: 600 }}>PDP Akordiyon / Teknik Özellikler</span>
              </div>
              <textarea
                rows={3}
                placeholder="Ölçüler, bölmeler, materyal bilgileri..."
                value={editProductFeatures}
                onChange={(e) => setEditProductFeatures(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Collections Selector */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  Koleksiyonlar (Anasayfa & Kategori Listeleri)
                </label>
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {editCollectionIds.length} koleksiyon seçildi
                </span>
              </div>
              {collectionsList.length > 0 ? (
                <div
                  style={{
                    maxHeight: 120,
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {collectionsList.map((col) => {
                    const isChecked = editCollectionIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          cursor: 'pointer',
                          padding: '2px 0',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditCollectionIds((prev) => [...prev, col.id]);
                            } else {
                              setEditCollectionIds((prev) => prev.filter((id) => id !== col.id));
                            }
                          }}
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#111827' : '#374151' }}>
                          {col.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                  Koleksiyonlar yükleniyor...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setIsEditingInfo(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="btn btn-primary"
                style={{ gap: 6 }}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Değişiklikleri Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

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
              onClick={handleOpenColorModal}
              className="btn btn-primary btn-sm"
              style={{ gap: 6, fontWeight: 700 }}
            >
              <Plus size={14} />
              <span>Yeni Renk Ekle</span>
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
                Bu model şu anda tek renklidir. &quot;Yeni Renk Ekle&quot; butonuna basarak kardeş renk varyantları oluşturabilirsiniz.
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
              maxWidth: 680,
              maxHeight: '92vh',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
              padding: 28,
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
              <div>
                <h3 className="heading-lg" style={{ fontSize: 20 }}>Yeni Renk Ürünü</h3>
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  <strong>{parsed.modelTitle || product.title}</strong> modeli için ayrı ürün kaydı oluşturun ve kardeş renk olarak bağlayın.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                style={{ color: '#9CA3AF', padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Source Product Info & Quick Prefill Bar */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Model</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    {parsed.modelTitle || product.title}
                  </div>
                </div>
                <div style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Model Grubu</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>
                    Mojo Sibling Group
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrefillFromSource}
                className="btn btn-secondary btn-sm"
                style={{ gap: 6, fontSize: 12 }}
              >
                <Sparkles size={13} color="#D97706" />
                <span>Kaynak Üründen Bilgileri Doldur</span>
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

              {/* Dynamic Title Preview */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Ürün Başlığı:</span>
                <strong style={{ color: '#111827' }}>
                  {parsed.modelTitle || product.title} - {newColorName}
                </strong>
              </div>

              {/* Price & Compare-At Price & Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Fiyat (TRY) *</label>
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
                  <label className="label">Karşılaştırma Fiyatı</label>
                  <input
                    type="text"
                    placeholder="Opsiyonel (örn. 1799)"
                    value={colorCompareAtPrice}
                    onChange={(e) => setColorCompareAtPrice(e.target.value)}
                    className="input-field"
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

              {/* Category & Product Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label className="label">Shopify Kategorisi</label>
                  <select
                    value={colorCategory}
                    onChange={(e) => setColorCategory(e.target.value)}
                    className="input-field"
                  >
                    {MOJO_TAXONOMY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Ürün Türü</label>
                  <input
                    type="text"
                    placeholder="Çanta"
                    value={colorProductType}
                    onChange={(e) => setColorProductType(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Collections Selector in Modal */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="label" style={{ marginBottom: 0 }}>
                    Koleksiyonlar (Kaynak Üründen Ön Tanımlı)
                  </label>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    {colorCollectionIds.length} koleksiyon seçildi
                  </span>
                </div>
                {collectionsList.length > 0 ? (
                  <div
                    style={{
                      maxHeight: 110,
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {collectionsList.map((col) => {
                      const isChecked = colorCollectionIds.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            cursor: 'pointer',
                            padding: '2px 0',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setColorCollectionIds((prev) => [...prev, col.id]);
                              } else {
                                setColorCollectionIds((prev) => prev.filter((id) => id !== col.id));
                              }
                            }}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#111827' : '#374151' }}>
                            {col.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                    Koleksiyonlar yükleniyor...
                  </div>
                )}
              </div>

              {/* SKU & Barcode & Weight */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 12 }}>
                <div>
                  <label className="label">SKU Kodu (Opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="Otomatik Üretilir (Benzersiz)"
                    value={colorSku}
                    onChange={(e) => setColorSku(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Barkod</label>
                  <input
                    type="text"
                    placeholder="Opsiyonel"
                    value={colorBarcode}
                    onChange={(e) => setColorBarcode(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Ağırlık (kg)</label>
                  <input
                    type="text"
                    placeholder="0.5"
                    value={colorWeight}
                    onChange={(e) => setColorWeight(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Tags & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Etiketler (Virgülle ayırın)</label>
                  <input
                    type="text"
                    placeholder="çanta, kadın, omuz çantası"
                    value={colorTags}
                    onChange={(e) => setColorTags(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Yayın Durumu</label>
                  <select
                    value={colorStatus}
                    onChange={(e) => setColorStatus(e.target.value as 'ACTIVE' | 'DRAFT')}
                    className="input-field"
                  >
                    <option value="ACTIVE">Aktif (Online Store + POS)</option>
                    <option value="DRAFT">Taslak</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Ürün Açıklaması (Opsiyonel / Renge Özel)</label>
                <textarea
                  rows={3}
                  placeholder="Ürün açıklaması..."
                  value={colorDescription}
                  onChange={(e) => setColorDescription(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Product Features */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>
                    Ürün Özellikleri (Kaynak Üründen Ön Tanımlı)
                  </label>
                  <span style={{ fontSize: 11, color: '#F61F1F', fontWeight: 600 }}>custom.mojo_product_features</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Kaynak üründen devralınan özellikler veya renge özel teknik detaylar..."
                  value={colorProductFeatures}
                  onChange={(e) => setColorProductFeatures(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Images (REQUIRED) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Yeni Rengin Görselleri *</label>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>1 = Kapak, 2 = Hover, 3+ = Galeri</span>
                </div>
                <ImageUploader images={colorImages} onChange={setColorImages} />
                {colorImages.length === 0 && (
                  <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginTop: 6 }}>
                    * Yeni renk için en az 1 ürün görseli yüklemelisiniz.
                  </p>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
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
                  style={{ minWidth: 200, gap: 8 }}
                >
                  {isCreatingColor ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Rengi Oluşturuluyor...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Rengi Oluştur & Bağla</span>
                    </>
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
