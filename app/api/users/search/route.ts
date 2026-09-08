import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { searchUsers } from '@/server/services/friend-service';

export const runtime = 'nodejs';

/**
 * ค้นหาผู้ใช้ด้วยอีเมล / username / เบอร์โทร — ตรงเป๊ะเท่านั้น
 * ไม่รองรับการค้นแบบบางส่วนโดยเจตนา ไม่งั้นจะกลายเป็นเครื่องมือไล่เก็บข้อมูลผู้ใช้
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchUsers(q, user.id);
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
}
