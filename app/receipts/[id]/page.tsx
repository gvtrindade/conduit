import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import ReceiptDetailClient from './client';

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = await headers();
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: headersList });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }
  return <ReceiptDetailClient id={id} userId={userId} />;
}
