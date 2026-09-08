export type SlipStage =
  | 'idle'
  | 'reading'      // อ่านไฟล์ + preprocess
  | 'scanning'     // หา QR ในรูป
  | 'verifying'    // ส่งไป server ตรวจซ้ำ
  | 'success'
  | 'failed';

export type SlipFailureReason =
  | 'no-qr'          // หา QR ในรูปไม่เจอ
  | 'not-a-slip'     // เจอ QR แต่ไม่ใช่ QR สลิปโอนเงิน
  | 'duplicate'      // สลิปนี้เคยถูกใช้ยืนยันไปแล้ว
  | 'bill-not-found'
  | 'network'
  | 'unknown';

export type DecodedSlip = {
  /** payload ดิบที่อ่านได้จาก QR */
  payload: string;
  /** sha-256 ของ payload — ใช้เป็นกุญแจกันสลิปซ้ำ (ไม่ส่ง payload ดิบไปเก็บ) */
  fingerprint: string;
  /** เลขอ้างอิงธุรกรรม ถ้าแกะออกมาได้ */
  transRef?: string;
  /** รหัสธนาคารผู้โอน ถ้าแกะออกมาได้ */
  sendingBank?: string;
};

export type SlipVerificationResult =
  | { ok: true; slip: DecodedSlip }
  | { ok: false; reason: SlipFailureReason; message: string };
