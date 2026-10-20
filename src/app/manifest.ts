import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EyeNova Optical POS & Inventory',
    short_name: 'EyeNova POS',
    description: 'High-speed optical retail register, contact lens batch tracking, and inventory management.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#1c1917',
    orientation: 'any',
    scope: '/',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
