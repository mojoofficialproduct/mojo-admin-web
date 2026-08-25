import { NextResponse } from 'next/server';
import { fetchLocations } from '@/lib/shopify/inventory';

export async function GET() {
  try {
    const locations = await fetchLocations();
    return NextResponse.json({ locations });
  } catch (err) {
    console.error('Locations API error:', err);
    return NextResponse.json({ error: 'Lokasyonlar alınamadı.' }, { status: 500 });
  }
}
