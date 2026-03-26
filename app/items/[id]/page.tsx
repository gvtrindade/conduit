import ItemDetailClient from './client';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemDetailClient id={id} />;
}
