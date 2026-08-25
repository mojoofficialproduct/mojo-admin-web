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

/**
 * Set inventory on a specific inventory item using official 2026-07 InventorySetQuantities mutation
 */
export async function setInventoryQuantity(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<boolean> {
  if (!inventoryItemId || !locationId || typeof quantity !== 'number') {
    return false;
  }

  const idempotencyKey = `mojo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const result = await executeShopifyGraphQL<{
    inventorySetQuantities: {
      inventoryAdjustmentGroup?: { id: string };
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  }>(INVENTORY_SET_QUANTITIES_MUTATION, {
    variables: {
      idempotencyKey,
      input: {
        reason: 'correction',
        name: 'available',
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity,
            changeFromQuantity: 0,
          },
        ],
      },
    },
    label: 'Stok adedi güncelleme',
  });

  const userErrors = result?.inventorySetQuantities?.userErrors || [];
  if (userErrors.length > 0) {
    throw new Error(normalizeGraphQLError({ userErrors }, 'Stok güncellenemedi.'));
  }

  return true;
}
