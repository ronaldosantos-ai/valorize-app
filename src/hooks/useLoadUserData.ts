import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

export function useLoadUserData() {
  const { setCostConfig, setServices } = useAppStore();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from('cost_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (config) setCostConfig(config);

      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (services) setServices(services);
    }
    load();
  }, []);
}
