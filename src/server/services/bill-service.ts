import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { shortId } from '@/shared/lib/id';
import { calculateSplit } from '@/features/bill-split/lib/calculate-split';
import { filterLinkableUserIds } from './friend-service';
import { encryptPayeeId } from './payee-service';
import type { Bill, DraftBill, PaymentRecord } from '@/features/bill-split/types';

/**
 * ชั้นเดียวที่รู้จักทั้ง schema ของ Prisma และ DTO ที่ UI ใช้
 *
 * เดิมบิลอยู่ใน KV (key-value) โดยสิทธิ์เจ้าของผูกกับ ownerToken ใน localStorage
 * ซึ่งหายเมื่อล้าง browser และย้ายเครื่องไม่ได้ — ตอนนี้ผูกกับ Bill.creatorId แทน
 */

const BILL_INCLUDE = {
  participants: {
    orderBy: { createdAt: 'asc' },
    include: {
      payments: {
        where: { status: 'VERIFIED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
  items: {
    orderBy: { sortOrder: 'asc' },
    include: { shares: { select: { participantId: true } } },
  },
} satisfies Prisma.BillInclude;

type BillWithRelations = Prisma.BillGetPayload<{ include: typeof BILL_INCLUDE }>;

/** แปลงแถวใน DB ให้เป็นรูปร่างที่หน้าจอใช้ */
function toDTO(bill: BillWithRelations, viewerId?: string | null): Bill {
  const payments: Record<string, PaymentRecord> = {};

  for (const p of bill.participants) {
    const latest = p.payments[0];
    payments[p.id] =
      p.status === 'PAID'
        ? {
            status: 'paid',
            slipFingerprint: latest?.slipFingerprint ?? undefined,
            slipRef: latest?.slipRef ?? undefined,
            paidAt: (p.paidAt ?? latest?.verifiedAt ?? bill.updatedAt).toISOString(),
            // ไม่มีสลิปผูกอยู่ = เจ้าของบิลติ๊กเอง
            manual: !latest?.slipFingerprint,
          }
        : { status: 'unpaid' };
  }

  return {
    id: bill.id,
    title: bill.title,
    status: bill.status,
    accountName: bill.payeeName ?? '',
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    people: bill.participants.map((p) => ({ id: p.id, name: p.displayName })),
    items: bill.items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.priceSatang,
      sharedBy: i.shares.map((s) => s.participantId),
    })),
    charges: {
      servicePercent: Number(bill.servicePercent),
      vatPercent: Number(bill.vatPercent),
      discount: bill.discountSatang,
    },
    payments,
    isCreator: viewerId ? bill.creatorId === viewerId : false,
  };
}

/**
 * สร้างบิลจากฉบับร่างของผู้ใช้ แล้ว "แช่แข็ง" ยอดของแต่ละคนทันที
 *
 * ทำทั้งหมดใน transaction เดียว — ถ้าล้มกลางทางต้องไม่เหลือบิลที่มีคนแต่ไม่มีรายการอาหาร
 */
export async function createBill(params: {
  creatorId: string;
  draft: DraftBill;
  /** บัญชีรับเงินของผู้สร้าง ณ ตอนสร้างบิล — เก็บเป็น snapshot ไม่อ้างอิงค่าปัจจุบัน */
  payee: { promptPayId: string; accountName: string };
}): Promise<Bill> {
  const { creatorId, draft, payee } = params;

  // คำนวณยอดฝั่ง server เสมอ ไม่รับยอดที่ client ส่งมา
  const split = calculateSplit(draft);

  // ผูกคนในบิลเข้ากับบัญชีผู้ใช้ได้เฉพาะ "เพื่อนจริง หรือตัวเราเอง"
  // ถ้าไม่กรอง ผู้ใช้จะยัด userId ของใครก็ได้ ทำให้บิลไปโผล่ในหน้าของคนแปลกหน้า
  const linkable = await filterLinkableUserIds(
    creatorId,
    draft.people.map((p) => p.userId ?? '').filter(Boolean),
  );

  const bill = await db.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
        publicToken: shortId(24),
        title: draft.title,
        status: 'OPEN',
        creatorId,
        servicePercent: draft.charges.servicePercent,
        vatPercent: draft.charges.vatPercent,
        discountSatang: draft.charges.discount,
        totalSatang: split.grandTotal,
        payeeName: payee.accountName,
        // เข้ารหัสก่อนเก็บ — เป็นเบอร์โทรหรือเลขบัตรประชาชน (ข้อมูลส่วนบุคคลตาม PDPA)
        payeeIdEnc: encryptPayeeId(payee.promptPayId),
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    // id ของ participant ที่ DB สร้าง ต่างจาก id ชั่วคราวในฉบับร่าง จึงต้องจับคู่ไว้
    const participantIdByDraftId = new Map<string, string>();
    for (const person of draft.people) {
      const participant = await tx.billParticipant.create({
        data: {
          billId: created.id,
          displayName: person.name,
          amountDueSatang: split.byPersonId[person.id]?.total ?? 0,
          claimToken: shortId(16),
          userId: person.userId && linkable.has(person.userId) ? person.userId : null,
        },
        select: { id: true },
      });
      participantIdByDraftId.set(person.id, participant.id);
    }

    for (const [index, item] of draft.items.entries()) {
      await tx.billItem.create({
        data: {
          billId: created.id,
          name: item.name,
          priceSatang: item.price,
          sortOrder: index,
          shares: {
            create: item.sharedBy
              .map((draftPersonId) => participantIdByDraftId.get(draftPersonId))
              .filter((id): id is string => Boolean(id))
              .map((participantId) => ({ participantId })),
          },
        },
      });
    }

    return tx.bill.findUniqueOrThrow({ where: { id: created.id }, include: BILL_INCLUDE });
  });

  await writeAudit({ actorId: creatorId, action: 'bill.create', entityId: bill.id });

  return { ...toDTO(bill, creatorId), publicToken: bill.publicToken };
}

