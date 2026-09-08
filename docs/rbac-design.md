# tymai — แผนขยายเป็น Web App เต็มรูปแบบ (Auth + RBAC)

เอกสารนี้ครอบคลุม: โครงสร้างโฟลเดอร์, UX flow, และโค้ด middleware สำหรับ Route Protection
ส่วน Database schema อยู่ที่ [`prisma/schema.prisma`](../prisma/schema.prisma)

---

## 0. ข้อสรุปเรื่อง Role ที่ต้องอ่านก่อน

โจทย์ระบุ 3 roles: Creator / Payer / Admin — แต่ **สองตัวแรกไม่ควรเป็น role ระดับผู้ใช้**

คนเดียวกันวันนี้เป็นคนจ่ายบิลหมูกระทะ พรุ่งนี้เป็นคนสร้างบิลชาบู ถ้าเก็บ `role = CREATOR`
ไว้บน `User` ผู้ใช้จะติดอยู่ในบทบาทเดียว ต้องมีปุ่มสลับ role หรือสมัครสองบัญชี ซึ่งพังทั้ง UX
และทำให้ query ประวัติยุ่งยาก

**โมเดลที่ใช้แทน:**

| ระดับ | เก็บที่ไหน | ใช้ตัดสินอะไร | ตรวจที่ไหน |
| --- | --- | --- | --- |
| **Global role** `USER` / `ADMIN` | `User.role` (อยู่ใน JWT) | เข้า `/admin` ได้ไหม | **proxy.ts** (edge, เร็ว) |
| **Creator ของบิลใบนี้** | `Bill.creatorId` | แก้บิล / ดู checklist / ติ๊กสถานะ | **server guard** (ต้อง query DB) |
| **Payer ของบิลใบนี้** | `BillParticipant.userId` | เห็นยอดตัวเอง / อัปโหลดสลิป | **server guard** |

ผลลัพธ์ที่ผู้ใช้เห็นยังตรงตามโจทย์ทุกอย่าง — Dashboard แยกส่วน "บิลที่ฉันสร้าง" กับ
"บิลที่ฉันต้องจ่าย" ชัดเจน และ `/admin` เข้าไม่ได้ถ้าไม่ใช่แอดมิน — แต่ผู้ใช้ไม่ต้องเลือกว่า
ตัวเองเป็นใครตอนสมัคร

### ข้อจำกัดทางเทคนิคที่กำหนดสถาปัตยกรรมนี้

> **proxy.ts (เดิมชื่อ middleware.ts) รันบน Edge Runtime — Prisma query ไม่ได้**

แปลว่า middleware ตรวจได้แค่สิ่งที่อยู่ใน JWT (มี session ไหม, role อะไร) เท่านั้น
คำถามอย่าง "คนนี้เป็นเจ้าของบิล `abc123` หรือเปล่า" **ต้องตรวจในหน้า/route handler เสมอ**

นี่คือจุดที่พลาดกันบ่อยที่สุด: เขียน middleware เช็ค role แล้วคิดว่าปลอดภัยแล้ว
ทั้งที่ผู้ใช้ธรรมดาคนหนึ่งยิง `PATCH /api/bills/<id ของคนอื่น>` ได้ตรงๆ
**middleware = ประตูหน้าบ้าน / server guard = กุญแจห้องแต่ละห้อง ต้องมีทั้งคู่**

---

## 1. โครงสร้างโฟลเดอร์ (App Router)

