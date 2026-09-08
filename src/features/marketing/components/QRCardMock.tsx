/**
 * การ์ด QR จำลองสำหรับหน้า Landing
 *
 * จงใจวาดลาย QR เป็น SVG เองแทนที่จะสร้าง QR จริง — QR จริงบนหน้าโฆษณา
 * เสี่ยงให้คนสแกนแล้วเข้าใจผิดว่าเป็นบัญชีที่ต้องโอนเงินไป
 * ลายนี้ deterministic (ไม่สุ่มใหม่ทุก render) จึงไม่เกิด hydration mismatch
 * และไม่ใช้ JS ทำอนิเมชัน — หน้าแรกต้องอ่านได้ก่อน JS จะทำงาน
 */
export function QRCardMock() {
  return (
    <div className="relative w-[280px] -rotate-2 overflow-hidden rounded-3xl border border-line bg-white shadow-lifted">
      <div className="bg-brand px-5 py-3.5 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/90">THAI QR PAYMENT</p>
        <p className="mt-0.5 truncate text-[11px] text-white/60">หมูกระทะวันศุกร์</p>
      </div>

      <div className="grid place-items-center px-5 pt-5 pb-3">
        <div className="rounded-2xl border border-line bg-white p-2">
          <FakeQR />
        </div>
      </div>

      <div className="space-y-0.5 px-5 pb-3 text-center">
        <p className="text-[11px] text-ink-faint">โอนเข้าบัญชี</p>
        <p className="text-sm font-semibold text-ink">สมชาย ใจดี</p>
      </div>

      <div className="mx-5 border-t border-dashed border-line" />

      <div className="space-y-0.5 px-5 py-3.5 text-center">
        <p className="text-[11px] text-ink-faint">
          ยอดที่ <span className="font-medium text-ink-muted">ข้าวตัง</span> ต้องชำระ
        </p>
        <p className="text-2xl font-bold tracking-tight tabular-nums text-brand">฿125.00</p>
      </div>
    </div>
  );
}

const SIZE = 25;

/** ลาย QR จำลอง: finder pattern 3 มุม + โมดูลที่คำนวณจากสูตรคงที่ */
function FakeQR() {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (inFinder(x, y)) continue;
      // สูตรคงที่ให้ลายดูกระจายแบบสุ่มแต่ผลลัพธ์เท่ากันทุกครั้ง
      if (((x * 7 + y * 13 + ((x * y) % 5)) & 3) === 0) cells.push({ x, y });
    }
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-[168px] w-[168px]" aria-hidden="true">
      <rect width={SIZE} height={SIZE} fill="#fff" />
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x + 0.12} y={y + 0.12} width={0.76} height={0.76} rx={0.3} fill="#0f172a" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
      {/* โลโก้ตรงกลาง เหมือนที่ระบบจริงวางทับ */}
      <circle cx={SIZE / 2} cy={SIZE / 2} r={3.2} fill="#fff" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={2.6} fill="#1e40af" />
      <text
        x={SIZE / 2}
        y={SIZE / 2 + 1.25}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight="700"
        fill="#fff"
      >
        ฿
      </text>
    </svg>
  );
}

function inFinder(x: number, y: number) {
  const zones = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];
  return zones.some(([zx, zy]) => x >= zx - 1 && x <= zx + 7 && y >= zy - 1 && y <= zy + 7);
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={7} height={7} rx={2} fill="none" stroke="#1e40af" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={1} fill="#1e40af" />
    </g>
  );
}
