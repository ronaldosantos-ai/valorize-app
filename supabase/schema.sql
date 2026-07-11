-- ============================================================
-- Valorize — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensão para UUID
create extension if not exists "uuid-ossp";

-- ─── Perfis de usuária ─────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  has_completed_onboarding boolean default false,
  created_at timestamptz default now()
);

-- ─── Configuração de custos ────────────────────────────────
create table public.cost_configs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rent numeric(10,2) default 0,
  electricity numeric(10,2) default 0,
  internet numeric(10,2) default 0,
  other_fixed numeric(10,2) default 0,
  equipment_value numeric(10,2) default 0,
  equipment_lifespan_months int default 24,
  desired_salary numeric(10,2) default 2000,
  work_days_per_month int default 22,
  work_hours_per_day numeric(4,1) default 8,
  das_mei_monthly numeric(10,2) default 75.90,
  card_fee_percent numeric(5,2) default 2.50,
  pix_fee_percent numeric(5,2) default 0.99,
  tax_reform_adjustment numeric(5,2) default 3.50,
  updated_at timestamptz default now()
);

-- ─── Serviços ──────────────────────────────────────────────
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  duration_minutes int not null,
  supply_cost numeric(10,2) not null,
  min_price numeric(10,2) not null,
  perceived_price numeric(10,2) not null,
  shielded_price numeric(10,2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── Clientes ──────────────────────────────────────────────
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  phone text,
  birthday date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Atendimentos ──────────────────────────────────────────
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id),
  client_id uuid references public.clients(id) on delete set null,
  service_name text not null,
  client_name text,
  charged_price numeric(10,2) not null,
  net_profit numeric(10,2) not null,
  payment_method text check (payment_method in ('pix', 'card', 'cash')) not null,
  notes text,
  attended_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ─── RLS (Row Level Security) ──────────────────────────────
alter table public.profiles enable row level security;
alter table public.cost_configs enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- Policies: cada usuária acessa apenas seus próprios dados
create policy "Profiles: own data" on public.profiles
  for all using (auth.uid() = id);

create policy "Cost configs: own data" on public.cost_configs
  for all using (auth.uid() = user_id);

create policy "Services: own data" on public.services
  for all using (auth.uid() = user_id);

create policy "Clients: own data" on public.clients
  for all using (auth.uid() = user_id);

create policy "Appointments: own data" on public.appointments
  for all using (auth.uid() = user_id);

-- ─── Trigger: criar perfil ao registrar ───────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Profissional'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── View: resumo mensal ───────────────────────────────────
create or replace view public.monthly_summary as
select
  user_id,
  to_char(attended_at, 'YYYY-MM') as month,
  sum(charged_price) as total_revenue,
  sum(net_profit) as total_net_profit,
  count(*) as total_appointments
from public.appointments
group by user_id, to_char(attended_at, 'YYYY-MM');
