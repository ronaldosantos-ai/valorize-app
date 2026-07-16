-- Migration: sinalizar serviços criados automaticamente e incompletos
-- Execute no SQL Editor do Supabase

alter table public.services
  add column if not exists needs_review boolean default false;
