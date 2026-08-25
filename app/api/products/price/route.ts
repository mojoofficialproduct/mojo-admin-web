import { NextRequest, NextResponse } from 'next/server';
import { updateVariantPrice, bulkUpdateProductPrices } from '@/lib/shopify/products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if bulk or single
    if (Array.isArray(body.items)) {
      const { items } = body;
      if (items.length === 0) {
        return NextResponse.json({ error: 'Güncellenecek ürün listesi boş.' }, { status: 400 });
      }

      const result = await bulkUpdateProductPrices(items);
      return NextResponse.json({
        success: result.successCount > 0,
        ...result,
      });
    }

    const { productId, variantId, price } = body;

    if (!productId || !variantId || price === undefined) {
      return NextResponse.json({ error: 'Eksik parametreler (productId, variantId, price gereklidir).' }, { status: 400 });
    }

    const result = await updateVariantPrice(productId, variantId, price);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Fiyat güncellenemedi.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Price update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fiyat güncellemesi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
