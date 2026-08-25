import { normalizeGraphQLError } from './errors';

export interface ShopifyGraphQLOptions {
  variables?: Record<string, unknown>;
  timeoutMs?: number;
  label?: string;
}

export interface ShopifyGraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown[]; path?: unknown[] }>;
}

export function getShopifyConfig() {
  const domain = (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';

  return {
    domain,
    token,
    apiVersion,
    isConfigured: Boolean(domain && token),
  };
}

export async function executeShopifyGraphQL<T = Record<string, unknown>>(
  query: string,
  options: ShopifyGraphQLOptions = {}
): Promise<T> {
  const { variables = {}, timeoutMs = 25000, label = 'Shopify API işlemi' } = options;
  const config = getShopifyConfig();

  if (!config.domain) {
    throw new Error('SHOPIFY_STORE_DOMAIN yapılandırılmamış. Lütfen .env dosyanızı kontrol edin.');
  }

  if (!config.token) {
    throw new Error(
      'SHOPIFY_ADMIN_ACCESS_TOKEN yapılandırılmamış. Lütfen Shopify Admin API Access Token ekleyin.'
    );
  }

  const endpoint = `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': config.token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Shopify API yetkilendirme hatası (401/403). Erişim jetonunu kontrol edin.');
      }
      if (response.status === 429) {
        throw new Error('Shopify API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.');
      }
      throw new Error(`Shopify API sunucu hatası (HTTP ${response.status})`);
    }

    const json: ShopifyGraphQLResponse<T> = await response.json();

    if (json.errors && json.errors.length > 0) {
      const errorMsg = normalizeGraphQLError(json, `${label} başarısız oldu.`);
      const err = new Error(errorMsg);
      // @ts-expect-error adding graphQLErrors property
      err.graphQLErrors = json.errors;
      throw err;
    }

    if (!json.data) {
      throw new Error(`${label} için sunucudan veri dönmedi.`);
    }

    return json.data;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${label} zaman aşımına uğradı (${Math.ceil(timeoutMs / 1000)} sn).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
