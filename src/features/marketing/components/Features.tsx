import type { ReactNode } from 'react';
import { SectionHeading } from './HowItWorks';

const FEATURES = [
  {
    icon: <IconSplit />,
    title: 'หารตามรายการจริง',
    detail:
      'เมนูไหนใครกินก็ติ๊กคนนั้น ระบบใช้วิธี largest-remainder ทำให้ยอดของทุกคนรวมกันเท่ากับบิลเป๊ะ ไม่มีเศษสตางค์หาย',
  },
  {
    icon: <IconQR />,
    title: 'QR ใส่ยอดมาให้แล้ว',
    detail:
      'สร้าง PromptPay QR แยกตามยอดของแต่ละคน แปะโลโก้กลาง QR ได้ และบันทึกเป็นรูปส่งต่อทางไลน์ได้เลย',
  },
  {
    icon: <IconSlip />,
    title: 'ตรวจสลิปอัตโนมัติ',
    detail:
      'เพื่อนอัปโหลดสลิป ระบบอ่าน QR บนสลิปแล้วติ๊กสถานะให้เอง พร้อมกันสลิปใบเดิมถูกส่งซ้ำหรือส่งต่อกันในกลุ่ม',
  },
  {
    icon: <IconChecklist />,
    title: 'เห็นสถานะทุกคนที่เดียว',
    detail:
      'ใครจ่ายแล้ว ใครยังค้าง เห็นครบในหน้าเดียว อัปเดตให้อัตโนมัติภายใน 5 วินาทีเมื่อมีสลิปเข้า',
  },
  {
    icon: <IconLink />,
    title: 'เพื่อนไม่ต้องสมัคร',
    detail:
      'ส่งลิงก์เดียวให้ในกลุ่ม เพื่อนเปิดมาเลือกชื่อตัวเอง เจอยอดกับ QR ทันที ไม่ต้องโหลดแอปอะไรเพิ่ม',
  },
  {
    icon: <IconHistory />,
    title: 'ย้อนดูได้ทุกบิล',
    detail:
      'บิลทุกใบผูกกับบัญชีคุณ เปิดจากเครื่องไหนก็เห็น ย้อนดูได้ว่าครั้งนั้นใครจ่ายเท่าไหร่ ตอนไหน',
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
      <SectionHeading
        eyebrow="ความสามารถ"
        title="ทำเรื่องเงินระหว่างเพื่อนให้จบแบบไม่ต้องเกรงใจกัน"
        description="ทุกอย่างออกแบบมาให้คนเก็บเงินไม่ต้องทวง และคนจ่ายไม่ต้องถามว่าเท่าไหร่"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <article
            key={feature.title}
            className="reveal-on-scroll rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lifted"
            style={{ animationDelay: `${(i % 3) * 60}ms` }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              {feature.icon}
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconSplit() {
  return (
    <Svg>
      <path d="M4 6h7M4 12h7M4 18h7" />
      <circle cx={17} cy={6} r={2} />
      <circle cx={17} cy={18} r={2} />
      <path d="M17 8v8" />
    </Svg>
  );
}
function IconQR() {
  return (
    <Svg>
      <rect x={3} y={3} width={7} height={7} rx={1.5} />
      <rect x={14} y={3} width={7} height={7} rx={1.5} />
      <rect x={3} y={14} width={7} height={7} rx={1.5} />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h6" />
    </Svg>
  );
}
function IconSlip() {
  return (
    <Svg>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h4" />
    </Svg>
  );
}
function IconChecklist() {
  return (
    <Svg>
      <path d="M4 6l2 2 3-3M4 14l2 2 3-3" />
      <path d="M13 7h7M13 15h7" />
    </Svg>
  );
}
function IconLink() {
  return (
    <Svg>
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </Svg>
  );
}
function IconHistory() {
  return (
    <Svg>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" />
      <path d="M3 4v4h4M12 7v5l3 2" />
    </Svg>
  );
}
