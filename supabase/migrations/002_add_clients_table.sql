-- Migration: cadastro completo de clientes
-- Execute este comando no SQL Editor do Supabase

create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  phone text,
  birthday date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

drop policy if exists "Clients: own data" on public.clients;
create policy "Clients: own data" on public.clients
  for all using (auth.uid() = user_id);

alter table public.appointments
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists idx_clients_user_name
  on public.clients (user_id, name);
