import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

export function useLoadUserData() {
  const { setCostConfig, setServices } = useAppStore();

  useEffect(() => {
    async function load(userId: string) {
      try {
        // maybeSingle + order: nunca quebra mesmo se houver registros duplicados;
        // usa sempre o mais recente
        const { data: configs } = await supabase
          .from('cost_configs')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (configs && configs.length > 0) setCostConfig(configs[0]);

        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (services) setServices(services);
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
      }
    }

    // Tenta carregar imediatamente (cobre o caso do app já aberto com sessão ativa)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) load(user.id);
    });

    // Recarrega sempre que o estado de login mudar (login novo, reinstalação, etc.)
    // Isso corrige o caso em que a sessão ainda não estava pronta no momento do carregamento inicial.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        load(session.user.id);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);
}
