import { executeShopifyGraphQL } from './client';
import {
  PRODUCTS_QUERY,
  GET_PRODUCT_QUERY,
  PRODUCT_CREATE_MUTATION,
  PRODUCT_UPDATE_MUTATION,
  PRODUCT_DELETE_MUTATION,
  PRODUCT_VARIANTS_BULK_UPDATE_MUTATION,
} from './queries';
import { normalizeGraphQLError } from './errors';
import {
  parseMojoProductTitle,
  getColorSwatch,
  generateUniqueSku,
  slugifyTurkish,
  detectMojoCardGroup,
  syncSiblingColorProductReferences,
  SiblingProductInput,
} from './mojo';
import { fetchLocations, setInventoryQuantity } from './inventory';
import { publishProductToDefaultSalesChannels, PublicationResult } from './publications';
import { uploadAndAttachProductImages, ImageUploadItem } from './media';
import { addProductToCollections } from './collections';

export interface ProductSummary {
  id: string;
  numericId: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  onlineStoreUrl?: string;
  templateSuffix?: string;
  category?: {
    id: string;
    name: string;
    fullName?: string;
  };
  updatedAt: string;
  totalInventory: number;
  imageUrl?: string;
  price: string;
  formattedPrice: string;
  currencyCode: string;
  sku?: string;
  variantId?: string;
  colorName?: string;
  swatchColor?: string;
  modelTitle?: string;
  groupId?: string;
  cardGroup?: string;
  productFeatures?: string;
  homepageVisible?: boolean;
  isPublished?: boolean;
  publishedChannelsCount?: number;
}

