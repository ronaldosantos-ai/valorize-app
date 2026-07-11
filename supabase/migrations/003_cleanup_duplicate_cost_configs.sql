-- Limpeza de registros duplicados de custos (cost_configs)
-- Mantém apenas o registro MAIS RECENTE de cada usuária e apaga os demais.
-- Execute no SQL Editor do Supabase.

delete from public.cost_configs a
using public.cost_configs b
where a.user_id = b.user_id
  and a.updated_at < b.updated_at;

-- Confirma que sobrou só 1 registro por usuária
select user_id, count(*) as total
from public.cost_configs
group by user_id
having count(*) > 1;
-- Se essa consulta acima não retornar nenhuma linha, a limpeza funcionou.
