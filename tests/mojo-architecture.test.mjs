import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMojoProductTitle,
  buildMojoColorIdentity,
  getColorSwatch,
  normalizeTurkish,
  slugifyTurkish,
  isCustomMojoTemplate,
  generateAutoSku,
  MOJO_COLOR_PALETTE,
  THEME_SUPPORTED_COLORS,
  COLOR_SWATCHES,
} from '../lib/shopify/mojo.ts';

import { categorizeError, normalizeGraphQLError } from '../lib/shopify/errors.ts';
import { buildInventoryQuantity, validateProductSetInventoryInput } from '../lib/shopify/inventory.ts';
import { getShopifyConfig, clearShopifyTokenCache, getShopifyTokenCacheStatus, getShopifyAccessToken } from '../lib/shopify/client.ts';

test('isCustomMojoTemplate detects mojo-dynamic and theme templates', () => {
  assert.equal(isCustomMojoTemplate('mojo-dynamic'), true);
  assert.equal(isCustomMojoTemplate('pristine3gozlu'), true);
  assert.equal(isCustomMojoTemplate('pristine-mini-capraz'), true);
  assert.equal(isCustomMojoTemplate('mojo-body-bag'), true);
  assert.equal(isCustomMojoTemplate('mojo-ayarlanabilir-zincir'), true);
  assert.equal(isCustomMojoTemplate(''), false);
  assert.equal(isCustomMojoTemplate('standard'), false);
});

test('Turkish normalization and slugification works accurately', () => {
  assert.equal(normalizeTurkish('  Krem  '), 'krem');
  assert.equal(normalizeTurkish('İPEK OMUZ ÇANTASI'), 'ipek omuz çantası');
  assert.equal(slugifyTurkish('Pristine 3 Gözlü Çapraz Çanta - Krem'), 'pristine-3-gozlu-capraz-canta-krem');
});

test('getColorSwatch returns accurate hex codes for preset and theme colors', () => {
  assert.equal(getColorSwatch('Siyah'), '#000000');
  assert.equal(getColorSwatch('siyah'), '#000000');
  assert.equal(getColorSwatch('Krem'), '#EAE3D6');
  assert.equal(getColorSwatch('krem'), '#EAE3D6');
  assert.equal(getColorSwatch('Taba'), '#B85A2B');
  assert.equal(getColorSwatch('Kırmızı'), '#F61F1F');
  assert.equal(getColorSwatch('Sarı'), '#FFD700', 'Yellow swatch must return #FFD700');
  assert.equal(getColorSwatch('sarı'), '#FFD700');
  assert.equal(getColorSwatch('Turuncu'), '#FFA500');
  assert.equal(getColorSwatch('Mor'), '#800080');
  assert.equal(getColorSwatch('Camel'), '#C19A6B');
  assert.equal(getColorSwatch('Antrasit'), '#383E42');
  assert.equal(getColorSwatch('BilinmeyenRenk'), '#CCCCCC');
});

test('MOJO_COLOR_PALETTE contains the required standard colors', () => {
  assert.ok(MOJO_COLOR_PALETTE.includes('Siyah'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Beyaz'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Krem'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Ekru'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Bej'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Vizon'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Taba'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Kahverengi'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Kırmızı'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Bordo'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Turuncu'));
});

test('parseMojoProductTitle correctly splits model title and color', () => {
  const result1 = parseMojoProductTitle('Luna Omuz Çantası - Krem');
  assert.equal(result1.modelTitle, 'Luna Omuz Çantası');
  assert.equal(result1.colorName, 'Krem');

  const result2 = parseMojoProductTitle('Pristine 3 Gözlü Çanta - Siyah DR');
  assert.equal(result2.modelTitle, 'Pristine 3 Gözlü Çanta');
  assert.equal(result2.colorName, 'Siyah');
  assert.equal(result2.modelCode, 'DR');

  const result3 = parseMojoProductTitle('Standart Model');
  assert.equal(result3.modelTitle, 'Standart Model');
});

test('generateAutoSku generates non-empty SKU with model and color codes', () => {
  const sku = generateAutoSku('Luna Omuz Çantası', 'Krem');
  assert.ok(sku.startsWith('MJ-LUNA-OMU-') || sku.startsWith('MOJO-'));
  assert.ok(sku.includes('KREM'));
});