/** อ่านบิลด้วย id — ใช้ในโซนที่ต้อง login */
export async function getBill(billId: string, viewerId?: string | null): Promise<Bill | null> {
  const bill = await db.bill.findUnique({ where: { id: billId }, include: BILL_INCLUDE });
  if (!bill) return null;

  const dto = toDTO(bill, viewerId);
  // ลิงก์สาธารณะเป็นความลับระดับเดียวกับรหัสผ่าน ส่งให้เฉพาะเจ้าของบิล
  return dto.isCreator ? { ...dto, publicToken: bill.publicToken } : dto;
}

/** อ่านบิลด้วยโทเคนสาธารณะ — เพื่อนที่ไม่มีบัญชีใช้ทางนี้ */
export async function getBillByPublicToken(token: string): Promise<Bill | null> {
  const bill = await db.bill.findUnique({ where: { publicToken: token }, include: BILL_INCLUDE });
  if (!bill) return null;
  return toDTO(bill, null);
}

/** เจ้าของบิลติ๊ก/ยกเลิกสถานะด้วยมือ (เช่น เพื่อนจ่ายเงินสด) */
export async function setParticipantStatus(params: {
  billId: string;
  participantId: string;
  paid: boolean;
  actorId: string;
}): Promise<Bill | null> {
  const { billId, participantId, paid, actorId } = params;

  const participant = await db.billParticipant.findFirst({
    where: { id: participantId, billId },
    select: { id: true },
  });
  if (!participant) return null;

  await db.$transaction(async (tx) => {
    await tx.billParticipant.update({
      where: { id: participantId },
      data: { status: paid ? 'PAID' : 'UNPAID', paidAt: paid ? new Date() : null },
    });

    if (!paid) {
      // ยกเลิกสถานะ = ต้องปล่อย fingerprint ของสลิปคืน ไม่งั้นสลิปใบนั้นใช้ยืนยันซ้ำไม่ได้เลย
      await tx.payment.deleteMany({ where: { participantId } });
    }
  });

  await syncSettledState(billId);
  await writeAudit({
    actorId,
    action: paid ? 'payment.mark-paid' : 'payment.mark-unpaid',
    entityId: participantId,
    metadata: { billId },
  });

  return getBill(billId, actorId);
}

