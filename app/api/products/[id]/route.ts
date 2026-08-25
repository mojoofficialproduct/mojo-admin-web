import { NextRequest, NextResponse } from 'next/server';
import { fetchProductById, deleteProduct } from '@/lib/shopify/products';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await fetchProductById(id);

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    console.error('Product GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ürün detayı alınamadı.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteProduct(id);
    return NextResponse.json({ success: true, message: 'Ürün silindi.' });
  } catch (err) {
    console.error('Product DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ürün silinemedi.' },
      { status: 500 }
    );
  }
}
