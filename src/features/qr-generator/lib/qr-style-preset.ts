import type { Options as QRCodeStylingOptions } from 'qr-code-styling';
import type { QRLogoPreset } from '../types';

export const LOGO_PRESETS: QRLogoPreset[] = [
  { id: 'wallet', label: 'กระเป๋าเงิน', src: '/qr-logos/wallet.svg' },
  { id: 'baht', label: 'บาท', src: '/qr-logos/baht.svg' },
  { id: 'bowl', label: 'ก๋วยเตี๋ยว', src: '/qr-logos/bowl.svg' },
  { id: 'coffee', label: 'กาแฟ', src: '/qr-logos/coffee.svg' },
  { id: 'heart', label: 'หัวใจ', src: '/qr-logos/heart.svg' },
];

/**
 * โลโก้กลาง QR บังข้อมูลบางส่วนเสมอ จึงต้อง:
 *   - errorCorrectionLevel = 'H' (กู้คืนได้ 30%)
 *   - โลโก้ไม่เกิน ~22% ของด้านกว้าง
 * เกินกว่านี้แอปธนาคารบางตัวจะสแกนไม่ติด
 */
export const MAX_LOGO_RATIO = 0.22;

export function buildQROptions(params: {
  payload: string;
  size: number;
  logoSrc?: string;
}): QRCodeStylingOptions {
  const { payload, size, logoSrc } = params;

  return {
    width: size,
    height: size,
    type: 'canvas',
    data: payload,
    margin: 0,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      // ต้องเป็น H เสมอ ไม่ว่าจะมีโลโก้หรือไม่ เพื่อให้สลับโลโก้ได้โดย QR ไม่เปลี่ยนความหนาแน่น
      errorCorrectionLevel: 'H',
    },
    image: logoSrc,
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: MAX_LOGO_RATIO * 2, // qr-code-styling คิดสัดส่วนบนพื้นที่กลาง ไม่ใช่ทั้งภาพ
      margin: 4,
      crossOrigin: 'anonymous',
    },
    dotsOptions: { color: '#0f172a', type: 'rounded' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { color: '#1e40af', type: 'extra-rounded' },
    cornersDotOptions: { color: '#1e40af', type: 'dot' },
  };
}
