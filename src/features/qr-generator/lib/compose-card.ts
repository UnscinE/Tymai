'use client';

import { formatTHB } from '@/shared/lib/currency';

const W = 720;
const H = 1040;

/**
 * ประกอบการ์ดสลิปเรียกเก็บเงินเป็นไฟล์ PNG ใบเดียว (ส่งต่อทางไลน์ได้เลย)
 * วาดด้วย canvas ตรงๆ ไม่ต้องพึ่ง html-to-image เพื่อไม่เพิ่ม dependency
 */
export async function composePaymentCard(params: {
  qrBlob: Blob;
  accountName: string;
  payerName: string;
  amountSatang: number;
  title: string;
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sans = '"Noto Sans Thai", "IBM Plex Sans Thai", system-ui, sans-serif';

  // พื้นหลัง + แถบหัวสีแบรนด์
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(0, 0, W, 168);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `600 34px ${sans}`;
  ctx.fillText('THAI QR PAYMENT', W / 2, 76);
  ctx.font = `400 24px ${sans}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(truncate(params.title, 40), W / 2, 118);

  // QR
  const qrImage = await blobToImage(params.qrBlob);
  const qrSize = 392;
  const qrX = (W - qrSize) / 2;
  const qrY = 216;
  roundedRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // ชื่อผู้รับเงิน
  let y = qrY + qrSize + 84;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = `400 22px ${sans}`;
  ctx.fillText('โอนเข้าบัญชี', W / 2, y);
  y += 40;
  ctx.fillStyle = '#0f172a';
  ctx.font = `600 32px ${sans}`;
  ctx.fillText(truncate(params.accountName, 32), W / 2, y);

  // เส้นคั่น
  y += 42;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.setLineDash([8, 8]);
  ctx.moveTo(80, y);
  ctx.lineTo(W - 80, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // ผู้จ่าย + ยอด
  y += 54;
  ctx.fillStyle = '#64748b';
  ctx.font = `400 22px ${sans}`;
  ctx.fillText(`ยอดที่ ${truncate(params.payerName, 20)} ต้องชำระ`, W / 2, y);
  y += 58;
  ctx.fillStyle = '#1e40af';
  ctx.font = `700 56px ${sans}`;
  ctx.fillText(formatTHB(params.amountSatang), W / 2, y);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('อ่านรูป QR ไม่ได้'));
    };
    img.src = url;
  });
}
