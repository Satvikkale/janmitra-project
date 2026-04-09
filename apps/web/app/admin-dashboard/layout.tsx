'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type AdminDashboardLayoutProps = {
  readonly children: ReactNode;
};

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const router = useRouter();
  const { isLoggedIn, userType } = useAuth();
  const [checked, setChecked] = useState(false);

  const isAdmin = userType === 'admin' || userType === 'platform_admin';

  useEffect(() => {
    // Wait a tick to allow auth state to settle after login redirect
    const timer = setTimeout(() => {
      if (!isLoggedIn) {
        router.replace('/auth/login');
      } else if (!isAdmin) {
        router.replace('/');
      }
      setChecked(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [isLoggedIn, isAdmin, router]);

  if (!checked || !isLoggedIn || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
