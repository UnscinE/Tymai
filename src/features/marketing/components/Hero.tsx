import Link from 'next/link';
import { Button } from '@/shared/components/ui/Button';
import { QRCardMock } from './QRCardMock';

const HIGHLIGHTS = [
  'หารตามรายการที่แต่ละคนกินจริง',
  'QR ใส่ยอดมาให้แล้ว ไม่ต้องพิมพ์เอง',
  'สลิปเข้า ระบบติ๊กให้อัตโนมัติ',
];

/**
 * Server component โดยตั้งใจ — หน้าแรกไม่ควรต้องรอ JS ก่อนถึงจะอ่านได้
 * อนิเมชันทั้งหมดเป็น CSS (class .reveal) ซึ่งค่าตั้งต้นคือมองเห็นปกติอยู่แล้ว
 */
export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* แสงนวลด้านหลัง — ใช้ radial gradient แทนรูป จะได้ไม่มี asset ให้โหลด */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60rem 32rem at 72% -10%, rgba(30,64,175,0.12), transparent 60%),' +
            'radial-gradient(40rem 24rem at 10% 10%, rgba(5,150,105,0.08), transparent 55%)',
        }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <div className="reveal inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            รองรับ PromptPay ทุกธนาคาร
          </div>

          <h1
            className="reveal mt-5 text-4xl leading-[1.15] font-bold tracking-tight text-ink md:text-5xl"
            style={{ animationDelay: '60ms' }}
          >
            หารค่าอาหารจบใน 30 วินาที
            <br />
            <span className="text-brand">ไม่ต้องทวงกันเอง</span>
          </h1>

          <p
            className="reveal mt-4 max-w-lg text-base leading-relaxed text-ink-muted"
            style={{ animationDelay: '120ms' }}
          >
            ใส่รายการอาหาร ติ๊กว่าใครกินอะไร ระบบคำนวณยอดรายคนให้แม่นถึงสตางค์ แล้วสร้าง PromptPay
            QR แยกตามยอดของแต่ละคน ส่งลิงก์ให้เพื่อนจ่ายได้ทันที
          </p>

          <ul className="reveal mt-6 space-y-2" style={{ animationDelay: '180ms' }}>
            {HIGHLIGHTS.map((text) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-ink-muted">
                <CheckMark />
                {text}
              </li>
            ))}
          </ul>

          <div
            className="reveal mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '240ms' }}
          >
            <Link href={isLoggedIn ? '/bills/new' : '/register'}>
              <Button className="h-11 px-6 text-[15px]">
                {isLoggedIn ? 'สร้างบิลใหม่' : 'เริ่มใช้ฟรี'}
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="secondary" className="h-11 px-6 text-[15px]">
                ดูวิธีใช้งาน
              </Button>
            </Link>
          </div>

          <p className="reveal mt-4 text-xs text-ink-faint" style={{ animationDelay: '300ms' }}>
            ใช้ฟรี ไม่มีค่าธรรมเนียม · เงินโอนเข้าบัญชีคุณโดยตรง ระบบไม่ถือเงินแทน
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="reveal relative" style={{ animationDelay: '160ms' }}>
            {/* การ์ดซ้อนด้านหลัง ให้รู้สึกว่ามีหลายใบ = หลายคนในบิลเดียว */}
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-5 translate-y-4 rotate-3 rounded-3xl border border-line bg-surface-alt/70"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-2.5 translate-y-2 rotate-1 rounded-3xl border border-line bg-white/80"
            />
            <QRCardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckMark() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
