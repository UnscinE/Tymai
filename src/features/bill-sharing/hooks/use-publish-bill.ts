'use client';

import { useCallback, useState } from 'react';
import type { Bill, DraftBill } from '@/features/bill-split/types';

/**
 * เจ้าของบิลกด "แชร์บิล" -> บันทึกลงฐานข้อมูลโดยผูกกับบัญชีผู้ใช้
 *
 * เดิมเก็บ ownerToken ไว้ใน localStorage เป็นหลักฐานความเป็นเจ้าของ
 * ซึ่งหายเมื่อล้าง browser และเปิดจากอีกเครื่องไม่ได้
 * ตอนนี้สิทธิ์มาจาก session + Bill.creatorId แทน จึงไม่ต้องเก็บอะไรไว้ในเครื่องอีก
 */
export function usePublishBill() {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(async (draft: DraftBill): Promise<Bill | null> => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'สร้างบิลไม่สำเร็จ');
      return json.bill as Bill;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างบิลไม่สำเร็จ');
      return null;
    } finally {
      setPublishing(false);
    }
  }, []);

  return { publish, publishing, error } as const;
}
