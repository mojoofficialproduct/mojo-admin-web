import { executeShopifyGraphQL } from './client';
import { ONLINE_STORE_PUBLICATIONS_QUERY, PUBLISHABLE_PUBLISH_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

let cachedOnlineStorePublicationId: string | null = null;

export async function getOnlineStorePublicationId(): Promise<string> {
  if (cachedOnlineStorePublicationId) return cachedOnlineStorePublicationId;

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
  if (publications.length === 0) {
    throw new Error('Shopify mağazasında erişilebilir satış kanalı (Publication) bulunamadı. write_publications yetkisini kontrol edin.');
  }

  const onlineStore =
    publications.find(
      (p) =>
        p.name?.toLowerCase().includes('online store') ||
        p.name?.toLowerCase().includes('online') ||
        p.name?.toLowerCase().includes('web') ||
        p.autoPublish === true
    ) || publications[0];

  if (!onlineStore?.id) {
    throw new Error('Online Store satış kanalı publication ID bulunamadı.');
  }

  cachedOnlineStorePublicationId = onlineStore.id;
  return cachedOnlineStorePublicationId;
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
      return { success: false, error: normalizeGraphQLError({ userErrors }, 'Kanal yayını gerçekleştirilemedi.') };
    }

    return { success: true, publicationId };
  } catch (err) {
    console.error('publishProductToOnlineStore error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Yayınlama başarısız oldu' };
  }
}
