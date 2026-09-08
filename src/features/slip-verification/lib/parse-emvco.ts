/**
 * EMVCo TLV parser — ใช้ได้ทั้ง QR รับเงิน (PromptPay) และ mini-QR บนสลิปโอนเงิน
 * รูปแบบ: [tag 2 หลัก][length 2 หลัก][value ยาวตาม length] ต่อกันไปเรื่อยๆ
 */

export type TLVNode = {
  tag: string;
  value: string;
  children?: TLVNode[];
};

/** tag ที่ค่าข้างในเป็น TLV ซ้อนอีกชั้น (template) */
const TEMPLATE_TAGS = new Set(
  ['26', '27', '28', '29', '30', '31', '32', '62', '64', '80', '81'],
);

export function parseTLV(input: string, depth = 0): TLVNode[] {
  const nodes: TLVNode[] = [];
  let i = 0;
  while (i + 4 <= input.length) {
    const tag = input.slice(i, i + 2);
    const lengthRaw = input.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthRaw)) return nodes;
    const length = Number(lengthRaw);
    const value = input.slice(i + 4, i + 4 + length);
    if (value.length < length) return nodes; // payload ขาด -> หยุด
    const node: TLVNode = { tag, value };
    if (depth < 2 && TEMPLATE_TAGS.has(tag) && value.length >= 4) {
      const children = parseTLV(value, depth + 1);
      if (children.length > 0) node.children = children;
    }
    nodes.push(node);
    i += 4 + length;
  }
  return nodes;
}

export function findTag(nodes: TLVNode[], tag: string): TLVNode | undefined {
  return nodes.find((n) => n.tag === tag);
}

/** เดินหา tag แบบลึก เช่น findPath(nodes, ['29','01']) */
export function findPath(nodes: TLVNode[], path: string[]): TLVNode | undefined {
  let current: TLVNode | undefined;
  let scope = nodes;
  for (const tag of path) {
    current = findTag(scope, tag);
    if (!current) return undefined;
    scope = current.children ?? [];
  }
  return current;
}

/** ตรวจ CRC16/CCITT-FALSE ของ payload EMVCo (tag 63 อยู่ท้ายสุดเสมอ) */
export function isCrcValid(payload: string): boolean {
  const idx = payload.lastIndexOf('6304');
  if (idx < 0 || idx + 8 !== payload.length) return false;
  const expected = payload.slice(idx + 4).toUpperCase();
  return crc16(payload.slice(0, idx + 4)) === expected;
}

export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
