import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';

/**
 * ระบบเพื่อน
 *
 * เก็บแถวเดียวต่อคู่ความสัมพันธ์ (ไม่เก็บสองทาง) เวลา query จึงต้องมองทั้ง
 * requesterId และ addresseeId เสมอ — helper ในไฟล์นี้ห่อเรื่องนั้นไว้ให้หมดแล้ว
 *
 * ข้อกำหนดด้านความเป็นส่วนตัวที่บังคับไว้ทั้งไฟล์:
 *   - ค้นหาได้ด้วย "ค่าที่ตรงเป๊ะ" เท่านั้น ห้าม contains/startsWith
 *     ไม่งั้นหน้าค้นหาจะกลายเป็นเครื่องมือไล่เก็บอีเมลกับเบอร์โทรของผู้ใช้ทั้งระบบ
 *   - ผลลัพธ์คืนแค่ id / ชื่อ / รูป / username ห้ามคืนอีเมลหรือเบอร์กลับไป
 */

export type PublicUser = {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
};

export type FriendshipView = 'none' | 'friends' | 'request-sent' | 'request-received' | 'self';

export type SearchResult = PublicUser & { relation: FriendshipView };

const PUBLIC_FIELDS = { id: true, name: true, image: true, username: true } satisfies Prisma.UserSelect;

/** ค้นหาผู้ใช้ด้วยอีเมล / username / เบอร์โทร แบบตรงเป๊ะเท่านั้น */
export async function searchUsers(rawQuery: string, currentUserId: string): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 3 || query.length > 100) return [];

  const normalizedPhone = query.replace(/[\s-]/g, '');

  const users = await db.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { email: query.toLowerCase() },
        { username: query.toLowerCase() },
        ...(/^\d{9,15}$/.test(normalizedPhone) ? [{ phone: normalizedPhone }] : []),
      ],
    },
    select: PUBLIC_FIELDS,
    take: 5,
  });

  if (users.length === 0) return [];

  const relations = await getRelations(
    currentUserId,
    users.map((u) => u.id),
  );

  return users.map((u) => ({ ...u, relation: u.id === currentUserId ? 'self' : (relations.get(u.id) ?? 'none') }));
}

/** สถานะความสัมพันธ์ระหว่างเรากับผู้ใช้หลายคนพร้อมกัน */
async function getRelations(userId: string, otherIds: string[]): Promise<Map<string, FriendshipView>> {
  const rows = await db.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: { in: otherIds } },
        { addresseeId: userId, requesterId: { in: otherIds } },
      ],
    },
    select: { requesterId: true, addresseeId: true, status: true },
  });

  const map = new Map<string, FriendshipView>();
  for (const row of rows) {
    const otherId = row.requesterId === userId ? row.addresseeId : row.requesterId;
    if (row.status === 'ACCEPTED') map.set(otherId, 'friends');
    else if (row.status === 'PENDING') {
      map.set(otherId, row.requesterId === userId ? 'request-sent' : 'request-received');
    }
    // BLOCKED ตั้งใจไม่บอกอะไรเลย — แสดงเป็น 'none' เหมือนคนแปลกหน้า
  }
  return map;
}

export async function listFriends(userId: string): Promise<PublicUser[]> {
  const rows = await db.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      requester: { select: PUBLIC_FIELDS },
      addressee: { select: PUBLIC_FIELDS },
      requesterId: true,
    },
    orderBy: { respondedAt: 'desc' },
  });

  return rows.map((row) => (row.requesterId === userId ? row.addressee : row.requester));
}

export type PendingRequests = {
  incoming: { id: string; user: PublicUser; createdAt: string }[];
  outgoing: { id: string; user: PublicUser; createdAt: string }[];
};

