import { SectionHeading } from './HowItWorks';

const POINTS = [
  {
    title: 'เงินโอนเข้าบัญชีคุณโดยตรง',
    detail:
      'ระบบสร้าง PromptPay QR ให้เท่านั้น ไม่ได้เป็นตัวกลางถือเงิน ไม่มีการหักค่าธรรมเนียมใดๆ',
  },
  {
    title: 'รูปสลิปไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์',
    detail:
      'การอ่าน QR บนสลิปทำในเครื่องของผู้จ่ายเอง เซิร์ฟเวอร์เห็นแค่รหัสอ้างอิงธุรกรรม ไม่เห็นรูปสลิป',
  },
  {
    title: 'สลิปหนึ่งใบใช้ยืนยันได้ครั้งเดียว',
    detail:
      'ระบบจำลายนิ้วมือของสลิปทุกใบ ถ้ามีคนส่งสลิปเดิมซ้ำหรือส่งต่อกันในกลุ่ม จะถูกปฏิเสธทันที',
  },
  {
    title: 'เลข PromptPay ไม่หลุดออกจากเซิร์ฟเวอร์',
    detail:
      'QR ถูกสร้างฝั่งเซิร์ฟเวอร์ เลขบัญชีของคุณไม่ถูกฝังลงในโค้ดหน้าเว็บที่ใครก็เปิดดูได้',
  },
];

export function TrustSection() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
        <SectionHeading
          eyebrow="ความปลอดภัย"
          title="เรื่องเงินต้องตรวจสอบได้"
          description="เราออกแบบให้ระบบรู้เรื่องของคุณน้อยที่สุดเท่าที่จำเป็นต่อการทำงาน"
        />

        <div className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {POINTS.map((point, i) => (
            <div
              key={point.title}
              className="reveal-on-scroll flex gap-3.5"
              style={{ animationDelay: `${(i % 2) * 70}ms` }}
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-soft text-success-ink">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    d="M12 3l7 3v6c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6z"
                    strokeLinejoin="round"
                  />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{point.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="reveal-on-scroll mt-8 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning-ink">
          <strong className="font-semibold">ข้อจำกัดที่บอกไว้ตรงๆ:</strong> QR บนสลิปโอนเงินของไทย
          บรรจุแค่รหัสธนาคารผู้โอนกับเลขอ้างอิงธุรกรรม ไม่มีข้อมูลยอดเงิน
          ระบบจึงยืนยันได้ว่า &ldquo;สลิปนี้เป็นของจริงและยังไม่เคยถูกใช้&rdquo;
          แต่ยังเทียบยอดเงินอัตโนมัติไม่ได้ ควรดูยอดในสลิปประกอบด้วยเสมอ
        </p>
      </div>
    </section>
  );
}
