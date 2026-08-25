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
  syncSiblingColorProductReferences,
  SiblingProductInput,
} from './mojo';
import { fetchLocations, setInventoryQuantity } from './inventory';
import { publishProductToDefaultSalesChannels, PublicationResult } from './publications';
import { uploadAndAttachProductImages, ImageUploadItem } from './media';

export interface ProductSummary {
  id: string;
  numericId: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  onlineStoreUrl?: string;
  templateSuffix?: string;
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
  descriptionHtml?: string;
  status?: 'ACTIVE' | 'DRAFT';
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
          customModelTitleMetafield?: { value?: string };
          customColorNameMetafield?: { value?: string };
          customSwatchColorMetafield?: { value?: string };
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

  // 3. Create Product in Shopify
  const productInput: Record<string, unknown> = {
    title: fullTitle,
    vendor: 'MOJO',
    status,
    templateSuffix: 'mojo-dynamic',
    metafields,
  };

  if (input.descriptionHtml?.trim()) {
    productInput.descriptionHtml = input.descriptionHtml.trim();
  }

  const createRes = await executeShopifyGraphQL<{
    productCreate: {
      product?: {
        id: string;
        title: string;
        handle: string;
        status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
        templateSuffix?: string;
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

  // 4. Update Variant with Price & SKU
  if (variantId) {
    const cleanPrice = parseFloat(String(input.price).replace(',', '.')).toFixed(2);
    const variantUpdatePayload: Record<string, unknown> = {
      id: variantId,
      price: cleanPrice,
      inventoryItem: {
        tracked: true,
        requiresShipping: true,
        sku,
      },
    };

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

  // 7. Publish to Default Sales Channels (Online Store + POS)
  let publicationDetails: PublicationResult | undefined = undefined;
  if (status === 'ACTIVE') {
    publicationDetails = await publishProductToDefaultSalesChannels(createdProduct.id);
    if (!publicationDetails.success || publicationDetails.actualCount === 0) {
      console.warn(`Ürün satış kanallarına yayınlanamadı (${createdProduct.id}):`, publicationDetails.error);
    }
  }

  const isPublished = Boolean(publicationDetails && publicationDetails.actualCount > 0);

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
      },
    ],
    { modelTitle, groupId }
  );

  return {
    success: true,
    publicationSuccess: isPublished,
    publicationWarning:
      status === 'ACTIVE' && (!publicationDetails || publicationDetails.actualCount === 0)
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
      isPublished,
      publishedChannelsCount: publicationDetails?.actualCount ?? 0,
    },
  };
}

/**
 * Add Sibling Color to Existing Product Group
 */
export async function addSiblingColorProduct(
  sourceProductId: string,
  newColorName: string,
  options: {
    customColorHex?: string;
    price?: string;
    compareAtPrice?: string;
    quantity?: string | number;
    sku?: string;
    images?: ImageUploadItem[];
  }
): Promise<{ success: boolean; product?: ProductSummary; error?: string }> {
  const sourceProduct = await fetchProductById(sourceProductId);
  if (!sourceProduct) {
    return { success: false, error: 'Kaynak ürün bulunamadı.' };
  }

  const parsed = parseMojoProductTitle(sourceProduct.title, sourceProduct.customColorNameMetafield?.value);
  const modelTitle = sourceProduct.customModelTitleMetafield?.value || parsed.modelTitle || sourceProduct.title;
  const sourceGroupId =
    sourceProduct.customGroupIdMetafield?.value || `grp_${Date.now()}_${slugifyTurkish(modelTitle).slice(0, 20)}`;

  const firstVariant = sourceProduct.variants?.nodes?.[0];
  const price = options.price || firstVariant?.price || '0';
  const compareAtPrice = options.compareAtPrice || firstVariant?.compareAtPrice || '';
  const quantity = options.quantity !== undefined ? options.quantity : '0';

  const createResult = await createMojoProduct(
    {
      modelTitle,
      colorName: newColorName,
      customColorHex: options.customColorHex,
      price: String(price),
      compareAtPrice: String(compareAtPrice),
      quantity,
      sku: options.sku,
      descriptionHtml: sourceProduct.descriptionHtml,
      status: 'ACTIVE',
    },
    options.images || []
  );

  if (!createResult.success || !createResult.product) {
    return { success: false, error: createResult.error || 'Yeni renk ürünü oluşturulamadı.' };
  }

  // Gather all existing sibling products + the new one and sync references across all of them
  const existingSiblings: SiblingProductInput[] =
    sourceProduct.customColorProductsMetafield?.references?.nodes || [sourceProduct];

  const allSiblings: SiblingProductInput[] = [
    ...existingSiblings.filter((s) => s.id !== createResult.product?.id),
    {
      id: createResult.product.id,
      title: createResult.product.title,
      colorName: newColorName,
      hex: createResult.product.swatchColor,
      templateSuffix: 'mojo-dynamic',
      groupId: sourceGroupId,
    },
  ];

  await syncSiblingColorProductReferences(allSiblings, {
    modelTitle,
    groupId: sourceGroupId,
  });

  return { success: true, product: createResult.product };
}

/**
 * Delete a product permanently
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  const fullId = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

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
