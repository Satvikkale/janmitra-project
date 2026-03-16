'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type AdminDashboardLayoutProps = {
  readonly children: ReactNode;
};

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const router = useRouter();
  const { isLoggedIn, userType } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth/login');
      return;
    }

    if (userType !== 'admin' && userType !== 'platform_admin') {
      router.replace('/');
    }
  }, [isLoggedIn, userType, router]);

  if (!isLoggedIn || (userType !== 'admin' && userType !== 'platform_admin')) {
    return null;
  }

  return <>{children}</>;
}
