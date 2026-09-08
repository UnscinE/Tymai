'use client';

import { useCallback, useState } from 'react';
import { useLocalStorage } from '@/shared/hooks/use-local-storage';
import type { Bill, DraftBill } from '@/features/bill-split/types';

export const OWNERSHIP_STORAGE_KEY = 'tymai.bill-ownership.v1';

type Ownership = { billId: string; ownerToken: string } | null;

/**
 * เจ้าของบิลกด "แชร์บิล" -> สร้างบิลบน server แล้วเก็บ ownerToken ไว้ในเครื่องตัวเอง
 * โทเคนนี้คือสิ่งเดียวที่ทำให้ติ๊กสถานะจ่ายเงินด้วยมือได้ จึงไม่เคยถูกใส่ไว้ในลิงก์ที่แชร์
 */
export function usePublishBill() {
  const { value: ownership, setValue: setOwnership, hydrated } = useLocalStorage<Ownership>(
    OWNERSHIP_STORAGE_KEY,
    null,
  );
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    async (draft: DraftBill): Promise<Bill | null> => {
      setPublishing(true);
      setError(null);
      try {
        const res = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'สร้างลิงก์บิลไม่สำเร็จ');
        const bill = json.bill as Bill;
        setOwnership({ billId: bill.id, ownerToken: json.ownerToken as string });
        return bill;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'สร้างลิงก์บิลไม่สำเร็จ');
        return null;
      } finally {
        setPublishing(false);
      }
    },
    [setOwnership],
  );

  const forget = useCallback(() => setOwnership(null), [setOwnership]);

  return { ownership, hydrated, publish, publishing, error, forget } as const;
}
