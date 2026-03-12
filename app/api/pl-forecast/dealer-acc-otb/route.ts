import { NextRequest, NextResponse } from 'next/server';
import { readDealerAccSellinStore, writeDealerAccSellinStore } from '@/lib/inventory-file-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await readDealerAccSellinStore();
    return NextResponse.json({ values: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      values?: Record<string, number>;
    };
    if (!body.values || typeof body.values !== 'object') {
      return NextResponse.json({ error: 'values is required' }, { status: 400 });
    }
    await writeDealerAccSellinStore(body.values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
