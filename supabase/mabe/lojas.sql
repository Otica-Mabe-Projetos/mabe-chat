-- Personalização Ótica Mabe: restrição por loja (components/mabe/lojas).
--
-- Uma organização só com todas as lojas; cada número (channel_sessions) é de uma
-- loja e cada pessoa atende certas lojas — tudo em organizations.settings.mabe_lojas:
--   numeros: { "<channel_session_id>": "L15" }
--   acesso:  { "<user_id>": { "todas": bool, "lojas": ["L15", ...] } }
--   trava:   bool   (desligada = ninguém é restringido)
--
-- A trava são políticas RESTRICTIVE nossas, SOMADAS (AND) às oficiais: não troca
-- nem edita nenhuma regra oficial, e o baseline oficial não as apaga (ele só
-- derruba políticas pelo nome delas). Platform admin, admin da organização e quem
-- tem "todas" veem tudo; com a trava ligada, os demais só veem as conversas dos
-- números das suas lojas (número sem loja: ninguém restrito vê). Onde a conversa vaza:
--   conversations       — a conversa (as mensagens herdam: messages_select exige
--                         a conversa visível);
--   event_log           — o texto das mensagens (body_preview) nos eventos;
--   webhook_events_log  — o payload cru do WhatsApp;
--   agent_cases         — o resumo que a IA faz da conversa;
--   assumir/transferir  — fn_conversation_assign é SECURITY DEFINER (passa por
--                         cima da RLS): um gatilho nosso recusa quem não vê a loja.
--
-- Desempenho: as políticas usam subconsultas SEM referência à linha
-- (col in (select mabe.fn_...())), que o Postgres calcula UMA vez por consulta.
-- Dependências: só tabelas/colunas (organizations.settings, user_organizations,
-- platform_admins, conversations.channel_session_id) — nenhuma função oficial.
--
-- Idempotente; o atualizador reaplica numa transação só (psql -1) depois do
-- baseline de cada versão (infra/atualizador-easypanel/atualizador.sh › aplicar_sql_mabe).

create schema if not exists mabe;
revoke all on schema mabe from public;
grant usage on schema mabe to authenticated, service_role;

-- Texto que parece uuid → uuid; senão nulo (evita erro de conversão numa política).
create or replace function mabe.fn_uuid_ou_nulo(p text)
returns uuid language sql immutable set search_path = '' as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end
$$;

create or replace function mabe.fn_sou_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins p where p.user_id = auth.uid() and p.revoked_at is null)
$$;

