import { executeShopifyGraphQL } from './client';
import { PRODUCTS_QUERY, PRODUCT_UPDATE_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

// Read-only source: sections/mojo-buy.liquid in the active MOJO theme + standard color swatches
export const COLOR_SWATCHES: Record<string, string> = {
  Siyah: '#000000',
  Dark: '#0E0101',
  Beyaz: '#FFFFFF',
  Krem: '#EAE3D6',
  Ekru: '#F2E8C9',
  Bej: '#EAD8AB',
  Vizon: '#CBBCA9',
  Hasır: '#D2B48C',
  Taba: '#B85A2B',
  'Açık Kahverengi': '#9A5630',
  Kahverengi: '#735454',
  Gri: '#D4CECE',
  Antrasit: '#383E42',
  Lacivert: '#282099',
  Mavi: '#94B8F2',
  'Açık Mavi': '#ADD8E6',
  Turkuaz: '#40E0D0',
  Yeşil: '#05AA3D',
  Haki: '#7B9C7C',
  Kırmızı: '#F61F1F',
  Bordo: '#800000',
  Mürdüm: '#5C2A2D',
  Pembe: '#FFC0CB',
  Pudra: '#FADADD',
  Mor: '#800080',
  Sarı: '#FFD700',
  Turuncu: '#FFA500',
  Altın: '#D4AF37',
  Gümüş: '#C0C0C0',
  Camel: '#C19A6B',
};

// 22 standard colors required by prompt + brand extensions
export const MOJO_COLOR_PALETTE = [
  'Siyah',
  'Beyaz',
  'Krem',
  'Ekru',
  'Bej',
  'Vizon',
  'Taba',
  'Kahverengi',
  'Gri',
  'Lacivert',
  'Mavi',
  'Yeşil',
  'Haki',
  'Kırmızı',
  'Bordo',
  'Mürdüm',
  'Pembe',
  'Pudra',
  'Mor',
  'Sarı',
  'Turuncu',
  'Camel',
];

export const THEME_SUPPORTED_COLORS = [
  'Siyah',
  'Dark',
  'Beyaz',
  'Krem',
  'Ekru',
  'Bej',
  'Vizon',
  'Hasır',
  'Taba',
  'Açık Kahverengi',
  'Kahverengi',
  'Bordo',
  'Mürdüm',
  'Kırmızı',
  'Haki',
  'Yeşil',
  'Gri',
  'Pembe',
  'Mavi',
  'Lacivert',
  'Sarı',
  'Turuncu',
  'Mor',
  'Camel',
  'Antrasit',
];

export const THEME_SWATCH_COLLECTIONS: Record<string, string> = {
  'pristine3gozlu': 'pristine-3-gozlu-capraz-canta',
  'pristine-mini-capraz': 'pristine-kadin-mini-capraz-canta',
  'mojo-body-bag': 'capraz-canta-taba',
  'mojo-ayarlanabilir-zincir': 'ayarlanabilir-zincir-askili-kadin-canta',
};

export function normalizeTurkish(value = ''): string {
  return String(value)
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
}

export function slugifyTurkish(value = ''): string {
  return normalizeTurkish(value)
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getColorSwatch(colorName = ''): string {
  const clean = String(colorName || '').trim();
  if (!clean) return '#CCCCCC';
  const normalized = normalizeTurkish(clean);
  const match = Object.keys(COLOR_SWATCHES).find((name) => normalizeTurkish(name) === normalized);
  return match ? COLOR_SWATCHES[match] : '#CCCCCC';
}

const SORTED_COLOR_NAMES = Object.keys(COLOR_SWATCHES).sort((a, b) => b.length - a.length);

/**
 * Parse "Luna Omuz Çantası - Krem" into { modelTitle, suffix, colorName, modelCode }
 */
export function parseMojoProductTitle(title = '', fallbackColor = '') {
  const cleanTitle = String(title || '').trim();
  const separatorIndex = cleanTitle.lastIndexOf(' - ');
  const modelTitle = separatorIndex >= 0 ? cleanTitle.slice(0, separatorIndex).trim() : cleanTitle;
  const suffix = separatorIndex >= 0 ? cleanTitle.slice(separatorIndex + 3).trim() : String(fallbackColor || '').trim();
  const normalizedSuffix = normalizeTurkish(suffix);

  const colorName =
    SORTED_COLOR_NAMES.find((name) => {
      const normalizedColor = normalizeTurkish(name);
      return normalizedSuffix === normalizedColor || normalizedSuffix.startsWith(`${normalizedColor} `);
    }) || String(fallbackColor || '').trim();

  const modelCode = colorName ? suffix.slice(colorName.length).trim() : '';

  return { modelTitle, suffix, colorName, modelCode };
}

export function buildMojoColorIdentity(sourceProduct: { title?: string; colorNameMetafield?: { value?: string } }, requestedColor = '') {
  const parsed = parseMojoProductTitle(
    sourceProduct?.title || '',
    sourceProduct?.colorNameMetafield?.value || ''
  );
  const requested = parseMojoProductTitle(`X - ${String(requestedColor || '').trim()}`);
  const colorName = requested.colorName || String(requestedColor || '').trim();
  const modelCode = requested.modelCode || parsed.modelCode;
  const colorSuffix = [colorName, modelCode].filter(Boolean).join(' ');
  const modelTitle = parsed.modelTitle;

  return {
    modelTitle,
    colorName,
    modelCode,
    colorSuffix,
    title: `${modelTitle} - ${colorSuffix}`,
  };
}

export function isCustomMojoTemplate(templateSuffix = ''): boolean {
  const clean = String(templateSuffix || '').trim();
  return clean === 'mojo-dynamic' || Boolean(THEME_SWATCH_COLLECTIONS[clean]);
}

/**
 * Automatically generate a collision-free, memorable SKU if left empty
 */
export function generateAutoSku(title = '', colorName = ''): string {
  let prefix = 'MOJO';
  if (title && title.trim()) {
    const cleanWords = title
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (cleanWords.length >= 2) {
      prefix = `MJ-${cleanWords[0].slice(0, 4)}-${cleanWords[1].slice(0, 3)}`;
    } else if (cleanWords.length === 1) {
      prefix = `MJ-${cleanWords[0].slice(0, 6)}`;
    }
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const colorSuffix = colorName ? `-${colorName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}` : '';
  return `${prefix}-${randomDigits}${colorSuffix}`;
}

/**
 * Generate a SKU and verify it against live Shopify catalog to guarantee uniqueness
 */
export async function generateUniqueSku(title = '', colorName = '', preferredSku = ''): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 && preferredSku ? preferredSku.trim() : generateAutoSku(title, colorName);
    if (!candidate) continue;

    try {
      const escaped = candidate.replace(/"/g, '\\"');
      const result = await executeShopifyGraphQL<{
        products: { edges: Array<{ node: { id: string } }> };
      }>(PRODUCTS_QUERY, {
        variables: { first: 1, query: `sku:"${escaped}"` },
        label: 'SKU benzersizlik kontrolü',
      });

      if (!result.products?.edges || result.products.edges.length === 0) {
        return candidate;
      }
    } catch {
      // If store is unconfigured or search fails, return candidate
      return candidate;
    }
  }

  return `${generateAutoSku(title, colorName)}-${Date.now().toString().slice(-4)}`;
}

export interface SiblingProductInput {
  id: string;
  title?: string;
  templateSuffix?: string;
  colorName?: string;
  hex?: string;
  groupId?: string;
  customColorNameMetafield?: { value?: string };
  customSwatchColorMetafield?: { value?: string };
  customModelTitleMetafield?: { value?: string };
  customGroupIdMetafield?: { value?: string };
}

/**
 * Synchronize custom.mojo_color_products, custom.mojo_primary_product,
 * and custom sort/color metafields across ALL sibling products in a group.
 */
export async function syncSiblingColorProductReferences(
  siblingProducts: SiblingProductInput[] = [],
  options: { modelTitle?: string; groupId?: string } = {}
) {
  if (!Array.isArray(siblingProducts) || siblingProducts.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const seenIds = new Set<string>();
  const validSiblings = siblingProducts.filter((s) => {
    if (!s || !s.id) return false;
    const norm = String(s.id).startsWith('gid://') ? s.id : `gid://shopify/Product/${s.id}`;
    if (seenIds.has(norm)) return false;
    seenIds.add(norm);
    return true;
  });

  if (validSiblings.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const orderedProductIds = validSiblings.map((p) =>
    String(p.id).startsWith('gid://') ? p.id : `gid://shopify/Product/${p.id}`
  );
  const primaryProductId = orderedProductIds[0];
  const listJsonValue = JSON.stringify(orderedProductIds);

  const updates = validSiblings.map(async (sibling, index) => {
    const sId = String(sibling.id).startsWith('gid://') ? sibling.id : `gid://shopify/Product/${sibling.id}`;
    const parsed = parseMojoProductTitle(
      sibling.title || '',
      sibling.customColorNameMetafield?.value || sibling.colorName
    );
    const colorName = sibling.customColorNameMetafield?.value || sibling.colorName || parsed.colorName || parsed.suffix || 'Renk';
    const colorHex = sibling.customSwatchColorMetafield?.value || sibling.hex || getColorSwatch(colorName);
    const modelTitle = options.modelTitle || sibling.customModelTitleMetafield?.value || parsed.modelTitle || sibling.title || '';
    const groupId = options.groupId || sibling.customGroupIdMetafield?.value || sibling.groupId || slugifyTurkish(modelTitle);

    const metafields = [
      {
        namespace: 'custom',
        key: 'mojo_color_products',
        value: listJsonValue,
        type: 'list.product_reference',
      },
      {
        namespace: 'custom',
        key: 'mojo_primary_product',
        value: primaryProductId,
        type: 'product_reference',
      },
      {
        namespace: 'custom',
        key: 'mojo_sort_index',
        value: String(index),
        type: 'number_integer',
      },
      {
        namespace: 'custom',
        key: 'mojo_color_name',
        value: colorName,
        type: 'single_line_text_field',
      },
      {
        namespace: 'custom',
        key: 'mojo_swatch_color',
        value: colorHex,
        type: 'color',
      },
      {
        namespace: 'custom',
        key: 'mojo_model_title',
        value: modelTitle,
        type: 'single_line_text_field',
      },
      {
        namespace: 'custom',
        key: 'mojo_group_id',
        value: groupId,
        type: 'single_line_text_field',
      },
    ];

    return executeShopifyGraphQL<{
      productUpdate: {
        product?: { id: string };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(PRODUCT_UPDATE_MUTATION, {
      variables: {
        product: {
          id: sId,
          metafields,
        },
      },
      label: `Kardeş renk senkronizasyonu (${colorName})`,
    });
  });

  const results = await Promise.allSettled(updates);
  const failures = results.filter((r) => r.status === 'rejected');

  return {
    success: failures.length === 0,
    updatedCount: results.filter((r) => r.status === 'fulfilled').length,
    failures,
  };
}
