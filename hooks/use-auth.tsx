'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserSession, UserRole } from '@/services/types';
import { withTimeout } from '@/lib/utils';

interface AuthContextType {
  session: UserSession | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single() as any, 10000);
        
        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Profile fetch failed:', err);
        return null;
      }
    };

    // Verifica sessão existente ao carregar
    console.log('[Auth] Checking session...');
    withTimeout(supabase.auth.getSession(), 10000)
      .then(async ({ data: { session: s } }) => {
        console.log('[Auth] Session data:', s?.user?.email || 'no session');
        try {
          if (s?.user) {
            const profile = await fetchProfile(s.user.id);
            console.log('[Auth] Profile fetched:', profile?.name || 'no profile');
            const role = (profile?.role ?? 'motorista') as UserRole;
            setSession({
              id: s.user.id,
              email: s.user.email!,
              name: profile?.name ?? s.user.user_metadata?.name ?? s.user.email!.split('@')[0],
              role,
              isLoggedIn: true,
            });
          }
        } catch (err) {
          console.error('[Auth] Initialization error:', err);
        } finally {
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('[Auth] Session fetch error:', err);
        setIsLoading(false);
      });

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('[Auth] State change event:', event);
      try {
        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          const role = (profile?.role ?? 'motorista') as UserRole;
          setSession({
            id: s.user.id,
            email: s.user.email!,
            name: profile?.name ?? s.user.user_metadata?.name ?? s.user.email!.split('@')[0],
            role,
            isLoggedIn: true,
          });
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('[Auth] State change error:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      console.log('[Auth] Pathname check:', pathname, 'Session:', !!session);
      if (!session && pathname !== '/login') {
        console.log('[Auth] No session, redirecting to /login');
        router.push('/login');
      } else if (session && pathname === '/login') {
        const target = session.role === 'admin' ? '/dashboard' : '/checklist';
        console.log('[Auth] Session exists, redirecting to', target);
        router.push(target);
      } else if (pathname === '/') {
        const target = session ? (session.role === 'admin' ? '/dashboard' : '/checklist') : '/login';
        console.log('[Auth] Root path, redirecting to', target);
        router.push(target);
      }
    }
  }, [session, isLoading, pathname, router]);

  // Login real com Supabase Auth
  const login = async (email: string, password: string): Promise<string | null> => {
    console.log('[Auth] Attempting login for', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Login error:', error.message);
      return error.message;
    }
    return null;
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    await supabase.auth.signOut();
    setSession(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, isLoading }}>
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
