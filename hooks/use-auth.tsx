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
        const { data, error } = await withTimeout<any>(
          Promise.resolve(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single()
          ),
          15000
        );
        
        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Profile fetch failed or timed out:', err);
        return null;
      }
    };

    // Verifica sessão existente ao carregar
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
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
      }
      setIsLoading(false);
    });

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!session && pathname !== '/login') {
        router.push('/login');
      } else if (session && pathname === '/login') {
        // Redireciona baseado no role
        router.push(session.role === 'admin' ? '/dashboard' : '/checklist');
      } else if (pathname === '/') {
        router.push(session ? (session.role === 'admin' ? '/dashboard' : '/checklist') : '/login');
      }
    }
  }, [session, isLoading, pathname, router]);

  // Login real com Supabase Auth
  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const logout = async () => {
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
