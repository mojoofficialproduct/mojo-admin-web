# MOJO ADMIN WEB — PRODUCT UPLOAD & PRICE MANAGER

MOJO mağazası için özel olarak tasarlanmış, doğrudan Shopify Admin GraphQL API ile çalışan hafif, güvenli ve lüks ürün yükleme ve hızlı fiyat yönetim paneli.

---

## 🚀 Özellikler

- **Shopify Tek Doğruluk Kaynağı**: Harici ürün veritabanı gerektirmez, doğrudan Shopify Admin GraphQL ile çalışır.
- **Client Credentials Grant Kimlik Doğrulama**: Shopify App Client ID & Secret ile otomatik access token alma, 24 saatlik süre dolmadan önce (5 dk kala) otomatik yenileme ve in-memory token önbelleği.
- **Güvenli Yönetici Girişi**: HTTP-only secure cookie session, korumalı rotalar ve middleware.
- **Hızlı Fiyat Yönetimi**: Ürün listesinde tek tıkla inline satır içi fiyat düzenleme ve çoklu ürünler için onaylı toplu fiyat güncelleme.
- **MOJO Dinamik Renk Mimarisi**:
  - `templateSuffix = 'mojo-dynamic'` otomatik ataması.
  - 21 standart MOJO rengi + Özel renk (HEX) seçimi.
  - Otomatik başlık formatı (`Model - Renk`).
  - Çakışmasız otomatik SKU üretimi.
  - `custom.mojo_*` metafield senkronizasyonu.
- **Görsel Staged Uploads**: Sürükle-bırak yükleme, anlık tarayıcı önizlemesi ve rol etiketleri (`1=Kapak`, `2=Hover`, `3+=Galeri`).
- **Stok & Yayınlama**: Gerçek lokasyon stoğu tanımlama ve Online Store kanalında anında yayınlama.
- **Kardeş Renk Ekleme**: Mevcut bir model için kardeş renk varyantı oluşturma ve `custom.mojo_color_products` referans listesini kardeşler arasında eşitleme.

---

## ⚙️ Gereksinimler & Çevre Değişkenleri (Environment Variables)

Proje kök dizininde `.env.example` dosyasını `.env.local` olarak kopyalayın:

```bash
cp .env.example .env.local
```

`.env.local` içeriğini doldurun:

```env
# Shopify Store & Client Credentials (Server-Side ONLY)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_shopify_app_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_app_client_secret
SHOPIFY_API_VERSION=2026-07

# Yönetici Giriş Bilgileri
ADMIN_PASSWORD=guclu_bir_admin_sifresi
SESSION_SECRET=en_az_32_karakter_uzunlugunda_guvenli_anahtar_123456
```

---

## 📦 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Geliştirme Ortamında Başlatma (Development)
```bash
npm run dev
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.

### 3. Testleri Çalıştırma
```bash
npm test
```

### 4. Production Derleme ve Çalıştırma (Production)
```bash
# Production derlemesi oluşturma
npm run build

# Production sunucusunu başlatma
npm start
```

---

## 🛡️ Güvenlik Notları
- `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` veya token bilgileri ASLA istemci (browser) bundle'ına gitmez.
- `.env*` dosyaları `.gitignore` ile korunmaktadır ve git geçmişine commit edilmez.
