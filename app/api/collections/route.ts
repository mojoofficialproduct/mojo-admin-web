import { NextResponse } from 'next/server';
import { fetchCollections } from '@/lib/shopify/collections';

export async function GET() {
  try {
    const collections = await fetchCollections(50);
    return NextResponse.json({ collections });
  } catch (err) {
    console.error('Collections API error:', err);
    return NextResponse.json({ error: 'Koleksiyonlar alınamadı.' }, { status: 500 });
  }
}