test('Inventory helpers build valid payloads without availableQuantity', () => {
  const inv = buildInventoryQuantity('gid://shopify/Location/12345', '20', 'available');
  assert.deepEqual(inv, {
    locationId: 'gid://shopify/Location/12345',
    name: 'available',
    quantity: 20,
  });
  assert.equal('availableQuantity' in (inv || {}), false);
  assert.equal(validateProductSetInventoryInput(inv), true);
  assert.equal(validateProductSetInventoryInput({ locationId: 'loc', availableQuantity: 5 }), false);
});

test('Error normalizer sanitizes raw GraphQL and schema errors', () => {
  const schemaError = 'Variable $input of type ProductSetInput! was provided invalid value for variants.0.inventoryQuantities.0.availableQuantity';
  const clean = normalizeGraphQLError(schemaError);
  assert.equal(clean.includes('Variable $input'), false);
  assert.equal(clean.includes('availableQuantity'), false);
  assert.equal(categorizeError('SKU already taken'), 'SKU kodu zaten kullanımda veya çakışıyor.');
});

test('Shopify Client Credentials configuration and cache management', async () => {
  // Test getShopifyConfig
  process.env.SHOPIFY_STORE_DOMAIN = 'test-store.myshopify.com';
  process.env.SHOPIFY_CLIENT_ID = 'test_client_id_123';
  process.env.SHOPIFY_CLIENT_SECRET = 'test_client_secret_456';
  process.env.SHOPIFY_API_VERSION = '2026-07';

  const config = getShopifyConfig();
  assert.equal(config.domain, 'test-store.myshopify.com');
  assert.equal(config.clientId, 'test_client_id_123');
  assert.equal(config.clientSecret, 'test_client_secret_456');
  assert.equal(config.apiVersion, '2026-07');
  assert.equal(config.isConfigured, true);

  // Test cache clearing and initial status
  clearShopifyTokenCache();
  const status = getShopifyTokenCacheStatus();
  assert.equal(status.hasCachedToken, false);
  assert.equal(status.isExpired, true);
});

test('Shopify Client Credentials Grant token retrieval and caching with mock fetch', async () => {
  clearShopifyTokenCache();

  process.env.SHOPIFY_STORE_DOMAIN = 'test-mock-store.myshopify.com';
  process.env.SHOPIFY_CLIENT_ID = 'mock_client_id';
  process.env.SHOPIFY_CLIENT_SECRET = 'mock_client_secret';

  let fetchCallCount = 0;
  let receivedBody = '';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/admin/oauth/access_token')) {
      fetchCallCount++;
      receivedBody = String(init?.body || '');
      return {
        ok: true,
        json: async () => ({
          access_token: 'shpat_mock_credentials_token_9999',
          scope: 'write_products,write_inventory,write_files',
          expires_in: 86400,
        }),
      };
    }
    return originalFetch(url, init);
  };

  try {
    // 1. Initial token retrieval
    const token1 = await getShopifyAccessToken();
    assert.equal(token1, 'shpat_mock_credentials_token_9999');
    assert.equal(fetchCallCount, 1);
    assert.ok(receivedBody.includes('grant_type=client_credentials'));
    assert.ok(receivedBody.includes('client_id=mock_client_id'));
    assert.ok(receivedBody.includes('client_secret=mock_client_secret'));

    // 2. Second retrieval should hit in-memory cache without extra HTTP call
    const token2 = await getShopifyAccessToken();
    assert.equal(token2, 'shpat_mock_credentials_token_9999');
    assert.equal(fetchCallCount, 1); // Cache hit, no second fetch

    // 3. Cache status inspection
    const status = getShopifyTokenCacheStatus();
    assert.equal(status.hasCachedToken, true);
    assert.equal(status.isExpired, false);

    // 4. Forced refresh should invalidate cache and fetch fresh token
    const token3 = await getShopifyAccessToken(true);
    assert.equal(token3, 'shpat_mock_credentials_token_9999');
    assert.equal(fetchCallCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearShopifyTokenCache();
  }
});