```
app/
├─ layout.tsx                        root: font, design token, providers
├─ (marketing)/                      ── สาธารณะ ─────────────────────────
│  ├─ layout.tsx                     nav แบบ public + footer
│  ├─ page.tsx                       Landing Page
│  ├─ pricing/page.tsx
│  ├─ privacy/page.tsx
│  └─ terms/page.tsx
│
├─ (auth)/                           ── เข้าสู่ระบบ ──────────────────────
│  ├─ layout.tsx                     layout กลางจอ ไม่มี nav
│  ├─ login/page.tsx
│  ├─ register/page.tsx
│  ├─ verify-request/page.tsx
│  └─ auth-error/page.tsx
│
├─ (app)/                            ── ต้อง login ─────────────────────
│  ├─ layout.tsx                     sidebar shell + requireUser()
│  ├─ dashboard/page.tsx             2 ส่วน: บิลที่ฉันสร้าง / บิลที่ฉันต้องจ่าย
│  ├─ bills/
│  │  ├─ new/page.tsx                สร้างบิล (เลือกเพื่อนจาก friend list)
│  │  └─ [billId]/
│  │     ├─ page.tsx                 รายละเอียด — ผู้ร่วมบิลทุกคนเข้าได้
│  │     ├─ manage/page.tsx          checklist + ติ๊กสถานะ — creator เท่านั้น
│  │     └─ pay/page.tsx             QR + อัปโหลดสลิป — participant เท่านั้น
│  ├─ friends/
│  │  ├─ page.tsx                    รายชื่อเพื่อน + ค้นหา
│  │  └─ requests/page.tsx           คำขอเข้า/ออก
│  ├─ history/page.tsx               filter: created / to-pay / settled
│  └─ settings/page.tsx              โปรไฟล์ + เลข PromptPay ของตัวเอง
│
├─ (admin)/                          ── ADMIN เท่านั้น ──────────────────
│  └─ admin/
│     ├─ layout.tsx                  requireAdmin() — ชั้นที่สองหลัง middleware
│     ├─ page.tsx                    Overview: DAU, บิล, ยอดรวม, สลิปที่ถูกปฏิเสธ
│     ├─ users/page.tsx              ค้นหา / ระงับ / คืนสิทธิ์ผู้ใช้
│     ├─ bills/page.tsx              บิลทั้งระบบ
│     └─ audit/page.tsx              AuditLog สำหรับข้อพิพาท
│
├─ b/[token]/page.tsx                ลิงก์สาธารณะ — เพื่อนจ่ายได้โดยไม่ต้อง login
│                                    (คงพฤติกรรมเดิมของ /bill/[id] ไว้)
├─ api/
│  ├─ auth/[...nextauth]/route.ts
│  ├─ promptpay/route.ts             (เดิม)
│  ├─ bills/…                        (เดิม — ย้าย store จาก KV ไป Prisma)
│  ├─ friends/…
│  └─ admin/…                        ทุก route เรียก requireAdmin() ในตัวเอง
│
└─ proxy.ts                          ← อยู่ที่ root ของโปรเจกต์จริงๆ (นอก app/)
                                     Next 16 เปลี่ยนชื่อจาก middleware.ts มาเป็นชื่อนี้

src/
├─ features/
│  ├─ auth/                          ฟอร์ม login/register, provider buttons
│  ├─ marketing/                     Hero, HowItWorks, Features, CTA
│  ├─ friends/                       ค้นหา, การ์ดเพื่อน, คำขอ
│  ├─ bill-split/                    ★ เดิม
│  ├─ qr-generator/                  ★ เดิม
│  ├─ slip-verification/             ★ เดิม
│  ├─ bill-sharing/                  ★ เดิม (เปลี่ยนไปยิง Prisma แทน KV)
│  ├─ bill-history/                  ตาราง + filter
│  └─ admin/                         stat card, user table, audit table
├─ server/
│  ├─ db.ts                          Prisma client singleton (lazy)
│  ├─ auth/
│  │  ├─ auth.config.ts              ★ edge-safe (ไม่มี Prisma) — middleware ใช้ตัวนี้
│  │  └─ index.ts                    ตัวเต็ม: adapter + credentials provider
│  ├─ guards.ts                      requireUser / requireAdmin / requireBillCreator
│  └─ services/                      bill-service, friend-service, audit-service
└─ shared/                           ★ เดิม
```

**ทำไมต้อง route group `( )`** — วงเล็บทำให้ชื่อกลุ่มไม่โผล่ใน URL
`/dashboard` ไม่ใช่ `/app/dashboard` แต่ยังแยก `layout.tsx` ได้คนละอัน
เอาไว้ครอบ shell คนละแบบ (marketing มี nav สาธารณะ, app มี sidebar, auth ไม่มีอะไรเลย)

