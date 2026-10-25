-- 012_paid_emails.sql
-- Quem paga ANTES de criar a conta no app: o webhook guarda o e-mail aqui,
-- e o perfil recebe o status de assinatura automaticamente quando for criado.

create table if not exists public.paid_emails (
  email               text primary key,
  subscription_status text not null,
  subscription_plan   text,
  payment_provider    text,
  updated_at          timestamptz not null default now()
);

-- Sem policies: ninguém acessa pelo app. Só a service role (webhook) e a função abaixo.
alter table public.paid_emails enable row level security;

create or replace function public.apply_paid_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  p public.paid_emails%rowtype;
begin
  v_email := lower(coalesce(new.email, (select u.email from auth.users u where u.id = new.id)));
  if v_email is null then
    return new;
  end if;

  select * into p from public.paid_emails where email = v_email;
  if found then
    new.subscription_status     := p.subscription_status;
    new.subscription_plan       := p.subscription_plan;
    new.subscription_updated_at := p.updated_at;
    new.payment_provider        := p.payment_provider;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_paid_status on public.profiles;
create trigger trg_apply_paid_status
  before insert on public.profiles
  for each row execute function public.apply_paid_status();