test('MOJO taxonomy categories and default bag category configuration', async () => {
  const { MOJO_TAXONOMY_CATEGORIES, getDefaultMojoCategory } = await import('../lib/shopify/categories.ts');
  assert.ok(Array.isArray(MOJO_TAXONOMY_CATEGORIES));
  assert.ok(MOJO_TAXONOMY_CATEGORIES.length >= 4);

  const defaultCat = getDefaultMojoCategory();
  assert.ok(defaultCat.id.startsWith('gid://shopify/TaxonomyCategory/'));
  assert.ok(defaultCat.name.toLowerCase().includes('çanta'));
});

function createMockFetch(graphqlHandler) {
  return async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('/admin/oauth/access_token')) {
      return {
        ok: true,
        json: async () => ({
          access_token: 'shpat_mock_test_token_12345',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      };
    }
    return graphqlHandler(url, init);
  };
}

test('Inventory CAS: setInventoryQuantity skips mutation when current stock already matches target', async () => {
  const { setInventoryQuantity } = await import('../lib/shopify/inventory.ts');

  let mutationCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetInventoryItemLevel')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            inventoryItem: {
              id: 'gid://shopify/InventoryItem/12345',
              inventoryLevels: {
                nodes: [
                  {
                    location: { id: 'gid://shopify/Location/999' },
                    quantities: [{ name: 'available', quantity: 15 }],
                  },
                ],
              },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('InventorySetQuantities')) {
      mutationCalled = true;
      return {
        ok: true,
        json: async () => ({
          data: { inventorySetQuantities: { inventoryAdjustmentGroup: { id: 'adj_1' }, userErrors: [] } },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const res = await setInventoryQuantity('gid://shopify/InventoryItem/12345', 'gid://shopify/Location/999', 15);
    assert.equal(res, true);
    assert.equal(mutationCalled, false, 'Mutation should not be called when quantity is unchanged');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Inventory CAS: setInventoryQuantity retries once on stale quantity and succeeds', async () => {
  const { setInventoryQuantity } = await import('../lib/shopify/inventory.ts');

  let readCount = 0;
  let mutationCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetInventoryItemLevel')) {
      readCount++;
      return {
        ok: true,
        json: async () => ({
          data: {
            inventoryItem: {
              id: 'gid://shopify/InventoryItem/12345',
              inventoryLevels: {
                nodes: [
                  {
                    location: { id: 'gid://shopify/Location/999' },
                    quantities: [{ name: 'available', quantity: readCount === 1 ? 10 : 12 }],
                  },
                ],
              },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('InventorySetQuantities')) {
      mutationCount++;
      if (mutationCount === 1) {
        // First mutation attempt fails with stale quantity error
        return {
          ok: true,
          json: async () => ({
            data: {
              inventorySetQuantities: {
                userErrors: [
                  {
                    field: ['input', 'quantities', '0', 'changeFromQuantity'],
                    message: 'The changeFromQuantity argument no longer matches the persisted quantity.',
                    code: 'CHANGE_FROM_QUANTITY_STALE',
                  },
                ],
              },
            },
          }),
        };
      }
      // Second attempt succeeds
      return {
        ok: true,
        json: async () => ({
          data: {
            inventorySetQuantities: {
              inventoryAdjustmentGroup: { id: 'adj_success' },
              userErrors: [],
            },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const res = await setInventoryQuantity('gid://shopify/InventoryItem/12345', 'gid://shopify/Location/999', 20);
    assert.equal(res, true);
    assert.equal(readCount, 2, 'Should re-read quantity before retry');
    assert.equal(mutationCount, 2, 'Should retry mutation once');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Inventory CAS: setInventoryQuantity formats user-friendly error when stale retries exhausted', async () => {
  const { setInventoryQuantity } = await import('../lib/shopify/inventory.ts');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetInventoryItemLevel')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            inventoryItem: {
              id: 'gid://shopify/InventoryItem/12345',
              inventoryLevels: {
                nodes: [
                  {
                    location: { id: 'gid://shopify/Location/999' },
                    quantities: [{ name: 'available', quantity: 10 }],
                  },
                ],
              },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('InventorySetQuantities')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            inventorySetQuantities: {
              userErrors: [
                {
                  field: ['input', 'quantities', '0', 'changeFromQuantity'],
                  message: 'The changeFromQuantity argument no longer matches the persisted quantity.',
                  code: 'CHANGE_FROM_QUANTITY_STALE',
                },
              ],
            },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    await assert.rejects(
      async () => {
        await setInventoryQuantity('gid://shopify/InventoryItem/12345', 'gid://shopify/Location/999', 25);
      },
      (err) => {
        assert.ok(err.message.includes('Stok siz düzenlerken Shopify\'da değişti'));
        assert.equal(err.message.includes('Variable $input'), false);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Publication verification: verifyProductPublicationsWithRetry succeeds with target channel matching', async () => {
  const { verifyProductPublicationsWithRetry } = await import('../lib/shopify/publications.ts');

  const targetIds = ['gid://shopify/Publication/1', 'gid://shopify/Publication/2'];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('VerifyProductPublications')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            product: {
              id: 'gid://shopify/Product/1001',
              publishedOnCurrentPublication: true,
              resourcePublications: {
                nodes: [
                  { isPublished: true, publication: { id: 'gid://shopify/Publication/1', name: 'Online Store' } },
                  { isPublished: true, publication: { id: 'gid://shopify/Publication/2', name: 'Point of Sale' } },
                ],
              },
            },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const result = await verifyProductPublicationsWithRetry('gid://shopify/Product/1001', targetIds, 2);
    assert.equal(result.isPublished, true);
    assert.equal(result.actualCount, 2);
    assert.equal(result.channels.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Sibling Color Workflow: addSiblingColorProduct supports customizable fields and inherits category', async () => {
  const { addSiblingColorProduct } = await import('../lib/shopify/products.ts');

  let passedCreateInput = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetProduct')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            product: {
              id: 'gid://shopify/Product/5001',
              title: 'Luna Omuz Çantası - Siyah',
              handle: 'luna-omuz-cantasi-siyah',
              descriptionHtml: '<p>Kaynak ürün açıklaması</p>',
              category: { id: 'gid://shopify/TaxonomyCategory/aa-1', name: 'Kadın Çantaları' },
              productType: 'Omuz Çantası',
              tags: ['luna', 'omuz'],
              variants: { nodes: [{ id: 'gid://shopify/ProductVariant/50011', price: '1299.00', compareAtPrice: '1599.00' }] },
              customGroupIdMetafield: { value: 'grp_luna_123' },
              customModelTitleMetafield: { value: 'Luna Omuz Çantası' },
              customColorNameMetafield: { value: 'Siyah' },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('ProductCreate')) {
      const parsedBody = JSON.parse(bodyStr);
      passedCreateInput = parsedBody.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/5002',
                title: passedCreateInput?.title,
                handle: 'luna-omuz-cantasi-bordo',
                status: 'ACTIVE',
                category: { id: passedCreateInput?.category, name: 'Kadın Çantaları' },
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/50021' }] },
              },
              userErrors: [],
            },
          },
        }),
      };
    }
    if (bodyStr.includes('ProductVariantsBulkUpdate') || bodyStr.includes('PublishProduct') || bodyStr.includes('VerifyProductPublications') || bodyStr.includes('GetOnlineStorePublications')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            productVariantsBulkUpdate: { userErrors: [] },
            publications: { nodes: [{ id: 'gid://shopify/Publication/1', name: 'Online Store', autoPublish: true }] },
            publishablePublish: { userErrors: [] },
            product: { id: 'gid://shopify/Product/5002', publishedOnCurrentPublication: true, resourcePublications: { nodes: [{ isPublished: true, publication: { id: 'gid://shopify/Publication/1', name: 'Online Store' } }] } },
          },
        }),
      };
    }
    if (bodyStr.includes('productUpdate')) {
      return {
        ok: true,
        json: async () => ({ data: { productUpdate: { product: { id: 'gid://shopify/Product/5001' }, userErrors: [] } } }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    // 1. Test with customized description, custom price, and inherited category
    const res = await addSiblingColorProduct('gid://shopify/Product/5001', 'Bordo', {
      price: '1499.00',
      compareAtPrice: '1799.00',
      descriptionHtml: '<p>Bordo renge özel açıklama</p>',
    });

    assert.equal(res.success, true);
    assert.equal(passedCreateInput?.title, 'Luna Omuz Çantası - Bordo');
    assert.equal(passedCreateInput?.descriptionHtml, '<p>Bordo renge özel açıklama</p>');
    assert.equal(passedCreateInput?.category, 'gid://shopify/TaxonomyCategory/aa-1', 'Should inherit category from source');
    assert.equal(passedCreateInput?.productType, 'Omuz Çantası', 'Should inherit productType from source');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('UI Regression: Product detail page button contains single plus sign', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.resolve('app/products/[id]/page.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.equal(content.includes('+ + Yeni Renk Ekle'), false, 'Must not contain double plus icon');
  assert.ok(content.includes('<span>Yeni Renk Ekle</span>') || content.includes('>Yeni Renk Ekle<'));
});

test('Collection helper: fetchCollections and addProductToCollections with mock GraphQL', async () => {
  const { fetchCollections, addProductToCollections } = await import('../lib/shopify/collections.ts');
  const originalFetch = globalThis.fetch;
  let addedToCol = '';

  globalThis.fetch = (async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetCollections')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            collections: {
              nodes: [
                { id: 'gid://shopify/Collection/101', title: 'Pristine 3 Gözlü', handle: 'pristine-3-gozlu' },
                { id: 'gid://shopify/Collection/102', title: 'Mojo Askılı', handle: 'mojo-askili' },
              ],
            },
          },
        }),
      };
    }
    if (bodyStr.includes('CollectionAddProducts')) {
      const parsed = JSON.parse(bodyStr);
      addedToCol = parsed.variables?.id;
      return {
        ok: true,
        json: async () => ({
          data: {
            collectionAddProducts: {
              collection: { id: addedToCol, title: 'Test Collection' },
              userErrors: [],
            },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const cols = await fetchCollections();
    assert.equal(cols.length, 2);
    assert.equal(cols[0].title, 'Pristine 3 Gözlü');

    const addRes = await addProductToCollections('gid://shopify/Product/999', ['101', '102']);
    assert.equal(addRes.success, true);
    assert.equal(addRes.addedCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Delete Product: self-heals by promoting surviving sibling when primary is deleted', async () => {
  const { deleteProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;
  let deletedId = '';
  let updatedSiblingPayloads = [];

  globalThis.fetch = (async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetProduct')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            product: {
              id: 'gid://shopify/Product/1001',
              title: 'Luna Çanta - Siyah',
              customColorProductsMetafield: {
                references: {
                  nodes: [
                    { id: 'gid://shopify/Product/1001', title: 'Luna Çanta - Siyah' },
                    { id: 'gid://shopify/Product/1002', title: 'Luna Çanta - Bordo' },
                  ],
                },
              },
              customPrimaryProductMetafield: { reference: { id: 'gid://shopify/Product/1001' } },
              customModelTitleMetafield: { value: 'Luna Çanta' },
              customGroupIdMetafield: { value: 'grp_luna' },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('productUpdate')) {
      const parsed = JSON.parse(bodyStr);
      updatedSiblingPayloads.push(parsed.variables?.product);
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: 'gid://shopify/Product/1002' }, userErrors: [] },
          },
        }),
      };
    }
    if (bodyStr.includes('ProductDelete')) {
      const parsed = JSON.parse(bodyStr);
      deletedId = parsed.variables?.input?.id;
      return {
        ok: true,
        json: async () => ({
          data: {
            productDelete: { deletedProductId: deletedId, userErrors: [] },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const res = await deleteProduct('gid://shopify/Product/1001');
    assert.equal(res, true);
    assert.equal(deletedId, 'gid://shopify/Product/1001');
    // Surviving sibling 1002 should have been synchronized as new primary
    assert.equal(updatedSiblingPayloads.length, 1);
    assert.equal(updatedSiblingPayloads[0].id, 'gid://shopify/Product/1002');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('P0 Bug Fix: syncSiblingColorProductReferences MUST NOT include templateSuffix in productUpdate payload', async () => {
  const { syncSiblingColorProductReferences } = await import('../lib/shopify/mojo.ts');
  const originalFetch = globalThis.fetch;
  let receivedProductPayloads = [];

  globalThis.fetch = (async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('productUpdate')) {
      const parsed = JSON.parse(bodyStr);
      receivedProductPayloads.push(parsed.variables?.product);
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: parsed.variables?.product?.id }, userErrors: [] },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    const siblings = [
      {
        id: 'gid://shopify/Product/8001',
        title: 'Pristine 3 Gözlü - Siyah',
        colorName: 'Siyah',
        hex: '#000000',
        templateSuffix: 'pristine3gozlu',
      },
      {
        id: 'gid://shopify/Product/8002',
        title: 'Pristine 3 Gözlü - Krem',
        colorName: 'Krem',
        hex: '#EAE3D6',
      },
    ];

    const result = await syncSiblingColorProductReferences(siblings, {
      modelTitle: 'Pristine 3 Gözlü',
      groupId: 'grp_pristine_3_gozlu',
    });

    assert.equal(result.success, true);
    assert.equal(receivedProductPayloads.length, 2);

    for (const payload of receivedProductPayloads) {
      assert.equal('templateSuffix' in payload, false, 'Payload MUST NOT contain templateSuffix to prevent overwriting existing templates');
      assert.ok(Array.isArray(payload.metafields), 'Payload must contain metafields');
      const hasColorProducts = payload.metafields.some((m) => m.key === 'mojo_color_products');
      assert.equal(hasColorProducts, true, 'Payload must update mojo_color_products');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Regression Test: custom.mojo_product_features MUST use multi_line_text_field in create and update mutations', async () => {
  const { createMojoProduct, updateMojoProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;
  let createPayload = null;
  let updatePayload = null;

  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('oauth/access_token')) {
      return {
        ok: true,
        json: async () => ({ access_token: 'mock_token_123', scope: 'write_products', expires_in: 86400 }),
      };
    }
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('ProductCreate') || bodyStr.includes('productCreate')) {
      const parsed = JSON.parse(bodyStr);
      createPayload = parsed.variables?.product || parsed.variables?.input;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/9999',
                handle: 'test-product-siyah',
                status: 'ACTIVE',
                templateSuffix: 'mojo-dynamic',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/99991', price: '1299.00' }] },
              },
              userErrors: [],
            },
          },
        }),
      };
    }
    if (bodyStr.includes('ProductUpdate') || bodyStr.includes('productUpdate')) {
      const parsed = JSON.parse(bodyStr);
      updatePayload = parsed.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: parsed.variables?.product?.id }, userErrors: [] },
          },
        }),
      };
    }
    if (
      bodyStr.includes('ProductVariantsBulkUpdate') ||
      bodyStr.includes('PublishProduct') ||
      bodyStr.includes('VerifyProductPublications') ||
      bodyStr.includes('GetOnlineStorePublications') ||
      bodyStr.includes('publishablePublish')
    ) {
      return {
        ok: true,
        json: async () => ({
          data: {
            productVariantsBulkUpdate: { userErrors: [] },
            publications: { nodes: [{ id: 'gid://shopify/Publication/1', name: 'Online Store', autoPublish: true }] },
            publishablePublish: { userErrors: [] },
            product: { id: 'gid://shopify/Product/9999', publishedOnCurrentPublication: true, resourcePublications: { nodes: [{ isPublished: true, publication: { id: 'gid://shopify/Publication/1', name: 'Online Store' } }] } },
          },
        }),
      };
    }
    return originalFetch(url, init);
  });

  try {
    // 1. Test Create
    const createRes = await createMojoProduct({
      modelTitle: 'Test Çanta',
      colorName: 'Siyah',
      price: '1299',
      productFeatures: 'Geniş iç hacimli, 3 bölmeli ve ayarlanabilir askılı çanta.',
    });

    assert.equal(createRes.success, true);
    assert.ok(createPayload, 'productCreate mutation must have been called');
    const createFeaturesMetafield = createPayload.metafields?.find((m) => m.key === 'mojo_product_features');
    assert.ok(createFeaturesMetafield, 'mojo_product_features must be in create payload');
    assert.equal(
      createFeaturesMetafield.type,
      'multi_line_text_field',
      'mojo_product_features MUST have type multi_line_text_field in create'
    );

    // 2. Test Update
    const updateRes = await updateMojoProduct('gid://shopify/Product/9999', {
      productFeatures: 'Güncellenmiş ürün özellikleri açıklaması.',
    });

    assert.equal(updateRes.success, true);
    assert.ok(updatePayload, 'productUpdate mutation must have been called');
    const updateFeaturesMetafield = updatePayload.metafields?.find((m) => m.key === 'mojo_product_features');
    assert.ok(updateFeaturesMetafield, 'mojo_product_features must be in update payload');
    assert.equal(
      updateFeaturesMetafield.type,
      'multi_line_text_field',
      'mojo_product_features MUST have type multi_line_text_field in update'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Card Group Architecture: detectMojoCardGroup identifies subgroups accurately', async () => {
  const { detectMojoCardGroup } = await import('../lib/shopify/mojo.ts');
  
  assert.equal(detectMojoCardGroup('MOJO Body Bags - Taba HSR', 'MOJO Body Bags'), 'HSR');
  assert.equal(detectMojoCardGroup('MOJO Body Bags - Siyah RG', 'MOJO Body Bags'), 'RG');
  assert.equal(detectMojoCardGroup('MOJO Body Bags - Zebra Beyaz DR', 'MOJO Body Bags'), 'ZEBRA');
  assert.equal(detectMojoCardGroup('MOJO Body Bags - Vizon DR', 'MOJO Body Bags'), 'DR');
  assert.equal(detectMojoCardGroup('test 5 - Siyah', 'test 5', 'grp_123_test-5'), 'grp_123_test-5');
});

