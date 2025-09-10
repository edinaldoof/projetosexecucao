import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SyncProvider } from '@/contexts/sync-context';
import { AuthProvider } from '@/contexts/auth-context';
import ProtectedRoute from '@/components/protected-route';

export const metadata: Metadata = {
  title: 'Firebase Fadex',
  description: 'Sincroniza dados de uma API local para o Firebase Storage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SyncProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </SyncProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
