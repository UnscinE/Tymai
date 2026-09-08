import Link from 'next/link';
import { Button } from '@/shared/components/ui/Button';

export function CTASection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
      <div className="reveal-on-scroll relative overflow-hidden rounded-3xl bg-brand px-6 py-12 text-center md:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(30rem 18rem at 80% -20%, rgba(255,255,255,0.18), transparent 60%)',
          }}
        />
        <div className="relative">
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            มื้อหน้าไม่ต้องมีใครออกให้ก่อน
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            สมัครฟรี ใช้ได้ทันที ไม่ต้องผูกบัตร ไม่มีค่าธรรมเนียม
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={isLoggedIn ? '/bills/new' : '/register'}>
              <Button
                variant="secondary"
                className="h-11 border-transparent bg-white px-6 text-[15px] text-brand hover:bg-white/90"
              >
                {isLoggedIn ? 'สร้างบิลใหม่' : 'เริ่มใช้ฟรี'}
              </Button>
            </Link>
            {!isLoggedIn && (
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="h-11 px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
                >
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
