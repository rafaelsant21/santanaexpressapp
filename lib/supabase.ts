import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste sessão no localStorage (evita logout inesperado)
    persistSession: true,
    // Detecta sessão de outras abas automaticamente
    detectSessionInUrl: true,
    // Auto-refresh do token JWT antes de expirar
    autoRefreshToken: true,
    // Storage padrão — usa localStorage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Timeout global para requests
  global: {
    headers: { 'x-app-version': '1.0.0' },
  },
});
