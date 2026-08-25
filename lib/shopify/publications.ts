import { executeShopifyGraphQL } from './client';
import { ONLINE_STORE_PUBLICATIONS_QUERY, PUBLISHABLE_PUBLISH_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

let cachedOnlineStorePublicationId: string | null = null;

export async function getOnlineStorePublicationId(): Promise<string | null> {
  if (cachedOnlineStorePublicationId) return cachedOnlineStorePublicationId;

  try {
    const res = await executeShopifyGraphQL<{
      publications: {
        nodes: Array<{
          id: string;
          name: string;
          autoPublish: boolean;
        }>;
      };
    }>(ONLINE_STORE_PUBLICATIONS_QUERY, {
      variables: { first: 25 },
      label: 'Kanal yayınları',
    });

    const publications = res?.publications?.nodes || [];
    const onlineStore =
      publications.find(
        (p) =>
          p.name?.toLowerCase().includes('online store') ||
          p.name?.toLowerCase().includes('online') ||
          p.autoPublish === true
      ) || publications[0];

    if (onlineStore?.id) {
      cachedOnlineStorePublicationId = onlineStore.id;
      return cachedOnlineStorePublicationId;
    }
  } catch (err) {
    console.warn('Online store yayını sorgulanamadı:', err);
  }

  return null;
}

export async function publishProductToOnlineStore(productId: string): Promise<{
  success: boolean;
  publicationId?: string;
  error?: string;
}> {
  if (!productId) return { success: false, error: 'Geçersiz ürün kimliği' };
  const fullId = String(productId).startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  try {
    const publicationId = await getOnlineStorePublicationId();
    if (!publicationId) {
      return { success: false, error: 'Online Store yayını bulunamadı.' };
    }

    const res = await executeShopifyGraphQL<{
      publishablePublish: {
        publishable?: { availablePublicationCount: number; publicationCount: number };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(PUBLISHABLE_PUBLISH_MUTATION, {
      variables: {
        id: fullId,
        input: [{ publicationId }],
      },
      label: 'Online Store kanalına yayınlama',
    });

    const userErrors = res?.publishablePublish?.userErrors || [];
    if (userErrors.length > 0) {
      return { success: false, error: normalizeGraphQLError({ userErrors }) };
    }

    return { success: true, publicationId };
  } catch (err) {
    console.error('publishProductToOnlineStore error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Yayınlama başarısız oldu' };
  }
}
