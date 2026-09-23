import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDb } from '@/db';
import { events, dates, participants, availabilities } from '@/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb(getRequestContext().env as any);
    const eventId = params.id;

    const eventResult = await db.select().from(events).where(eq(events.id, eventId));
    if (eventResult.length === 0) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    }
    const event = eventResult[0];

    const datesResult = await db.select().from(dates).where(eq(dates.eventId, eventId));

    const participantsResult = await db.select().from(participants).where(eq(participants.eventId, eventId));
    
    const availabilitiesResult = await db.select()
      .from(availabilities)
      .innerJoin(participants, eq(availabilities.participantId, participants.id))
      .where(eq(participants.eventId, eventId));

    const formattedParticipants = participantsResult.map(p => {
      const answers: Record<string, number> = {};
      availabilitiesResult
        .filter(a => a.availabilities.participantId === p.id)
        .forEach(a => {
          answers[a.availabilities.dateId] = a.availabilities.status;
        });
      return {
        id: p.id,
        name: p.name,
        answers
      };
    });

    return NextResponse.json({
      event,
      dates: datesResult,
      participants: formattedParticipants
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, answers } = await req.json() as { name: string, answers: Record<string, number> };
    if (!name) return NextResponse.json({ error: '名前は必須です' }, { status: 400 });

    const db = getDb(getRequestContext().env as any);
    const eventId = params.id;
    const participantId = crypto.randomUUID();

    await db.insert(participants).values({
      id: participantId,
      eventId,
      name,
    });

    const dateIds = Object.keys(answers);
    if (dateIds.length > 0) {
      const availabilityInserts = dateIds.map(dateId => ({
        id: crypto.randomUUID(),
        participantId,
        dateId,
        status: answers[dateId]
      }));
      await db.insert(availabilities).values(availabilityInserts);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb(getRequestContext().env as any);
    const eventId = params.id;
    
    const reqBody = await req.json().catch(() => null) as { password?: string } | null;
    const providedPassword = reqBody?.password;

    const eventResult = await db.select().from(events).where(eq(events.id, eventId));
    if (eventResult.length === 0) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    }
    const event = eventResult[0];

    // Password check
    if (providedPassword !== '0519') {
      if (event.password && event.password !== providedPassword) {
        return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
      } else if (!event.password) {
        // If event has no password, only master password can delete it
        return NextResponse.json({ error: 'このイベントはマスターパスワードでのみ削除可能です' }, { status: 401 });
      }
    }

    const eventParticipants = await db.select({ id: participants.id }).from(participants).where(eq(participants.eventId, eventId));
    
    if (eventParticipants.length > 0) {
      const pIds = eventParticipants.map(p => p.id);
      for (const pId of pIds) {
        await db.delete(availabilities).where(eq(availabilities.participantId, pId));
      }
      await db.delete(participants).where(eq(participants.eventId, eventId));
    }

    await db.delete(dates).where(eq(dates.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
