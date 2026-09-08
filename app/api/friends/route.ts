import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { listFriends, removeFriendship, sendFriendRequest } from '@/server/services/friend-service';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  return NextResponse.json({ friends: await listFriends(user.id) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** ส่งคำขอเป็นเพื่อน (ถ้าอีกฝ่ายส่งมาก่อนแล้ว จะกลายเป็นการตอบรับทันที) */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }
  if (typeof body.userId !== 'string' || !body.userId) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const result = await sendFriendRequest(user.id, body.userId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ status: result.status });
}

/** เลิกเป็นเพื่อน หรือยกเลิกคำขอที่ส่งไป */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  const userId = new URL(request.url).searchParams.get('userId') ?? '';
  if (!userId) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });

  const result = await removeFriendship(user.id, userId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 404 });
  return NextResponse.json({ status: result.status });
}
