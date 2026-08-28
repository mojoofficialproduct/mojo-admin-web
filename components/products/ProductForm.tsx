'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ColorPicker } from './ColorPicker';
import { ImageUploader, LocalImageItem } from './ImageUploader';
import { useToast } from '@/components/ui/Toast';
import {
  CheckCircle2,
  ArrowRight,
  Plus,
  Eye,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Search,
  Tag,
  Sliders,
  Bold,
  Italic,
  List,
  FolderPlus,
} from 'lucide-react';
import Link from 'next/link';

import { MOJO_TAXONOMY_CATEGORIES, getDefaultMojoCategory } from '@/lib/shopify/categories';

export function ProductForm() {
  const router = useRouter();
  const { success, error, warning } = useToast();

  // Basic Info State
  const [modelTitle, setModelTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(getDefaultMojoCategory().id);
  const [collectionsList, setCollectionsList] = useState<Array<{ id: string; title: string; handle: string }>>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState('Siyah');
  const [customColorHex, setCustomColorHex] = useState('');
  const [description, setDescription] = useState('');
  const [productFeatures, setProductFeatures] = useState('');

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch('/api/collections');
        if (res.ok) {
          const data = await res.json();
          if (data.collections) {
            setCollectionsList(data.collections);
          }
        }
      } catch (err) {
        console.warn('Koleksiyonlar yüklenemedi:', err);
      }
    }
    loadCollections();
  }, []);

  // Pricing & Stock
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [quantity, setQuantity] = useState('10');

  // Images
  const [images, setImages] = useState<LocalImageItem[]>([]);

  // Advanced & Inventory
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('KILOGRAMS');
  const [vendor, setVendor] = useState('MOJO');
  const [productType, setProductType] = useState('Çanta');
  const [tags, setTags] = useState('çanta, kadın');
  const [handle, setHandle] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Category Attributes (Optional UI hints)
  const [targetGender, setTargetGender] = useState('Kadın');
  const [carryingOption, setCarryingOption] = useState('Omuz / Çapraz Askı');
  const [bagClosure, setBagClosure] = useState('Fermuarlı');
  const [ageGroup, setAgeGroup] = useState('Yetişkin');

  // Card Subgroup & Essential & Homepage settings
  const [cardGroupPreset, setCardGroupPreset] = useState<'AUTO' | 'HSR' | 'RG' | 'DR' | 'ZEBRA' | 'CUSTOM'>('AUTO');
  const [customCardGroup, setCustomCardGroup] = useState('');
  const [showInEssential, setShowInEssential] = useState(false);
  const [homepageVisible, setHomepageVisible] = useState(false);

  // Accordion Toggles
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Form Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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

  // Formatting helpers for description
  const handleInsertFormatting = (type: 'bold' | 'italic' | 'list') => {
    if (type === 'bold') {
      setDescription((prev) => `${prev} **vurgulanan metin** `);
    } else if (type === 'italic') {
      setDescription((prev) => `${prev} *italik metin* `);
    } else if (type === 'list') {
      setDescription((prev) => `${prev}\n• Özellik 1\n• Özellik 2\n• Özellik 3\n`);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!modelTitle.trim()) {
      errors.modelTitle = 'Ürün adı (model) zorunludur.';
    }
    if (!selectedColor.trim()) {
      errors.selectedColor = 'Ana renk seçimi zorunludur.';
    }
    if (!price.trim() || isNaN(parseFloat(price.replace(',', '.')))) {
      errors.price = 'Geçerli bir satış fiyatı girin.';
    }
    if (!quantity.trim() || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0) {
      errors.quantity = 'Geçerli bir stok miktarı girin.';
    }
    if (images.length === 0) {
      errors.images = 'En az 1 ürün görseli yüklemeniz önerilir.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).filter((k) => k !== 'images').length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Eksik Alanlar', 'Lütfen formdaki zorunlu alanları kontrol edin.');
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
      if (barcode.trim()) {
        formData.append('barcode', barcode.trim());
      }
      if (description.trim()) {
        // Clean markdown/newlines to HTML
        const html = description
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            if (line.startsWith('• ') || line.startsWith('- ')) {
              return `<li>${line.slice(2).trim()}</li>`;
            }
            return `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>`;
          })
          .join('');
        formData.append('descriptionHtml', html || `<p>${description.trim()}</p>`);
      }
      if (productFeatures.trim()) {
        formData.append('productFeatures', productFeatures.trim());
      }
      formData.append('status', status);
      formData.append('vendor', vendor.trim() || 'MOJO');
      if (productType.trim()) {
        formData.append('productType', productType.trim());
      }
      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }
      formData.append('requiresShipping', requiresShipping ? 'true' : 'false');
      if (weight.trim()) {
        formData.append('weight', weight.trim().replace(',', '.'));
        formData.append('weightUnit', weightUnit);
      }
      if (handle.trim()) {
        formData.append('handle', handle.trim());
      }
      if (seoTitle.trim()) {
        formData.append('seoTitle', seoTitle.trim());
      }
      if (seoDescription.trim()) {
        formData.append('seoDescription', seoDescription.trim());
      }

      if (selectedCollectionIds.length > 0) {
        selectedCollectionIds.forEach((cid) => {
          formData.append('collectionIds', cid);
        });
        formData.append('collectionIdsJson', JSON.stringify(selectedCollectionIds));
      }

      const finalCardGroup =
        cardGroupPreset === 'CUSTOM' ? customCardGroup.trim() : cardGroupPreset === 'AUTO' ? '' : cardGroupPreset;
      if (finalCardGroup) {
        formData.append('cardGroup', finalCardGroup);
      }
      formData.append('showInEssential', showInEssential ? 'true' : 'false');
      formData.append('homepageVisible', homepageVisible ? 'true' : 'false');

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
    setSelectedCollectionIds([]);
    setSelectedColor('Siyah');
    setCustomColorHex('');
    setPrice('');
    setCompareAtPrice('');
    setQuantity('10');
    setSku('');
    setBarcode('');
    setDescription('');
    setStatus('ACTIVE');
    setVendor('MOJO');
    setProductType('Çanta');
    setTags('çanta, kadın');
    setWeight('');
    setHandle('');
    setSeoTitle('');
    setSeoDescription('');
    setImages([]);
    setValidationErrors({});
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
          Ürün Shopify&apos;a Eklendi ve Yayınlandı
        </h2>
        <p className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
          <strong>{createdProductResult.title}</strong> ürünü mağazanıza başarıyla yüklendi, stok, şablon ve satış kanalı ayarları tamamlandı.
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
            ✓ Online Store ve Point of Sale kanallarında aktif olarak yayınlandı
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Core Info, Images, Advanced Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Section 1 - Temel Bilgiler */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <h3 className="heading-md" style={{ fontSize: 16 }}>Temel Ürün Bilgileri</h3>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                Model adı, kategori ve açıklama bilgilerini doldurun.
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="label">
                Ürün Adı (Model) <span style={{ color: '#F61F1F' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Pristine 3 Gözlü Çapraz Çanta"
                value={modelTitle}
                onChange={(e) => {
                  setModelTitle(e.target.value);
                  if (validationErrors.modelTitle) {
                    setValidationErrors((prev) => ({ ...prev, modelTitle: '' }));
                  }
                }}
                className="input-field"
                style={{ borderColor: validationErrors.modelTitle ? '#EF4444' : undefined }}
                required
              />
              {validationErrors.modelTitle && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{validationErrors.modelTitle}</div>
              )}

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

            {/* Collections (Homepage & Custom Collections) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  Koleksiyonlar (Anasayfa & Kategori Listeleri)
                </label>
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {selectedCollectionIds.length} koleksiyon seçildi
                </span>
              </div>
              
              {collectionsList.length > 0 ? (
                <div
                  style={{
                    maxHeight: 140,
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
                    const isChecked = selectedCollectionIds.includes(col.id);
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
                              setSelectedCollectionIds((prev) => [...prev, col.id]);
                            } else {
                              setSelectedCollectionIds((prev) => prev.filter((id) => id !== col.id));
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
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '6px 0' }}>
                  Koleksiyon listesi yükleniyor...
                </div>
              )}
            </div>

            {/* Kart Renk Grubu & Essential Vitrin Ayarları */}
            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="label" style={{ marginBottom: 0, fontWeight: 600 }}>
                  Kart Renk Grubu (Card Subgroup)
                </label>
                <span style={{ fontSize: 11, color: '#4B5563', fontWeight: 500 }}>
                  custom.mojo_card_group
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Ürün kartlarının altında gösterilecek kardeş swatch alt grubunu belirler. Otomatik modda başlık kontrol edilir (HSR, RG, DR, Zebra).
              </p>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: cardGroupPreset === 'CUSTOM' ? 10 : 0 }}>
                {(['AUTO', 'HSR', 'RG', 'DR', 'ZEBRA', 'CUSTOM'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCardGroupPreset(preset)}
                    className={`btn btn-sm ${cardGroupPreset === preset ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    {preset === 'AUTO' ? '⚡ Otomatik Tespit' : preset === 'CUSTOM' ? '✏️ Özel Grup' : preset}
                  </button>
                ))}
              </div>

              {cardGroupPreset === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Örn: VIZON-SET veya MODEL-SUBGROUP"
                  value={customCardGroup}
                  onChange={(e) => setCustomCardGroup(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 8 }}
                />
              )}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showInEssential}
                    onChange={(e) => setShowInEssential(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      Ana Sayfa ESSENTIAL&apos;da Göster
                    </span>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                      Ürün otomatik olarak Ana Sayfa &quot;MOJO KOLEKSİYON / ESSENTIAL&quot; vitrinine eklenir (en başta listelenir).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Description with Quick Helpers */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>Ürün Açıklaması</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('bold')}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11, height: 24 }}
                    title="Kalın Yazı Ekle"
                  >
                    <Bold size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('italic')}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11, height: 24 }}
                    title="İtalik Yazı Ekle"
                  >
                    <Italic size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('list')}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11, height: 24 }}
                    title="Madde İmleri Ekle"
                  >
                    <List size={11} />
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                placeholder="Ürünün malzeme, ebat ve genel özelliklerini yazın..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical', minHeight: 90 }}
              />
            </div>

            {/* Product Features (custom.mojo_product_features - PDP Accordion Tab) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  Ürün Özellikleri (PDP Akordiyon / Teknik Detaylar)
                </label>
                <span style={{ fontSize: 11, color: '#F61F1F', fontWeight: 600 }}>custom.mojo_product_features</span>
              </div>
              <textarea
                rows={4}
                placeholder="Ölçüler, iç hacim, bölmeler, askı yapısı ve materyal detayları (HTML veya metin)..."
                value={productFeatures}
                onChange={(e) => setProductFeatures(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical', minHeight: 90 }}
              />
              <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Bu alana girilen metin, ürün sayfasındaki <strong>ÜRÜN ÖZELLİKLERİ</strong> sekmesinde dinamik olarak görüntülenir.
              </p>
            </div>
          </div>

          {/* Card: Section 2 - Görseller */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="heading-md" style={{ fontSize: 16 }}>
                  Ürün Görselleri <span style={{ color: '#F61F1F' }}>*</span>
                </h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: images.length > 0 ? '#10B981' : '#6B7280' }}>
                  {images.length} Görsel Seçildi
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                1. görsel kapak, 2. görsel hover, 3+ görseller galeri olarak atanır.
              </p>
            </div>

            <ImageUploader images={images} onChange={setImages} />
            {validationErrors.images && images.length === 0 && (
              <div style={{ fontSize: 12, color: '#D97706' }}>⚠️ {validationErrors.images}</div>
            )}
          </div>

          {/* Card: Section 3 - Gelişmiş Bilgiler (Accordion) */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isAdvancedOpen ? '#F9FAFB' : '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={18} color="#111827" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    Gelişmiş Alanlar (Barkod, Kargo, SEO, Etiketler)
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    İsteğe bağlı organizasyon, kargo ve SEO ayarları
                  </div>
                </div>
              </div>
              {isAdvancedOpen ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
            </button>

            {isAdvancedOpen && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '20px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  backgroundColor: '#FAFAFA',
                }}
              >
                {/* Inventory & Codes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Özel SKU (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      placeholder="Boş bırakılırsa otomatik üretilir"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Barkod (Barcode / EAN)</label>
                    <input
                      type="text"
                      placeholder="Örn: 8690000000000"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Satıcı (Vendor)</label>
                    <input
                      type="text"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Ürün Türü</label>
                    <input
                      type="text"
                      placeholder="Örn: Çanta, Omuz Çantası"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="label">Etiketler (Virgülle ayırın)</label>
                  <input
                    type="text"
                    placeholder="kadın, çanta, omuz çantası, yeni sezon"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Shipping / Weight */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Truck size={16} color="#111827" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kargo & Gönderim</span>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={requiresShipping}
                      onChange={(e) => setRequiresShipping(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Bu ürün fiziksel bir üründür ve kargo gerektirir</span>
                  </label>

                  {requiresShipping && (
                    <div style={{ display: 'flex', gap: 10, maxWidth: 260 }}>
                      <input
                        type="text"
                        placeholder="Ağırlık (Örn: 0.45)"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field"
                      />
                      <select
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value)}
                        className="input-field"
                        style={{ width: 80 }}
                      >
                        <option value="KILOGRAMS">kg</option>
                        <option value="GRAMS">g</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* SEO */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Search size={16} color="#111827" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Arama Motoru (SEO)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label className="label" style={{ marginBottom: 0 }}>SEO Başlığı</label>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{seoTitle.length}/60</span>
                      </div>
                      <input
                        type="text"
                        placeholder={previewTitle}
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label className="label" style={{ marginBottom: 0 }}>Meta Açıklama</label>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{seoDescription.length}/160</span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Google arama sonuçlarında görünecek kısa açıklama..."
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        className="input-field"
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label className="label">Özel URL Handle (İsteğe Bağlı)</label>
                      <input
                        type="text"
                        placeholder="Otomatik oluşturulur (Örn: luna-omuz-cantasi-krem)"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Attributes (Taxonomy Hints) */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Tag size={16} color="#111827" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kategori Özellikleri (Çanta)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Hedef Cinsiyet</label>
                      <select
                        value={targetGender}
                        onChange={(e) => setTargetGender(e.target.value)}
                        className="input-field"
                      >
                        <option value="Kadın">Kadın</option>
                        <option value="Unisex">Unisex</option>
                        <option value="Erkek">Erkek</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Taşıma Şekli</label>
                      <select
                        value={carryingOption}
                        onChange={(e) => setCarryingOption(e.target.value)}
                        className="input-field"
                      >
                        <option value="Omuz / Çapraz Askı">Omuz / Çapraz Askı</option>
                        <option value="El Çantası">El Çantası</option>
                        <option value="Sırt Çantası">Sırt Çantası</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Kapatma Şekli</label>
                      <select
                        value={bagClosure}
                        onChange={(e) => setBagClosure(e.target.value)}
                        className="input-field"
                      >
                        <option value="Fermuarlı">Fermuarlı</option>
                        <option value="Mıknatıslı">Mıknatıslı</option>
                        <option value="Klipsli">Klipsli</option>
                        <option value="Büzgülü">Büzgülü</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Yaş Grubu</label>
                      <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="input-field"
                      >
                        <option value="Yetişkin">Yetişkin</option>
                        <option value="Genç">Genç</option>
                        <option value="Tüm Yaşlar">Tüm Yaşlar</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Color, Price, Stock, Status & Submit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Color Selection */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="heading-md" style={{ fontSize: 16 }}>
                Ana Renk <span style={{ color: '#F61F1F' }}>*</span>
              </h3>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
                {selectedColor}
              </span>
            </div>

            <ColorPicker
              selectedColor={selectedColor}
              customHex={customColorHex}
              onChange={(name, hex) => {
                setSelectedColor(name);
                if (hex) setCustomColorHex(hex);
              }}
            />
          </div>

          {/* Card: Price & Stock */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="heading-md" style={{ fontSize: 16 }}>Fiyatlandırma & Stok</h3>

            {/* Selling Price */}
            <div>
              <label className="label">
                Satış Fiyatı (TRY) <span style={{ color: '#F61F1F' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#6B7280',
                  }}
                >
                  ₺
                </span>
                <input
                  type="text"
                  placeholder="1299"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (validationErrors.price) {
                      setValidationErrors((prev) => ({ ...prev, price: '' }));
                    }
                  }}
                  className="input-field"
                  style={{
                    paddingLeft: 28,
                    fontSize: 16,
                    fontWeight: 700,
                    borderColor: validationErrors.price ? '#EF4444' : undefined,
                  }}
                  required
                />
              </div>
              {validationErrors.price && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{validationErrors.price}</div>
              )}
            </div>

            {/* Compare At Price */}
            <div>
              <label className="label">Karşılaştırma Fiyatı (Üstü Çizili)</label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#9CA3AF',
                  }}
                >
                  ₺
                </span>
                <input
                  type="text"
                  placeholder="1599"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 28, color: '#6B7280' }}
                />
              </div>
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="label">
                Stok Adedi <span style={{ color: '#F61F1F' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="10"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (validationErrors.quantity) {
                    setValidationErrors((prev) => ({ ...prev, quantity: '' }));
                  }
                }}
                className="input-field"
                style={{ borderColor: validationErrors.quantity ? '#EF4444' : undefined }}
                required
              />
              {validationErrors.quantity && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{validationErrors.quantity}</div>
              )}
            </div>

            {/* Homepage Curated Visibility */}
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: homepageVisible ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                backgroundColor: homepageVisible ? '#F0FDF4' : '#F9FAFB',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginTop: 4,
              }}
            >
              <input
                type="checkbox"
                id="homepageVisibleToggle"
                checked={homepageVisible}
                onChange={(e) => setHomepageVisible(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer' }}
              />
              <label htmlFor="homepageVisibleToggle" style={{ cursor: 'pointer', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: '#111827', display: 'block' }}>
                  Ana Sayfada Göster (Maks 5)
                </span>
                <span style={{ fontSize: 11, color: '#6B7280', display: 'block', marginTop: 2 }}>
                  Bu rengin ana sayfa vitrininde listelenmesini sağlar. Aile başına en fazla 5 renk seçilebilir.
                </span>
              </label>
            </div>
          </div>

          {/* Card: Status & Submit */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="heading-md" style={{ fontSize: 16 }}>Yayın Durumu</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStatus('ACTIVE')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: status === 'ACTIVE' ? '2px solid #10B981' : '1px solid #E5E7EB',
                  backgroundColor: status === 'ACTIVE' ? '#ECFDF5' : '#FFFFFF',
                  color: status === 'ACTIVE' ? '#065F46' : '#374151',
                  fontWeight: status === 'ACTIVE' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span>● Aktif</span>
                <span style={{ fontSize: 10, color: '#6B7280' }}>Online + POS Yayını</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: status === 'DRAFT' ? '2px solid #D97706' : '1px solid #E5E7EB',
                  backgroundColor: status === 'DRAFT' ? '#FFFBEB' : '#FFFFFF',
                  color: status === 'DRAFT' ? '#92400E' : '#374151',
                  fontWeight: status === 'DRAFT' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span>○ Taslak</span>
                <span style={{ fontSize: 10, color: '#6B7280' }}>Gizli Kayıt</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Ürün Shopify&apos;a Ekleniyor...</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Ürünü Shopify&apos;a Ekle</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
