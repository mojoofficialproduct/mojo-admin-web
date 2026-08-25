import { executeShopifyGraphQL } from './client';
import { STAGED_UPLOADS_CREATE_MUTATION, PRODUCT_UPDATE_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

export interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
}

export interface ImageUploadItem {
  filename: string;
  mimeType: string;
  buffer: Buffer | Uint8Array;
  altText?: string;
}

/**
 * Upload a binary buffer to the Shopify staged target URL
 */
export async function uploadBufferToShopifyStagedTarget(
  target: StagedTarget,
  buffer: Buffer | Uint8Array,
  filename: string,
  mimeType: string
): Promise<string> {
  const formData = new FormData();

  if (target.parameters && Array.isArray(target.parameters)) {
    for (const param of target.parameters) {
      formData.append(param.name, param.value);
    }
  }

  const blob = new Blob([buffer as BlobPart], { type: mimeType });
  formData.append('file', blob, filename);

  const response = await fetch(target.url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Görsel Shopify depolamasına yüklenemedi (HTTP ${response.status})`);
  }

  return target.resourceUrl;
}

/**
 * Create staged uploads and attach images directly to a Shopify Product
 */
export async function uploadAndAttachProductImages(
  productId: string,
  images: ImageUploadItem[]
): Promise<string[]> {
  if (!productId || !images || images.length === 0) {
    return [];
  }

  const stagedInputs = images.map((img) => ({
    resource: 'IMAGE',
    filename: img.filename || 'product-image.jpg',
    mimeType: img.mimeType || 'image/jpeg',
    httpMethod: 'POST',
  }));

  const stagedRes = await executeShopifyGraphQL<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(STAGED_UPLOADS_CREATE_MUTATION, {
    variables: { input: stagedInputs },
    label: 'Görsel yükleme hazırlığı',
  });

  const stagedTargets = stagedRes?.stagedUploadsCreate?.stagedTargets || [];
  const stagedErrors = stagedRes?.stagedUploadsCreate?.userErrors || [];
  if (stagedErrors.length > 0) {
    throw new Error(`Yükleme hazırlığı hatası: ${normalizeGraphQLError({ userErrors: stagedErrors })}`);
  }

  if (stagedTargets.length !== images.length) {
    throw new Error('Shopify beklenen sayıda yükleme hedefi döndürmedi.');
  }

  const mediaInputs = [];
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const target = stagedTargets[i];

    const resourceUrl = await uploadBufferToShopifyStagedTarget(
      target,
      item.buffer,
      item.filename,
      item.mimeType
    );

    mediaInputs.push({
      originalSource: resourceUrl,
      alt: item.altText?.trim() || item.filename || '',
      mediaContentType: 'IMAGE',
    });
  }

  // Attach all media to the product via productUpdate
  const updateRes = await executeShopifyGraphQL<{
    productUpdate: {
      product?: { id: string };
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(PRODUCT_UPDATE_MUTATION, {
    variables: {
      product: { id: productId },
      media: mediaInputs,
    },
    label: 'Görselleri ürüne bağlama',
  });

  const userErrors = updateRes?.productUpdate?.userErrors || [];
  if (userErrors.length > 0) {
    throw new Error(normalizeGraphQLError({ userErrors }, 'Görseller ürüne bağlanamadı.'));
  }

  return mediaInputs.map((m) => m.originalSource);
}
