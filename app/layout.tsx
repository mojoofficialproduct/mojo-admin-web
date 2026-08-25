import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'MOJO — Ürün Yönetimi & Fiyat Paneli',
  description: 'Shopify ürün yükleme ve hızlı fiyat yönetim paneli',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
