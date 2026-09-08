# tymai — หารค่าอาหาร + PromptPay QR + ตรวจสลิป

ระบบแชร์ค่าอาหารในกลุ่ม สร้าง PromptPay QR แยกตามยอดของแต่ละคน และตรวจสลิปโอนเงินอัตโนมัติ

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · TypeScript

## เริ่มใช้งาน

```bash
pnpm install
pnpm dev
```

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า:

| ตัวแปร | จำเป็น | คำอธิบาย |
| --- | --- | --- |
| `PROMPTPAY_ID` | ✅ | เบอร์โทร 10 หลัก / เลขบัตรประชาชน 13 หลัก / eWallet 15 หลัก **ห้ามใส่ prefix `NEXT_PUBLIC_`** |
| `ACCOUNT_NAME` | ✅ | ชื่อบัญชีผู้รับเงินที่แสดงบนการ์ด QR |
| `UPSTASH_REDIS_REST_URL` | prod | ที่เก็บบิลที่แชร์ (Vercel KV ใช้ค่าคู่นี้ได้เลย) |
| `UPSTASH_REDIS_REST_TOKEN` | prod | คู่กับด้านบน |

ถ้าไม่ตั้งค่า Upstash ตอน dev ระบบจะ fallback ไปเก็บบิลในไฟล์ `.bill-store.json` ให้อัตโนมัติ
(ตัด fallback นี้ทิ้งบน production — จะ throw error ทันทีถ้า env ไม่ครบ)

## โครงสร้าง (Feature-based)

```
app/                      routing layer อย่างเดียว
  page.tsx                หน้าเจ้าของบิล
  bill/[id]/              หน้าที่เพื่อนเปิดจากลิงก์
  api/promptpay/          สร้าง PromptPay payload ฝั่ง server
  api/bills/              สร้าง / อ่าน / อัปเดตบิล และรับสลิป
src/features/
  bill-split/             จับคู่เมนู↔คนกิน และคำนวณยอด
  qr-generator/           สร้าง QR + โลโก้กลาง + ส่งออกเป็นรูป
  slip-verification/      อ่าน QR บนสลิป + ยืนยัน + checklist
  bill-sharing/           แชร์ลิงก์บิล + poll สถานะ
src/shared/               UI, motion variants, utility ที่ใช้ร่วมกัน
src/server/               KV adapter + bill store (server-only)
```

กติกา: import ข้าม feature ได้เฉพาะผ่าน `index.ts` ของ feature นั้น ห้าม import ลึกเข้าไปในโฟลเดอร์ย่อย

## เรื่องที่ควรรู้ก่อนแก้โค้ด

**เงินเก็บเป็นสตางค์ (integer) ทั้งระบบ** — ดู `src/shared/lib/currency.ts`
การหารใช้ largest-remainder method ทำให้ผลรวมยอดของทุกคน = ยอดบิลเป๊ะเสมอ ไม่มีเศษหาย

**PromptPay ID ไม่เคยออกจาก server** — payload ถูกสร้างที่ `POST /api/promptpay`
ฝั่ง client ได้รับแค่สตริง payload ของยอดนั้นๆ

**โลโก้กลาง QR** — บังคับ error correction level `H` และจำกัดขนาดโลโก้ไว้ที่ ~22% ของด้านกว้าง
เกินกว่านี้แอปธนาคารบางตัวจะสแกนไม่ติด (ดู `MAX_LOGO_RATIO`)

**การตรวจสลิปเป็น "ระดับ A" — กันสลิปซ้ำ ยังไม่ได้เทียบยอด**
QR บนสลิปโอนเงินของไทยบรรจุแค่รหัสธนาคารผู้ส่งกับเลขอ้างอิงธุรกรรม **ไม่มีข้อมูลยอดเงิน**
ระบบจึงทำได้แค่ (1) ปฏิเสธ QR ที่ไม่ใช่สลิป และ (2) กันสลิปใบเดิมถูกใช้ซ้ำทั้งระบบ
ถ้าต้องการยืนยันยอดจริง ให้ต่อ Slip Verification API (EasySlip / SlipOK / SCB)
ที่จุดซึ่งคอมเมนต์ไว้ใน `src/features/slip-verification/lib/verify-slip.server.ts`

**รูปสลิปไม่ถูกอัปโหลดขึ้น server** — อ่าน QR ในเครื่องผู้ใช้ (BarcodeDetector → zxing → jsQR)
แล้วส่งเฉพาะ payload ของ QR ไปตรวจ

## Flow การใช้งาน

1. เจ้าของบิลกรอกเมนู + ติ๊กว่าใครกินอะไร → บิลฉบับร่างอยู่ใน localStorage
2. กด "แชร์บิลนี้" → บิลถูกบันทึกลง KV (อายุ 30 วัน) ได้ลิงก์ `/bill/<id>` + `ownerToken` เก็บในเครื่องเจ้าของ
3. เพื่อนเปิดลิงก์ เลือกชื่อตัวเอง → เห็น QR ที่ใส่ยอดของตัวเองแล้ว → โอน → อัปโหลดสลิป
4. สถานะเด้งกลับไปที่หน้าเจ้าของบิลภายใน 5 วินาที (poll เฉพาะตอนแท็บเปิดอยู่)
5. เจ้าของบิลติ๊ก/ยกเลิกสถานะเองได้ (เช่น เพื่อนจ่ายเงินสด) — ต้องมี `ownerToken`
