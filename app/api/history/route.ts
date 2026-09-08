import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { getHistory, type HistoryFilter } from '@/server/services/history-service';

export const runtime = 'nodejs';

const FILTERS: HistoryFilter[] = ['all', 'created', 'to-pay', 'settled'];

/** ใช้ตอนกด "โหลดเพิ่ม" — หน้าแรกโหลดจาก server component ไปแล้ว */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const raw = sp.get('filter') ?? 'all';
  const filter = (FILTERS as string[]).includes(raw) ? (raw as HistoryFilter) : 'all';

  const page = await getHistory({
    userId: user.id,
    filter,
    cursor: sp.get('cursor'),
    query: (sp.get('q') ?? '').trim().slice(0, 80),
  });

  return NextResponse.json(page, { headers: { 'Cache-Control': 'no-store' } });
}
