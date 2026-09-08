'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Bill } from '@/features/bill-split/types';

const POLL_INTERVAL_MS = 5000;

type Status = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * ดึงบิลจาก server แล้ว poll ทุก 5 วิ เพื่อให้เจ้าของบิลเห็นทันทีเมื่อเพื่อนอัปโหลดสลิป
 * หยุด poll เมื่อแท็บถูกซ่อน (ประหยัดโควตา DB และแบตมือถือ)
 *
 * รับ endpoint เต็มๆ เพราะมีสองทาง:
 *   /api/bills/<id>            สำหรับคนที่ login แล้ว
 *   /api/public/bills/<token>  สำหรับเพื่อนที่เปิดจากลิงก์
 */
export function useSharedBill(endpoint: string | null, initialBill?: Bill | null) {
  const [bill, setBill] = useState<Bill | null>(initialBill ?? null);
  const [status, setStatus] = useState<Status>(initialBill ? 'ready' : 'loading');

  const refresh = useCallback(async () => {
    if (!endpoint) return;
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
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
      // อ่านค่าเดิมผ่าน functional update แทนการเขียน ref ระหว่าง render
      // (การเขียน ref ระหว่าง render ไม่ปลอดภัยกับ concurrent rendering ของ React 19)
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) return;
    // refresh() เรียก setState หลัง await เท่านั้น ไม่ใช่ synchronous cascade ที่กฎนี้ตั้งใจกัน
    // และการ fetch ตอน mount คือหน้าที่ของ effect โดยแท้
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [endpoint, initialBill, refresh]);

  return { bill, setBill, status, refresh } as const;
}
