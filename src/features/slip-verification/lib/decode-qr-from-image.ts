'use client';

import { drawToCanvas, enhanceContrast, loadImageFromFile } from './preprocess-image';

/**
 * อ่าน QR จากรูปสลิป โดยไล่ 3 ชั้นตามความแม่นยำ:
 *   1. BarcodeDetector API (native, Chrome/Edge/Android) — เร็วและทนที่สุด
 *   2. @zxing/library — ทน perspective/หมุน ดีกว่า jsQR ใช้กับ Safari/Firefox
 *   3. jsQR — ด่านสุดท้าย
 * แต่ละชั้นลองทั้งรูปต้นฉบับ, รูปเพิ่มคอนทราสต์, และรูปหมุน 90/180/270
 */

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
};

const ROTATIONS = [0, 90, 180, 270] as const;

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const img = await loadImageFromFile(file);

  for (const rotation of ROTATIONS) {
    const { canvas, imageData } = drawToCanvas(img, rotation);

    const native = await tryBarcodeDetector(canvas);
    if (native) return native;

    const zxing = await tryZxing(canvas);
    if (zxing) return zxing;

    const jsqr = await tryJsQr(imageData);
    if (jsqr) return jsqr;

    // รอบเสริม: เพิ่มคอนทราสต์แล้วลองใหม่ (แพงกว่า เลยทำหลังสุดของแต่ละมุม)
    const boosted = enhanceContrast(imageData);
    const jsqrBoosted = await tryJsQr(boosted);
    if (jsqrBoosted) return jsqrBoosted;
  }

  return null;
}

let detector: BarcodeDetectorLike | null | undefined;

async function tryBarcodeDetector(canvas: HTMLCanvasElement): Promise<string | null> {
  if (detector === undefined) {
    const Ctor = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike })
      .BarcodeDetector;
    detector = Ctor ? new Ctor({ formats: ['qr_code'] }) : null;
  }
  if (!detector) return null;
  try {
    const results = await detector.detect(canvas);
    return results[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

async function tryZxing(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const reader = new BrowserQRCodeReader();
    return reader.decodeFromCanvas(canvas).getText();
  } catch {
    return null; // zxing โยน NotFoundException เมื่อไม่เจอ ถือเป็นเรื่องปกติ
  }
}

async function tryJsQr(imageData: ImageData): Promise<string | null> {
  try {
    const jsQR = (await import('jsqr')).default;
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return result?.data ?? null;
  } catch {
    return null;
  }
}
