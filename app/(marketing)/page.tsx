import type { Metadata } from 'next';
import { auth } from '@/server/auth';
import { CTASection, Features, Hero, HowItWorks, TrustSection } from '@/features/marketing';

export const metadata: Metadata = {
  title: 'tymai · หารค่าอาหารแล้วสร้าง PromptPay QR ให้เพื่อนสแกนจ่าย',
  description:
    'ใส่รายการอาหาร ติ๊กว่าใครกินอะไร ระบบคำนวณยอดรายคนแม่นถึงสตางค์ สร้าง PromptPay QR แยกตามยอด และตรวจสลิปให้อัตโนมัติ',
};

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <main>
      <Hero isLoggedIn={isLoggedIn} />
      <HowItWorks />
      <div id="features" className="scroll-mt-20">
        <Features />
      </div>
      <TrustSection />
      <CTASection isLoggedIn={isLoggedIn} />
    </main>
  );
}
