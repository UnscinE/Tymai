'use client';

const MAX_EDGE = 1600;

export type PreparedImage = {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
};

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('เปิดไฟล์รูปไม่ได้'));
      img.src = url;
    });
    return img;
  } finally {
    // ปล่อยหลัง decode เสร็จ กัน memory leak
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * วาดรูปลง canvas พร้อมย่อขนาด + หมุนตามองศาที่กำหนด
 * ย่อก่อนช่วยให้ decoder เร็วขึ้นมาก และลด noise จากรูปถ่ายความละเอียดสูง
 */
export function drawToCanvas(img: HTMLImageElement, rotation: 0 | 90 | 180 | 270 = 0): PreparedImage {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const swap = rotation === 90 || rotation === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('เบราว์เซอร์นี้ไม่รองรับ canvas 2d');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  return { canvas, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/**
 * เพิ่มคอนทราสต์แบบ grayscale + normalize
 * ช่วยกรณีถ่ายรูปจากหน้าจอ/แสงไม่พอ ที่ jsQR มักอ่านไม่ออก
 */
export function enhanceContrast(source: ImageData): ImageData {
  const data = new Uint8ClampedArray(source.data);
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    data[i] = data[i + 1] = data[i + 2] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  const range = max - min;
  if (range > 0 && range < 255) {
    const factor = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      const v = (data[i] - min) * factor;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  return new ImageData(data, source.width, source.height);
}