---

## 2. UX / UI Flow

### 2.1 Landing → สมัคร → สร้างบิลแรก

```
[ / ]  Landing Page
  Hero: "หารค่าอาหารจบใน 30 วินาที ไม่ต้องทวงกันเอง"
        + ภาพ QR การ์ดจริงของแอป + ปุ่ม [เริ่มใช้ฟรี] [ดูตัวอย่างบิล]
  How it works: 1 ใส่รายการ → 2 ติ๊กว่าใครกินอะไร → 3 ส่งลิงก์ → 4 สลิปเข้า ระบบติ๊กเอง
  Trust section: "ไม่เก็บรูปสลิปขึ้นเซิร์ฟเวอร์" / "เลข PromptPay เข้ารหัส" / "กันสลิปซ้ำ"
  CTA ล่าง: [เริ่มใช้ฟรี]
         │
         ▼  กด "เริ่มใช้ฟรี"
[ /register ]  ปุ่ม Google เด่นที่สุด + ฟอร์ม email/password ด้านล่าง
         │     สมัครเสร็จ → onboarding 1 ขั้น: "ใส่เลข PromptPay ของคุณ" (ข้ามได้)
         ▼
[ /dashboard ]  ว่างเปล่าครั้งแรก → empty state ปุ่มเดียว [+ สร้างบิลแรก]
```

### 2.2 สร้างบิล (Creator)

```
[ /bills/new ]
  Step 1  ชื่อบิล + วันที่
  Step 2  เลือกคนหาร
          ├─ แท็บ "เพื่อนของฉัน"  ← กดจาก friend list ทีเดียวจบ (เร็วสุด)
          ├─ แท็บ "ค้นหา"        ← username / email / เบอร์ → กดเพิ่มเพื่อนไปด้วยเลย
          └─ แท็บ "ใส่ชื่อเอง"    ← เพื่อนที่ไม่มีบัญชี (userId = null)
  Step 3  รายการอาหาร + ติ๊กว่าใครกินอะไร   ← หน้าจอเดิมที่ทำไว้แล้ว
  Step 4  ค่าบริการ / VAT / ส่วนลด → ตรวจยอดสรุปรายคน
          │
          ▼  กด [ยืนยันและส่งเก็บเงิน]
     bill.status: DRAFT → OPEN
     ยอดของทุกคนถูกแช่แข็งลง BillParticipant.amountDueSatang
     ส่ง notification ให้เพื่อนที่มีบัญชี + ได้ลิงก์สาธารณะสำหรับคนที่ไม่มี
```

> **จุดที่ต้องระวัง:** หลัง `OPEN` แล้วห้ามแก้ยอด ถ้าจะแก้ต้องยกเลิกบิลแล้วสร้างใหม่
> ไม่งั้นคนที่จ่ายไปแล้วจะเจอยอดเปลี่ยนหลังโอน (ปัญหาเดียวกับที่ระบบ KV เดิมเจอ
> ตอนแก้ draft หลังแชร์ ซึ่งตอนนี้แก้ด้วยการเตือนให้สร้างลิงก์ใหม่)

### 2.3 จ่ายเงิน (Payer)

```
คนมีบัญชี:  แจ้งเตือน → [ /dashboard ] การ์ด "บิลที่ต้องชำระ (2)"
                        → [ /bills/<id>/pay ] QR ใส่ยอดมาแล้ว
คนไม่มีบัญชี: ลิงก์ทางไลน์ → [ /b/<token>?p=<claimToken> ] เจอยอดตัวเองทันที ไม่ต้อง login
                        │
                        ▼  สแกนจ่าย → [อัปโหลดสลิป]
        อ่าน QR ในเครื่องผู้ใช้ (BarcodeDetector → zxing → jsQR)
                        │
                        ▼  ส่งเฉพาะ payload ขึ้น server
        ตรวจ: เป็นสลิปจริงไหม + fingerprint นี้เคยถูกใช้หรือยัง
                        │
              ┌─────────┴─────────┐
           ผ่าน                 ไม่ผ่าน
    participant → PAID      แสดงเหตุผล + ปุ่มลองใหม่
    บันทึก Payment          (duplicate / not-a-slip / no-qr)
    ถ้าครบทุกคน bill → SETTLED
```

