'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * เก็บ state ลง localStorage แบบทน SSR:
 * render แรกใช้ค่า initial เสมอ (ตรงกับ server) แล้วค่อย hydrate ใน effect
 * เพื่อไม่ให้เกิด hydration mismatch
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* โหมดส่วนตัว / โควตาเต็ม / JSON เสีย — ใช้ค่า initial ต่อไป */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* เขียนไม่ได้ก็ปล่อยผ่าน ไม่ควรทำให้แอปพัง */
    }
  }, [value, hydrated]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      /* noop */
    }
  }, []);

  return { value, setValue, hydrated, clear } as const;
}
