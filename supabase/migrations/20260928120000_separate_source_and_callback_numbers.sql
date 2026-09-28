-- Keep provider caller ID separate from the callback number confirmed by the
-- caller. Existing caller_phone values were copied from leads, so they belong
-- in callback_phone; historical source caller IDs cannot be reconstructed.
alter table public.calls rename column caller_phone to callback_phone;

alter table public.calls
  add column source_caller_phone text
  check (source_caller_phone is null or char_length(source_caller_phone) between 3 and 40);

create or replace function private.copy_lead_caller_phone_to_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.calls
  set callback_phone = new.caller_phone
  where id = new.call_id
    and organization_id = new.organization_id
    and location_id = new.location_id;
  return new;
end;
$function$;

-- A location name is not evidence that its real customer traffic is synthetic.
-- Only explicitly generated fixture call IDs remain marked as test data.
drop trigger if exists calls_apply_location_test_flag on public.calls;
drop trigger if exists leads_apply_location_test_flag on public.leads;
drop function if exists private.apply_location_test_flag();

update public.locations set is_test = false where is_test;

update public.calls
set is_test = (
  pg_catalog.starts_with(source_call_id, 'call_test_')
  or pg_catalog.starts_with(source_call_id, 'conv_bridge_smoke_')
);

update public.leads lead_row
set is_test = exists (
  select 1
  from public.calls call_row
  where call_row.id = lead_row.call_id
    and call_row.is_test
);

-- The fifth argument remains named p_caller_phone for PostgREST compatibility,
-- but now means provider-sourced incoming caller ID, never callback_phone.
create or replace function public.record_event_call_outcome(
  p_organization_id uuid,
  p_location_id uuid,
  p_source_call_id text,
  p_outcome text,
  p_caller_phone text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  location_is_active boolean;
begin
  if p_outcome is null
     or p_outcome not in ('in_progress', 'accepted', 'needs_information', 'duplicate', 'transfer_required', 'not_supported', 'failed')
     or nullif(pg_catalog.btrim(p_source_call_id), '') is null
     or (p_caller_phone is not null and char_length(p_caller_phone) not between 3 and 40) then
    return false;
  end if;

  select active into location_is_active
  from public.locations
  where id = p_location_id and organization_id = p_organization_id;

  if location_is_active is distinct from true then
    return false;
  end if;

  insert into public.calls (
    organization_id, location_id, source_call_id, source_caller_phone, request_type, outcome
  ) values (
    p_organization_id,
    p_location_id,
    pg_catalog.btrim(p_source_call_id),
    nullif(pg_catalog.btrim(p_caller_phone), ''),
    'event_lead',
    p_outcome
  )
  on conflict (location_id, source_call_id) do update
    set source_caller_phone = coalesce(excluded.source_caller_phone, public.calls.source_caller_phone),
        outcome = case
          when public.calls.outcome = 'accepted' then public.calls.outcome
          else excluded.outcome
        end;

  return true;
end;
$function$;

revoke all on function public.record_event_call_outcome(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_event_call_outcome(uuid, uuid, text, text, text)
  to service_role;
