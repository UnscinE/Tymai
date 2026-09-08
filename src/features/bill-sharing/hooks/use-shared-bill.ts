'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bill } from '@/features/bill-split/types';

const POLL_INTERVAL_MS = 5000;

type Status = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * ดึงบิลจาก server แล้ว poll ทุก 5 วิ เพื่อให้เจ้าของบิลเห็นทันทีเมื่อเพื่อนอัปโหลดสลิป
 * หยุด poll เมื่อแท็บถูกซ่อน (ประหยัดโควตา Upstash และแบตมือถือ)
 */
export function useSharedBill(billId: string | null, initialBill?: Bill | null) {
  const [bill, setBill] = useState<Bill | null>(initialBill ?? null);
  const [status, setStatus] = useState<Status>(initialBill ? 'ready' : 'loading');
  const billRef = useRef(bill);
  billRef.current = bill;

  const refresh = useCallback(async () => {
    if (!billId) return;
    try {
      const res = await fetch(`/api/bills/${billId}`, { cache: 'no-store' });
      if (res.status === 404) {
        setStatus('not-found');
        return;
      }
      if (!res.ok) throw new Error('โหลดบิลไม่สำเร็จ');
      const json = await res.json();
      setBill(json.bill as Bill);
      setStatus('ready');
    } catch {
      // ถ้าเคยโหลดสำเร็จแล้ว ให้คงข้อมูลเดิมไว้ อย่าทำหน้าจอว่าง
      setStatus(billRef.current ? 'ready' : 'error');
    }
  }, [billId]);

  useEffect(() => {
    if (!billId) return;
    if (!initialBill) void refresh();

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [billId, initialBill, refresh]);

  return { bill, setBill, status, refresh } as const;
}
