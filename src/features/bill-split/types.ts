/** ทุกจำนวนเงินในไฟล์นี้เป็น "สตางค์" (integer) */

export type Person = {
  id: string;
  name: string;
  /**
   * บัญชีผู้ใช้ที่ผูกกับคนนี้ (ถ้าเลือกมาจากรายชื่อเพื่อน)
   * ถ้าเป็น null คือเพื่อนที่ไม่มีบัญชี ต้องจ่ายผ่านลิงก์สาธารณะ
   * ฝั่ง server จะกรองอีกชั้นว่าเป็นเพื่อนกันจริงไหม ห้ามเชื่อค่านี้ตรงๆ
   */
  userId?: string | null;
};

export type BillItem = {
  id: string;
  name: string;
  /** ราคาเต็มของรายการนี้ (สตางค์) */
  price: number;
  /** รายชื่อ person.id ที่ร่วมกินรายการนี้ — ว่าง = ยังไม่จับคู่ */
  sharedBy: string[];
};

/** ค่าใช้จ่ายระดับบิล คิดตามสัดส่วนยอดอาหารของแต่ละคน */
export type BillCharges = {
  /** ค่าบริการ % (เช่น 10) */
  servicePercent: number;
  /** ภาษีมูลค่าเพิ่ม % (เช่น 7) — คิดหลังบวกค่าบริการ ตามบิลร้านอาหารไทย */
  vatPercent: number;
  /** ส่วนลดทั้งบิล (สตางค์) หักตามสัดส่วน */
  discount: number;
};

export type PaymentStatus = 'unpaid' | 'paid';

export type PaymentRecord = {
  status: PaymentStatus;
  /** ลายนิ้วมือของสลิป (sha-256 ของ payload) ที่ใช้ยืนยัน */
  slipFingerprint?: string;
  /** เลขอ้างอิงที่อ่านได้จาก QR บนสลิป (ถ้าแกะได้) */
  slipRef?: string;
  paidAt?: string;
  /** true = เจ้าของบิลกดยืนยันเอง ไม่ได้มาจากสลิป */
  manual?: boolean;
};

/**
 * รูปร่างของบิลที่ฝั่ง UI ใช้ — เป็น DTO ที่ map มาจากตารางใน Prisma อีกที
 * (person.id ที่นี่ = BillParticipant.id ในฐานข้อมูล)
 *
 * จงใจไม่ให้ UI รู้จัก schema ของ DB ตรงๆ เพื่อให้เปลี่ยนโครงตารางได้
 * โดยแตะแค่ bill-service.ts จุดเดียว
 */
export type Bill = {
  id: string;
  title: string;
  people: Person[];
  items: BillItem[];
  charges: BillCharges;
  payments: Record<string, PaymentRecord>;
  accountName: string;
  createdAt: string;
  updatedAt: string;
  /** สถานะบิล — 'OPEN' คือกำลังเก็บเงิน, 'SETTLED' คือครบแล้ว */
  status: 'DRAFT' | 'OPEN' | 'SETTLED' | 'CANCELLED';
  /** โทเคนลิงก์สาธารณะ — ส่งให้เฉพาะเจ้าของบิลเท่านั้น ไม่ส่งไปกับหน้าที่เพื่อนเปิด */
  publicToken?: string;
  /** ผู้ใช้ที่กำลังดูเป็นเจ้าของบิลนี้ไหม (คำนวณฝั่ง server) */
  isCreator?: boolean;
};

/** ผลลัพธ์การคำนวณของคนหนึ่งคน */
export type PersonShare = {
  personId: string;
  name: string;
  /** ยอดอาหารก่อนค่าบริการ/VAT/ส่วนลด */
  subtotal: number;
  service: number;
  vat: number;
  discount: number;
  /** ยอดที่ต้องจ่ายจริง */
  total: number;
  /** รายการที่คนนี้ร่วมจ่าย พร้อมส่วนแบ่ง */
  lines: { itemId: string; itemName: string; amount: number }[];
};

export type SplitResult = {
  shares: PersonShare[];
  byPersonId: Record<string, PersonShare>;
  /** ยอดอาหารรวมทั้งบิล */
  subtotal: number;
  serviceTotal: number;
  vatTotal: number;
  discountTotal: number;
  grandTotal: number;
  /** รายการที่ยังไม่มีใครถูกจับคู่ — เตือนผู้ใช้ว่ายอดยังไม่ครบ */
  unassignedItems: BillItem[];
  unassignedAmount: number;
};

export type DraftBill = Pick<Bill, 'title' | 'people' | 'items' | 'charges'>;