export interface CreateProductInput {
  modelTitle: string;
  colorName: string;
  customColorHex?: string;
  price: string;
  compareAtPrice?: string;
  quantity: string | number;
  sku?: string;
  barcode?: string;
  descriptionHtml?: string;
  productFeatures?: string;
  status?: 'ACTIVE' | 'DRAFT';
  locationId?: string;
  categoryId?: string;
  collectionIds?: string[];
  cardGroup?: string;
  showInEssential?: boolean;
  homepageVisible?: boolean;
  vendor?: string;
  productType?: string;
  tags?: string[] | string;
  requiresShipping?: boolean;
  weight?: number | string;
  weightUnit?: string;
  handle?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateProductInput {
  title?: string;
  descriptionHtml?: string;
  productFeatures?: string;
  categoryId?: string;
  collectionIds?: string[];
  cardGroup?: string;
  showInEssential?: boolean;
  homepageVisible?: boolean;
  status?: 'ACTIVE' | 'DRAFT';
  vendor?: string;
  productType?: string;
  tags?: string[] | string;
  price?: string | number;
  compareAtPrice?: string | number;
  sku?: string;
  barcode?: string;
  quantity?: string | number;
  locationId?: string;
}

export function formatPriceTRY(amount: string | number, currencyCode = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₺0,00';
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currencyCode === 'TL' ? 'TRY' : currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₺${num.toFixed(2)}`;
  }
}

/**
 * Fetch and list products with search & status filters
 */
export async function fetchProductsList(options: {
  first?: number;
  after?: string | null;
  searchTerm?: string;
  statusFilter?: string;
}): Promise<{
  products: ProductSummary[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
}> {
  const { first = 50, after = null, searchTerm = '', statusFilter = '' } = options;

  const queryParts: string[] = [];
  if (statusFilter && statusFilter !== 'ALL') {
    queryParts.push(`status:${statusFilter.toLowerCase()}`);
  }
  if (searchTerm && searchTerm.trim()) {
    const clean = searchTerm.trim().replace(/"/g, '\\"');
    queryParts.push(`(title:*${clean}* OR handle:*${clean}* OR tag:*${clean}* OR sku:*${clean}*)`);
  }

  const queryString = queryParts.join(' AND ');

  const data = await executeShopifyGraphQL<{
    products: {
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string | null;
        endCursor?: string | null;
      };
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
          onlineStoreUrl?: string;
          templateSuffix?: string;
          category?: { id: string; name: string; fullName?: string };
          updatedAt: string;
          totalInventory?: number;
          featuredImage?: { url: string; altText?: string };
          priceRangeV2?: {
            minVariantPrice: { amount: string; currencyCode: string };
            maxVariantPrice: { amount: string; currencyCode: string };
          };
          variants?: {
            nodes: Array<{
              id: string;
              title: string;
              price: string;
              sku?: string;
              inventoryQuantity?: number;
            }>;
          };
          customGroupIdMetafield?: { value?: string };
          customCardGroupMetafield?: { value?: string };
          customModelTitleMetafield?: { value?: string };
          customColorNameMetafield?: { value?: string };
          customSwatchColorMetafield?: { value?: string };
          customProductFeaturesMetafield?: { value?: string };
          customHomepageVisibleMetafield?: { value?: string };
        };
      }>;
    };
  }>(PRODUCTS_QUERY, {
    variables: {
      first,
      after,
      query: queryString || undefined,
      sortKey: 'UPDATED_AT',
      reverse: true,
    },
    label: 'Ürün listesi yükleme',
  });

  const products: ProductSummary[] = (data.products?.edges || []).map((edge) => {
    const node = edge.node;
    const defaultVariant = node.variants?.nodes?.[0];
    const rawPrice = defaultVariant?.price || node.priceRangeV2?.minVariantPrice?.amount || '0';
    const currency = node.priceRangeV2?.minVariantPrice?.currencyCode || 'TRY';
    const parsed = parseMojoProductTitle(node.title, node.customColorNameMetafield?.value);
    const colorName = node.customColorNameMetafield?.value || parsed.colorName;
    const swatchColor = node.customSwatchColorMetafield?.value || getColorSwatch(colorName);

    return {
      id: node.id,
      numericId: node.id.split('/').pop() || '',
      title: node.title,
      handle: node.handle,
      status: node.status,
      onlineStoreUrl: node.onlineStoreUrl,
      templateSuffix: node.templateSuffix,
      category: node.category,
      updatedAt: node.updatedAt,
      totalInventory: node.totalInventory ?? 0,
      imageUrl: node.featuredImage?.url,
      price: rawPrice,
      formattedPrice: formatPriceTRY(rawPrice, currency),
      currencyCode: currency,
      sku: defaultVariant?.sku || '',
      variantId: defaultVariant?.id,
      colorName,
      swatchColor,
      modelTitle: node.customModelTitleMetafield?.value || parsed.modelTitle,
      groupId: node.customGroupIdMetafield?.value,
      cardGroup: node.customCardGroupMetafield?.value,
      productFeatures: node.customProductFeaturesMetafield?.value,
      homepageVisible: node.customHomepageVisibleMetafield?.value === 'true',
    };
  });

  return {
    products,
    pageInfo: data.products?.pageInfo || {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}

/**
 * Fetch a single product by ID with full details and siblings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchProductById(id: string): Promise<any | null> {
  const fullId = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

  const data = await executeShopifyGraphQL<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    product: any;
  }>(GET_PRODUCT_QUERY, {
    variables: { id: fullId },
    label: 'Ürün detayını getirme',
  });

  return data?.product || null;
}

/**
 * Quick Single Variant Price Update
 */
export async function updateVariantPrice(
  productId: string,
  variantId: string,
  newPrice: string | number
): Promise<{ success: boolean; updatedPrice?: string; error?: string }> {
  const fullProductId = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
  const fullVariantId = variantId.startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`;
  const priceStr = String(newPrice).trim().replace(',', '.');

  const cleanNum = parseFloat(priceStr);
  if (isNaN(cleanNum) || cleanNum < 0) {
    return { success: false, error: 'Lütfen geçerli bir fiyat girin.' };
  }

  const result = await executeShopifyGraphQL<{
    productVariantsBulkUpdate: {
      productVariants?: Array<{ id: string; price: string }>;
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
    variables: {
      productId: fullProductId,
      variants: [
        {
          id: fullVariantId,
          price: cleanNum.toFixed(2),
        },
      ],
    },
    label: 'Fiyat güncelleme',
  });

  const userErrors = result?.productVariantsBulkUpdate?.userErrors || [];
  if (userErrors.length > 0) {
    return { success: false, error: normalizeGraphQLError({ userErrors }, 'Fiyat güncellenemedi.') };
  }

  const updated = result?.productVariantsBulkUpdate?.productVariants?.[0];
  return { success: true, updatedPrice: updated?.price || cleanNum.toFixed(2) };
}

/**
 * Bulk update prices for multiple products
 */
export async function bulkUpdateProductPrices(
  items: Array<{ productId: string; variantId: string; price: string | number }>
): Promise<{
  successCount: number;
  failureCount: number;
  failures: Array<{ productId: string; error: string }>;
}> {
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ productId: string; error: string }> = [];

