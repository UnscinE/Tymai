import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';

/**
 * ประวัติบิล — รวมทั้งบิลที่เราสร้างเองและบิลที่เราถูกเรียกเก็บ
 *
 * "บิลที่ฉันต้องจ่าย" จะมีข้อมูลก็ต่อเมื่อ BillParticipant.userId ถูกผูกไว้
 * ซึ่งเกิดตอนเจ้าของบิลเลือกเราจากรายชื่อเพื่อน
 * เพื่อนที่จ่ายผ่านลิงก์สาธารณะโดยไม่มีบัญชี จะไม่ปรากฏในประวัติของใคร
 */

export type HistoryFilter = 'all' | 'created' | 'to-pay' | 'settled';

export type HistoryRow = {
  id: string;
  title: string;
  status: 'DRAFT' | 'OPEN' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
  /** true = เราเป็นคนสร้างบิลนี้ */
  isCreator: boolean;
  /** ยอดรวมทั้งบิล (สตางค์) — มีความหมายเมื่อเราเป็นคนสร้าง */
  totalSatang: number;
  /** ยอดที่ "เรา" ต้องจ่ายในบิลนี้ (สตางค์) — null ถ้าเราไม่ได้อยู่ในบิล */
  myAmountSatang: number | null;
  myStatus: 'UNPAID' | 'PENDING_REVIEW' | 'PAID' | 'WAIVED' | null;
  participantCount: number;
  paidCount: number;
};

export type HistoryPage = {
  rows: HistoryRow[];
  nextCursor: string | null;
  summary: {
    createdCount: number;
    collectedSatang: number;
    outstandingSatang: number;
    owedSatang: number;
  };
};

const PAGE_SIZE = 20;

export async function getHistory(params: {
  userId: string;
  filter: HistoryFilter;
  cursor?: string | null;
  query?: string;
}): Promise<HistoryPage> {
  const { userId, filter, cursor, query } = params;

  const mine: Prisma.BillWhereInput = { creatorId: userId };
  const toPay: Prisma.BillWhereInput = { participants: { some: { userId } } };

  const scope: Prisma.BillWhereInput =
    filter === 'created' ? mine : filter === 'to-pay' ? toPay : { OR: [mine, toPay] };

  const where: Prisma.BillWhereInput = {
    ...scope,
    ...(filter === 'settled' ? { status: 'SETTLED' } : {}),
    // ค้นหาชื่อบิลของตัวเอง ใช้ contains ได้ ไม่ใช่ข้อมูลผู้ใช้คนอื่น
    ...(query ? { title: { contains: query, mode: 'insensitive' as const } } : {}),
  };

  const bills = await db.bill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      creatorId: true,
      totalSatang: true,
      participants: {
        select: { userId: true, amountDueSatang: true, status: true },
      },
    },
  });

  const hasMore = bills.length > PAGE_SIZE;
  const page = hasMore ? bills.slice(0, PAGE_SIZE) : bills;

  const rows: HistoryRow[] = page.map((bill) => {
    const me = bill.participants.find((p) => p.userId === userId);
    return {
      id: bill.id,
      title: bill.title,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      isCreator: bill.creatorId === userId,
      totalSatang: bill.totalSatang,
      myAmountSatang: me?.amountDueSatang ?? null,
      myStatus: me?.status ?? null,
      participantCount: bill.participants.length,
      paidCount: bill.participants.filter((p) => p.status === 'PAID' || p.status === 'WAIVED').length,
    };
  });

  return {
    rows,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    summary: await getSummary(userId),
  };
}

/** ตัวเลขสรุปด้านบนของหน้าประวัติ — คิดจากบิลทั้งหมด ไม่ใช่แค่หน้าที่กำลังดู */
async function getSummary(userId: string) {
  const [createdCount, collected, outstanding, owed] = await Promise.all([
    db.bill.count({ where: { creatorId: userId } }),
    db.billParticipant.aggregate({
      where: { bill: { creatorId: userId }, status: { in: ['PAID', 'WAIVED'] } },
      _sum: { amountDueSatang: true },
    }),
    db.billParticipant.aggregate({
      where: { bill: { creatorId: userId, status: 'OPEN' }, status: 'UNPAID' },
      _sum: { amountDueSatang: true },
    }),
    db.billParticipant.aggregate({
      where: { userId, status: 'UNPAID', bill: { status: 'OPEN' } },
      _sum: { amountDueSatang: true },
    }),
  ]);

  return {
    createdCount,
    collectedSatang: collected._sum.amountDueSatang ?? 0,
    outstandingSatang: outstanding._sum.amountDueSatang ?? 0,
    owedSatang: owed._sum.amountDueSatang ?? 0,
  };
}
