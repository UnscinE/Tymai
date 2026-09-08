'use client';

import { useCallback, useState } from 'react';
import type { Bill } from '@/features/bill-split/types';
import { decodeQrFromFile } from '../lib/decode-qr-from-image';
import type { SlipFailureReason, SlipStage } from '../types';

type State = {
  stage: SlipStage;
  message: string | null;
  reason: SlipFailureReason | null;
};

const IDLE: State = { stage: 'idle', message: null, reason: null };

/**
 * Flow การยืนยันสลิป:
 *   reading  -> โหลดรูป
 *   scanning -> หา QR (BarcodeDetector -> zxing -> jsQR, ลองหมุน 4 มุม)
 *   verifying-> ส่ง payload ให้ server ตรวจว่าเป็นสลิปจริง + ยังไม่เคยถูกใช้
 *   success / failed
 *
 * การอ่าน QR ทำฝั่ง client เพื่อไม่ต้องอัปโหลดรูปสลิป (ซึ่งมีข้อมูลส่วนตัว) ขึ้น server เลย
 * server เห็นแค่ payload ของ QR เท่านั้น
 */
export function useSlipVerification(billId: string, options?: { onBillUpdate?: (bill: Bill) => void }) {
  const [state, setState] = useState<State>(IDLE);

  const reset = useCallback(() => setState(IDLE), []);

  const verify = useCallback(
    async (personId: string, file: File) => {
      setState({ stage: 'reading', message: 'กำลังเปิดสลิป…', reason: null });

      let payload: string | null = null;
      try {
        setState({ stage: 'scanning', message: 'กำลังค้นหา QR บนสลิป…', reason: null });
        payload = await decodeQrFromFile(file);
      } catch {
        setState({ stage: 'failed', reason: 'unknown', message: 'เปิดไฟล์รูปไม่ได้ ลองไฟล์อื่นดูครับ' });
        return;
      }

      if (!payload) {
        setState({
          stage: 'failed',
          reason: 'no-qr',
          message: 'ไม่พบ QR บนสลิป — ลองใช้ภาพที่บันทึกจากแอปธนาคารโดยตรง (ไม่ใช่ถ่ายจากหน้าจอ)',
        });
        return;
      }

      setState({ stage: 'verifying', message: 'กำลังตรวจสอบสลิป…', reason: null });

      try {
        const res = await fetch(`/api/bills/${billId}/slips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId, payload }),
        });
        const json = await res.json();

        if (!res.ok) {
          setState({
            stage: 'failed',
            reason: (json.reason as SlipFailureReason) ?? 'unknown',
            message: json.error ?? 'ยืนยันสลิปไม่สำเร็จ',
          });
          return;
        }

        if (json.bill) options?.onBillUpdate?.(json.bill as Bill);
        setState({
          stage: 'success',
          reason: null,
          message: json.alreadyPaid ? 'รายการนี้ถูกยืนยันไปแล้ว' : 'ยืนยันสลิปเรียบร้อย',
        });
      } catch {
        setState({ stage: 'failed', reason: 'network', message: 'เชื่อมต่อไม่ได้ กรุณาลองใหม่' });
      }
    },
    [billId, options],
  );

  return { state, verify, reset } as const;
}
