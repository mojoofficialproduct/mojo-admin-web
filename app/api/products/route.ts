import { NextRequest, NextResponse } from 'next/server';
import { fetchProductsList, createMojoProduct } from '@/lib/shopify/products';
import { ImageUploadItem } from '@/lib/shopify/media';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q') || '';
    const statusFilter = searchParams.get('status') || '';
    const first = parseInt(searchParams.get('first') || '50', 10);
    const after = searchParams.get('after') || null;

    const result = await fetchProductsList({
      first,
      after,
      searchTerm,
      statusFilter,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Products GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ürünler yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let modelTitle = '';
    let colorName = '';
    let customColorHex = '';
    let price = '0';
    let compareAtPrice = '';
    let quantity: string | number = '0';
    let sku = '';
    let descriptionHtml = '';
    let status: 'ACTIVE' | 'DRAFT' = 'ACTIVE';
    let locationId = '';
    let categoryId = '';
    const imageItems: ImageUploadItem[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      modelTitle = String(formData.get('modelTitle') || '').trim();
      colorName = String(formData.get('colorName') || '').trim();
      customColorHex = String(formData.get('customColorHex') || '').trim();
      price = String(formData.get('price') || '0').trim();
      compareAtPrice = String(formData.get('compareAtPrice') || '').trim();
      quantity = String(formData.get('quantity') || '0').trim();
      sku = String(formData.get('sku') || '').trim();
      descriptionHtml = String(formData.get('descriptionHtml') || '').trim();
      status = (formData.get('status') as 'ACTIVE' | 'DRAFT') || 'ACTIVE';
      locationId = String(formData.get('locationId') || '').trim();
      categoryId = String(formData.get('categoryId') || '').trim();

      const imageFiles = formData.getAll('images') as File[];
      for (const file of imageFiles) {
        if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          imageItems.push({
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            buffer: Buffer.from(arrayBuffer),
            altText: `${modelTitle} - ${colorName}`,
          });
        }
      }
    } else {
      const body = await request.json();
      modelTitle = String(body.modelTitle || '').trim();
      colorName = String(body.colorName || '').trim();
      customColorHex = String(body.customColorHex || '').trim();
      price = String(body.price || '0').trim();
      compareAtPrice = String(body.compareAtPrice || '').trim();
      quantity = body.quantity || '0';
      sku = String(body.sku || '').trim();
      descriptionHtml = String(body.descriptionHtml || '').trim();
      status = body.status || 'ACTIVE';
      locationId = String(body.locationId || '').trim();
      categoryId = String(body.categoryId || '').trim();
    }

    if (!modelTitle) {
      return NextResponse.json({ error: 'Ürün adı (model) zorunludur.' }, { status: 400 });
    }
    if (!colorName) {
      return NextResponse.json({ error: 'Ana renk seçimi zorunludur.' }, { status: 400 });
    }

    const result = await createMojoProduct(
      {
        modelTitle,
        colorName,
        customColorHex,
        price,
        compareAtPrice,
        quantity,
        sku,
        descriptionHtml,
        status,
        locationId,
        categoryId,
      },
      imageItems
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Ürün oluşturulamadı.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Products POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ürün oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
