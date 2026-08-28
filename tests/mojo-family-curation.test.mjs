import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMojoProduct,
  addSiblingColorProduct,
  updateFamilyHomepageCuration,
  updateMojoProduct
} from '../lib/shopify/products.ts';
import { clearShopifyTokenCache } from '../lib/shopify/client.ts';

const mockDomain = 'test-store.myshopify.com';
const mockClientId = 'test_client_id_123';
const mockClientSecret = 'test_client_secret_456';

function setupMockEnv() {
  process.env.SHOPIFY_STORE_DOMAIN = mockDomain;
  process.env.SHOPIFY_CLIENT_ID = mockClientId;
  process.env.SHOPIFY_CLIENT_SECRET = mockClientSecret;
  process.env.SHOPIFY_API_VERSION = '2026-07';
  clearShopifyTokenCache();
}

function createMockFetch(graphqlHandler) {
  return async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('/admin/oauth/access_token')) {
      return {
        ok: true,
        json: async () => ({
          access_token: 'mock_access_token_xyz',
          expires_in: 86399,
          scope: 'read_products,write_products,read_inventory,write_inventory',
        }),
      };
    }
    if (urlStr.includes('/graphql.json')) {
      const body = JSON.parse(String(init?.body || '{}'));
      return graphqlHandler(body);
    }
    return { ok: true, json: async () => ({}) };
  };
}

