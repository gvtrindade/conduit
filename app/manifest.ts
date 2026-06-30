import type { MetadataRoute } from 'next';

function icon(sizes: string, purpose?: "any" | "maskable") {
  const ext = purpose === "maskable" ? ".maskable" : "";
  return {
    src: `/icon-${sizes}${ext}.png`,
    sizes,
    type: 'image/png',
    purpose,
  };
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CONDUIT // Grocery Intelligence',
    short_name: 'CONDUIT',
    description: 'Receipt tracking and inventory management for household crews',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d1117',
    theme_color: '#3b82f6',
    categories: ['finance', 'productivity'],
    icons: [
      icon('192x192'),
      icon('192x192', 'maskable'),
      icon('512x512'),
      icon('512x512', 'maskable'),
    ],
  };
}