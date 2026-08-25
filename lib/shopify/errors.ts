export interface GraphQLErrorDetail {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface UserErrorDetail {
  field?: string[];
  message: string;
}

export interface GraphQLResponseLike {
  errors?: GraphQLErrorDetail[];
  userErrors?: UserErrorDetail[];
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Categorize error for human-friendly display without raw GraphQL schema dumps
 */
export function categorizeError(errorOrMessage: unknown, context = ''): string {
  const msg =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage instanceof Error
      ? errorOrMessage.message
      : (errorOrMessage as { message?: string })?.message || '';

  const lower = msg.toLowerCase();

  if (lower.includes('sku') || lower.includes('already taken') || lower.includes('unique')) {
    return 'SKU kodu zaten kullanımda veya çakışıyor.';
  }
  if (
    lower.includes('inventory') ||
    lower.includes('quantity') ||
    lower.includes('stock') ||
    lower.includes('location') ||
    lower.includes('availablequantity')
  ) {
    return 'Stok bilgisi güncellenirken bir sorun oluştu.';
  }
  if (lower.includes('media') || lower.includes('file') || lower.includes('image') || lower.includes('staged')) {
    return 'Görsel yüklenirken veya ürüne bağlanırken bir sorun oluştu.';
  }
  if (lower.includes('option') || lower.includes('optionvalues') || lower.includes('productoptions')) {
    return 'Ürün seçenekleri (varyasyon türleri) oluşturulamadı.';
  }
  if (lower.includes('variant') || lower.includes('productset') || lower.includes('combination')) {
    return 'Varyasyon kombinasyonları oluşturulamadı.';
  }
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('abort') ||
    lower.includes('network') ||
    lower.includes('fetch')
  ) {
    return 'Shopify ile bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
  }
  if (
    lower.includes('required') ||
    lower.includes('expected value') ||
    lower.includes('cannot be blank') ||
    lower.includes('invalid value')
  ) {
    return 'Formda eksik veya geçersiz alanlar tespit edildi.';
  }
  if (lower.includes('unauthenticated') || lower.includes('access token') || lower.includes('invalid api key')) {
    return 'Shopify API erişim yetkisi geçersiz. Lütfen ayarları kontrol edin.';
  }

  return context || (msg && !msg.includes('Variable $') ? msg : 'İşlem gerçekleştirilemedi.');
}

/**
 * Central Error Normalizer that guarantees no raw technical/schema leaks
 */
export function normalizeGraphQLError(
  responseOrError: unknown,
  fallback = 'İşlem gerçekleştirilemedi.'
): string {
  if (!responseOrError) return fallback;

  if (typeof responseOrError === 'string') {
    if (
      responseOrError.includes('Variable $input') ||
      responseOrError.includes('Field is not defined') ||
      responseOrError.includes('ProductSetInventoryInput')
    ) {
      return categorizeError(responseOrError, fallback);
    }
    return responseOrError;
  }

  const errObj = responseOrError as GraphQLResponseLike;
  let rawMessage = '';

  if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
    rawMessage = errObj.errors.map((e) => e.message).join(' | ');
  } else if (errObj.userErrors && Array.isArray(errObj.userErrors) && errObj.userErrors.length > 0) {
    rawMessage = errObj.userErrors
      .map((e) => (e.field && e.field.length > 0 ? `${e.field.join('.')}: ${e.message}` : e.message))
      .join(', ');
  } else if (errObj.message) {
    rawMessage = errObj.message;
  }

  if (!rawMessage) return fallback;

  if (
    rawMessage.includes('Variable $input') ||
    rawMessage.includes('Field is not defined') ||
    rawMessage.includes('ProductSetInventoryInput')
  ) {
    return categorizeError(rawMessage, fallback);
  }

  return rawMessage;
}