export type RecordSlipResult =
  | { ok: true; bill: Bill }
  | { ok: false; reason: 'duplicate'; message: string };

/**
 * บันทึกสลิปที่ผ่านการตรวจแล้ว
 *
 * ความ unique ของ Payment.slipFingerprint เป็นตัวกันสลิปซ้ำ "ทั้งระบบ"
 * (เดิมกลไกนี้อยู่ที่ SET NX ใน KV) — ให้ DB เป็นคนตัดสิน ไม่ใช่โค้ดเช็คก่อนเขียน
 * เพราะสองรีเควสต์ที่มาพร้อมกันจะผ่านการเช็คทั้งคู่ แต่ constraint จะยอมแค่อันเดียว
 */
export async function recordVerifiedSlip(params: {
  billId: string;
  participantId: string;
  fingerprint: string;
  transRef?: string;
  sendingBank?: string;
  amountSatang: number;
}): Promise<RecordSlipResult> {
  const { billId, participantId, fingerprint, transRef, sendingBank, amountSatang } = params;

  try {
    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          billId,
          participantId,
          amountSatang,
          method: 'PROMPTPAY_QR',
          status: 'VERIFIED',
          slipFingerprint: fingerprint,
          slipRef: transRef,
          sendingBank,
          verificationLevel: 'ANTI_DUPLICATE',
          verifiedAt: new Date(),
        },
      });
      await tx.billParticipant.update({
        where: { id: participantId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, 'slipFingerprint')) {
      const existing = await db.payment.findUnique({
        where: { slipFingerprint: fingerprint },
        select: { billId: true },
      });
      return {
        ok: false,
        reason: 'duplicate',
        message:
          existing?.billId === billId
            ? 'สลิปใบนี้ถูกใช้ยืนยันในบิลนี้ไปแล้ว'
            : 'สลิปใบนี้เคยถูกใช้ยืนยันไปแล้ว กรุณาใช้สลิปของการโอนครั้งนี้',
      };
    }
    throw error;
  }

  await syncSettledState(billId);
  await writeAudit({
    actorId: null,
    action: 'payment.verify-slip',
    entityId: participantId,
    metadata: { billId, transRef, sendingBank },
  });

  const bill = await getBill(billId, null);
  return { ok: true, bill: bill! };
}

/** อัปเดตสถานะบิลเป็น SETTLED เมื่อทุกคนจ่ายครบ (และย้อนกลับถ้ามีการยกเลิก) */
async function syncSettledState(billId: string) {
  const [total, paid] = await Promise.all([
    db.billParticipant.count({ where: { billId } }),
    db.billParticipant.count({ where: { billId, status: { in: ['PAID', 'WAIVED'] } } }),
  ]);
  const settled = total > 0 && paid === total;

  await db.bill.updateMany({
    where: { id: billId, status: { in: ['OPEN', 'SETTLED'] } },
    data: { status: settled ? 'SETTLED' : 'OPEN', settledAt: settled ? new Date() : null },
  });
}

async function writeAudit(params: {
  actorId: string | null;
  action: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.action.split('.')[0] === 'bill' ? 'Bill' : 'BillParticipant',
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    // audit log ล้มต้องไม่ทำให้ธุรกรรมของผู้ใช้ล้มตาม — log ไว้แล้วไปต่อ
    console.error('[audit] เขียน log ไม่สำเร็จ', error);
  }
}

function isUniqueViolation(error: unknown, field: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === 'string' ? target.includes(field) : true;
}
