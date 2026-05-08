import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Santana Express',
  description: 'Santana Express - Gestão de Frota',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased min-h-[100dvh] bg-background overflow-x-hidden w-full" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
