'use client';

import { useEffect, useState } from 'react';
import type { PaymentQRData } from '../types';

/**
 * ที่มาของ QR — เลข PromptPay ไม่เคยถูกส่งมาจาก client
 * server เป็นคนตัดสินเองว่าจะใช้บัญชีไหนจากบริบทที่ให้มา
 */
export type QRSource =
  /** บัญชีของผู้ใช้ที่ login อยู่ ใช้ตอนพรีวิวในหน้าสร้างบิล */
  | { kind: 'own'; amountSatang: number }
  /** คนหนึ่งคนในบิล สำหรับผู้ใช้ที่ login แล้ว */
  | { kind: 'bill'; billId: string; personId: string }
  /** คนหนึ่งคนในบิล ผ่านลิงก์สาธารณะ */
  | { kind: 'public'; token: string; personId: string };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: PaymentQRData }
  | { status: 'error'; message: string; reason?: string };

function resolveRequest(source: QRSource): { url: string; body: unknown } | null {
  switch (source.kind) {
    case 'own':
      if (!Number.isInteger(source.amountSatang) || source.amountSatang <= 0) return null;
      return { url: '/api/promptpay', body: { amountSatang: source.amountSatang } };
    case 'bill':
      return { url: `/api/bills/${source.billId}/qr`, body: { personId: source.personId } };
    case 'public':
      return { url: `/api/public/bills/${source.token}/qr`, body: { personId: source.personId } };
  }
}

/** ขอ payload จาก server แล้วยกเลิกคำขอเก่าเมื่อบริบทเปลี่ยนเร็วๆ */
export function usePromptPayPayload(source: QRSource) {
  const [state, setState] = useState<State>({ status: 'idle' });
  // serialize เพื่อให้ effect เทียบค่าได้ ไม่ใช่เทียบ reference ของ object ที่สร้างใหม่ทุก render
  const key = JSON.stringify(source);

  useEffect(() => {
    const parsed = JSON.parse(key) as QRSource;
    const request = resolveRequest(parsed);
    if (!request) {
      // รีเซ็ตเมื่อบริบทเปลี่ยนเป็นค่าที่ยังสร้าง QR ไม่ได้ (เช่น ยอดเป็น 0)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          const error = new Error(json.error ?? 'สร้าง QR ไม่สำเร็จ');
          (error as Error & { reason?: string }).reason = json.reason;
          throw error;
        }
        setState({ status: 'ready', data: json as PaymentQRData });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'สร้าง QR ไม่สำเร็จ',
          reason: (error as { reason?: string })?.reason,
        });
      });

    return () => controller.abort();
  }, [key]);

  return state;
}