### 2.4 แอดมิน

```
[ /admin ]        การ์ดสรุป: ผู้ใช้ใหม่ 7 วัน, บิล OPEN, ยอดค้างรวม, สลิปถูกปฏิเสธ
[ /admin/users ]  ค้นหา → ดูบิลของคนนั้น → ระงับ/คืนสิทธิ์ (เขียน AuditLog ทุกครั้ง)
[ /admin/bills ]  filter ตามสถานะ/ช่วงเวลา → เปิดดูบิลใดก็ได้
[ /admin/audit ]  ไทม์ไลน์ทุก action ที่เปลี่ยนสถานะเงิน — ใช้ตอนมีข้อพิพาท
```

---

## 3. Route Protection — ทำจริงแล้ว

โค้ดอยู่ในโปรเจกต์แล้ว ไม่ต้องคัดลอกจากเอกสาร:

| ไฟล์ | หน้าที่ |
| --- | --- |
| [`proxy.ts`](../proxy.ts) | ประตูหน้าบ้าน (Edge) — เช็ค session + role อย่างเดียว |
| [`src/server/auth/auth.config.ts`](../src/server/auth/auth.config.ts) | config ที่ edge รันได้ ไม่แตะ Prisma/bcrypt |
| [`src/server/auth/index.ts`](../src/server/auth/index.ts) | Auth.js ตัวเต็ม: Prisma adapter + credentials |
| [`src/server/guards.ts`](../src/server/guards.ts) | กุญแจแต่ละห้อง — `requireUser` / `requireAdmin` / `requireBillCreator` / `requireBillParticipant` |
| [`src/types/next-auth.d.ts`](../src/types/next-auth.d.ts) | ขยาย type ของ Session/User ให้มี role/status |

### เรื่องที่เจอตอนลงมือจริง (ต่างจากที่วางแผนไว้)

**1. Next.js 16 เปลี่ยนชื่อ `middleware.ts` เป็น `proxy.ts`**
ใช้ `middleware.ts` ต่อได้แต่ขึ้น deprecation warning ทุกครั้งที่ build
ไฟล์ในโปรเจกต์จึงชื่อ `proxy.ts` — เนื้อหาและ `export const config = { matcher }` เหมือนเดิมทุกอย่าง

**2. `declare module 'next-auth/jwt'` ไม่ทำงาน**
`next-auth/jwt` เป็นแค่ `export * from '@auth/core/jwt'` การ augment มันจึงสร้าง module ใหม่
แทนที่จะ merge เข้ากับ `interface JWT` ตัวจริง (และ pnpm ก็ไม่ hoist `@auth/core` ขึ้น top-level
ให้ augment ตรงๆ ได้) จึงประกาศ `type AppToken` เองใน `auth.config.ts` แล้ว cast ที่ขอบ callback
ชัดเจนกว่าและไม่ต้องพึ่งพฤติกรรมการ hoist ของ package manager

**3. Prisma 7 ไม่รับ `url` ใน schema แล้ว**
- connection ตอน migrate → [`prisma.config.ts`](../prisma.config.ts) อ่าน `DIRECT_URL`
- connection ตอน runtime → driver adapter (`@prisma/adapter-pg`) ใน [`src/server/db.ts`](../src/server/db.ts) อ่าน `DATABASE_URL`

**4. Prisma client ต้องสร้างแบบ lazy**
`next build` จะ import ทุก route เพื่อเก็บ config ถ้าสร้าง client ตอน import ทันที
build จะพังทั้งกระบวนบนเครื่อง CI ที่ไม่มี `DATABASE_URL` — `db.ts` จึงห่อด้วย Proxy
แล้วสร้าง client ตอนมีคนเรียกใช้ครั้งแรกเท่านั้น

### ผลการทดสอบ Route Protection