  for (const item of items) {
    try {
      const res = await updateVariantPrice(item.productId, item.variantId, item.price);
      if (res.success) {
        successCount++;
      } else {
        failureCount++;
        failures.push({ productId: item.productId, error: res.error || 'Güncellenemedi' });
      }
    } catch (err) {
      failureCount++;
      failures.push({
        productId: item.productId,
        error: err instanceof Error ? err.message : 'Hata oluştu',
      });
    }
  }

  return { successCount, failureCount, failures };
}

/**
 * Full New Product Creation (MOJO Dynamic Architecture)
 */
export async function createMojoProduct(
  input: CreateProductInput,
  images: ImageUploadItem[] = []
): Promise<{
  success: boolean;
  publicationSuccess?: boolean;
  publicationWarning?: string;
  publication?: PublicationResult;
  product?: ProductSummary;
  error?: string;
  details?: Record<string, unknown>;
}> {
  const modelTitle = input.modelTitle.trim();
  const colorName = input.colorName.trim();

  if (!modelTitle) {
    return { success: false, error: 'Ürün adı (model) boş bırakılamaz.' };
  }
  if (!colorName) {
    return { success: false, error: 'Ana renk seçimi zorunludur.' };
  }

  const fullTitle = modelTitle.includes(' - ') ? modelTitle : `${modelTitle} - ${colorName}`;
  const colorHex = input.customColorHex?.trim() || getColorSwatch(colorName);
  const groupId = `grp_${Date.now()}_${slugifyTurkish(modelTitle).slice(0, 20)}`;
  const cardGroup = input.cardGroup?.trim() || detectMojoCardGroup(fullTitle, modelTitle, groupId);
  const status = input.status || 'ACTIVE';

  // 1. Resolve SKU (unique, non-colliding)
  const sku = await generateUniqueSku(modelTitle, colorName, input.sku);

  // 2. Prepare Metafields
  const metafields = [
    {
      namespace: 'custom',
      key: 'mojo_group_id',
      value: groupId,
      type: 'single_line_text_field',
    },
    {
      namespace: 'custom',
      key: 'mojo_card_group',
      value: cardGroup,
      type: 'single_line_text_field',
    },
    {
      namespace: 'custom',
      key: 'mojo_model_title',
      value: modelTitle,
      type: 'single_line_text_field',
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
      key: 'mojo_sort_index',
      value: '0',
      type: 'number_integer',
    },
  ];

  if (input.productFeatures?.trim()) {
    metafields.push({
      namespace: 'custom',
      key: 'mojo_product_features',
      value: input.productFeatures.trim(),
      type: 'multi_line_text_field',
    });
  }

  const homepageVisible = input.homepageVisible !== undefined ? input.homepageVisible : true;
  if (homepageVisible === true && groupId) {
    try {
      const allProds = await fetchProductsList({ first: 50 });
      const existingInGroup = allProds.products.filter(
        (p) => p.groupId === groupId && p.homepageVisible === true
      );
      if (existingInGroup.length >= 5) {
        return {
          success: false,
          error: 'Bu ürün ailesinde ana sayfa için en fazla 5 renk seçebilirsiniz.',
        };
      }
    } catch (e) {
      console.warn('Family homepage count validation notice:', e);
    }
  }

  metafields.push({
    namespace: 'custom',
    key: 'mojo_homepage_visible',
    value: homepageVisible ? 'true' : 'false',
    type: 'boolean',
  });

  // 3. Create Product in Shopify
  const productInput: Record<string, unknown> = {
    title: fullTitle,
    vendor: input.vendor?.trim() || 'MOJO',
    status,
    templateSuffix: 'mojo-dynamic',
    metafields,
  };

  if (input.descriptionHtml?.trim()) {
    productInput.descriptionHtml = input.descriptionHtml.trim();
  }

  if (input.categoryId?.trim()) {
    productInput.category = input.categoryId.trim();
  }

  if (input.productType?.trim()) {
    productInput.productType = input.productType.trim();
  }

  if (input.tags) {
    if (Array.isArray(input.tags)) {
      productInput.tags = input.tags.filter(Boolean);
    } else if (typeof input.tags === 'string' && input.tags.trim()) {
      productInput.tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  if (input.handle?.trim()) {
    productInput.handle = input.handle.trim();
  }

  if (input.seoTitle?.trim() || input.seoDescription?.trim()) {
    productInput.seo = {
      title: input.seoTitle?.trim() || undefined,
      description: input.seoDescription?.trim() || undefined,
    };
  }

  const createRes = await executeShopifyGraphQL<{
    productCreate: {
      product?: {
        id: string;
        title: string;
        handle: string;
        status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
        templateSuffix?: string;
        category?: { id: string; name: string; fullName?: string };
        variants?: {
          nodes: Array<{
            id: string;
            inventoryItem?: { id: string; tracked: boolean };
          }>;
        };
      };
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(PRODUCT_CREATE_MUTATION, {
    variables: { product: productInput },
    label: 'Ürün kaydı oluşturma',
  });

  const userErrors = createRes?.productCreate?.userErrors || [];
  if (userErrors.length > 0) {
    return { success: false, error: normalizeGraphQLError({ userErrors }, 'Ürün oluşturulamadı.') };
  }

  const createdProduct = createRes?.productCreate?.product;
  if (!createdProduct?.id) {
    return { success: false, error: 'Shopify ürün kimliği döndürmedi.' };
  }

  const defaultVariant = createdProduct.variants?.nodes?.[0];
  const variantId = defaultVariant?.id;
  const inventoryItemId = defaultVariant?.inventoryItem?.id;

  // 4. Update Variant with Price, CompareAt, SKU, Barcode
  if (variantId) {
    const cleanPrice = parseFloat(String(input.price).replace(',', '.')).toFixed(2);
    const variantUpdatePayload: Record<string, unknown> = {
      id: variantId,
      price: cleanPrice,
      inventoryItem: {
        tracked: true,
        requiresShipping: input.requiresShipping !== false,
        sku,
      },
    };

    if (input.barcode?.trim()) {
      variantUpdatePayload.barcode = input.barcode.trim();
    }

    if (input.compareAtPrice) {
      variantUpdatePayload.compareAtPrice = parseFloat(
        String(input.compareAtPrice).replace(',', '.')
      ).toFixed(2);
    }

    await executeShopifyGraphQL(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
      variables: {
        productId: createdProduct.id,
        variants: [variantUpdatePayload],
      },
      label: 'Varyant fiyat ve SKU ayarlama',
    });
  }

  // 5. Update Inventory / Stock if quantity > 0
  const qty = parseInt(String(input.quantity), 10);
  if (inventoryItemId && !isNaN(qty) && qty > 0) {
    try {
      let targetLocationId = input.locationId;
      if (!targetLocationId) {
        const locations = await fetchLocations();
        const primary = locations.find((l) => l.isPrimary && l.isActive) || locations.find((l) => l.isActive);
        targetLocationId = primary?.id;
      }

      if (targetLocationId) {
        await setInventoryQuantity(inventoryItemId, targetLocationId, qty);
      }
    } catch (invErr) {
      console.warn('Stok güncelleme uyarısı:', invErr);
    }
  }

  // 6. Upload and Attach Images
  let uploadedMediaUrls: string[] = [];
  if (images && images.length > 0) {
    try {
      uploadedMediaUrls = await uploadAndAttachProductImages(createdProduct.id, images);
    } catch (mediaErr) {
      console.warn('Görsel yükleme uyarısı:', mediaErr);
    }
  }

  // 6.5 Assign to Collections if specified (plus ESSENTIAL if enabled)
  const targetCollectionIds = [...(input.collectionIds || [])];
  if (input.showInEssential !== false) {
    const essentialColId = 'gid://shopify/Collection/336765911211';
    if (!targetCollectionIds.includes(essentialColId)) {
      targetCollectionIds.push(essentialColId);
    }
  }

  if (targetCollectionIds.length > 0) {
    try {
      await addProductToCollections(createdProduct.id, targetCollectionIds);
    } catch (colErr) {
      console.warn('Koleksiyon atama uyarısı:', colErr);
    }
  }

  // 7. Publish to Default Sales Channels (Online Store + POS)
  let publicationDetails: PublicationResult | undefined = undefined;
  if (status === 'ACTIVE') {
    publicationDetails = await publishProductToDefaultSalesChannels(createdProduct.id);
    if (!publicationDetails.success || publicationDetails.actualCount === 0) {
      console.warn(`Ürün satış kanallarına yayınlanamadı (${createdProduct.id}):`, publicationDetails.error);
    }
  }

  const isPublished = Boolean(publicationDetails && (publicationDetails.success || publicationDetails.actualCount > 0));
  const isFailed = status === 'ACTIVE' && Boolean(publicationDetails && !publicationDetails.success && publicationDetails.actualCount === 0);

  // 8. Self-initialize sibling list
  const primaryId = createdProduct.id;
  await syncSiblingColorProductReferences(
    [
      {
        id: primaryId,
        title: fullTitle,
        colorName,
        hex: colorHex,
        templateSuffix: 'mojo-dynamic',
        groupId,
        cardGroup,
      },
    ],
    { modelTitle, groupId, cardGroup }
  );

  return {
    success: true,
    publicationSuccess: isPublished,
    publicationWarning: isFailed
      ? 'Ürün oluşturuldu ancak satış kanallarına (Online Store / POS) yayınlanamadı.'
      : undefined,
    publication: publicationDetails,
    product: {
      id: createdProduct.id,
      numericId: createdProduct.id.split('/').pop() || '',
      title: fullTitle,
      handle: createdProduct.handle,
      status: createdProduct.status,
      templateSuffix: createdProduct.templateSuffix,
      updatedAt: new Date().toISOString(),
      totalInventory: isNaN(qty) ? 0 : qty,
      imageUrl: uploadedMediaUrls[0] || undefined,
      price: String(input.price),
      formattedPrice: formatPriceTRY(input.price),
      currencyCode: 'TRY',
      sku,
      variantId,
      colorName,
      swatchColor: colorHex,
      modelTitle,
      groupId,
      cardGroup,
      isPublished,
      publishedChannelsCount: publicationDetails?.actualCount ?? 0,
      category: createdProduct.category,
    },
  };
}

export interface AddSiblingColorOptions {
  customColorHex?: string;
  price?: string | number;
  compareAtPrice?: string | number;
  quantity?: string | number;
  sku?: string;
  barcode?: string;
  descriptionHtml?: string;
  productFeatures?: string;
  categoryId?: string;
  collectionIds?: string[];
  cardGroup?: string;
  showInEssential?: boolean;
  homepageVisible?: boolean;
  vendor?: string;
  productType?: string;
  tags?: string[] | string;
  weight?: number | string;
  weightUnit?: string;
  status?: 'ACTIVE' | 'DRAFT';
  requiresShipping?: boolean;
  handle?: string;
  seoTitle?: string;
  seoDescription?: string;
  images?: ImageUploadItem[];
}

/**
 * Add Sibling Color to Existing Product Group
 */
export async function addSiblingColorProduct(
  sourceProductId: string,
  newColorName: string,
  options: AddSiblingColorOptions = {}
): Promise<{ success: boolean; product?: ProductSummary; error?: string }> {
  const sourceProduct = await fetchProductById(sourceProductId);
  if (!sourceProduct) {
    return { success: false, error: 'Kaynak ürün bulunamadı.' };
  }

  const parsed = parseMojoProductTitle(sourceProduct.title, sourceProduct.customColorNameMetafield?.value);
  const modelTitle = sourceProduct.customModelTitleMetafield?.value || parsed.modelTitle || sourceProduct.title;
  const sourceGroupId =
    sourceProduct.customGroupIdMetafield?.value || `grp_${Date.now()}_${slugifyTurkish(modelTitle).slice(0, 20)}`;
  const sourceCardGroup = sourceProduct.customCardGroupMetafield?.value;

  const existingSiblings: SiblingProductInput[] =
    sourceProduct.customColorProductsMetafield?.references?.nodes || [sourceProduct];

  const visibleSiblingsCount = existingSiblings.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.customHomepageVisibleMetafield?.value === 'true' || s.homepageVisible === true
  ).length;

  let targetHomepageVisible = options.homepageVisible;
  if (targetHomepageVisible === undefined) {
    targetHomepageVisible = visibleSiblingsCount < 5;
  } else if (targetHomepageVisible === true && visibleSiblingsCount >= 5) {
    return {
      success: false,
      error: 'Bu ürün ailesinde ana sayfa için en fazla 5 renk seçebilirsiniz.',
    };
  }

  const firstVariant = sourceProduct.variants?.nodes?.[0];
  const price = options.price !== undefined && String(options.price).trim() !== '' ? options.price : firstVariant?.price || '0';
  const compareAtPrice =
    options.compareAtPrice !== undefined && String(options.compareAtPrice).trim() !== ''
      ? options.compareAtPrice
      : firstVariant?.compareAtPrice || '';
  const quantity = options.quantity !== undefined && String(options.quantity).trim() !== '' ? options.quantity : '0';
  const descriptionHtml =
    options.descriptionHtml !== undefined ? options.descriptionHtml : sourceProduct.descriptionHtml || '';
  const productFeatures =
    options.productFeatures !== undefined
      ? options.productFeatures
      : sourceProduct.customProductFeaturesMetafield?.value || '';
  const categoryId = options.categoryId || sourceProduct.category?.id;
  const sourceCollections = (sourceProduct as any)?.collections?.nodes?.map((c: any) => c.id) || [];
  const targetCollectionIds = options.collectionIds !== undefined ? options.collectionIds : sourceCollections;
  const vendor = options.vendor || sourceProduct.vendor || 'MOJO';
  const productType =
    options.productType !== undefined && String(options.productType).trim() !== ''
      ? options.productType
      : sourceProduct.productType || 'Çanta';
  const tags = options.tags !== undefined ? options.tags : sourceProduct.tags;
  const status = options.status || 'ACTIVE';

  const initialCardGroup =
    options.cardGroup || sourceCardGroup || detectMojoCardGroup(`${modelTitle} - ${newColorName}`, modelTitle, sourceGroupId);

  const createResult = await createMojoProduct(
    {
      modelTitle,
      colorName: newColorName,
      customColorHex: options.customColorHex,
      price: String(price),
      compareAtPrice: compareAtPrice ? String(compareAtPrice) : undefined,
      quantity,
      sku: options.sku,
      barcode: options.barcode,
      descriptionHtml,
      productFeatures,
      status,
      categoryId,
      collectionIds: targetCollectionIds,
      cardGroup: initialCardGroup,
      showInEssential: options.showInEssential,
      homepageVisible: targetHomepageVisible,
      vendor,
      productType,
      tags,
      weight: options.weight,
      weightUnit: options.weightUnit,
      requiresShipping: options.requiresShipping,
      handle: options.handle,
      seoTitle: options.seoTitle,
      seoDescription: options.seoDescription,
    },
    options.images || []
  );

  if (!createResult.success || !createResult.product) {
    return { success: false, error: createResult.error || 'Yeni renk ürünü oluşturulamadı.' };
  }

  // Gather all existing sibling products + the new one and sync references across all of them
  const targetCardGroup = createResult.product.cardGroup || initialCardGroup;

  const allSiblings: SiblingProductInput[] = [
    ...existingSiblings
      .filter((s) => s.id !== createResult.product?.id)
      .map((s) => ({
        ...s,
        cardGroup: s.customCardGroupMetafield?.value || (s as any).cardGroup || sourceCardGroup,
      })),
    {
      id: createResult.product.id,
      title: createResult.product.title,
      colorName: newColorName,
      hex: createResult.product.swatchColor,
      templateSuffix: 'mojo-dynamic',
      groupId: sourceGroupId,
      cardGroup: targetCardGroup,
    },
  ];

  await syncSiblingColorProductReferences(allSiblings, {
    modelTitle,
    groupId: sourceGroupId,
    cardGroup: targetCardGroup,
  });

  return { success: true, product: createResult.product };
}

/**
 * Delete a product permanently with self-healing primary promotion
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  const fullId = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  try {
    const currentProduct = await fetchProductById(productId);
    const existingSiblings: SiblingProductInput[] =
      currentProduct?.customColorProductsMetafield?.references?.nodes || [];

    const survivingSiblings = existingSiblings.filter((s) => {
      const sId = String(s.id).startsWith('gid://') ? s.id : `gid://shopify/Product/${s.id}`;
      return sId !== fullId;
    });

    if (survivingSiblings.length > 0) {
      const parsed = parseMojoProductTitle(currentProduct?.title || '');
      const modelTitle = currentProduct?.customModelTitleMetafield?.value || parsed.modelTitle;
      const groupId = currentProduct?.customGroupIdMetafield?.value || parsed.modelTitle;

      await syncSiblingColorProductReferences(survivingSiblings, {
        modelTitle,
        groupId,
      });
    }
  } catch (err) {
    console.warn('Silme öncesi kardeş ürün senkronizasyon uyarısı:', err);
  }

  const res = await executeShopifyGraphQL<{
    productDelete: {
      deletedProductId?: string;
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(PRODUCT_DELETE_MUTATION, {
    variables: { input: { id: fullId } },
    label: 'Ürün silme',
  });

  const userErrors = res?.productDelete?.userErrors || [];
  if (userErrors.length > 0) {
    throw new Error(normalizeGraphQLError({ userErrors }, 'Ürün silinemedi.'));
  }

  return true;
}

/**
 * Update existing product details (Price, Stock, Description, Category, SKU, Barcode, etc.)
 */
export async function updateMojoProduct(
  productId: string,
  input: UpdateProductInput
): Promise<{ success: boolean; error?: string }> {
  const fullProductId = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  // 1. Update Core Product attributes if provided
  const productInput: Record<string, unknown> = { id: fullProductId };
  let hasProductUpdates = false;

  if (input.title?.trim()) {
    productInput.title = input.title.trim();
    hasProductUpdates = true;
  }
  if (input.descriptionHtml !== undefined) {
    productInput.descriptionHtml = input.descriptionHtml.trim();
    hasProductUpdates = true;
  }
  if (input.categoryId?.trim()) {
    productInput.category = input.categoryId.trim();
    hasProductUpdates = true;
  }
  if (input.status) {
    productInput.status = input.status;
    hasProductUpdates = true;
  }
  if (input.vendor?.trim()) {
    productInput.vendor = input.vendor.trim();
    hasProductUpdates = true;
  }
  if (input.productType !== undefined) {
    productInput.productType = input.productType.trim();
    hasProductUpdates = true;
  }
  if (input.tags !== undefined) {
    if (Array.isArray(input.tags)) {
      productInput.tags = input.tags;
    } else if (typeof input.tags === 'string') {
      productInput.tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    hasProductUpdates = true;
  }
  const metafieldsToUpdate: Array<{ namespace: string; key: string; value: string; type: string }> = [];
  if (input.productFeatures !== undefined) {
    metafieldsToUpdate.push({
      namespace: 'custom',
      key: 'mojo_product_features',
      value: input.productFeatures.trim(),
      type: 'multi_line_text_field',
    });
  }
  if (input.cardGroup !== undefined && input.cardGroup.trim()) {
    metafieldsToUpdate.push({
      namespace: 'custom',
      key: 'mojo_card_group',
      value: input.cardGroup.trim(),
      type: 'single_line_text_field',
    });
  }
  if (input.homepageVisible !== undefined) {
    if (input.homepageVisible === true) {
      try {
        const currentProduct = await fetchProductById(productId);
        const siblings: Array<{ id: string; customHomepageVisibleMetafield?: { value?: string } }> =
          currentProduct?.customColorProductsMetafield?.references?.nodes || [currentProduct];

        const otherVisibleCount = siblings.filter((s) => {
          const sId = String(s.id).startsWith('gid://') ? s.id : `gid://shopify/Product/${s.id}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return sId !== fullProductId && (s.customHomepageVisibleMetafield?.value === 'true' || (s as any).customHomepageVisibleMetafield?.value === true);
        }).length;

        if (otherVisibleCount >= 5) {
          return {
            success: false,
            error: 'Bu ürün ailesinde ana sayfa için en fazla 5 renk seçebilirsiniz.',
          };
        }
      } catch (err) {
        console.warn('Update homepage count validation notice:', err);
      }
    }

    metafieldsToUpdate.push({
      namespace: 'custom',
      key: 'mojo_homepage_visible',
      value: input.homepageVisible ? 'true' : 'false',
      type: 'boolean',
    });
  }
  if (metafieldsToUpdate.length > 0) {
    productInput.metafields = metafieldsToUpdate;
    hasProductUpdates = true;
  }

  if (hasProductUpdates) {
    const updateRes = await executeShopifyGraphQL<{
      productUpdate: {
        product?: { id: string };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(PRODUCT_UPDATE_MUTATION, {
      variables: { product: productInput },
      label: 'Ürün güncelleme',
    });

    const userErrors = updateRes?.productUpdate?.userErrors || [];
    if (userErrors.length > 0) {
      return { success: false, error: normalizeGraphQLError({ userErrors }, 'Ürün güncellenemedi.') };
    }
  }

  // 1.5 Update Collection Memberships if provided
  const targetCollectionIds = input.collectionIds ? [...input.collectionIds] : undefined;
  if (input.showInEssential === true && targetCollectionIds) {
    const essentialColId = 'gid://shopify/Collection/336765911211';
    if (!targetCollectionIds.includes(essentialColId)) {
      targetCollectionIds.push(essentialColId);
    }
  }

  if (targetCollectionIds && targetCollectionIds.length > 0) {
    try {
      await addProductToCollections(fullProductId, targetCollectionIds);
    } catch (colErr) {
      console.warn('Koleksiyon güncelleme uyarısı:', colErr);
    }
  }

  // 2. Update Variant (Price, CompareAt, SKU, Barcode)
  if (
    input.price !== undefined ||
    input.compareAtPrice !== undefined ||
    input.sku !== undefined ||
    input.barcode !== undefined
  ) {
    const currentProduct = await fetchProductById(productId);
    const firstVariant = currentProduct?.variants?.nodes?.[0];
    if (firstVariant?.id) {
      const variantPayload: Record<string, unknown> = { id: firstVariant.id };
      if (input.price !== undefined && String(input.price).trim()) {
        variantPayload.price = parseFloat(String(input.price).replace(',', '.')).toFixed(2);
      }
      if (input.compareAtPrice !== undefined) {
        if (String(input.compareAtPrice).trim()) {
          variantPayload.compareAtPrice = parseFloat(String(input.compareAtPrice).replace(',', '.')).toFixed(2);
        } else {
          variantPayload.compareAtPrice = null;
        }
      }
      if (input.barcode !== undefined) {
        variantPayload.barcode = input.barcode.trim() || null;
      }
      if (input.sku !== undefined) {
        variantPayload.inventoryItem = {
          tracked: true,
          sku: input.sku.trim(),
        };
      }

      await executeShopifyGraphQL(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
        variables: {
          productId: fullProductId,
          variants: [variantPayload],
        },
        label: 'Varyant güncelleme',
      });
    }
  }

  // 3. Update Inventory only if quantity provided AND changed
  if (input.quantity !== undefined && String(input.quantity).trim() !== '') {
    const qty = parseInt(String(input.quantity), 10);
    if (!isNaN(qty)) {
      const currentProduct = await fetchProductById(productId);
      const currentInventory =
        currentProduct?.totalInventory ?? currentProduct?.variants?.nodes?.[0]?.inventoryQuantity;
      const inventoryItemId = currentProduct?.variants?.nodes?.[0]?.inventoryItem?.id;

      // Only perform inventory mutation if quantity actually differs
      if (inventoryItemId && currentInventory !== qty) {
        let targetLocationId = input.locationId;
        if (!targetLocationId) {
          const locations = await fetchLocations();
          const primary = locations.find((l) => l.isPrimary && l.isActive) || locations.find((l) => l.isActive);
          targetLocationId = primary?.id;
        }
        if (targetLocationId) {
          await setInventoryQuantity(inventoryItemId, targetLocationId, qty);
        }
      }
    }
  }

  return { success: true };
}
