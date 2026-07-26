import type { Metadata } from 'next';
import { Crimson_Text, Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  variable: '--font-crimson-text',
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TabungPin — Round-Up Batch Savings',
  description:
    'Setiap pembayaran USDC dikumpulkan, kembalian dibulatkan ke atas menumpuk setiap minggu. Setorkan ke vault DeFi dengan satu tanda tangan.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${spaceGrotesk.variable} ${crimsonText.variable}`}>
      <body className="min-h-screen bg-orange-50 text-gray-900 font-crimson antialiased">
        {children}
      </body>
    </html>
  );
}
