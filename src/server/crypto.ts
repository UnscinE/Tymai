import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * เข้ารหัสข้อมูลอ่อนไหวก่อนเก็บลงฐานข้อมูล (AES-256-GCM)
 *
 * ใช้กับเลข PromptPay ซึ่งเป็นเบอร์โทรหรือเลขบัตรประชาชน — เป็นข้อมูลส่วนบุคคลตาม PDPA
 * ถ้า DB รั่วแล้วเก็บเป็น plaintext คือรั่วข้อมูลส่วนบุคคลของผู้ใช้ทุกคนพร้อมกัน
 *
 * GCM ให้ทั้งความลับและการตรวจว่าข้อมูลถูกแก้ไขหรือไม่ (auth tag)
 * ถ้ามีใครแก้ ciphertext ในฐานข้อมูลตรงๆ การถอดรหัสจะ throw ไม่ใช่คืนค่าขยะ
 *
 * รูปแบบที่เก็บ: v1.<iv base64url>.<authTag base64url>.<ciphertext base64url>
 * ใส่เลขเวอร์ชันไว้ เผื่อวันหนึ่งต้องหมุนกุญแจหรือเปลี่ยน algorithm
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // ความยาวมาตรฐานของ GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      '[crypto] ขาดค่า ENCRYPTION_KEY — สร้างด้วย: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('[crypto] ENCRYPTION_KEY ต้องเป็น base64 ของข้อมูล 32 ไบต์ (AES-256)');
  }

  cachedKey = key;
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, b64url(iv), b64url(tag), b64url(encrypted)].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('[crypto] รูปแบบข้อมูลที่เข้ารหัสไม่ถูกต้อง');
  }

  const [, ivPart, tagPart, dataPart] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), fromB64url(ivPart));
  decipher.setAuthTag(fromB64url(tagPart));

  return Buffer.concat([decipher.update(fromB64url(dataPart)), decipher.final()]).toString('utf8');
}

/** ถอดรหัสแบบไม่ throw — ใช้ตอนอ่านข้อมูลเก่าที่อาจเข้ารหัสด้วยกุญแจคนละดอก */
export function tryDecryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}
