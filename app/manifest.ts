import type { MetadataRoute } from 'next';

function icon(sizes: string, purpose?: "any" | "maskable") {
  return {
    src: `/icon-${sizes}.png`,
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
      icon('192x192', 'any'),
      icon('192x192', 'maskable'),
      icon('512x512', 'any'),
      icon('512x512', 'maskable'),
    ],
  };
}