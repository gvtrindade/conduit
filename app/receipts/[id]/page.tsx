import ReceiptDetailClient from './client';

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptDetailClient id={id} />;
}
