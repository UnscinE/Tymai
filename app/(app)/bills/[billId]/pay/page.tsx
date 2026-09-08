import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBillParticipant } from '@/server/guards';
import { getBill } from '@/server/services/bill-service';
import { PayBillClient } from './PayBillClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'จ่ายบิล · tymai' };

/**
 * หน้าจ่ายเงินสำหรับคนที่มีบัญชีและถูกผูกเข้ากับบิลแล้ว
 * (การผูก BillParticipant.userId เกิดตอนเลือกเพื่อนจาก friend list — เฟส 5)
 * ระหว่างนี้เพื่อนจ่ายผ่านลิงก์สาธารณะ /b/<token> ได้ตามปกติ
 */
export default async function PayBillPage({ params }: PageProps<'/bills/[billId]/pay'>) {
  const { billId } = await params;
  const { user, participant } = await requireBillParticipant(billId);

  const bill = await getBill(billId, user.id);
  if (!bill) notFound();

  return <PayBillClient initialBill={bill} participantId={participant.id} />;
}
