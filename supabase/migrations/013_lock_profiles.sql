-- 013_lock_profiles.sql
-- Segurança: o app só pode ler o próprio perfil e editar name, has_completed_onboarding e push_token.
-- Status de assinatura e is_admin só mudam pelo webhook (service role) ou pelo painel admin.
-- Já executado no SQL Editor em 2026-11-01.

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, has_completed_onboarding, push_token) on public.profiles to authenticated;
