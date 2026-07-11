-- Migration: adicionar nome da cliente aos atendimentos
-- Execute este comando no SQL Editor do Supabase

alter table public.appointments
  add column if not exists client_name text;

-- Índice para buscar rapidamente os atendimentos de uma mesma cliente
create index if not exists idx_appointments_client_name
  on public.appointments (user_id, client_name);
