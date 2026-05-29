'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserSession, UserRole } from '@/services/types';
import { devLog, warnLog } from '@/lib/utils';

interface AuthContextType {
  session: UserSession | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache do perfil para não refazer query a cada auth state change
const profileCache = new Map<string, { data: any; ts: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchProfile = async (userId: string) => {
      // Checar cache de perfil
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
        return cached.data;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          warnLog('Auth', 'Error fetching profile:', error.message);
          return null;
        }
        // Cachear resultado
        profileCache.set(userId, { data, ts: Date.now() });
        return data;
      } catch (err: any) {
        warnLog('Auth', 'Profile fetch failed:', err?.message);
        return null;
      }
    };

    const buildSession = async (user: any): Promise<UserSession | null> => {
      if (!user) return null;
      const profile = await fetchProfile(user.id);
      const role = (profile?.role ?? 'motorista') as UserRole;
      return {
        id: user.id,
        email: user.email!,
        name: profile?.name ?? user.user_metadata?.name ?? user.email!.split('@')[0],
        role,
        isLoggedIn: true,
      };
    };

    // Check existing session on mount
    const initSession = async () => {
      try {
        devLog('Auth', 'Checking session...');
        
        // Safety timeout: never hang more than 10s
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            warnLog('Auth', 'Session check timed out after 10s');
            resolve(null);
          }, 10000);
        });

        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!sessionResult) {
          // Timed out
          return;
        }

        const { data: { session: s }, error } = sessionResult;
        
        if (error) {
          warnLog('Auth', 'Session fetch error:', error.message);
          return;
        }

        if (s?.user && isMountedRef.current) {
          const userSession = await buildSession(s.user);
          if (isMountedRef.current) {
            devLog('Auth', 'Session loaded:', userSession?.email);
            setSession(userSession);
          }
        }
      } catch (err: any) {
        warnLog('Auth', 'Init error:', err?.message);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      devLog('Auth', 'State change:', event);

      // Ignorar TOKEN_REFRESHED — a sessão já existe, não precisa refazer o perfil
      if (event === 'TOKEN_REFRESHED') {
        devLog('Auth', 'Token refreshed, keeping current session');
        return;
      }

      try {
        if (event === 'SIGNED_OUT') {
          if (isMountedRef.current) setSession(null);
          return;
        }

        if (s?.user && isMountedRef.current) {
          const userSession = await buildSession(s.user);
          if (isMountedRef.current) setSession(userSession);
        } else if (event === 'SIGNED_IN' && !s?.user) {
          // Edge case: SIGNED_IN sem user = ignorar (não deslogar)
          warnLog('Auth', 'SIGNED_IN event without user, ignoring');
        }
      } catch (err: any) {
        warnLog('Auth', 'State change error:', err?.message);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Navigation guard
  useEffect(() => {
    if (isLoading) return;

    if (!session && pathname !== '/login') {
      devLog('Auth', 'No session, redirecting to /login');
      router.push('/login');
    } else if (session && pathname === '/login') {
      const target = session.role === 'admin' ? '/dashboard' : '/checklist';
      devLog('Auth', 'Session exists, redirecting to', target);
      router.push(target);
    } else if (pathname === '/') {
      const target = session ? (session.role === 'admin' ? '/dashboard' : '/checklist') : '/login';
      router.push(target);
    }
  }, [session, isLoading, pathname, router]);

  // Memoized login
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    devLog('Auth', 'Login attempt for', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      warnLog('Auth', 'Login error:', error.message);
      return error.message;
    }
    return null;
  }, []);

  // Memoized logout
  const logout = useCallback(async () => {
    devLog('Auth', 'Logging out...');
    profileCache.clear();
    await supabase.auth.signOut();
    setSession(null);
    router.push('/login');
  }, [router]);

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
