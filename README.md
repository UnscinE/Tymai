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
| `ENCRYPTION_KEY` | ✅ | base64 ของ 32 ไบต์ ใช้เข้ารหัสเลข PromptPay สร้างด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PROMPTPAY_ID` / `ACCOUNT_NAME` | – | เหลือไว้เป็น fallback ของบิลเก่าเท่านั้น ผู้ใช้ใหม่ตั้งเลขเองที่ `/settings` |
| `DATABASE_URL` | ✅ | Supabase pooler (port 6543) ใช้ตอน runtime |
| `DIRECT_URL` | ✅ | Supabase session pooler (port 5432) ใช้ตอน migrate |
| `AUTH_SECRET` | ✅ | สร้างด้วย `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | – | เว้นว่างได้ ระบบจะใช้ email/password อย่างเดียว |

### ตั้งค่า Supabase + Auth (เฟส 1–2)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) แล้วไปที่ **Project Settings → Database → Connection string**
   คัดลอกมาใส่ `.env.local` สองค่า:

   ```
   DATABASE_URL=  # Transaction pooler  port 6543  → ใช้ตอน runtime
   DIRECT_URL=    # Direct connection    port 5432  → ใช้ตอน migrate เท่านั้น
   ```

   > **สองข้อที่ทำให้ต่อไม่ติดตอนตั้งค่าครั้งแรก**
   >
   > 1. **อย่าใช้ `db.<ref>.supabase.co` เป็น `DIRECT_URL`** — โฮสต์นี้ resolve เป็น IPv6 อย่างเดียว
   >    เครือข่ายบ้าน/ออฟฟิศส่วนใหญ่ในไทยเป็น IPv4 จะได้ `P1001: Can't reach database server`
   >    ให้ใช้ **Session pooler** แทน: โฮสต์เดียวกับ pooler แต่ **port 5432**
   >    (`aws-0-<region>.pooler.supabase.com:5432`) ซึ่งเป็น IPv4 และรองรับ migration
   > 2. **ถอดวงเล็บเหลี่ยมรอบรหัสผ่านออก** — Supabase ให้ template มาเป็น `:[YOUR-PASSWORD]@`
   >    ถ้าลืมลบ `[` `]` จะได้ `P1000: Authentication failed`

   สรุปค่าที่ใช้จริง: ทั้งสองตัวชี้ที่โฮสต์ `pooler.supabase.com` ต่างกันแค่ port
   (6543 = transaction mode สำหรับ runtime, 5432 = session mode สำหรับ migrate)
   ห้ามใช้ port 6543 กับ migrate เพราะ pgbouncer transaction mode ไม่รองรับ prepared statement

2. สร้าง `AUTH_SECRET`:

   ```bash
   npx auth secret
   ```

