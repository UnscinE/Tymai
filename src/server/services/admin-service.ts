import 'server-only';
import type { Prisma, UserRole, UserStatus } from '@prisma/client';
import { db } from '@/server/db';

/**
 * ข้อมูลสำหรับหน้าแอดมิน
 *
 * ทุกฟังก์ชันในนี้ข้ามการตรวจสิทธิ์ระดับ "เจ้าของข้อมูล" โดยเจตนา
 * เพราะแอดมินต้องเห็นข้อมูลทั้งระบบตอนมีข้อพิพาท
 * ดังนั้นทุก caller ต้องเรียก requireAdmin() ก่อนเสมอ — ห้ามเรียกจากที่อื่น
 *
 * ข้อยกเว้นที่ไม่ยอมให้แม้แต่แอดมิน: เลข PromptPay ที่เข้ารหัสไว้
 * ไม่มีฟังก์ชันไหนในไฟล์นี้ถอดรหัสมันออกมา
 */

export type AdminOverview = {
  users: { total: number; active: number; suspended: number; newThisWeek: number };
  bills: { total: number; open: number; settled: number; newThisWeek: number };
  money: { collectedSatang: number; outstandingSatang: number };
  slips: { verified: number; last7Days: number };
};

export async function getOverview(): Promise<AdminOverview> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userTotal,
    userActive,
    userSuspended,
    userNew,
    billTotal,
    billOpen,
    billSettled,
    billNew,
    collected,
    outstanding,
    slipsVerified,
    slipsWeek,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'ACTIVE' } }),
    db.user.count({ where: { status: 'SUSPENDED' } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.bill.count(),
    db.bill.count({ where: { status: 'OPEN' } }),
    db.bill.count({ where: { status: 'SETTLED' } }),
    db.bill.count({ where: { createdAt: { gte: weekAgo } } }),
    db.billParticipant.aggregate({
      where: { status: { in: ['PAID', 'WAIVED'] } },
      _sum: { amountDueSatang: true },
    }),
    db.billParticipant.aggregate({
      where: { status: 'UNPAID', bill: { status: 'OPEN' } },
      _sum: { amountDueSatang: true },
    }),
    db.payment.count({ where: { status: 'VERIFIED' } }),
    db.payment.count({ where: { status: 'VERIFIED', createdAt: { gte: weekAgo } } }),
  ]);

  return {
    users: { total: userTotal, active: userActive, suspended: userSuspended, newThisWeek: userNew },
    bills: { total: billTotal, open: billOpen, settled: billSettled, newThisWeek: billNew },
    money: {
      collectedSatang: collected._sum.amountDueSatang ?? 0,
      outstandingSatang: outstanding._sum.amountDueSatang ?? 0,
    },
    slips: { verified: slipsVerified, last7Days: slipsWeek },
  };
}

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  billsCreated: number;
  billsJoined: number;
  hasPayee: boolean;
};

export async function listUsers(params: { query?: string; limit?: number }): Promise<AdminUserRow[]> {
  const query = (params.query ?? '').trim();

  // แอดมินค้นหาแบบบางส่วนได้ ต่างจากผู้ใช้ทั่วไปที่ค้นได้เฉพาะค่าที่ตรงเป๊ะ
  // เพราะแอดมินต้องสืบหาบัญชีตอนมีข้อพิพาท และการกระทำถูกบันทึกไว้ใน AuditLog อยู่แล้ว
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {};

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
      promptPayIdEnc: true,
      _count: { select: { createdBills: true, participations: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    billsCreated: u._count.createdBills,
    billsJoined: u._count.participations,
    // บอกแค่ว่า "ตั้งไว้หรือยัง" ไม่เคยถอดรหัสเลขออกมาให้แอดมินเห็น
    hasPayee: Boolean(u.promptPayIdEnc),
  }));
}

export type AdminActionResult = { ok: true } | { ok: false; message: string };

export async function setUserStatus(params: {
  actorId: string;
  userId: string;
  status: UserStatus;
}): Promise<AdminActionResult> {
  const { actorId, userId, status } = params;

  if (actorId === userId) {
    // กันแอดมินระงับบัญชีตัวเองจนล็อกตัวเองออกจากระบบ
    return { ok: false, message: 'ระงับบัญชีตัวเองไม่ได้' };
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!target) return { ok: false, message: 'ไม่พบผู้ใช้คนนี้' };

  await db.user.update({ where: { id: userId }, data: { status } });
  await writeAdminAudit(actorId, `user.${status.toLowerCase()}`, 'User', userId, {
    from: target.status,
    to: status,
  });
  return { ok: true };
}

export async function setUserRole(params: {
  actorId: string;
  userId: string;
  role: UserRole;
}): Promise<AdminActionResult> {
  const { actorId, userId, role } = params;

  if (actorId === userId) {
    return { ok: false, message: 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้' };
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { ok: false, message: 'ไม่พบผู้ใช้คนนี้' };

  if (target.role === 'ADMIN' && role === 'USER') {
    // ต้องเหลือแอดมินอย่างน้อยหนึ่งคนเสมอ ไม่งั้นไม่มีใครเข้าหลังบ้านได้อีกเลย
    const admins = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admins <= 1) return { ok: false, message: 'ต้องเหลือแอดมินอย่างน้อย 1 คน' };
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  await writeAdminAudit(actorId, 'user.set-role', 'User', userId, { from: target.role, to: role });
  return { ok: true };
}

export type AdminBillRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  totalSatang: number;
  creatorName: string | null;
  creatorEmail: string | null;
  participantCount: number;
  paidCount: number;
};

export async function listBills(params: { query?: string; limit?: number }): Promise<AdminBillRow[]> {
  const query = (params.query ?? '').trim();

  const bills = await db.bill.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { creator: { email: { contains: query, mode: 'insensitive' } } },
          ],
        }
      : {},
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      totalSatang: true,
      creator: { select: { name: true, email: true } },
      participants: { select: { status: true } },
    },
  });

  return bills.map((b) => ({
    id: b.id,
    title: b.title,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    totalSatang: b.totalSatang,
    creatorName: b.creator.name,
    creatorEmail: b.creator.email,
    participantCount: b.participants.length,
    paidCount: b.participants.filter((p) => p.status === 'PAID' || p.status === 'WAIVED').length,
  }));
}

export type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  actorEmail: string | null;
  metadata: unknown;
  createdAt: string;
};

export async function listAuditLog(params: {
  action?: string;
  limit?: number;
}): Promise<AuditRow[]> {
  const rows = await db.auditLog.findMany({
    where: params.action ? { action: params.action } : {},
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    actorName: r.actor?.name ?? null,
    actorEmail: r.actor?.email ?? null,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** รายชื่อ action ที่มีในระบบ ใช้ทำตัวกรองในหน้า audit */
export async function listAuditActions(): Promise<string[]> {
  const rows = await db.auditLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
    take: 50,
  });
  return rows.map((r) => r.action);
}

async function writeAdminAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
  } catch (error) {
    // audit log ล้มต้องไม่ทำให้การกระทำของแอดมินล้มตาม
    console.error('[audit] เขียน log ไม่สำเร็จ', error);
  }
}
