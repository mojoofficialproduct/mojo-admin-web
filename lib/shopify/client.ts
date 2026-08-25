import { normalizeGraphQLError } from './errors';

export interface ShopifyGraphQLOptions {
  variables?: Record<string, unknown>;
  timeoutMs?: number;
  label?: string;
  retryOnAuthError?: boolean;
}

export interface ShopifyGraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown[]; path?: unknown[] }>;
}

export interface ShopifyTokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
  associated_user_scope?: unknown;
  associated_user?: unknown;
}

export interface ShopifyConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  isConfigured: boolean;
}

interface TokenCacheState {
  accessToken: string;
  expiresAt: number; // timestamp in milliseconds
}

// In-memory token cache for server-side execution
let cachedTokenState: TokenCacheState | null = null;
let tokenFetchPromise: Promise<string> | null = null;

// 5 minutes buffer before actual expiration (in milliseconds)
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

export function getShopifyConfig(): ShopifyConfig {
  const domain = (process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const clientId = process.env.SHOPIFY_CLIENT_ID || '';
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || '';
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';

  return {
    domain,
    clientId,
    clientSecret,
    apiVersion,
    isConfigured: Boolean(domain && clientId && clientSecret),
  };
}

/**
 * Clear cached access token (used on 401 or auth reset)
 */
export function clearShopifyTokenCache(): void {
  cachedTokenState = null;
  tokenFetchPromise = null;
}

/**
 * Inspect in-memory cache status (safe, no secret leak)
 */
export function getShopifyTokenCacheStatus(): {
  hasCachedToken: boolean;
  expiresAt: number | null;
  isExpired: boolean;
} {
  if (!cachedTokenState) {
    return { hasCachedToken: false, expiresAt: null, isExpired: true };
  }
  const isExpired = Date.now() >= cachedTokenState.expiresAt - EXPIRATION_BUFFER_MS;
  return {
    hasCachedToken: true,
    expiresAt: cachedTokenState.expiresAt,
    isExpired,
  };
}

/**
 * Obtain Shopify Admin Access Token using Client Credentials Grant
 * Endpoint: POST https://{shop}.myshopify.com/admin/oauth/access_token
 * Body: grant_type=client_credentials&client_id={id}&client_secret={secret}
 */
export async function getShopifyAccessToken(forceRefresh = false): Promise<string> {
  const config = getShopifyConfig();

  if (!config.domain) {
    throw new Error('SHOPIFY_STORE_DOMAIN yapılandırılmamış. Lütfen .env dosyanızı kontrol edin.');
  }

  // Check valid non-expired cached token
  if (!forceRefresh && cachedTokenState) {
    const isStillValid = Date.now() < cachedTokenState.expiresAt - EXPIRATION_BUFFER_MS;
    if (isStillValid) {
      return cachedTokenState.accessToken;
    }
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      'SHOPIFY_CLIENT_ID veya SHOPIFY_CLIENT_SECRET yapılandırılmamış. Lütfen Shopify App kimlik bilgilerinizi ekleyin.'
    );
  }

  // Deduplicate concurrent token requests during cold starts
  if (tokenFetchPromise && !forceRefresh) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    const tokenEndpoint = `https://${config.domain}/admin/oauth/access_token`;

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: bodyParams.toString(),
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson.error_description || errJson.error || JSON.stringify(errJson);
        } catch {
          errorDetail = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(`Shopify Client Credentials yetkilendirme hatası: ${errorDetail}`);
      }

      const json: ShopifyTokenResponse = await response.json();

      if (!json.access_token) {
        throw new Error('Shopify yanıtında access_token bulunamadı.');
      }

      // Default to 24 hours (86400 seconds) if expires_in is omitted
      const expiresInSeconds = typeof json.expires_in === 'number' && json.expires_in > 0 ? json.expires_in : 86400;
      const expiresAt = Date.now() + expiresInSeconds * 1000;

      cachedTokenState = {
        accessToken: json.access_token,
        expiresAt,
      };

      return json.access_token;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Execute Shopify Admin GraphQL Query/Mutation with automatic token acquisition,
 * in-memory caching, and 1-time automatic retry on auth expiration.
 */
export async function executeShopifyGraphQL<T = Record<string, unknown>>(
  query: string,
  options: ShopifyGraphQLOptions = {}
): Promise<T> {
  const { variables = {}, timeoutMs = 25000, label = 'Shopify API işlemi', retryOnAuthError = true } = options;
  const config = getShopifyConfig();

  if (!config.domain) {
    throw new Error('SHOPIFY_STORE_DOMAIN yapılandırılmamış. Lütfen .env dosyanızı kontrol edin.');
  }

  // 1. Resolve Access Token via Client Credentials Grant
  const token = await getShopifyAccessToken();

  const endpoint = `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    // 2. Handle 401 Unauthorized with single retry
    if (response.status === 401 || response.status === 403) {
      if (retryOnAuthError) {
        clearShopifyTokenCache();
        // Force fresh token and retry without further auth retries
        return executeShopifyGraphQL<T>(query, {
          ...options,
          retryOnAuthError: false,
        });
      }
      throw new Error('Shopify API yetkilendirme hatası (401/403). Client ID ve Client Secret bilgilerini kontrol edin.');
    }

    if (response.status === 429) {
      throw new Error('Shopify API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.');
    }

    if (!response.ok) {
      throw new Error(`Shopify API sunucu hatası (HTTP ${response.status})`);
    }

    const json: ShopifyGraphQLResponse<T> = await response.json();

    if (json.errors && json.errors.length > 0) {
      // Check if GraphQL error is related to invalid token
      const isAuthError = json.errors.some(
        (e) =>
          e.message?.toLowerCase().includes('unauthenticated') ||
          e.message?.toLowerCase().includes('access token') ||
          e.message?.toLowerCase().includes('invalid api key')
      );

      if (isAuthError && retryOnAuthError) {
        clearShopifyTokenCache();
        return executeShopifyGraphQL<T>(query, {
          ...options,
          retryOnAuthError: false,
        });
      }

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
