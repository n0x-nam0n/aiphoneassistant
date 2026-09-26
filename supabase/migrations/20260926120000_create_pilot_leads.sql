-- Hostess overflow pilot: tenant-scoped call and event-lead intake.
-- Trusted workflows write with service_role; invited owners read through scoped RLS.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  timezone text not null check (char_length(btrim(timezone)) between 1 and 80),
  ai_inbound_number text,
  forwarded_main_number text,
  human_transfer_number text,
  manager_email text check (manager_email is null or (char_length(manager_email) between 5 and 320 and pg_catalog.strpos(manager_email, '@') > 1)),
  active boolean not null default false,
  recording_enabled boolean not null default false,
  transcription_enabled boolean not null default false,
  recording_policy_approved_at timestamptz,
  recording_disclosure text,
  transcript_retention_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (human_transfer_number is null or forwarded_main_number is null or human_transfer_number <> forwarded_main_number),
  check (human_transfer_number is null or ai_inbound_number is null or human_transfer_number <> ai_inbound_number),
  check (not active or (nullif(btrim(ai_inbound_number), '') is not null and nullif(btrim(forwarded_main_number), '') is not null and nullif(btrim(human_transfer_number), '') is not null and nullif(btrim(manager_email), '') is not null)),
  check (not recording_enabled or (recording_policy_approved_at is not null and nullif(btrim(recording_disclosure), '') is not null)),
  check (not transcription_enabled or (recording_policy_approved_at is not null and nullif(btrim(recording_disclosure), '') is not null and transcript_retention_days is not null and transcript_retention_days > 0)),
  check (transcript_retention_days is null or transcript_retention_days between 1 and 3650)
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  source_call_id text not null check (char_length(source_call_id) between 1 and 200),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  request_type text not null default 'event_lead' check (request_type = 'event_lead'),
  outcome text not null check (outcome in ('in_progress', 'accepted', 'needs_information', 'duplicate', 'transfer_required', 'not_supported', 'failed')),
  transfer_state text not null default 'not_required' check (transfer_state in ('not_required', 'required', 'attempted', 'connected', 'failed')),
  safe_summary text check (safe_summary is null or char_length(safe_summary) <= 4000),
  created_at timestamptz not null default now(),
  unique (location_id, source_call_id),
  unique (organization_id, location_id, id),
  foreign key (organization_id, location_id) references public.locations(organization_id, id) on delete cascade,
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  call_id uuid not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 240),
  caller_phone text not null check (char_length(caller_phone) between 3 and 40),
  caller_name text check (caller_name is null or char_length(caller_name) between 1 and 160),
  caller_email text check (caller_email is null or char_length(caller_email) <= 320),
  event_type text check (event_type is null or char_length(event_type) between 1 and 120),
  event_date date,
  event_time time,
  party_size integer check (party_size is null or party_size > 0),
  budget_amount numeric(12, 2) check (budget_amount is null or budget_amount >= 0),
  budget_currency text check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$'),
  notes text check (notes is null or char_length(notes) <= 4000),
  safe_summary text check (safe_summary is null or char_length(safe_summary) <= 4000),
  status text not null default 'New' check (status in ('New', 'Contacted', 'Qualified', 'Won', 'Lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, idempotency_key),
  unique (organization_id, location_id, id),
  unique (location_id, request_id),
  foreign key (organization_id, location_id) references public.locations(organization_id, id) on delete cascade,
  foreign key (organization_id, location_id, call_id) references public.calls(organization_id, location_id, id) on delete cascade
);

create table public.lead_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  lead_id uuid not null,
  channel text not null check (channel in ('email')),
  recipient text not null check (char_length(recipient) between 3 and 320),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, channel, recipient),
  foreign key (organization_id, location_id) references public.locations(organization_id, id) on delete cascade,
  foreign key (organization_id, location_id, lead_id) references public.leads(organization_id, location_id, id) on delete cascade
);

create index calls_location_created_at_idx on public.calls(location_id, created_at desc);
create index leads_location_created_at_idx on public.leads(location_id, created_at desc);
create index leads_location_status_idx on public.leads(location_id, status, created_at desc);
create index lead_notifications_pending_idx on public.lead_notifications(status, created_at) where status = 'pending';

create or replace function public.touch_pilot_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.touch_pilot_updated_at() from public, anon, authenticated;