export async function listPendingRequests(userId: string): Promise<PendingRequests> {
  const rows = await db.friendship.findMany({
    where: {
      status: 'PENDING',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      id: true,
      createdAt: true,
      requesterId: true,
      requester: { select: PUBLIC_FIELDS },
      addressee: { select: PUBLIC_FIELDS },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    incoming: rows
      .filter((r) => r.requesterId !== userId)
      .map((r) => ({ id: r.id, user: r.requester, createdAt: r.createdAt.toISOString() })),
    outgoing: rows
      .filter((r) => r.requesterId === userId)
      .map((r) => ({ id: r.id, user: r.addressee, createdAt: r.createdAt.toISOString() })),
  };
}

export type FriendActionResult = { ok: true; status: FriendshipView } | { ok: false; message: string };

export async function sendFriendRequest(fromId: string, toId: string): Promise<FriendActionResult> {
  if (fromId === toId) return { ok: false, message: 'เพิ่มตัวเองเป็นเพื่อนไม่ได้' };

  const target = await db.user.findFirst({
    where: { id: toId, status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });
  if (!target) return { ok: false, message: 'ไม่พบผู้ใช้คนนี้' };

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: fromId, addresseeId: toId },
        { requesterId: toId, addresseeId: fromId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') return { ok: true, status: 'friends' };
    if (existing.status === 'BLOCKED') {
      // ไม่บอกว่าถูกบล็อก — ตอบเหมือนส่งคำขอไปแล้วตามปกติ
      return { ok: true, status: 'request-sent' };
    }
    // อีกฝ่ายส่งคำขอมาก่อนแล้ว การกดเพิ่มกลับ = ตอบรับ
    if (existing.requesterId === toId) {
      await db.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      return { ok: true, status: 'friends' };
    }
    return { ok: true, status: 'request-sent' };
  }

  await db.friendship.create({ data: { requesterId: fromId, addresseeId: toId, status: 'PENDING' } });
  return { ok: true, status: 'request-sent' };
}

export async function respondToRequest(
  userId: string,
  friendshipId: string,
  accept: boolean,
): Promise<FriendActionResult> {
  // ตอบรับ/ปฏิเสธได้เฉพาะคำขอที่ "ส่งมาหาเรา" เท่านั้น
  const row = await db.friendship.findFirst({
    where: { id: friendshipId, addresseeId: userId, status: 'PENDING' },
    select: { id: true },
  });
  if (!row) return { ok: false, message: 'ไม่พบคำขอนี้' };

  if (accept) {
    await db.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    return { ok: true, status: 'friends' };
  }

  // ปฏิเสธ = ลบทิ้ง เพื่อให้อีกฝ่ายส่งใหม่ได้ในอนาคต
  await db.friendship.delete({ where: { id: friendshipId } });
  return { ok: true, status: 'none' };
}

/** ยกเลิกคำขอที่เราส่งไป หรือเลิกเป็นเพื่อน */
export async function removeFriendship(userId: string, otherUserId: string): Promise<FriendActionResult> {
  const deleted = await db.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
      status: { in: ['PENDING', 'ACCEPTED'] },
    },
  });
  if (deleted.count === 0) return { ok: false, message: 'ไม่พบความสัมพันธ์นี้' };
  return { ok: true, status: 'none' };
}

/**
 * กรอง userId ที่ผู้ใช้ส่งมาตอนสร้างบิล ให้เหลือเฉพาะ "เพื่อนจริง หรือตัวเราเอง"
 *
 * ถ้าไม่กรอง ผู้ใช้จะยัด userId ของใครก็ได้ลงบิล ทำให้คนแปลกหน้าเห็นบิลโผล่
 * ในหน้า "บิลที่ต้องชำระ" ของตัวเอง ซึ่งเป็นช่องทางสแปมและหลอกให้โอนเงิน
 */
export async function filterLinkableUserIds(
  userId: string,
  candidateIds: string[],
): Promise<Set<string>> {
  const unique = [...new Set(candidateIds.filter(Boolean))];
  const others = unique.filter((id) => id !== userId);
  const allowed = new Set<string>();

  if (unique.includes(userId)) allowed.add(userId);
  if (others.length === 0) return allowed;

  const rows = await db.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addresseeId: { in: others } },
        { addresseeId: userId, requesterId: { in: others } },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });

  for (const row of rows) {
    allowed.add(row.requesterId === userId ? row.addresseeId : row.requesterId);
  }
  return allowed;
}
