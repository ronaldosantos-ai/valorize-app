-- 014_cancel_subscription.sql
-- Guarda os dados da assinatura da Whop para a cliente poder cancelar pelo app.

alter table public.profiles
  add column if not exists whop_membership_id text,
  add column if not exists whop_manage_url text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists access_until timestamptz;

alter table public.paid_emails
  add column if not exists whop_membership_id text,
  add column if not exists whop_manage_url text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists access_until timestamptz;

-- Quem paga antes de criar a conta no app: copia também os dados da assinatura.
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
    new.whop_membership_id      := p.whop_membership_id;
    new.whop_manage_url         := p.whop_manage_url;
    new.cancel_at_period_end    := coalesce(p.cancel_at_period_end, false);
    new.access_until            := p.access_until;
  end if;
  return new;
end;
$$;
