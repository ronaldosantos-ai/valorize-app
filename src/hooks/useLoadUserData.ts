import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

export function useLoadUserData() {
  const { setCostConfig, setServices } = useAppStore();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // maybeSingle + order: nunca quebra mesmo se houver registros duplicados;
        // usa sempre o mais recente
        const { data: configs } = await supabase
          .from('cost_configs')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (configs && configs.length > 0) setCostConfig(configs[0]);

        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (services) setServices(services);
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
      }
    }
    load();
  }, []);
}
