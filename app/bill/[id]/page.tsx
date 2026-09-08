import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBill } from '@/server/bill-store';
import { SharedBillClient } from './SharedBillClient';

// บิลเปลี่ยนสถานะตลอดเวลา จึงต้อง render สดทุกครั้ง ห้าม cache
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bill = await getBill(id);
  return {
    title: bill ? `${bill.title} · หารค่าอาหาร` : 'ไม่พบบิลนี้',
    description: bill ? `ดูยอดที่ต้องจ่ายและสแกน PromptPay QR สำหรับ ${bill.title}` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SharedBillPage({ params }: Props) {
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) notFound();

  return <SharedBillClient initialBill={bill} />;
}
