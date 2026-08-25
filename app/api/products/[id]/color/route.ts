import { NextRequest, NextResponse } from 'next/server';
import { addSiblingColorProduct } from '@/lib/shopify/products';
import { ImageUploadItem } from '@/lib/shopify/media';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const contentType = request.headers.get('content-type') || '';

    let colorName = '';
    let customColorHex = '';
    let price = '';
    let compareAtPrice = '';
    let quantity: string | number = '0';
    let sku = '';
    const imageItems: ImageUploadItem[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      colorName = String(formData.get('colorName') || '').trim();
      customColorHex = String(formData.get('customColorHex') || '').trim();
      price = String(formData.get('price') || '').trim();
      compareAtPrice = String(formData.get('compareAtPrice') || '').trim();
      quantity = String(formData.get('quantity') || '0').trim();
      sku = String(formData.get('sku') || '').trim();

      const imageFiles = formData.getAll('images') as File[];
      for (const file of imageFiles) {
        if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          imageItems.push({
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            buffer: Buffer.from(arrayBuffer),
            altText: `Renk: ${colorName}`,
          });
        }
      }
    } else {
      const body = await request.json();
      colorName = String(body.colorName || '').trim();
      customColorHex = String(body.customColorHex || '').trim();
      price = String(body.price || '').trim();
      compareAtPrice = String(body.compareAtPrice || '').trim();
      quantity = body.quantity || '0';
      sku = String(body.sku || '').trim();
    }

    if (!colorName) {
      return NextResponse.json({ error: 'Renk adı zorunludur.' }, { status: 400 });
    }

    const result = await addSiblingColorProduct(id, colorName, {
      customColorHex,
      price: price || undefined,
      compareAtPrice: compareAtPrice || undefined,
      quantity,
      sku: sku || undefined,
      images: imageItems,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Renk eklenemedi.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Sibling color POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Renk eklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
