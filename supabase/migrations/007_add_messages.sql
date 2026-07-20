-- Canal de mensagens entre a usuária e o suporte (Ronaldo, via painel admin)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_user_id_created_at_idx
  on public.messages (user_id, created_at);

alter table public.messages enable row level security;

-- A usuária só vê e envia mensagens vinculadas ao próprio user_id.
-- O painel admin usa a service_role key (bypassa RLS), então o Ronaldo
-- consegue ler/responder mensagens de todas as usuárias sem policy extra aqui.
create policy "Usuaria ve suas proprias mensagens"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "Usuaria envia suas proprias mensagens"
  on public.messages for insert
  with check (auth.uid() = user_id and sender = 'user');

-- Permite a usuária marcar como lida a resposta do admin (não pode alterar o conteúdo)
create policy "Usuaria marca mensagem do admin como lida"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Habilita Realtime para essa tabela (chat em tempo real no app)
alter publication supabase_realtime add table public.messages;