create trigger locations_touch_updated_at
  before update on public.locations
  for each row execute function public.touch_pilot_updated_at();

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_pilot_updated_at();

create trigger lead_notifications_touch_updated_at
  before update on public.lead_notifications
  for each row execute function public.touch_pilot_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  );
$function$;

revoke all on function private.is_organization_owner(uuid) from public, anon;
grant execute on function private.is_organization_owner(uuid) to authenticated, service_role;

-- Atomically save an accepted lead and its notification outbox item. The workflow
-- must provide tenant IDs from trusted location configuration, not caller input.
create or replace function public.submit_event_lead(
  p_organization_id uuid,
  p_location_id uuid,
  p_source_call_id text,
  p_idempotency_key text,
  p_caller_phone text,
  p_caller_name text default null,
  p_caller_email text default null,
  p_event_type text default null,
  p_event_date date default null,
  p_event_time time default null,
  p_party_size integer default null,
  p_budget_amount numeric default null,
  p_budget_currency text default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  location_row public.locations%rowtype;
  call_row public.calls%rowtype;
  lead_row public.leads%rowtype;
begin
  if p_organization_id is null or p_location_id is null
     or nullif(pg_catalog.btrim(p_source_call_id), '') is null
     or nullif(pg_catalog.btrim(p_idempotency_key), '') is null then
    return pg_catalog.jsonb_build_object(
      'status', 'failed',
      'action', 'request_not_processed',
      'request_id', null,
      'caller_message', 'I couldn’t send that inquiry just now. Please contact the restaurant directly.',
      'missing_fields', '[]'::jsonb,
      'transfer_target', null,
      'retry_allowed', true
    );
  end if;

  select * into location_row
  from public.locations
  where id = p_location_id and organization_id = p_organization_id
  for share;

  if not found or not location_row.active then
    return pg_catalog.jsonb_build_object(
      'status', 'failed',
      'action', 'request_not_processed',
      'request_id', null,
      'caller_message', 'I can’t send that inquiry right now. Please contact the restaurant directly.',
      'missing_fields', '[]'::jsonb,
      'transfer_target', null,
      'retry_allowed', false
    );
  end if;

  if nullif(pg_catalog.btrim(p_caller_phone), '') is null then
    return pg_catalog.jsonb_build_object(
      'status', 'needs_information',
      'action', 'collect_callback_number',
      'request_id', null,
      'caller_message', 'What phone number should the restaurant use to follow up with you?',
      'missing_fields', pg_catalog.jsonb_build_array('caller_phone'),
      'transfer_target', null,
      'retry_allowed', false
    );
  end if;

  select * into lead_row
  from public.leads
  where location_id = p_location_id and idempotency_key = p_idempotency_key;

  if found then
    return pg_catalog.jsonb_build_object(
      'status', 'duplicate',
      'action', 'event_lead_already_received',
      'request_id', lead_row.request_id,
      'caller_message', 'Your event inquiry has already been recorded for the restaurant to review. Nothing is booked yet.',
      'missing_fields', '[]'::jsonb,
      'transfer_target', null,
      'retry_allowed', false
    );
  end if;

  insert into public.calls (
    organization_id, location_id, source_call_id, request_type, outcome
  ) values (
    p_organization_id, p_location_id, pg_catalog.btrim(p_source_call_id), 'event_lead', 'accepted'
  )
  on conflict (location_id, source_call_id) do update
    set outcome = 'accepted'
  returning * into call_row;

  insert into public.leads (
    organization_id, location_id, call_id, idempotency_key, caller_phone,
    caller_name, caller_email, event_type, event_date, event_time,
    party_size, budget_amount, budget_currency, notes
  ) values (
    p_organization_id,
    p_location_id,
    call_row.id,
    pg_catalog.btrim(p_idempotency_key),
    pg_catalog.btrim(p_caller_phone),
    nullif(pg_catalog.btrim(p_caller_name), ''),
    nullif(pg_catalog.btrim(p_caller_email), ''),
    nullif(pg_catalog.btrim(p_event_type), ''),
    p_event_date,
    p_event_time,
    p_party_size,
    p_budget_amount,
    nullif(pg_catalog.upper(pg_catalog.btrim(p_budget_currency)), ''),
    nullif(pg_catalog.btrim(p_notes), '')
  )
  on conflict (location_id, idempotency_key) do nothing
  returning * into lead_row;

  if not found then
    select * into lead_row
    from public.leads
    where location_id = p_location_id and idempotency_key = p_idempotency_key;

    return pg_catalog.jsonb_build_object(
      'status', 'duplicate',
      'action', 'event_lead_already_received',
      'request_id', lead_row.request_id,
      'caller_message', 'Your event inquiry has already been recorded for the restaurant to review. Nothing is booked yet.',
      'missing_fields', '[]'::jsonb,
      'transfer_target', null,
      'retry_allowed', false
    );
  end if;

  insert into public.lead_notifications (
    organization_id, location_id, lead_id, channel, recipient
  ) values (
    p_organization_id, p_location_id, lead_row.id, 'email', pg_catalog.btrim(location_row.manager_email)
  ) on conflict (lead_id, channel, recipient) do nothing;

  return pg_catalog.jsonb_build_object(
    'status', 'accepted',
    'action', 'event_lead_received',
    'request_id', lead_row.request_id,
    'caller_message', 'I’ve recorded your event inquiry for the restaurant to review. Nothing is booked yet.',
    'missing_fields', '[]'::jsonb,
    'transfer_target', null,
    'retry_allowed', false
  );
end;
$function$;

revoke all on function public.submit_event_lead(uuid, uuid, text, text, text, text, text, text, date, time, integer, numeric, text, text) from public, anon, authenticated;
grant execute on function public.submit_event_lead(uuid, uuid, text, text, text, text, text, text, date, time, integer, numeric, text, text) to service_role;

-- Record outcome metadata without storing caller details for non-accepted branches.
create or replace function public.record_event_call_outcome(
  p_organization_id uuid,
  p_location_id uuid,
  p_source_call_id text,
  p_outcome text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  location_is_active boolean;
begin
  if p_outcome is null
     or p_outcome not in ('in_progress', 'needs_information', 'duplicate', 'transfer_required', 'not_supported', 'failed')
     or nullif(pg_catalog.btrim(p_source_call_id), '') is null then
    return false;
  end if;

  select active into location_is_active
  from public.locations
  where id = p_location_id and organization_id = p_organization_id;

  if location_is_active is distinct from true then
    return false;
  end if;

  insert into public.calls (
    organization_id, location_id, source_call_id, request_type, outcome
  ) values (
    p_organization_id, p_location_id, pg_catalog.btrim(p_source_call_id), 'event_lead', p_outcome
  )
  on conflict (location_id, source_call_id) do update
    set outcome = case
      when public.calls.outcome = 'accepted' then public.calls.outcome
      else excluded.outcome
    end;

  return true;
end;
$function$;

revoke all on function public.record_event_call_outcome(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_event_call_outcome(uuid, uuid, text, text) to service_role;

alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.calls enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notifications enable row level security;

revoke all on public.organizations, public.locations, public.organization_memberships, public.calls, public.leads, public.lead_notifications from anon, authenticated;
grant select, insert, update, delete on public.organizations, public.locations, public.organization_memberships, public.calls, public.leads, public.lead_notifications to service_role;
grant select on public.organizations, public.locations, public.calls, public.leads to authenticated;
grant update (status) on public.leads to authenticated;

create policy "owners read their organizations"
  on public.organizations for select to authenticated
  using (private.is_organization_owner(id));

create policy "owners read their locations"
  on public.locations for select to authenticated
  using (private.is_organization_owner(organization_id));

create policy "owners read their calls"
  on public.calls for select to authenticated
  using (private.is_organization_owner(organization_id));

create policy "owners read their leads"
  on public.leads for select to authenticated
  using (private.is_organization_owner(organization_id));

create policy "owners update their lead status"
  on public.leads for update to authenticated
  using (private.is_organization_owner(organization_id))
  with check (private.is_organization_owner(organization_id));

comment on table public.calls is 'Minimal call outcome record for the Hostess event-lead pilot; audio/transcripts are not stored here.';
comment on table public.leads is 'Tenant-scoped event inquiry for human follow-up; a lead is not a confirmed event or reservation.';
comment on table public.lead_notifications is 'Server-side notification delivery state; one delivery row per lead, channel, and destination.';
comment on column public.locations.forwarded_main_number is 'Existing restaurant number whose unanswered calls may conditionally forward to the AI.';
comment on column public.locations.human_transfer_number is 'Verified human destination; must not loop back to the restaurant forwarding route or AI.';
