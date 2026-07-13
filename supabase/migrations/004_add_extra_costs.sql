-- Migration: itens extras de custo fixo (lista flexível)
-- Execute no SQL Editor do Supabase

alter table public.cost_configs
  add column if not exists extra_costs jsonb default '[]'::jsonb;
