import { executeShopifyGraphQL } from './client';
import { LOCATIONS_QUERY, INVENTORY_SET_QUANTITIES_MUTATION } from './queries';
import { normalizeGraphQLError } from './errors';

export interface LocationNode {
  id: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
}

export async function fetchLocations(): Promise<LocationNode[]> {
  try {
    const data = await executeShopifyGraphQL<{
      locations: { nodes: LocationNode[] };
    }>(LOCATIONS_QUERY, { label: 'Mağaza lokasyonları' });

    return data?.locations?.nodes || [];
  } catch (err) {
    console.error('fetchLocations error:', err);
    return [];
  }
}

export function buildInventoryQuantity(locationId: string, quantity: string | number, name = 'available') {
  if (!locationId) return null;
  const parsedQty = parseInt(String(quantity), 10);
  if (Number.isNaN(parsedQty)) return null;
  return {
    locationId: String(locationId).trim(),
    name: String(name || 'available').trim(),
    quantity: parsedQty,
  };
}

export function validateProductSetInventoryInput(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const i = item as Record<string, unknown>;
  if (!i.locationId || typeof i.locationId !== 'string') return false;
  if (i.name !== 'available' && i.name !== 'on_hand') return false;
  if (typeof i.quantity !== 'number' || !Number.isInteger(i.quantity)) return false;
  if ('availableQuantity' in i) {
    console.error('CRITICAL: availableQuantity must not exist on ProductSetInventoryInput!', item);
    return false;
  }
  return true;
}

export const INVENTORY_ITEM_LEVEL_QUERY = /* GraphQL */ `
  query GetInventoryItemLevel($id: ID!) {
    inventoryItem(id: $id) {
      id
      inventoryLevels(first: 10) {
        nodes {
          location {
            id
          }
          quantities(names: ["available"]) {
            name
            quantity
          }
        }
      }
    }
  }
`;

/**
 * Fetch fresh current available quantity for a specific inventory item at a location
 */
export async function fetchCurrentInventoryQuantity(
  inventoryItemId: string,
  locationId: string
): Promise<number> {
  const fullItemId = inventoryItemId.startsWith('gid://')
    ? inventoryItemId
    : `gid://shopify/InventoryItem/${inventoryItemId}`;
  const fullLocId = locationId.startsWith('gid://')
    ? locationId
    : `gid://shopify/Location/${locationId}`;

  try {
    const res = await executeShopifyGraphQL<{
      inventoryItem: {
        id: string;
        inventoryLevels: {
          nodes: Array<{
            location: { id: string };
            quantities: Array<{ name: string; quantity: number }>;
          }>;
        };
      };
    }>(INVENTORY_ITEM_LEVEL_QUERY, {
      variables: { id: fullItemId },
      label: 'Mevcut stok adedi okuma',
    });

    const levels = res?.inventoryItem?.inventoryLevels?.nodes || [];
    const targetLevel = levels.find((l) => l.location?.id === fullLocId) || levels[0];
    const availableQty = targetLevel?.quantities?.find((q) => q.name === 'available')?.quantity;

    return typeof availableQty === 'number' ? availableQty : 0;
  } catch (err) {
    console.warn('fetchCurrentInventoryQuantity error, falling back to 0:', err);
    return 0;
  }
}

/**
 * Set inventory on a specific inventory item using official 2026-07 InventorySetQuantities mutation
 * Uses Compare-and-Swap (CAS) with fresh read and one retry on stale quantity.
 */
export async function setInventoryQuantity(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<boolean> {
  if (!inventoryItemId || !locationId || typeof quantity !== 'number') {
    return false;
  }

  const fullItemId = inventoryItemId.startsWith('gid://')
    ? inventoryItemId
    : `gid://shopify/InventoryItem/${inventoryItemId}`;
  const fullLocId = locationId.startsWith('gid://')
    ? locationId
    : `gid://shopify/Location/${locationId}`;

  // STEP A: Read fresh current available quantity from Shopify
  let currentQty = await fetchCurrentInventoryQuantity(fullItemId, fullLocId);

  // If current quantity is already equal to target quantity, no mutation needed
  if (currentQty === quantity) {
    return true;
  }

  // STEP B: Execute CAS mutation with single retry on stale quantity
  let success = false;
  let lastErrorMessage = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    const idempotencyKey = `mojo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const result = await executeShopifyGraphQL<{
        inventorySetQuantities: {
          inventoryAdjustmentGroup?: { id: string };
          userErrors?: Array<{ field: string[]; message: string; code?: string }>;
        };
      }>(INVENTORY_SET_QUANTITIES_MUTATION, {
        variables: {
          idempotencyKey,
          input: {
            reason: 'correction',
            name: 'available',
            quantities: [
              {
                inventoryItemId: fullItemId,
                locationId: fullLocId,
                quantity,
                changeFromQuantity: currentQty,
              },
            ],
          },
        },
        label: `Stok adedi güncelleme (Deneme ${attempt})`,
      });

      const userErrors = result?.inventorySetQuantities?.userErrors || [];
      if (userErrors.length === 0) {
        success = true;
        break;
      }

      const rawMsg = userErrors.map((e) => e.message).join(', ');
      lastErrorMessage = rawMsg;

      const isStale =
        rawMsg.toLowerCase().includes('changefromquantity') ||
        rawMsg.toLowerCase().includes('stale') ||
        userErrors.some((e) => e.code === 'CHANGE_FROM_QUANTITY_STALE');

      if (isStale) {
        if (attempt === 1) {
          console.warn('Inventory CAS stale quantity detected, refetching fresh stock and retrying...');
          currentQty = await fetchCurrentInventoryQuantity(fullItemId, fullLocId);
          if (currentQty === quantity) {
            success = true;
            break;
          }
          continue;
        } else {
          throw new Error(
            'Stok siz düzenlerken Shopify\'da değişti. Güncel stok bilgisi yeniden yüklendi. Lütfen tekrar deneyin.'
          );
        }
      }

      throw new Error(normalizeGraphQLError({ userErrors }, 'Stok güncellenemedi.'));
    } catch (err) {
      const errStr = String(err);
      if (
        errStr.includes('changeFromQuantity') ||
        errStr.includes('stale') ||
        errStr.includes('CHANGE_FROM_QUANTITY_STALE')
      ) {
        if (attempt === 1) {
          currentQty = await fetchCurrentInventoryQuantity(fullItemId, fullLocId);
          if (currentQty === quantity) {
            success = true;
            break;
          }
          continue;
        } else {
          throw new Error(
            'Stok siz düzenlerken Shopify\'da değişti. Güncel stok bilgisi yeniden yüklendi. Lütfen tekrar deneyin.'
          );
        }
      }
      throw err;
    }
  }

  if (!success) {
    if (
      lastErrorMessage.toLowerCase().includes('changefromquantity') ||
      lastErrorMessage.toLowerCase().includes('stale')
    ) {
      throw new Error(
        'Stok siz düzenlerken Shopify\'da değişti. Güncel stok bilgisi yeniden yüklendi. Lütfen tekrar deneyin.'
      );
    }
    throw new Error(lastErrorMessage || 'Stok güncellenemedi.');
  }

  return true;
}