3. (ถ้าจะใช้ Google login) สร้าง OAuth client ที่ Google Cloud Console
   ตั้ง redirect URI เป็น `http://localhost:3000/api/auth/callback/google`
   แล้วใส่ `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
   ถ้าเว้นว่างไว้ ระบบยังใช้ email/password ได้ตามปกติ

4. สร้างตารางใน DB:

   ```bash
   pnpm prisma migrate dev --name init
   ```

5. ตั้งแอดมินคนแรก (Prisma Studio ใช้ `DIRECT_URL` ผ่าน prisma.config.ts):

   ```bash
   pnpm prisma studio
   ```

   เปิดตาราง `User` แล้วเปลี่ยน `role` ของบัญชีตัวเองเป็น `ADMIN`

### สิทธิ์การเข้าถึง (RBAC)

`role` ระดับผู้ใช้มีแค่ `USER` กับ `ADMIN`
ส่วน "คนสร้างบิล" / "คนจ่าย" เป็นความสัมพันธ์ต่อบิลแต่ละใบ ไม่ใช่ role ของคน
เหตุผลและรายละเอียดทั้งหมดอยู่ใน [docs/rbac-design.md](docs/rbac-design.md)

| ด่าน | ไฟล์ | ตรวจอะไร |
| --- | --- | --- |
| ประตูหน้าบ้าน (Edge) | `proxy.ts` | login แล้วหรือยัง / role เป็น ADMIN ไหม |
| กุญแจแต่ละห้อง | `src/server/guards.ts` | บิลใบนี้เป็นของใคร (ต้อง query DB) |

**ทั้งสองด่านต้องมีคู่กัน** — `proxy.ts` รันบน Edge ซึ่ง Prisma query ไม่ได้
จึงตอบคำถามระดับ "คนนี้เป็นเจ้าของบิล abc123 ไหม" แทนไม่ได้

## โครงสร้าง (Feature-based)

```
app/
  (marketing)/            หน้าสาธารณะ — Landing page
  (auth)/                 login / register
  (app)/                  ต้อง login — dashboard, bills, friends, history, settings
  (admin)/                ADMIN เท่านั้น — ภาพรวม, ผู้ใช้, บิลทั้งระบบ, audit log
  b/[token]/              ลิงก์บิลสาธารณะ เพื่อนเปิดจ่ายได้โดยไม่ต้องสมัคร
  api/promptpay/          สร้าง PromptPay payload ฝั่ง server
  api/bills/              สร้าง / อ่าน / อัปเดตบิล และรับสลิป (ต้อง login)
  api/public/bills/       เวอร์ชันสาธารณะ สิทธิ์มาจากโทเคนในลิงก์
proxy.ts                  ประตูหน้าบ้าน (Edge) — Next 16 เปลี่ยนชื่อจาก middleware.ts
src/features/
  marketing/              section ของ Landing page
  auth/                   ฟอร์ม login / register
  friends/                ค้นหา/เพิ่มเพื่อน + ตัวเลือกเพื่อนตอนสร้างบิล
  bill-history/           ตารางประวัติ + filter
  admin/                  ตารางผู้ใช้ + audit log
  bill-split/             จับคู่เมนู↔คนกิน และคำนวณยอด
  qr-generator/           สร้าง QR + โลโก้กลาง + ส่งออกเป็นรูป
  slip-verification/      อ่าน QR บนสลิป + ยืนยัน + checklist
  bill-sharing/           สร้างบิลบน server + poll สถานะ
