'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LOGO_PRESETS } from '../lib/qr-style-preset';
import type { QRLogo } from '../types';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export function useQrLogo(initial: QRLogo = { kind: 'preset', presetId: 'wallet', src: LOGO_PRESETS[0].src }) {
  const [logo, setLogo] = useState<QRLogo>(initial);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => revoke, [revoke]);

  const selectPreset = useCallback(
    (presetId: string) => {
      const preset = LOGO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      revoke();
      setError(null);
      setLogo({ kind: 'preset', presetId: preset.id, src: preset.src });
    },
    [revoke],
  );

  const clearLogo = useCallback(() => {
    revoke();
    setError(null);
    setLogo({ kind: 'none' });
  }, [revoke]);

  const uploadLogo = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        setError('รองรับเฉพาะไฟล์ PNG, JPG, WebP หรือ SVG');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('ไฟล์ใหญ่เกิน 2 MB');
        return;
      }
      revoke();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setError(null);
      setLogo({ kind: 'custom', src: url, fileName: file.name });
    },
    [revoke],
  );

  return { logo, error, selectPreset, uploadLogo, clearLogo, presets: LOGO_PRESETS } as const;
}
