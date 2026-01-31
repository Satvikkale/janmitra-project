import React, { createContext, useContext, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
const API = (require('expo-constants').default.expoConfig?.extra as any).apiBase as string;

type AuthResult = { accessToken: string; refreshToken: string; user: any };

type Ctx = {
  user?: any;
  accessToken?: string;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (p: { name: string; email?: string; phone?: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const C = createContext<Ctx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string|undefined>();
  const [user, setUser] = useState<any>();

  const login = async (identifier: string, password: string) => {
    try {
      const r = await fetch(`${API}/v1/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ identifier, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || 'Login failed');
      setAccessToken(j.accessToken); setUser(j.user);
      await SecureStore.setItemAsync('jm_access', j.accessToken);
      await SecureStore.setItemAsync('jm_refresh', j.refreshToken);
      return { accessToken: j.accessToken as string, refreshToken: j.refreshToken as string, user: j.user };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Network error. Please check your connection.');
    }
  };

  const register = async (p:{name:string;email?:string;phone?:string;password:string}) => {
    try {
      const r = await fetch(`${API}/v1/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || 'Register failed');
      setAccessToken(j.accessToken); setUser(j.user);
      await SecureStore.setItemAsync('jm_access', j.accessToken);
      await SecureStore.setItemAsync('jm_refresh', j.refreshToken);
      return { accessToken: j.accessToken as string, refreshToken: j.refreshToken as string, user: j.user };
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.message || 'Network error. Please check your connection.');
    }
  };

  const logout = async () => {
    setAccessToken(undefined); setUser(undefined);
    await SecureStore.deleteItemAsync('jm_access');
    await SecureStore.deleteItemAsync('jm_refresh');
  };

  const value = useMemo(()=>({ user, accessToken, login, register, logout }), [user, accessToken]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useLocalAuth = () => useContext(C);