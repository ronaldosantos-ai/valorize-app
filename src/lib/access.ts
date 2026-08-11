import { supabase } from './supabase';

export type AccessReason = 'active' | 'trial' | 'grace' | 'canceled' | 'past_due' | 'no_subscription';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  trialDaysLeft?: number;
}

const TRIAL_DAYS = 7;
const PAST_DUE_GRACE_DAYS = 3; // margem extra pra falha temporária de cartão

// Decide se a usuária pode usar o app: assinatura ativa > teste grátis > carência de atraso > bloqueado
export function computeAccess(userCreatedAt: string, profile: {
  subscription_status: string | null;
  subscription_updated_at: string | null;
} | null): AccessResult {
  const status = profile?.subscription_status ?? null;

  if (status === 'active') {
    return { allowed: true, reason: 'active' };
  }

  const trialEnd = new Date(userCreatedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now < trialEnd) {
    const trialDaysLeft = Math.max(1, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000)));
    return { allowed: true, reason: 'trial', trialDaysLeft };
  }

  if (status === 'past_due') {
    const updatedAt = profile?.subscription_updated_at ? new Date(profile.subscription_updated_at).getTime() : 0;
    const graceEnd = updatedAt + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    if (now < graceEnd) {
      return { allowed: true, reason: 'grace' };
    }
    return { allowed: false, reason: 'past_due' };
  }

  if (status === 'canceled') {
    return { allowed: false, reason: 'canceled' };
  }

  return { allowed: false, reason: 'no_subscription' };
}

// Busca os dados da usuária no Supabase e aplica a regra de acesso.
export async function checkAccess(): Promise<AccessResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'no_subscription' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_updated_at')
      .eq('id', user.id)
      .single();

    return computeAccess(user.created_at, profile);
  } catch (err) {
    // Em caso de falha de rede/consulta, não bloqueia a usuária por um erro nosso —
    // melhor liberar e tentar checar de novo na próxima abertura do app.
    console.log('Erro ao checar acesso:', err);
    return { allowed: true, reason: 'active' };
  }
}
