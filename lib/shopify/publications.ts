import { executeShopifyGraphQL } from './client';
import { ONLINE_STORE_PUBLICATIONS_QUERY, PUBLISHABLE_PUBLISH_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

export interface TargetPublication {
  id: string;
  name: string;
  isOnlineStore: boolean;
  isPos: boolean;
}

let cachedTargetPublications: TargetPublication[] | null = null;

/**
 * Discover and cache the default target sales channel publications
 * (Online Store + Point of Sale)
 */
export async function getDefaultSalesChannelPublications(): Promise<TargetPublication[]> {
  if (cachedTargetPublications && cachedTargetPublications.length > 0) {
    return cachedTargetPublications;
  }

  const res = await executeShopifyGraphQL<{
    publications: {
      nodes: Array<{
        id: string;
        name: string;
        autoPublish: boolean;
        supportsFuturePublishing?: boolean;
      }>;
    };
  }>(ONLINE_STORE_PUBLICATIONS_QUERY, {
    variables: { first: 25 },
    label: 'Satış kanalı yayınları listesi',
  });

  const publications = res?.publications?.nodes || [];
  if (publications.length === 0) {
    throw new Error(
      'Shopify mağazasında erişilebilir satış kanalı (Publication) bulunamadı. Lütfen Shopify App write_publications yetkisini kontrol edin.'
    );
  }

  const targetList: TargetPublication[] = [];

  // 1. Find Online Store / Online Mağaza
  const onlineStore = publications.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes('online store') || n.includes('online mağaza') || n.includes('online') || n.includes('web');
  }) || publications.find((p) => p.autoPublish === true) || publications[0];

  if (onlineStore) {
    targetList.push({
      id: onlineStore.id,
      name: onlineStore.name,
      isOnlineStore: true,
      isPos: false,
    });
  }

  // 2. Find Point of Sale / POS
  const pos = publications.find((p) => {
    const n = (p.name || '').toLowerCase();
    return (n.includes('point of sale') || n.includes('pos') || n.includes('satış noktası') || n.includes('fiziksel')) && p.id !== onlineStore?.id;
  });

  if (pos) {
    targetList.push({
      id: pos.id,
      name: pos.name,
      isOnlineStore: false,
      isPos: true,
    });
  }

  // If POS is not found, include any other active publication or autoPublish publication up to 2
  if (targetList.length < 2) {
    for (const p of publications) {
      if (!targetList.some((t) => t.id === p.id)) {
        targetList.push({
          id: p.id,
          name: p.name,
          isOnlineStore: false,
          isPos: false,
        });
        if (targetList.length >= 2) break;
      }
    }
  }

  cachedTargetPublications = targetList;
  return cachedTargetPublications;
}

/**
 * Get the single Online Store publication ID (backward-compatibility helper)
 */
export async function getOnlineStorePublicationId(): Promise<string> {
  const targets = await getDefaultSalesChannelPublications();
  const online = targets.find((t) => t.isOnlineStore) || targets[0];
  if (!online?.id) {
    throw new Error('Online Store satış kanalı publication ID bulunamadı.');
  }
  return online.id;
}

export interface PublicationResult {
  success: boolean;
  expectedCount: number;
  actualCount: number;
  channels: Array<{ id: string; name: string; isPublished: boolean }>;
  publicationIds?: string[];
  error?: string;
}

/**
 * Publish product to both Online Store and Point of Sale (Channels = 2)
 */
export async function publishProductToDefaultSalesChannels(
  productId: string
): Promise<PublicationResult> {
  if (!productId) {
    return {
      success: false,
      expectedCount: 2,
      actualCount: 0,
      channels: [],
      error: 'Geçersiz ürün kimliği',
    };
  }

  const fullId = String(productId).startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  try {
    const targets = await getDefaultSalesChannelPublications();
    const publicationInputs = targets.map((t) => ({ publicationId: t.id }));

    const res = await executeShopifyGraphQL<{
      publishablePublish: {
        publishable?: {
          availablePublicationsCount?: { count: number };
          resourcePublicationsCount?: { count: number };
        };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(PUBLISHABLE_PUBLISH_MUTATION, {
      variables: {
        id: fullId,
        input: publicationInputs,
      },
      label: 'Varsayılan satış kanallarına yayınlama (Online Store + POS)',
    });

    const userErrors = res?.publishablePublish?.userErrors || [];
    if (userErrors.length > 0) {
      const errorMsg = normalizeGraphQLError({ userErrors }, 'Satış kanallarına yayınlama gerçekleştirilemedi.');
      return {
        success: false,
        expectedCount: targets.length,
        actualCount: 0,
        channels: [],
        error: errorMsg,
      };
    }

    // Read-back verification
    const verification = await verifyProductPublications(productId);

    return {
      success: verification.actualCount > 0,
      expectedCount: targets.length,
      actualCount: verification.actualCount,
      channels: verification.channels,
      publicationIds: targets.map((t) => t.id),
    };
  } catch (err) {
    console.error('publishProductToDefaultSalesChannels error:', err);
    return {
      success: false,
      expectedCount: 2,
      actualCount: 0,
      channels: [],
      error: err instanceof Error ? err.message : 'Yayınlama başarısız oldu',
    };
  }
}

/**
 * Backward compatibility alias for single-channel callers
 */
export async function publishProductToOnlineStore(productId: string) {
  return publishProductToDefaultSalesChannels(productId);
}

/**
 * Read-back verification of all published channels for a product
 */
export async function verifyProductPublications(productId: string): Promise<{
  isPublished: boolean;
  actualCount: number;
  channels: Array<{ id: string; name: string; isPublished: boolean }>;
}> {
  const fullId = String(productId).startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
  const query = /* GraphQL */ `
    query VerifyProductPublications($id: ID!) {
      product(id: $id) {
        id
        publishedOnCurrentPublication
        resourcePublications(first: 10) {
          nodes {
            isPublished
            publication {
              id
              name
            }
          }
        }
      }
    }
  `;

  try {
    const res = await executeShopifyGraphQL<{
      product: {
        id: string;
        publishedOnCurrentPublication: boolean;
        resourcePublications: {
          nodes: Array<{
            isPublished: boolean;
            publication: { id: string; name: string };
          }>;
        };
      };
    }>(query, {
      variables: { id: fullId },
      label: 'Kanal yayın durumu doğrulaması',
    });

    const nodes = res?.product?.resourcePublications?.nodes || [];
    const publishedNodes = nodes.filter((n) => n.isPublished);

    return {
      isPublished: publishedNodes.length > 0 || res?.product?.publishedOnCurrentPublication || false,
      actualCount: publishedNodes.length,
      channels: nodes.map((n) => ({
        id: n.publication?.id,
        name: n.publication?.name,
        isPublished: n.isPublished,
      })),
    };
  } catch (err) {
    console.warn('Yayın durumu doğrulama uyarısı:', err);
    return {
      isPublished: false,
      actualCount: 0,
      channels: [],
    };
  }
}
