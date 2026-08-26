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
    let productFeatures = '';
    let status: 'ACTIVE' | 'DRAFT' = 'ACTIVE';
    let locationId = '';
    let categoryId = '';
    let barcode = '';
    let vendor = 'MOJO';
    let productType = '';
    let tags = '';
    let requiresShipping = true;
    let weight = '';
    let weightUnit = 'KILOGRAMS';
    let handle = '';
    let seoTitle = '';
    let seoDescription = '';
    let collectionIds: string[] = [];
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
      barcode = String(formData.get('barcode') || '').trim();
      descriptionHtml = String(formData.get('descriptionHtml') || '').trim();
      productFeatures = String(formData.get('productFeatures') || '').trim();
      status = (formData.get('status') as 'ACTIVE' | 'DRAFT') || 'ACTIVE';
      locationId = String(formData.get('locationId') || '').trim();
      categoryId = String(formData.get('categoryId') || '').trim();
      vendor = String(formData.get('vendor') || 'MOJO').trim();
      productType = String(formData.get('productType') || '').trim();
      tags = String(formData.get('tags') || '').trim();
      requiresShipping = formData.get('requiresShipping') !== 'false';
      weight = String(formData.get('weight') || '').trim();
      weightUnit = String(formData.get('weightUnit') || 'KILOGRAMS').trim();
      handle = String(formData.get('handle') || '').trim();
      seoTitle = String(formData.get('seoTitle') || '').trim();
      seoDescription = String(formData.get('seoDescription') || '').trim();

      const collectionIdsRaw = formData.getAll('collectionIds') as string[];
      const collectionIdsJson = formData.get('collectionIdsJson') as string;
      collectionIds = collectionIdsRaw.map(String).filter(Boolean);
      if (collectionIds.length === 0 && collectionIdsJson) {
        try {
          const parsed = JSON.parse(collectionIdsJson);
          if (Array.isArray(parsed)) collectionIds = parsed;
        } catch {}
      }

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
      barcode = String(body.barcode || '').trim();
      descriptionHtml = String(body.descriptionHtml || '').trim();
      productFeatures = String(body.productFeatures || '').trim();
      status = body.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
      locationId = String(body.locationId || '').trim();
      categoryId = String(body.categoryId || '').trim();
      collectionIds = Array.isArray(body.collectionIds) ? body.collectionIds : [];
      vendor = String(body.vendor || 'MOJO').trim();
      productType = String(body.productType || '').trim();
      tags = String(body.tags || '').trim();
      requiresShipping = body.requiresShipping !== false;
      weight = String(body.weight || '').trim();
      weightUnit = String(body.weightUnit || 'KILOGRAMS').trim();
      handle = String(body.handle || '').trim();
      seoTitle = String(body.seoTitle || '').trim();
      seoDescription = String(body.seoDescription || '').trim();
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
        barcode,
        descriptionHtml,
        productFeatures,
        status,
        locationId,
        categoryId,
        collectionIds,
        vendor,
        productType,
        tags,
        requiresShipping,
        weight,
        weightUnit,
        handle,
        seoTitle,
        seoDescription,
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
