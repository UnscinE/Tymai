import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { setUserRole, setUserStatus } from '@/server/services/admin-service';

export const runtime = 'nodejs';

/** เปลี่ยนสถานะหรือสิทธิ์ของผู้ใช้ — ทุกการกระทำถูกบันทึกลง audit log */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  // ตรวจซ้ำที่นี่ด้วย ไม่พึ่ง proxy.ts อย่างเดียว
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  let body: { userId?: string; status?: 'ACTIVE' | 'SUSPENDED'; role?: 'USER' | 'ADMIN' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });

  if (body.status === 'ACTIVE' || body.status === 'SUSPENDED') {
    const result = await setUserStatus({ actorId: user.id, userId, status: body.status });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.role === 'USER' || body.role === 'ADMIN') {
    const result = await setUserRole({ actorId: user.id, userId, role: body.role });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'ไม่รู้จักการกระทำนี้' }, { status: 400 });
}
