-- A no-transfer callback queue for callers who need a person or reservation help.
alter table public.calls
  drop constraint if exists calls_request_type_check;

alter table public.calls
  add constraint calls_request_type_check
  check (request_type in ('event_lead', 'callback_request'));

create table public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  call_id uuid not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 240),
  source_call_id text not null check (char_length(source_call_id) between 1 and 200),
  source_caller_phone text check (source_caller_phone is null or char_length(source_caller_phone) between 3 and 40),
  caller_name text not null check (char_length(caller_name) between 1 and 160),
  callback_phone text not null check (char_length(callback_phone) between 3 and 40),
  details text not null check (char_length(details) between 1 and 2000),
  request_category text not null default 'general' check (request_category in ('general', 'large_party', 'complaint', 'staff_manager')),
  manager_notification_required boolean not null default false,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Completed')),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_id, id),
  unique (location_id, idempotency_key),
  unique (location_id, request_id),
  foreign key (organization_id, location_id) references public.locations(organization_id, id) on delete cascade,
  foreign key (organization_id, location_id, call_id) references public.calls(organization_id, location_id, id) on delete cascade
);

create table public.callback_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  callback_request_id uuid not null,
  channel text not null check (channel = 'email'),
  recipient text not null check (char_length(recipient) between 3 and 320),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 200),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (callback_request_id, channel, recipient),
  foreign key (organization_id, location_id) references public.locations(organization_id, id) on delete cascade,
  foreign key (organization_id, location_id, callback_request_id) references public.callback_requests(organization_id, location_id, id) on delete cascade
);

create index callback_requests_location_created_at_idx
  on public.callback_requests(location_id, created_at desc);
create index callback_requests_location_status_idx
  on public.callback_requests(location_id, status, created_at desc);
create index callback_notifications_pending_idx
  on public.callback_notifications(status, created_at) where status = 'pending';

create trigger callback_requests_touch_updated_at
  before update on public.callback_requests
  for each row execute function public.touch_pilot_updated_at();
create trigger callback_notifications_touch_updated_at
  before update on public.callback_notifications
  for each row execute function public.touch_pilot_updated_at();

alter table public.callback_requests enable row level security;
revoke all on public.callback_requests from anon, authenticated;
grant select, update on public.callback_requests to authenticated;
grant select, insert, update, delete on public.callback_requests to service_role;
alter table public.callback_notifications enable row level security;
revoke all on public.callback_notifications from anon, authenticated;
grant select, insert, update, delete on public.callback_notifications to service_role;

create policy "owners read their callback requests"
  on public.callback_requests for select to authenticated
  using (private.is_organization_owner(organization_id));

create policy "owners update their callback request status"
  on public.callback_requests for update to authenticated
  using (private.is_organization_owner(organization_id))
  with check (private.is_organization_owner(organization_id));

create or replace function public.submit_callback_request(
  p_organization_id uuid,
  p_location_id uuid,
  p_source_call_id text,
  p_idempotency_key text,
  p_source_caller_phone text,
  p_caller_name text,
  p_callback_phone text,
  p_details text,
  p_request_category text default 'general'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  call_row public.calls%rowtype;
  callback_row public.callback_requests%rowtype;
  location_row public.locations%rowtype;
begin
  if p_organization_id is null or p_location_id is null
     or nullif(pg_catalog.btrim(p_source_call_id), '') is null
     or char_length(p_source_call_id) > 200
     or nullif(pg_catalog.btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) > 240
     or nullif(pg_catalog.btrim(p_caller_name), '') is null
     or char_length(p_caller_name) > 160
     or nullif(pg_catalog.btrim(p_callback_phone), '') is null
     or char_length(p_callback_phone) not between 3 and 40
     or nullif(pg_catalog.btrim(p_details), '') is null
     or char_length(p_details) > 2000
     or p_request_category is null
     or p_request_category not in ('general', 'large_party', 'complaint', 'staff_manager')
     or (p_source_caller_phone is not null and char_length(p_source_caller_phone) not between 3 and 40) then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;

  select * into location_row
  from public.locations
  where id = p_location_id and organization_id = p_organization_id;

  if not found or not location_row.active then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  insert into public.calls (
    organization_id, location_id, source_call_id, source_caller_phone,
    callback_phone, request_type, outcome, transfer_state
  ) values (
    p_organization_id, p_location_id, pg_catalog.btrim(p_source_call_id),
    nullif(pg_catalog.btrim(p_source_caller_phone), ''),
    pg_catalog.btrim(p_callback_phone), 'callback_request', 'accepted', 'not_required'
  )
  on conflict (location_id, source_call_id) do update
    set source_caller_phone = coalesce(excluded.source_caller_phone, public.calls.source_caller_phone),
        callback_phone = coalesce(excluded.callback_phone, public.calls.callback_phone)
  returning * into call_row;

  insert into public.callback_requests (
    organization_id, location_id, call_id, idempotency_key, source_call_id,
    source_caller_phone, caller_name, callback_phone, details, request_category,
    manager_notification_required, is_test
  ) values (
    p_organization_id, p_location_id, call_row.id, pg_catalog.btrim(p_idempotency_key),
    pg_catalog.btrim(p_source_call_id), nullif(pg_catalog.btrim(p_source_caller_phone), ''),
    pg_catalog.btrim(p_caller_name), pg_catalog.btrim(p_callback_phone), pg_catalog.btrim(p_details),
    p_request_category, p_request_category <> 'general',
    call_row.is_test
  )
  on conflict (location_id, idempotency_key) do nothing
  returning * into callback_row;

  if not found then
    select * into callback_row
    from public.callback_requests
    where location_id = p_location_id and idempotency_key = p_idempotency_key;

    return pg_catalog.jsonb_build_object(
      'status', 'duplicate',
      'request_id', callback_row.request_id,
      'caller_message', 'Callback request is already recorded.'
    );
  end if;

  insert into public.callback_notifications (
    organization_id, location_id, callback_request_id, channel, recipient
  ) values (
    p_organization_id, p_location_id, callback_row.id, 'email', pg_catalog.btrim(location_row.manager_email)
  ) on conflict (callback_request_id, channel, recipient) do nothing;

  return pg_catalog.jsonb_build_object(
    'status', 'accepted',
    'request_id', callback_row.request_id,
    'caller_message', 'Callback request recorded.'
  );
end;
$function$;

revoke all on function public.submit_callback_request(uuid, uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_callback_request(uuid, uuid, text, text, text, text, text, text, text)
  to service_role;

comment on table public.callback_requests is
  'Private owner follow-up queue for callers who request a person or reservation assistance; never triggers a live call transfer.';
