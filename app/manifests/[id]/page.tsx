import ManifestDetailClient from './client';

export default async function ManifestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManifestDetailClient id={id} />;
}
