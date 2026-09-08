import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import type { UserRole, UserStatus } from '@prisma/client';

/**
 * กุญแจแต่ละห้อง — ด่านที่ proxy.ts ทำแทนไม่ได้เพราะต้อง query DB
 *
 * ทุก page และทุก route handler ที่แตะข้อมูลของผู้ใช้ ต้องเรียกอย่างน้อยหนึ่งตัวในนี้
 * ห้ามพึ่ง proxy.ts อย่างเดียว: ถ้าลืมใส่ path ใน matcher หรือ matcher มีช่องโหว่
 * ผู้ใช้ยิง API ตรงๆ ได้ทันที
 */

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
};

/**
 * ยืนยันตัวตนกับฐานข้อมูล ไม่ใช่เชื่อ JWT อย่างเดียว
 *
 * session ของเราเป็น JWT อายุ 30 วัน ซึ่งแปลว่าถ้าเชื่อแต่ token
 * ผู้ใช้ที่ถูกลบหรือถูกแอดมินระงับไปแล้ว จะยังเข้าระบบได้จนกว่า token จะหมดอายุ
 * (เจอปัญหานี้จริงตอนทดสอบ: บัญชีที่ลบจาก DB แล้วยังเปิดหน้าที่ต้อง login ได้อยู่)
 *
 * proxy.ts ยังอ่านแค่ token เพื่อความเร็วบน Edge — การเพิกถอนสิทธิ์จริงมาตัดสินที่นี่
 */
type ResolveResult =
  | { kind: 'ok'; user: SessionUser }
  /** ไม่มี session เลย หรือบัญชีถูกลบไปแล้ว */
  | { kind: 'anonymous' }
  /** มี session แต่บัญชีถูกระงับ — ต่างจาก anonymous เพราะห้ามส่งกลับไปหน้า login */
  | { kind: 'suspended' };

async function resolveUser(): Promise<ResolveResult> {
  const session = await auth();
  if (!session?.user?.id) return { kind: 'anonymous' };

  const fresh = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true },
  });
  if (!fresh || fresh.deletedAt) return { kind: 'anonymous' };
  if (fresh.status !== 'ACTIVE') return { kind: 'suspended' };

  return {
    kind: 'ok',
    user: {
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      status: fresh.status,
    },
  };
}

/**
 * ต้องแยก "ถูกระงับ" ออกจาก "ไม่ได้ login" ให้ชัด
 *
 * ถ้าส่งผู้ใช้ที่ถูกระงับไป /login จะเกิด redirect loop:
 * proxy.ts เห็นว่ายังถือ JWT ที่บอกว่า ACTIVE อยู่ (สถานะใน token ค้างมาจากตอน login)
 * จึงเด้งกลับ /dashboard แล้ว guard ก็เด้งไป /login อีก วนไม่จบ
 * — เจอปัญหานี้จริงตอนทดสอบการระงับบัญชีกลางคัน
 */
export async function requireUser(): Promise<SessionUser> {
  const result = await resolveUser();
  if (result.kind === 'suspended') redirect('/suspended');
  if (result.kind === 'anonymous') redirect('/login');
  return result.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/forbidden');
  return user;
}

/** เวอร์ชันสำหรับ API — คืน null แทนการ redirect เพื่อให้ caller ตอบ JSON ได้เอง */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const result = await resolveUser();
  return result.kind === 'ok' ? result.user : null;
}

/** ต้องเป็นเจ้าของบิลใบนี้ (หรือแอดมิน) — ใช้กับหน้าจัดการบิลและ API ที่แก้บิล */
export async function requireBillCreator(billId: string) {
  const user = await requireUser();
  const bill = await db.bill.findUnique({
    where: { id: billId },
    select: { id: true, creatorId: true, status: true, title: true },
  });

  // "ไม่เจอ" กับ "ไม่ใช่ของเรา" ต้องตอบเหมือนกัน
  // ไม่งั้นคนนอกไล่เดา id เพื่อดูว่าบิลไหนมีอยู่จริงได้
  if (!bill || (bill.creatorId !== user.id && user.role !== 'ADMIN')) notFound();

  return { user, bill };
}

/** ต้องเป็นคนที่อยู่ในบิลใบนี้ — ใช้กับหน้าจ่ายเงิน */
export async function requireBillParticipant(billId: string) {
  const user = await requireUser();
  const participant = await db.billParticipant.findUnique({
    where: { billId_userId: { billId, userId: user.id } },
    select: { id: true, amountDueSatang: true, status: true, displayName: true },
  });
  if (!participant) notFound();
  return { user, participant };
}