test('Homepage Curated Max-5: createMojoProduct creates custom.mojo_homepage_visible boolean metafield', async () => {
  const { createMojoProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;

  let createPayload = null;

  globalThis.fetch = async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('ProductCreate') || bodyStr.includes('productCreate')) {
      const parsed = JSON.parse(bodyStr);
      createPayload = parsed.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/10001',
                title: createPayload.title,
                handle: 'test-product',
                status: 'ACTIVE',
                templateSuffix: 'mojo-dynamic',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/10001' }] },
              },
              userErrors: [],
            },
          },
        }),
      };
    }
    if (bodyStr.includes('GetAllProducts') || bodyStr.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            products: { edges: [] },
          },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: {
          productVariantsBulkUpdate: { userErrors: [] },
          publications: { nodes: [] },
          product: { id: 'gid://shopify/Product/10001' },
        },
      }),
    };
  };

  try {
    const res = await createMojoProduct({
      modelTitle: 'Curated Model',
      colorName: 'Siyah',
      price: '999',
      homepageVisible: true,
    });

    assert.equal(res.success, true);
    assert.ok(createPayload, 'productCreate mutation called');
    const homeVisMetafield = createPayload.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.ok(homeVisMetafield, 'mojo_homepage_visible must be present');
    assert.equal(homeVisMetafield.type, 'boolean');
    assert.equal(homeVisMetafield.value, 'true');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Homepage Curated Max-5: updateMojoProduct preserves existing value when undefined', async () => {
  const { updateMojoProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;

  let updatePayload = null;

  globalThis.fetch = async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('ProductUpdate') || bodyStr.includes('productUpdate')) {
      const parsed = JSON.parse(bodyStr);
      updatePayload = parsed.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: parsed.variables?.product?.id }, userErrors: [] },
          },
        }),
      };
    }
    return originalFetch(url, init);
  };

  try {
    const res = await updateMojoProduct('gid://shopify/Product/10001', {
      title: 'Only Title Update',
    });

    assert.equal(res.success, true);
    assert.ok(updatePayload);
    const homeVisMetafield = updatePayload.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(homeVisMetafield, undefined, 'homepageVisible must not be updated if omitted');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Homepage Curated Max-5: updateMojoProduct blocks 6th selection in same family', async () => {
  const { updateMojoProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetProduct') || bodyStr.includes('product(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            product: {
              id: 'gid://shopify/Product/6',
              title: 'Family A - 6',
              customColorProductsMetafield: {
                references: {
                  nodes: [
                    { id: 'gid://shopify/Product/1', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/2', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/3', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/4', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/5', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/6', customHomepageVisibleMetafield: { value: 'false' } },
                  ],
                },
              },
            },
          },
        }),
      };
    }
    return originalFetch(url, init);
  };

  try {
    const res = await updateMojoProduct('gid://shopify/Product/6', {
      homepageVisible: true,
    });

    assert.equal(res.success, false);
    assert.equal(res.error, 'Bu ürün ailesinde ana sayfa için en fazla 5 renk seçebilirsiniz.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Homepage Curated Max-5: addSiblingColorProduct defaults to true when count < 5 and false when count >= 5', async () => {
  const { addSiblingColorProduct } = await import('../lib/shopify/products.ts');
  const originalFetch = globalThis.fetch;

  let createdSiblingPayload = null;

  // Case A: 3 existing visible -> new sibling defaults to true
  globalThis.fetch = async (url, init) => {
    const bodyStr = String(init?.body || '');
    if (bodyStr.includes('GetProduct') || bodyStr.includes('product(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            product: {
              id: 'gid://shopify/Product/1',
              title: 'Family Bag - Siyah',
              customGroupIdMetafield: { value: 'grp_bag' },
              customColorProductsMetafield: {
                references: {
                  nodes: [
                    { id: 'gid://shopify/Product/1', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/2', customHomepageVisibleMetafield: { value: 'true' } },
                    { id: 'gid://shopify/Product/3', customHomepageVisibleMetafield: { value: 'true' } },
                  ],
                },
              },
            },
          },
        }),
      };
    }
    if (bodyStr.includes('ProductCreate') || bodyStr.includes('productCreate')) {
      const parsed = JSON.parse(bodyStr);
      createdSiblingPayload = parsed.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/4',
                title: createdSiblingPayload.title,
                handle: 'family-bag-kirmizi',
                status: 'ACTIVE',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/4' }] },
              },
              userErrors: [],
            },
          },
        }),
      };
    }
    if (bodyStr.includes('GetAllProducts') || bodyStr.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: { products: { edges: [] } },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: {
          productVariantsBulkUpdate: { userErrors: [] },
          productUpdate: { product: { id: 'gid://shopify/Product/1' }, userErrors: [] },
        },
      }),
    };
  };

  try {
    const resA = await addSiblingColorProduct('gid://shopify/Product/1', 'Kırmızı');
    assert.equal(resA.success, true);
    const visMetaA = createdSiblingPayload.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(visMetaA?.value, 'true', 'Sibling should default to true when family count is 3');

    // Case B: 5 existing visible -> new sibling defaults to false
    globalThis.fetch = async (url, init) => {
      const bodyStr = String(init?.body || '');
      if (bodyStr.includes('GetProduct') || bodyStr.includes('product(')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              product: {
                id: 'gid://shopify/Product/1',
                title: 'Family Bag - Siyah',
                customGroupIdMetafield: { value: 'grp_bag' },
                customColorProductsMetafield: {
                  references: {
                    nodes: [
                      { id: 'gid://shopify/Product/1', customHomepageVisibleMetafield: { value: 'true' } },
                      { id: 'gid://shopify/Product/2', customHomepageVisibleMetafield: { value: 'true' } },
                      { id: 'gid://shopify/Product/3', customHomepageVisibleMetafield: { value: 'true' } },
                      { id: 'gid://shopify/Product/4', customHomepageVisibleMetafield: { value: 'true' } },
                      { id: 'gid://shopify/Product/5', customHomepageVisibleMetafield: { value: 'true' } },
                    ],
                  },
                },
              },
            },
          }),
        };
      }
      if (bodyStr.includes('ProductCreate') || bodyStr.includes('productCreate')) {
        const parsed = JSON.parse(bodyStr);
        createdSiblingPayload = parsed.variables?.product;
        return {
          ok: true,
          json: async () => ({
            data: {
              productCreate: {
                product: {
                  id: 'gid://shopify/Product/6',
                  title: createdSiblingPayload.title,
                  handle: 'family-bag-yesil',
                  status: 'ACTIVE',
                  variants: { nodes: [{ id: 'gid://shopify/ProductVariant/6' }] },
                },
                userErrors: [],
              },
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            productVariantsBulkUpdate: { userErrors: [] },
            productUpdate: { product: { id: 'gid://shopify/Product/1' }, userErrors: [] },
          },
        }),
      };
    };

    const resB = await addSiblingColorProduct('gid://shopify/Product/1', 'Yeşil');
    assert.equal(resB.success, true);
    const visMetaB = createdSiblingPayload.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(visMetaB?.value, 'false', 'Sibling should default to false when family count is 5');
  } finally {
    globalThis.fetch = originalFetch;
  }
});




