-- Flag pra conta do dono do app (Ronaldo) e futuros admins: libera o acesso
-- ao app SEMPRE, independente de status de assinatura ou trial.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
