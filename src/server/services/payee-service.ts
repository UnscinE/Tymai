import 'server-only';
import { db } from '@/server/db';
import { decryptSecret, encryptSecret, tryDecryptSecret } from '@/server/crypto';
import { serverEnv } from '@/shared/lib/env';

/**
 * ข้อมูลบัญชีรับเงินของผู้ใช้แต่ละคน
 *
 * เดิมทั้งระบบใช้ PROMPTPAY_ID ตัวเดียวจาก env แปลว่าไม่ว่าใครสร้างบิล
 * เงินจะวิ่งเข้าบัญชีเดียวกันหมด ซึ่งใช้จริงกับผู้ใช้หลายคนไม่ได้
 * ตอนนี้เก็บรายคนที่ User.promptPayIdEnc โดยเข้ารหัสไว้ (ดู src/server/crypto.ts)
 */

export type PayeeInfo = { promptPayId: string; accountName: string };

/**
 * PromptPay ID ที่ใช้ได้:
 *   - เบอร์โทร 10 หลัก ขึ้นต้นด้วย 0
 *   - เลขบัตรประชาชน 13 หลัก
 *   - eWallet 15 หลัก
 */
export function normalizePromptPayId(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^\d{13}$/.test(digits)) return digits;
  if (/^\d{15}$/.test(digits)) return digits;
  return null;
}

/** ปิดบังเลขไว้แสดงในหน้าตั้งค่า — ผู้ใช้ยืนยันได้ว่าใส่ถูกใบ โดยไม่ต้องโชว์ทั้งเลข */
export function maskPromptPayId(id: string): string {
  if (id.length <= 4) return '••••';
  return `${'•'.repeat(id.length - 4)}${id.slice(-4)}`;
}

export async function setUserPayee(
  userId: string,
  promptPayId: string,
  accountName: string,
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      promptPayIdEnc: encryptSecret(promptPayId),
      promptPayName: accountName.trim().slice(0, 60) || null,
    },
  });
}

export async function clearUserPayee(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { promptPayIdEnc: null, promptPayName: null },
  });
}

/** อ่านบัญชีรับเงินของผู้ใช้ — คืน null ถ้ายังไม่ได้ตั้ง */
export async function getUserPayee(userId: string): Promise<PayeeInfo | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { promptPayIdEnc: true, promptPayName: true, name: true },
  });
  if (!user?.promptPayIdEnc) return null;

  const promptPayId = tryDecryptSecret(user.promptPayIdEnc);
  // ถอดไม่ออก = กุญแจถูกเปลี่ยน ให้ถือว่ายังไม่ได้ตั้งค่า ผู้ใช้จะได้กรอกใหม่
  if (!promptPayId) return null;

  return { promptPayId, accountName: user.promptPayName ?? user.name ?? 'ผู้รับเงิน' };
}

/** ไว้แสดงในหน้าตั้งค่า (เลขถูกปิดบัง) */
export async function getUserPayeeMasked(userId: string) {
  const payee = await getUserPayee(userId);
  if (!payee) return null;
  return { masked: maskPromptPayId(payee.promptPayId), accountName: payee.accountName };
}

/**
 * บัญชีรับเงินของ "บิล" — อ่านจาก snapshot ที่บันทึกไว้ตอนสร้างบิล
 *
 * ต้องใช้ snapshot ไม่ใช่ค่าปัจจุบันของผู้สร้าง เพราะถ้าเขาเปลี่ยนเลข PromptPay
 * ทีหลัง บิลเก่าที่ยังเก็บเงินไม่ครบต้องยังชี้ไปที่บัญชีเดิมที่เพื่อนโอนไปแล้ว
 */
export async function getBillPayee(billId: string): Promise<PayeeInfo | null> {
  const bill = await db.bill.findUnique({
    where: { id: billId },
    select: { payeeIdEnc: true, payeeName: true },
  });
  if (!bill) return null;

  if (bill.payeeIdEnc) {
    const promptPayId = tryDecryptSecret(bill.payeeIdEnc);
    if (promptPayId) {
      return { promptPayId, accountName: bill.payeeName ?? 'ผู้รับเงิน' };
    }
  }

  // บิลที่สร้างก่อนระบบเก็บ PromptPay รายคน — ใช้ค่าจาก env เป็นค่าสำรอง
  // (เป็นบัญชีเดียวกับที่ระบบใช้อยู่เดิม จึงไม่ทำให้เงินวิ่งผิดที่)
  const legacy = serverEnv.legacyPromptPayId;
  if (!legacy) return null;
  return { promptPayId: legacy, accountName: bill.payeeName ?? serverEnv.accountName };
}

/** เข้ารหัสเลขเพื่อเก็บเป็น snapshot ในบิล */
export function encryptPayeeId(promptPayId: string): string {
  return encryptSecret(promptPayId);
}

export { decryptSecret };
