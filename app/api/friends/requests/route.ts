import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { listPendingRequests, respondToRequest } from '@/server/services/friend-service';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  return NextResponse.json(await listPendingRequests(user.id), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** ตอบรับหรือปฏิเสธคำขอที่ส่งมาหาเรา */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: { requestId?: string; accept?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }
  if (typeof body.requestId !== 'string' || typeof body.accept !== 'boolean') {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const result = await respondToRequest(user.id, body.requestId, body.accept);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 404 });
  return NextResponse.json({ status: result.status });
}
