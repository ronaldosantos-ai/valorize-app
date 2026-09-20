-- 011_whop_webhook.sql
alter table public.profiles
  add column if not exists payment_provider text;

update public.profiles
set payment_provider = 'ticto'
where payment_provider is null
  and subscription_status is not null;

create table if not exists public.webhook_events (
  id            text primary key,
  provider      text not null,
  event_type    text not null,
  payload       jsonb not null,
  email         text,
  result        text,
  created_at    timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

create index if not exists webhook_events_created_at_idx
  on public.webhook_events (created_at desc);