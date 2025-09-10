'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication on both server and client side potential states
    const sessionAuth = sessionStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated && !sessionAuth) {
      if (pathname !== '/login') {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    } else {
      if (pathname === '/login') {
        router.push('/');
      }
      setIsLoading(false);
    }
  }, [isAuthenticated, router, pathname]);
  
  if (isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  return <>{children}</>;
}
