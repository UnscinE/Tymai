'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type QRCodeStyling from 'qr-code-styling';
import { buildQROptions } from '../lib/qr-style-preset';

export type QRCanvasHandle = {
  /** ดึงไฟล์ PNG ของตัว QR ล้วน (ไม่รวมการ์ด) */
  toBlob: () => Promise<Blob | null>;
};

/**
 * qr-code-styling แตะ window ตอน construct จึงต้องอยู่ใน client component
 * และ import แบบ dynamic ภายใน effect เท่านั้น ไม่งั้น build ฝั่ง server จะพัง
 */
export function StyledQRCanvas({
  payload,
  size = 232,
  logoSrc,
  handleRef,
  className,
}: {
  payload: string;
  size?: number;
  logoSrc?: string;
  handleRef?: Ref<QRCanvasHandle>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<QRCodeStyling | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(handleRef, () => ({
    toBlob: async () => {
      const instance = instanceRef.current;
      if (!instance) return null;
      const data = await instance.getRawData('png');
      if (!data) return null;
      return data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: 'image/png' });
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || !payload) return;

    (async () => {
      const { default: QRCodeStylingCtor } = await import('qr-code-styling');
      if (cancelled) return;

      const options = buildQROptions({ payload, size, logoSrc });
      if (instanceRef.current) {
        instanceRef.current.update(options);
      } else {
        instanceRef.current = new QRCodeStylingCtor(options);
        container.replaceChildren();
        instanceRef.current.append(container);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [payload, size, logoSrc]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, opacity: ready ? 1 : 0, transition: 'opacity 200ms ease' }}
      aria-label="PromptPay QR Code"
      role="img"
    />
  );
}
