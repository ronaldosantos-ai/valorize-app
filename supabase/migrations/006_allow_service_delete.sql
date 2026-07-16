-- Migration: permite excluir um serviço mesmo que já tenha sido usado em
-- atendimentos passados. O histórico não é afetado — cada atendimento já
-- guarda seu próprio nome e valor no momento do registro; só o vínculo
-- (service_id) vira nulo, sem apagar nada do que já foi salvo.
-- Execute no SQL Editor do Supabase

alter table public.appointments
  drop constraint if exists appointments_service_id_fkey;

alter table public.appointments
  add constraint appointments_service_id_fkey
  foreign key (service_id) references public.services(id)
  on delete set null;
