'use client';
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { getAccessToken, clearTokens as clearAuthTokens } from '@/lib/auth';

interface AuthContextType {
  isLoggedIn: boolean;
  userType: string | null;
  setIsLoggedIn: (value: boolean) => void;
  logout: () => void;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const checkAuthStatus = useCallback(() => {
    const token = getAccessToken();
    setIsLoggedIn(!!token);
    
    // Get userType from localStorage (only on client)
    if (globalThis.window !== undefined) {
      const storedUserType = globalThis.localStorage.getItem('userType');
      setUserType(storedUserType);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthTokens();
    setIsLoggedIn(false);
    setUserType(null);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.removeItem('userType');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    checkAuthStatus();
  }, [checkAuthStatus]);

  const value = useMemo(() => ({
    isLoggedIn,
    userType,
    setIsLoggedIn,
    logout,
    checkAuthStatus,
  }), [isLoggedIn, userType, logout, checkAuthStatus]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}