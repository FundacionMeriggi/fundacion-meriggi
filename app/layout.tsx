import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/fundacion-meriggi' : '';
const publicUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://fundacionmeriggi.github.io/fundacion-meriggi').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(publicUrl),
  title: {
    default: 'Fundación Meriggi — Salud mental con una red que acompaña',
    template: '%s — Fundación Meriggi',
  },
  description: 'Atención en salud mental, trabajo interdisciplinario y una plataforma segura para pacientes, profesionales y coordinación.',
  robots: { index: false, follow: false },
  manifest: `${base}/manifest.webmanifest`,
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: publicUrl,
    siteName: 'Fundación Meriggi',
    title: 'Fundación Meriggi',
    description: 'Salud mental con una red que acompaña.',
    images: [{
      url: `${publicUrl}/og.png`,
      width: 1730,
      height: 909,
      alt: 'Fundación Meriggi — Salud mental con una red que acompaña.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fundación Meriggi',
    description: 'Salud mental con una red que acompaña.',
    images: [`${publicUrl}/og.png`],
  },
};

export const viewport: Viewport = { themeColor: '#f5bc26' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