src/shared/               UI, motion variants, utility ที่ใช้ร่วมกัน
src/server/               db, auth, guards, crypto, services (server-only)
prisma/schema.prisma      โครงฐานข้อมูล
```

กติกา: import ข้าม feature ได้เฉพาะผ่าน `index.ts` ของ feature นั้น ห้าม import ลึกเข้าไปในโฟลเดอร์ย่อย

## เรื่องที่ควรรู้ก่อนแก้โค้ด

**เงินเก็บเป็นสตางค์ (integer) ทั้งระบบ** — ดู `src/shared/lib/currency.ts`
การหารใช้ largest-remainder method ทำให้ผลรวมยอดของทุกคน = ยอดบิลเป๊ะเสมอ ไม่มีเศษหาย

**เลข PromptPay เก็บรายคนและเข้ารหัสไว้** — อยู่ที่ `User.promptPayIdEnc` (AES-256-GCM)
client ไม่เคยเห็นเลขเต็ม แม้แต่หน้าตั้งค่าก็แสดงแค่ 4 หลักท้าย และหน้าแอดมินบอกได้แค่ว่า
"ตั้งแล้ว/ยังไม่ตั้ง" — ไม่มีโค้ดที่ไหนถอดรหัสให้แอดมินดู

**บิลเก็บ snapshot ของบัญชีรับเงิน** — `Bill.payeeIdEnc` ถูกบันทึกตอนสร้างบิล
ถ้าผู้สร้างเปลี่ยนเลข PromptPay ทีหลัง บิลเก่าที่ยังเก็บเงินไม่ครบต้องยังชี้ไปบัญชีเดิม
ที่เพื่อนโอนไปแล้ว

**ยอดใน QR คำนวณฝั่ง server เสมอ** — endpoint รับแค่ `personId` ไม่รับยอด
ไม่งั้นผู้ใช้แก้ยอดในคำขอเพื่อสร้าง QR ที่จ่ายน้อยกว่าจริงได้

**โลโก้กลาง QR** — บังคับ error correction level `H` และจำกัดขนาดโลโก้ไว้ที่ ~22% ของด้านกว้าง
เกินกว่านี้แอปธนาคารบางตัวจะสแกนไม่ติด (ดู `MAX_LOGO_RATIO`)

**การตรวจสลิปเป็น "ระดับ A" — กันสลิปซ้ำ ยังไม่ได้เทียบยอด**
QR บนสลิปโอนเงินของไทยบรรจุแค่รหัสธนาคารผู้ส่งกับเลขอ้างอิงธุรกรรม **ไม่มีข้อมูลยอดเงิน**
ระบบจึงทำได้แค่ (1) ปฏิเสธ QR ที่ไม่ใช่สลิป และ (2) กันสลิปใบเดิมถูกใช้ซ้ำทั้งระบบ
ถ้าต้องการยืนยันยอดจริง ให้ต่อ Slip Verification API (EasySlip / SlipOK / SCB)
ที่จุดซึ่งคอมเมนต์ไว้ใน `src/features/slip-verification/lib/verify-slip.server.ts`

**บิลที่สร้างแล้วแก้ยอดไม่ได้** — ยอดถูกแช่แข็งตอนกดสร้าง
ถ้าต้องแก้ต้องสร้างบิลใหม่ ไม่งั้นคนที่โอนไปแล้วจะเจอยอดเปลี่ยนหลังจ่าย

**กันสลิปซ้ำด้วย unique constraint ไม่ใช่โค้ดเช็คก่อนเขียน** — `Payment.slipFingerprint`
เป็น unique ทั้งตาราง ให้ฐานข้อมูลเป็นคนตัดสินว่าใครถึงก่อน
ถ้าเช็คในโค้ดก่อน insert สองรีเควสต์ที่มาพร้อมกันจะผ่านการเช็คทั้งคู่

**รูปสลิปไม่ถูกอัปโหลดขึ้น server** — อ่าน QR ในเครื่องผู้ใช้ (BarcodeDetector → zxing → jsQR)
แล้วส่งเฉพาะ payload ของ QR ไปตรวจ

## Flow การใช้งาน

1. เจ้าของบิล login แล้วกรอกเมนู + ติ๊กว่าใครกินอะไรที่ `/bills/new`
   (ฉบับร่างยังอยู่ใน localStorage เพื่อให้ปิดแท็บแล้วกลับมาทำต่อได้)
2. กด "สร้างบิลและเก็บเงิน" → บันทึกลง Postgres ผูกกับ `Bill.creatorId`
   **ยอดของทุกคนถูกแช่แข็งลง `BillParticipant.amountDueSatang` ทันที** แก้ทีหลังไม่ได้
3. เจ้าของบิลคัดลอกลิงก์ `/b/<publicToken>` ส่งให้เพื่อน
4. เพื่อนเปิดลิงก์ เลือกชื่อตัวเอง → เห็น QR ที่ใส่ยอดของตัวเองแล้ว → โอน → อัปโหลดสลิป
   (ไม่ต้องสมัครสมาชิก สิทธิ์มาจากการถือโทเคนในลิงก์)
5. สถานะเด้งกลับไปที่หน้าเจ้าของบิลภายใน 5 วินาที (poll เฉพาะตอนแท็บเปิดอยู่)
   ครบทุกคนเมื่อไหร่ บิลเปลี่ยนเป็น `SETTLED` อัตโนมัติ
6. เจ้าของบิลติ๊ก/ยกเลิกสถานะเองได้ (เช่น เพื่อนจ่ายเงินสด) — สิทธิ์มาจาก session ไม่ใช่โทเคนในเครื่อง
