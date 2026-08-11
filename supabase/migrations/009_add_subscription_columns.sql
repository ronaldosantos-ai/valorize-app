-- Essas colunas já foram criadas manualmente durante a integração com a Ticto
-- (Edge Function "ticto-webhook"). Esse arquivo só documenta o schema no
-- repositório do app — é seguro rodar de novo, não duplica nada.
alter table public.profiles
  add column if not exists subscription_status text;

alter table public.profiles
  add column if not exists subscription_plan text;

alter table public.profiles
  add column if not exists subscription_updated_at timestamptz;
