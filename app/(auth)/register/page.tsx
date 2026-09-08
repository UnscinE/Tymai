import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = { title: 'สมัครสมาชิก · tymai' };

export default function RegisterPage() {
  return <RegisterForm />;
}
