import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBillByPublicToken } from '@/server/services/bill-service';
import { PublicBillClient } from './PublicBillClient';

// บิลเปลี่ยนสถานะตลอดเวลา จึงต้อง render สดทุกครั้ง ห้าม cache
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/b/[token]'>): Promise<Metadata> {
  const { token } = await params;
  const bill = await getBillByPublicToken(token);
  return {
    title: bill ? `${bill.title} · หารค่าอาหาร` : 'ไม่พบบิลนี้',
    description: bill ? `ดูยอดที่ต้องจ่ายและสแกน PromptPay QR สำหรับ ${bill.title}` : undefined,
    // ลิงก์บิลไม่ควรถูก index — ใครเจอใน Google ก็เปิดดูยอดของทั้งกลุ่มได้
    robots: { index: false, follow: false },
  };
}

export default async function PublicBillPage({ params }: PageProps<'/b/[token]'>) {
  const { token } = await params;
  const bill = await getBillByPublicToken(token);
  if (!bill) notFound();
  return <PublicBillClient token={token} initialBill={bill} />;
}
