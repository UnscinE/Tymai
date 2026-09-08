'use client';

import { useEffect, useState } from 'react';
import type { PaymentQRData } from '../types';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: PaymentQRData }
  | { status: 'error'; message: string };

/**
 * ขอ PromptPay payload จาก server (เลข PromptPay ไม่เคยออกมาอยู่ใน bundle)
 * ยิงใหม่ทุกครั้งที่ยอดเปลี่ยน และยกเลิกคำขอเก่าเมื่อยอดเปลี่ยนเร็วๆ
 */
export function usePromptPayPayload(amountSatang: number) {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    if (!Number.isInteger(amountSatang) || amountSatang <= 0) {
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch('/api/promptpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountSatang }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'สร้าง QR ไม่สำเร็จ');
        setState({ status: 'ready', data: json as PaymentQRData });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'สร้าง QR ไม่สำเร็จ' });
      });

    return () => controller.abort();
  }, [amountSatang]);

  return state;
}