test('1. Family Curation: 0 selected -> PASS', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  const updatePayloads = [];

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProductsList') || query.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            products: {
              edges: [
                { node: { id: 'gid://shopify/Product/1', title: 'Bag - Siyah', customGroupIdMetafield: { value: 'grp_test' } } },
                { node: { id: 'gid://shopify/Product/2', title: 'Bag - Beyaz', customGroupIdMetafield: { value: 'grp_test' } } },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      };
    }
    if (query.includes('ProductUpdate') || query.includes('productUpdate')) {
      updatePayloads.push(body.variables?.product);
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: body.variables?.product?.id }, userErrors: [] },
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ data: {} }) };
  });

  try {
    const res = await updateFamilyHomepageCuration('grp_test', [
      { productId: 'gid://shopify/Product/1', homepageVisible: false },
      { productId: 'gid://shopify/Product/2', homepageVisible: false },
    ]);
    assert.equal(res.success, true);
    assert.equal(updatePayloads.length, 2);
    assert.equal(updatePayloads[0].metafields[0].value, 'false');
    assert.equal(updatePayloads[1].metafields[0].value, 'false');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('2. Family Curation: 1 selected -> PASS', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  const updatePayloads = [];

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProductsList') || query.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            products: {
              edges: [
                { node: { id: 'gid://shopify/Product/1', title: 'Bag - Siyah', customGroupIdMetafield: { value: 'grp_test' } } },
                { node: { id: 'gid://shopify/Product/2', title: 'Bag - Beyaz', customGroupIdMetafield: { value: 'grp_test' } } },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      };
    }
    if (query.includes('ProductUpdate') || query.includes('productUpdate')) {
      updatePayloads.push(body.variables?.product);
      return {
        ok: true,
        json: async () => ({
          data: {
            productUpdate: { product: { id: body.variables?.product?.id }, userErrors: [] },
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ data: {} }) };
  });

  try {
    const res = await updateFamilyHomepageCuration('grp_test', [
      { productId: 'gid://shopify/Product/1', homepageVisible: true },
      { productId: 'gid://shopify/Product/2', homepageVisible: false },
    ]);
    assert.equal(res.success, true);
    assert.equal(updatePayloads[0].metafields[0].value, 'true');
    assert.equal(updatePayloads[1].metafields[0].value, 'false');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('3. Family Curation: 2 selected -> PASS', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProductsList') || query.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            products: {
              edges: [
                { node: { id: 'gid://shopify/Product/1', title: 'Bag - 1', customGroupIdMetafield: { value: 'grp_test' } } },
                { node: { id: 'gid://shopify/Product/2', title: 'Bag - 2', customGroupIdMetafield: { value: 'grp_test' } } },
                { node: { id: 'gid://shopify/Product/3', title: 'Bag - 3', customGroupIdMetafield: { value: 'grp_test' } } },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: { productUpdate: { product: { id: '1' }, userErrors: [] } },
      }),
    };
  });

  try {
    const res = await updateFamilyHomepageCuration('grp_test', [
      { productId: 'gid://shopify/Product/1', homepageVisible: true },
      { productId: 'gid://shopify/Product/2', homepageVisible: true },
      { productId: 'gid://shopify/Product/3', homepageVisible: false },
    ]);
    assert.equal(res.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('4. Family Curation: 5 selected -> PASS', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  const edges = [1, 2, 3, 4, 5, 6].map((i) => ({
    node: {
      id: `gid://shopify/Product/${i}`,
      title: `Bag - ${i}`,
      customGroupIdMetafield: { value: 'grp_test' },
    }
  }));

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProductsList') || query.includes('products(')) {
      return {
        ok: true,
        json: async () => ({ data: { products: { edges, pageInfo: { hasNextPage: false } } } }),
      };
    }
    return {
      ok: true,
      json: async () => ({ data: { productUpdate: { product: { id: '1' }, userErrors: [] } } }),
    };
  });

  try {
    const selections = [
      { productId: 'gid://shopify/Product/1', homepageVisible: true },
      { productId: 'gid://shopify/Product/2', homepageVisible: true },
      { productId: 'gid://shopify/Product/3', homepageVisible: true },
      { productId: 'gid://shopify/Product/4', homepageVisible: true },
      { productId: 'gid://shopify/Product/5', homepageVisible: true },
      { productId: 'gid://shopify/Product/6', homepageVisible: false },
    ];
    const res = await updateFamilyHomepageCuration('grp_test', selections);
    assert.equal(res.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('5. Family Curation: 6 selected -> REJECT (Atomic validation)', async () => {
  setupMockEnv();
  const selections = [
    { productId: 'gid://shopify/Product/1', homepageVisible: true },
    { productId: 'gid://shopify/Product/2', homepageVisible: true },
    { productId: 'gid://shopify/Product/3', homepageVisible: true },
    { productId: 'gid://shopify/Product/4', homepageVisible: true },
    { productId: 'gid://shopify/Product/5', homepageVisible: true },
    { productId: 'gid://shopify/Product/6', homepageVisible: true },
  ];
  const res = await updateFamilyHomepageCuration('grp_test', selections);
  assert.equal(res.success, false);
  assert.match(res.error || '', /en fazla 5 renk/);
});

test('6. Family Curation: Another-family product ID payload -> REJECT', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProductsList') || query.includes('products(')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            products: {
              edges: [
                { node: { id: 'gid://shopify/Product/1', title: 'Bag - 1', customGroupIdMetafield: { value: 'grp_test' } } },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ data: {} }) };
  });

  try {
    const res = await updateFamilyHomepageCuration('grp_test', [
      { productId: 'gid://shopify/Product/999', homepageVisible: true },
    ]);
    assert.equal(res.success, false);
    assert.match(res.error || '', /bu ürün ailesine ait değil/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('7. New Sibling: Default homepageVisible is FALSE', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  let createdProductPayload = null;

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProduct') || query.includes('product(')) {
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
                  ],
                },
              },
            },
          },
        }),
      };
    }
    if (query.includes('ProductCreate') || query.includes('productCreate')) {
      createdProductPayload = body.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/2',
                title: createdProductPayload?.title,
                handle: 'family-bag-bordo',
                status: 'ACTIVE',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/2' }] },
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
  });

  try {
    const res = await addSiblingColorProduct('gid://shopify/Product/1', 'Bordo', {
      images: [{ filename: 'bordo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') }],
    });
    assert.equal(res.success, true);
    const visMeta = createdProductPayload?.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(visMeta?.value, 'false', 'New sibling MUST default to false');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('8. New Sibling: Explicit homepageVisible = true works when total <= 5', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  let createdProductPayload = null;

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('GetProduct') || query.includes('product(')) {
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
                  ],
                },
              },
            },
          },
        }),
      };
    }
    if (query.includes('ProductCreate') || query.includes('productCreate')) {
      createdProductPayload = body.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/2',
                title: createdProductPayload?.title,
                handle: 'family-bag-bordo',
                status: 'ACTIVE',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/2' }] },
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
  });

  try {
    const res = await addSiblingColorProduct('gid://shopify/Product/1', 'Bordo', {
      homepageVisible: true,
      images: [{ filename: 'bordo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') }],
    });
    assert.equal(res.success, true);
    const visMeta = createdProductPayload?.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(visMeta?.value, 'true');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('9. Unrelated product update preserves existing homepage_visible', async () => {
  setupMockEnv();
  const originalFetch = globalThis.fetch;
  let updatePayload = null;

  globalThis.fetch = createMockFetch((body) => {
    const query = body.query || '';
    if (query.includes('ProductUpdate') || query.includes('productUpdate')) {
      updatePayload = body.variables?.product;
      return {
        ok: true,
        json: async () => ({
          data: { productUpdate: { product: { id: 'gid://shopify/Product/1' }, userErrors: [] } },
        }),
      };
    }
    return { ok: true, json: async () => ({ data: {} }) };
  });

  try {
    const res = await updateMojoProduct('gid://shopify/Product/1', {
      title: 'Updated Title Only',
    });
    assert.equal(res.success, true);
    const mf = updatePayload?.metafields?.find((m) => m.key === 'mojo_homepage_visible');
    assert.equal(mf, undefined, 'Unrelated title edit should not touch homepage_visible');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
