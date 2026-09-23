import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDb } from '@/db';
import { events, dates } from '@/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { name, dates: dateStrings, password } = await req.json() as { name: string, dates: string[], password?: string };
    
    if (!name || !dateStrings || dateStrings.length === 0) {
      return NextResponse.json({ error: 'イベント名と候補日は必須です' }, { status: 400 });
    }

    const db = getDb(getRequestContext().env as any);
    const eventId = crypto.randomUUID();

    await db.insert(events).values({
      id: eventId,
      name,
      description: '',
      password: password || null,
    });

    const dateInserts = dateStrings.map(dateStr => ({
      id: crypto.randomUUID(),
      eventId,
      dateString: dateStr,
    }));
    await db.insert(dates).values(dateInserts);

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