ทดสอบด้วย session cookie จริงที่ sign ด้วย `AUTH_SECRET` ของโปรเจกต์:

| สถานะผู้ใช้ | เส้นทาง | ผลลัพธ์ |
| --- | --- | --- |
| ไม่ได้ login | `/dashboard` | 307 → `/login?callbackUrl=%2Fdashboard` |
| ไม่ได้ login | `/admin` | 307 → `/login?callbackUrl=%2Fadmin` |
| ไม่ได้ login | `/api/admin/x` | 401 JSON |
| ไม่ได้ login | `/`, `/login`, `/bill/<id>`, `/api/promptpay` | ผ่าน |
| `role=USER` | `/admin` | 307 → `/forbidden` |
| `role=USER` | `/api/admin/x` | 403 JSON |
| `role=USER` | `/login` | 307 → `/dashboard` |
| `role=ADMIN` | `/admin` | ผ่านด่าน (404 เพราะยังไม่ได้สร้างหน้า) |
| `status=SUSPENDED` | ทุกหน้า | 307 → `/suspended` |
| `status=SUSPENDED` | `/api/admin/x` | 403 JSON |

## 4. ลำดับการทำ (แนะนำ)

| เฟส | งาน | ทำไมต้องลำดับนี้ |
| --- | --- | --- |
| 1 ✅ | Prisma + Postgres + migrate | ทุกอย่างต่อจากนี้ต้องมี DB ก่อน |
| 2 ✅ | Auth.js + `/login` `/register` + proxy.ts | ได้ `session.user.id` มาใช้เป็น foreign key |
| 3 ✅ | ย้าย bill store จาก KV → Prisma | ใช้ session + `Bill.creatorId` แทน `ownerToken` ใน localStorage |
| 4 ✅ | Dashboard + History | มีข้อมูลใน DB แล้วค่อยทำหน้าอ่าน |
| 5 ✅ | Friend system | ต่อยอดจาก User ที่มีอยู่แล้ว |
| 6 ✅ | Landing Page | ทำท้ายสุดได้ เพราะไม่มีอะไรพึ่งมัน |
| 7 ✅ | Admin + AuditLog | ต้องมีข้อมูลจริงก่อนถึงจะออกแบบหน้ารวมได้ตรงจุด |

**เฟส 3 ทำเสร็จแล้ว** — ชั้น KV ถูกลบทิ้งทั้งหมด (`src/server/kv.ts`, `src/server/bill-store.ts`
และ dependency `@upstash/redis`) เพราะยังไม่เคยตั้งค่า Upstash จริง จึงไม่มีข้อมูล production ให้ย้าย
ตัดตรงๆ ได้เลยโดยไม่ต้องรองรับสองแบบคู่กัน

สิ่งที่เปลี่ยนไป:
- สิทธิ์เจ้าของบิล: `ownerToken` ใน localStorage → session + `Bill.creatorId`
- กันสลิปซ้ำ: `SET NX` บน KV → unique constraint บน `Payment.slipFingerprint`
- ลิงก์สาธารณะ: `/bill/<id>` → `/b/<publicToken>` (โทเคนแยกจาก id เพิกถอนได้)
- หน้าสร้างบิล: `/` → `/bills/new` (ต้อง login) ที่ `/` กลายเป็น Landing page

**เฟส 4 + 5 ทำเสร็จแล้ว**

- ระบบเพื่อน: ค้นหาแบบตรงเป๊ะเท่านั้น (อีเมล / username / เบอร์โทร) ผลลัพธ์คืนแค่
  id / ชื่อ / รูป / username — ไม่คืนอีเมลหรือเบอร์กลับไป
- `filterLinkableUserIds()` กรอง userId ที่ client ส่งมาตอนสร้างบิล ให้เหลือเฉพาะ
  เพื่อนจริงหรือตัวเราเอง ถ้าไม่กรอง ผู้ใช้จะยัด userId ของใครก็ได้ ทำให้บิลไปโผล่
  ในหน้า "บิลที่ต้องชำระ" ของคนแปลกหน้า — เป็นช่องทางสแปมและหลอกให้โอนเงิน
  (ทดสอบแล้ว: ยัด userId มั่วเข้าไป participant นั้นถูกบันทึกเป็น `userId = null`)
