'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * เก็บ state ลง localStorage แบบทน SSR:
 * render แรกใช้ค่า initial เสมอ (ตรงกับ server) แล้วค่อย hydrate ใน effect
 * เพื่อไม่ให้เกิด hydration mismatch
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // hydration โดยเจตนา: render แรกต้องตรงกับ server (ซึ่งไม่มี localStorage)
      // แล้วค่อยอ่านค่าจริงใน effect — ถ้าอ่านตั้งแต่ useState initializer จะ hydration mismatch ทันที
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* โหมดส่วนตัว / โควตาเต็ม / JSON เสีย — ใช้ค่า initial ต่อไป */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* เขียนไม่ได้ก็ปล่อยผ่าน ไม่ควรทำให้แอปพัง */
    }
  }, [key, value, hydrated]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  return { value, setValue, hydrated, clear } as const;
}
