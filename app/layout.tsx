import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  themeColor: '#ef4444',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Santana Express',
  description: 'Santana Express - Gestão de Frota',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Santana',
  },
  icons: {
    icon: '/icons/icon-192x192.png?v=3',
    apple: '/icons/apple-touch-icon.png?v=3',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased min-h-[100dvh] bg-background overflow-x-hidden w-full" suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Toaster 
          theme="dark" 
          richColors 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
