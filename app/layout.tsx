import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/fundacion-meriggi' : '';

export const metadata: Metadata = {
  title: 'Fundación Meriggi — Gestión clínica',
  description: 'Sistema de gestión clínica, agenda y portal de pacientes de Fundación Meriggi.',
  robots: { index: false, follow: false },
  manifest: `${base}/manifest.webmanifest`,
};

export const viewport: Viewport = { themeColor: '#f5bc26' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
