import 'server-only';

/**
 * ตัวแปรสภาพแวดล้อมฝั่ง server
 *
 * หมายเหตุ: PROMPTPAY_ID ไม่ใช่ค่าหลักของระบบอีกแล้ว — ตั้งแต่รองรับผู้ใช้หลายคน
 * เลข PromptPay ถูกเก็บรายคนที่ User.promptPayIdEnc (เข้ารหัสไว้)
 * ค่านี้เหลือไว้เป็น fallback ของบิลเก่าที่สร้างก่อนมีระบบนั้นเท่านั้น
 */

function optional(key: string): string {
  return process.env[key] ?? '';
}

export const serverEnv = {
  /** ใช้กับบิลเก่าที่ยังไม่มี payeeIdEnc เท่านั้น — บิลใหม่ไม่แตะค่านี้ */
  get legacyPromptPayId() {
    return optional('PROMPTPAY_ID');
  },
  get accountName() {
    return optional('ACCOUNT_NAME') || 'ผู้รับเงิน';
  },
};
