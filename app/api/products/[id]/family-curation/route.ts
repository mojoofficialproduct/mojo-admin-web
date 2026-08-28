import { NextRequest, NextResponse } from 'next/server';
import { updateFamilyHomepageCuration, FamilyCurationSelection } from '@/lib/shopify/products';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const groupId = String(body.groupId || '').trim();
    const selections = body.selections as FamilyCurationSelection[];

    if (!groupId) {
      return NextResponse.json(
        { error: 'Ürün grubu kimliği (groupId) belirtilmelidir.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        { error: 'Geçersiz veya boş seçim listesi.' },
        { status: 400 }
      );
    }

    // Atomic validation: Max 5 items can be visible on homepage
    const trueCount = selections.filter((s) => s.homepageVisible === true).length;
    if (trueCount > 5) {
      return NextResponse.json(
        { error: 'Bu ürün ailesinde ana sayfa için en fazla 5 renk seçebilirsiniz.' },
        { status: 400 }
      );
    }

    const result = await updateFamilyHomepageCuration(groupId, selections);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Vitrin ayarları güncellenemedi.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      message: 'Ana sayfa vitrin seçimleri başarıyla güncellendi.',
    });
  } catch (err) {
    console.error('Family curation POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Vitrin ayarları güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
