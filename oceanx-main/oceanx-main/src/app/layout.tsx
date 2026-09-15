import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'OceanX · Maritime Oil Spill Intelligence',
  description:
    'Satellite oil spill detection with AIS correlation for vessel attribution. SIH 2026 problem statement 26143.'
};

export const viewport: Viewport = {
  themeColor: '#040a12',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