-- Organizações em que a pessoa logada NÃO é restringida (trava desligada, admin ou "todas").
create or replace function mabe.fn_orgs_livres()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select uo.organization_id
  from public.user_organizations uo
  join public.organizations o on o.id = uo.organization_id
  where uo.user_id = auth.uid()
    and uo.revoked_at is null
    and (
      not coalesce((o.settings #>> '{mabe_lojas,trava}')::boolean, false)
      or uo.role = 'admin'
      or coalesce((o.settings #>> array['mabe_lojas', 'acesso', auth.uid()::text, 'todas'])::boolean, false)
    )
$$;

-- Números (channel_session_id) das lojas que a pessoa logada atende.
create or replace function mabe.fn_numeros_permitidos()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select mabe.fn_uuid_ou_nulo(n.key)
  from public.user_organizations uo
  join public.organizations o on o.id = uo.organization_id
  cross join lateral jsonb_each_text(coalesce(o.settings #> '{mabe_lojas,numeros}', '{}'::jsonb)) n
  where uo.user_id = auth.uid()
    and uo.revoked_at is null
    and coalesce(o.settings #> array['mabe_lojas', 'acesso', auth.uid()::text, 'lojas'], '[]'::jsonb) ? n.value
    and mabe.fn_uuid_ou_nulo(n.key) is not null
$$;

-- De qual número é a conversa (para tabelas que só guardam conversation_id).
create or replace function mabe.fn_numero_da_conversa(p_conversa uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.channel_session_id from public.conversations c where c.id = p_conversa
$$;

revoke execute on function mabe.fn_uuid_ou_nulo(text) from public, anon;
revoke execute on function mabe.fn_sou_platform_admin() from public, anon;
revoke execute on function mabe.fn_orgs_livres() from public, anon;
revoke execute on function mabe.fn_numeros_permitidos() from public, anon;
revoke execute on function mabe.fn_numero_da_conversa(uuid) from public, anon;
grant execute on function mabe.fn_uuid_ou_nulo(text) to authenticated, service_role;
grant execute on function mabe.fn_sou_platform_admin() to authenticated, service_role;
grant execute on function mabe.fn_orgs_livres() to authenticated, service_role;
grant execute on function mabe.fn_numeros_permitidos() to authenticated, service_role;
grant execute on function mabe.fn_numero_da_conversa(uuid) to authenticated, service_role;

-- conversations
drop policy if exists mabe_loja_restringe on public.conversations;
create policy mabe_loja_restringe on public.conversations
  as restrictive
  for all
  to authenticated
  using (
    (select mabe.fn_sou_platform_admin())
    or organization_id in (select mabe.fn_orgs_livres())
    or channel_session_id in (select mabe.fn_numeros_permitidos())
  )
  with check (
    (select mabe.fn_sou_platform_admin())
    or organization_id in (select mabe.fn_orgs_livres())
    or channel_session_id in (select mabe.fn_numeros_permitidos())
  );

-- event_log (body_preview das mensagens)
drop policy if exists mabe_loja_event_log on public.event_log;
create policy mabe_loja_event_log on public.event_log
  as restrictive
  for select
  to authenticated
  using (
    (select mabe.fn_sou_platform_admin())
    or organization_id in (select mabe.fn_orgs_livres())
    or (
      (mabe.fn_uuid_ou_nulo(payload ->> 'channel_session_id') is null
        or mabe.fn_uuid_ou_nulo(payload ->> 'channel_session_id') in (select mabe.fn_numeros_permitidos()))
      and (mabe.fn_numero_da_conversa(mabe.fn_uuid_ou_nulo(payload ->> 'conversation_id')) is null
        or mabe.fn_numero_da_conversa(mabe.fn_uuid_ou_nulo(payload ->> 'conversation_id')) in (select mabe.fn_numeros_permitidos()))
    )
  );

-- webhook_events_log (payload cru do WhatsApp)
drop policy if exists mabe_loja_webhook_log on public.webhook_events_log;
create policy mabe_loja_webhook_log on public.webhook_events_log
  as restrictive
  for select
  to authenticated
  using (
    (select mabe.fn_sou_platform_admin())
    or organization_id in (select mabe.fn_orgs_livres())
    or channel_session_id is null
    or channel_session_id in (select mabe.fn_numeros_permitidos())
  );

-- agent_cases (resumo da conversa feito pela IA)
drop policy if exists mabe_loja_agent_cases on public.agent_cases;
create policy mabe_loja_agent_cases on public.agent_cases
  as restrictive
  for select
  to authenticated
  using (
    (select mabe.fn_sou_platform_admin())
    or organization_id in (select mabe.fn_orgs_livres())
    or conversation_id is null
    or mabe.fn_numero_da_conversa(conversation_id) in (select mabe.fn_numeros_permitidos())
  );

-- Assumir / transferir / trocar de número: fn_conversation_assign é SECURITY DEFINER,
-- então a política não a alcança. Quem chama com sessão (auth.uid() não nulo) precisa
-- ver a loja da conversa antes e depois. Worker e roteamento rodam com o service role
-- (auth.uid() nulo) e passam.
create or replace function mabe.fn_trava_atribuicao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null
     or mabe.fn_sou_platform_admin()
     or new.organization_id in (select mabe.fn_orgs_livres()) then
    return new;
  end if;
  if old.channel_session_id not in (select mabe.fn_numeros_permitidos())
     or new.channel_session_id not in (select mabe.fn_numeros_permitidos()) then
    raise exception 'conversa de outra loja' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function mabe.fn_trava_atribuicao() from public, anon;

drop trigger if exists mabe_trava_atribuicao on public.conversations;
create trigger mabe_trava_atribuicao
  before update of assigned_to_user_id, channel_session_id on public.conversations
  for each row
  execute function mabe.fn_trava_atribuicao();

-- Versão anterior deste arquivo (função por linha), substituída acima.
drop function if exists mabe.fn_ve_conversa(uuid, uuid);
drop function if exists mabe.fn_ve_numero(uuid, uuid);
