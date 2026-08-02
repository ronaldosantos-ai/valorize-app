-- Guarda o token de push notification (Expo) de cada usuária, pra podermos
-- notificar quando o admin responder no chat de suporte.
alter table public.profiles
  add column if not exists push_token text;

-- Habilita a extensão pg_net, necessária pro trigger abaixo fazer a chamada
-- HTTP para a Expo Push API.
create extension if not exists pg_net;

-- Função que dispara quando uma nova mensagem do ADMIN é inserida:
-- busca o push_token da usuária e manda a notificação via Expo Push API.
create or replace function public.notify_user_on_admin_message()
returns trigger as $$
declare
  v_push_token text;
begin
  if new.sender = 'admin' then
    select push_token into v_push_token
    from public.profiles
    where id = new.user_id;

    if v_push_token is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'to', v_push_token,
          'title', 'Valorize',
          'body', new.content,
          'data', jsonb_build_object('type', 'support_reply')
        )
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_admin_message_notify on public.messages;
create trigger on_admin_message_notify
  after insert on public.messages
  for each row
  execute function public.notify_user_on_admin_message();
