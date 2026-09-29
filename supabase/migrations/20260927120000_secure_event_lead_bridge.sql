-- Quotas for the authenticated voice-agent bridge. Invalid and incomplete
-- submissions count toward quota so they cannot be used for denial of wallet.

create table private.event_bridge_rate_limits (
  scope text not null check (scope in ('source', 'conversation')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at)
);

revoke all on table private.event_bridge_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.event_bridge_rate_limits to service_role;

create index event_bridge_rate_limits_cleanup_idx
  on private.event_bridge_rate_limits (window_started_at);

create or replace function public.consume_event_bridge_quota(
  p_source_key_hash text,
  p_conversation_key_hash text,
  p_source_limit integer default 10,
  p_conversation_limit integer default 5
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_window timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now());
  source_count integer;
  conversation_count integer;
begin
  if p_source_key_hash !~ '^[0-9a-f]{64}$'
     or p_conversation_key_hash !~ '^[0-9a-f]{64}$'
     or p_source_limit not between 1 and 100
     or p_conversation_limit not between 1 and 20 then
    return false;
  end if;

  insert into private.event_bridge_rate_limits (
    scope, key_hash, window_started_at, request_count
  ) values (
    'source', p_source_key_hash, current_window, 1
  )
  on conflict (scope, key_hash, window_started_at) do update
    set request_count = private.event_bridge_rate_limits.request_count + 1,
        updated_at = pg_catalog.now()
  returning request_count into source_count;

  insert into private.event_bridge_rate_limits (
    scope, key_hash, window_started_at, request_count
  ) values (
    'conversation', p_conversation_key_hash, current_window, 1
  )
  on conflict (scope, key_hash, window_started_at) do update
    set request_count = private.event_bridge_rate_limits.request_count + 1,
        updated_at = pg_catalog.now()
  returning request_count into conversation_count;

  delete from private.event_bridge_rate_limits
  where window_started_at < pg_catalog.now() - interval '48 hours';

  return source_count <= p_source_limit
     and conversation_count <= p_conversation_limit;
end;
$function$;

revoke all on function public.consume_event_bridge_quota(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_event_bridge_quota(text, text, integer, integer)
  to service_role;

comment on function public.consume_event_bridge_quota(text, text, integer, integer)
  is 'Atomically applies per-source and per-conversation hourly quotas for the authenticated voice bridge.';
