import { executeShopifyGraphQL } from './client';
import { COLLECTIONS_QUERY, COLLECTION_ADD_PRODUCTS_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

export interface CollectionSummary {
  id: string;
  numericId: string;
  title: string;
  handle: string;
  productsCount?: number;
}

/**
 * Fetch list of Shopify Collections
 */
export async function fetchCollections(first = 50): Promise<CollectionSummary[]> {
  try {
    const data = await executeShopifyGraphQL<{
      collections: {
        nodes: Array<{
          id: string;
          title: string;
          handle: string;
          productsCount?: { count: number };
        }>;
      };
    }>(COLLECTIONS_QUERY, {
      variables: { first },
      label: 'Koleksiyon listesi yükleme',
    });

    const nodes = data?.collections?.nodes || [];
    return nodes.map((c) => ({
      id: c.id,
      numericId: c.id.split('/').pop() || '',
      title: c.title,
      handle: c.handle,
      productsCount: c.productsCount?.count ?? 0,
    }));
  } catch (err) {
    console.error('fetchCollections error:', err);
    return [];
  }
}

/**
 * Assign a product to multiple manual collections via GraphQL
 */
export async function addProductToCollections(
  productId: string,
  collectionIds: string[] = []
): Promise<{ success: boolean; addedCount: number; errors?: string[] }> {
  if (!productId || !Array.isArray(collectionIds) || collectionIds.length === 0) {
    return { success: true, addedCount: 0 };
  }

  const fullProductId = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
  const validCollectionIds = collectionIds
    .map((cid) => (cid.startsWith('gid://') ? cid : `gid://shopify/Collection/${cid}`))
    .filter(Boolean);

  let addedCount = 0;
  const errors: string[] = [];

  for (const colId of validCollectionIds) {
    try {
      const res = await executeShopifyGraphQL<{
        collectionAddProducts: {
          collection?: { id: string; title: string };
          userErrors?: Array<{ field: string[]; message: string }>;
        };
      }>(COLLECTION_ADD_PRODUCTS_MUTATION, {
        variables: {
          id: colId,
          productIds: [fullProductId],
        },
        label: `Koleksiyona ürün ekleme (${colId})`,
      });

      const userErrors = res?.collectionAddProducts?.userErrors || [];
      if (userErrors.length > 0) {
        const msg = normalizeGraphQLError({ userErrors });
        console.warn(`Collection ${colId} addition notice:`, msg);
        errors.push(msg);
      } else {
        addedCount++;
      }
    } catch (err) {
      console.warn(`Error adding product to collection ${colId}:`, err);
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    success: errors.length === 0 || addedCount > 0,
    addedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}
