'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/shared/hooks/use-local-storage';
import { entityId } from '@/shared/lib/id';
import { toSatang } from '@/shared/lib/currency';
import { calculateSplit, DEFAULT_CHARGES } from '../lib/calculate-split';
import type { BillCharges, DraftBill } from '../types';

export const DRAFT_STORAGE_KEY = 'tymai.bill-draft.v1';

const EMPTY_DRAFT: DraftBill = {
  title: 'บิลค่าอาหาร',
  people: [],
  items: [],
  charges: DEFAULT_CHARGES,
};

/**
 * บิลฉบับร่างอยู่ใน localStorage ของเจ้าของบิลเท่านั้น
 * จะกลายเป็นบิลที่แชร์ได้ก็ต่อเมื่อกด "แชร์บิล" (POST /api/bills)
 */
export function useBillSplit() {
  const { value: draft, setValue: setDraft, hydrated, clear } = useLocalStorage<DraftBill>(
    DRAFT_STORAGE_KEY,
    EMPTY_DRAFT,
  );

  const split = useMemo(() => calculateSplit(draft), [draft]);

  const addPerson = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setDraft((d) => ({ ...d, people: [...d.people, { id: entityId('p'), name: trimmed }] }));
    },
    [setDraft],
  );

  const renamePerson = useCallback(
    (id: string, name: string) => {
      setDraft((d) => ({
        ...d,
        people: d.people.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
      }));
    },
    [setDraft],
  );

  const removePerson = useCallback(
    (id: string) => {
      setDraft((d) => ({
        ...d,
        people: d.people.filter((p) => p.id !== id),
        // ต้องถอดคนนี้ออกจากทุกรายการด้วย ไม่งั้นยอดจะค้าง
        items: d.items.map((it) => ({ ...it, sharedBy: it.sharedBy.filter((pid) => pid !== id) })),
      }));
    },
    [setDraft],
  );

  const addItem = useCallback(
    (name: string, priceInput: string, sharedBy: string[] = []) => {
      const trimmed = name.trim();
      const price = toSatang(priceInput);
      if (!trimmed || price <= 0) return;
      setDraft((d) => ({
        ...d,
        items: [...d.items, { id: entityId('i'), name: trimmed, price, sharedBy }],
      }));
    },
    [setDraft],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<{ name: string; price: number }>) => {
      setDraft((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      }));
    },
    [setDraft],
  );

  const removeItem = useCallback(
    (id: string) => setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) })),
    [setDraft],
  );

  /** ติ๊ก/เอาออก ว่าคนนี้ร่วมกินรายการนี้ไหม — หัวใจของการจับคู่ "เมนู ↔ คนกิน" */
  const toggleEater = useCallback(
    (itemId: string, personId: string) => {
      setDraft((d) => ({
        ...d,
        items: d.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                sharedBy: it.sharedBy.includes(personId)
                  ? it.sharedBy.filter((id) => id !== personId)
                  : [...it.sharedBy, personId],
              }
            : it,
        ),
      }));
    },
    [setDraft],
  );

  const setItemEaters = useCallback(
    (itemId: string, personIds: string[]) => {
      setDraft((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === itemId ? { ...it, sharedBy: personIds } : it)),
      }));
    },
    [setDraft],
  );

  const setCharges = useCallback(
    (patch: Partial<BillCharges>) => setDraft((d) => ({ ...d, charges: { ...d.charges, ...patch } })),
    [setDraft],
  );

  const setTitle = useCallback(
    (title: string) => setDraft((d) => ({ ...d, title: title.slice(0, 80) })),
    [setDraft],
  );

  const reset = useCallback(() => {
    clear();
    setDraft(EMPTY_DRAFT);
  }, [clear, setDraft]);

  return {
    draft,
    split,
    hydrated,
    actions: {
      addPerson,
      renamePerson,
      removePerson,
      addItem,
      updateItem,
      removeItem,
      toggleEater,
      setItemEaters,
      setCharges,
      setTitle,
      reset,
    },
  } as const;
}
