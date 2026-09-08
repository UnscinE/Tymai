
const STEPS = [
  {
    title: 'ใส่รายการอาหาร',
    detail: 'พิมพ์เมนูกับราคาตามบิลร้าน ใส่ค่าบริการกับ VAT ได้ด้วย',
  },
  {
    title: 'ติ๊กว่าใครกินอะไร',
    detail: 'กดชื่อเพื่อนใต้แต่ละเมนู ใครไม่ได้กินก็ไม่ต้องจ่าย',
  },
  {
    title: 'ส่งลิงก์ให้เพื่อน',
    detail: 'เพื่อนเปิดลิงก์เจอ QR ที่ใส่ยอดของตัวเองมาแล้ว ไม่ต้องสมัครสมาชิก',
  },
  {
    title: 'สลิปเข้า ระบบติ๊กเอง',
    detail: 'เพื่อนอัปโหลดสลิป ระบบอ่าน QR บนสลิปแล้วอัปเดตสถานะให้อัตโนมัติ',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
        <SectionHeading
          eyebrow="วิธีใช้งาน"
          title="4 ขั้นตอน จบตั้งแต่ยังไม่ลุกจากโต๊ะ"
          description="ไม่ต้องจดใส่กระดาษ ไม่ต้องกดเครื่องคิดเลข ไม่ต้องไล่ทวงทีละคน"
        />

        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
          {/* เส้นเชื่อมระหว่างขั้นตอน — ซ่อนบนจอเล็กเพราะเรียงแนวตั้ง */}
          <div
            aria-hidden="true"
            className="absolute top-5 right-8 left-8 hidden h-px bg-line md:block"
          />

          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="reveal-on-scroll relative"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-brand/20 bg-brand-soft text-sm font-bold text-brand-dark">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="reveal-on-scroll max-w-2xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-base leading-relaxed text-ink-muted">{description}</p>}
    </div>
  );
}