- หน้า `/bills/[id]/pay` ที่เฟส 3 ยังเข้าไม่ได้ ตอนนี้ใช้งานได้จริงแล้ว
- `/settings` เพิ่มเข้ามาเพราะระบบค้นหาเพื่อนต้องมี username/เบอร์ให้ค้น
  ตอนสมัครสมาชิกเก็บแค่ชื่อกับอีเมล

**เฟส 7 + PromptPay รายคน ทำเสร็จแล้ว**

- `src/server/crypto.ts` เข้ารหัส AES-256-GCM (มี auth tag จึงตรวจจับได้ถ้ามีคนแก้ ciphertext
  ในฐานข้อมูลตรงๆ) ใช้กับ `User.promptPayIdEnc` และ `Bill.payeeIdEnc`
- หน้าแอดมินไม่มีทางเห็นเลข PromptPay ของใครเลย — `listUsers()` คืนแค่ `hasPayee: boolean`
- ป้องกันแอดมินล็อกตัวเองออก: ระงับบัญชีตัวเองไม่ได้ เปลี่ยนสิทธิ์ตัวเองไม่ได้
  และถอดแอดมินคนสุดท้ายไม่ได้

**บทเรียนจากการทดสอบ (2):** หลังทำ guard ให้ตรวจสถานะกับ DB เกิด redirect loop
เมื่อแอดมินระงับบัญชีระหว่างที่ผู้ใช้ยัง login อยู่ — guard เห็น DB บอกว่าถูกระงับจึงส่งไป `/login`
แต่ proxy.ts เห็น JWT ที่ยังบอกว่า ACTIVE จึงเด้งกลับ `/dashboard` วนไม่จบ
แก้โดยให้ `resolveUser()` แยก `suspended` ออกจาก `anonymous` แล้วส่งไป `/suspended` แทน

**บทเรียนจากการทดสอบ:** `requireUser()` เดิมเชื่อ JWT อย่างเดียว ทำให้บัญชีที่ถูกลบ
หรือถูกระงับยังเข้าระบบได้จนกว่า token อายุ 30 วันจะหมด แก้แล้วโดยให้ guard
ตรวจสถานะกับฐานข้อมูลทุกครั้ง ส่วน `proxy.ts` ยังอ่านแค่ token เพื่อความเร็วบน Edge

---

## 5. เรื่องความปลอดภัยที่ต้องไม่ลืม

- **เลข PromptPay ต้องเข้ารหัสก่อนเก็บ** (`promptPayIdEnc`) — เป็นเบอร์โทร/เลขบัตร ปชช.
  ถ้า DB รั่วแล้วเก็บเป็น plaintext คือรั่วข้อมูลส่วนบุคคลตาม PDPA ใช้ AES-256-GCM
  โดยเก็บ key ไว้ใน env แยกจาก DB
- **ค้นหาเพื่อนต้อง exact match เท่านั้น** — ห้ามทำ `contains` บน email/เบอร์
  ไม่งั้นจะกลายเป็นเครื่องมือไล่เก็บเบอร์โทรผู้ใช้ทั้งระบบ
- **ผลการค้นหาคืนเฉพาะ id / displayName / รูป** ห้ามคืน email หรือเบอร์กลับไป
- **rate limit** หน้าค้นหาเพื่อนและ endpoint อัปโหลดสลิป
- **`slipFingerprint` unique ทั้งตาราง** ไม่ใช่ unique ต่อบิล — สลิปใบเดียวใช้ได้ครั้งเดียว
  ทั้งระบบ นี่คือหัวใจของการกันโกงระดับ A
- **`/admin` ต้องมีสองด่าน** — middleware (เร็ว, ครอบทุก request) + `requireAdmin()`
  ในหน้าและใน API ทุกตัว middleware ตัวเดียวไม่พอถ้ามีใครลืมใส่ path ใน matcher
