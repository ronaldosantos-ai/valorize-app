import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Na web, o link do e-mail "Esqueci minha senha" abre o app com "type=recovery" na URL.
// Guardamos isso ANTES de o Supabase limpar a URL, para mostrar a tela de nova senha.
export const startedInRecovery =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  /type=recovery/.test(window.location.hash || '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Na web o Supabase precisa ler a sessão que vem no link do e-mail.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Mantém o token da sessão atualizado quando o app volta ao primeiro plano
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
