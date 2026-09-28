-- Keep the caller's source/callback number on the call record so the owner desk
-- can identify calls even when the conversation does not create a lead.
alter table public.calls
  add column caller_phone text
  check (caller_phone is null or char_length(caller_phone) between 3 and 40);

-- Recover caller numbers for accepted calls already in the lead table.
update public.calls call_row
set caller_phone = lead.caller_phone
from public.leads lead
where lead.call_id = call_row.id
  and call_row.caller_phone is null;

create or replace function private.copy_lead_caller_phone_to_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.calls
  set caller_phone = new.caller_phone
  where id = new.call_id
    and organization_id = new.organization_id
    and location_id = new.location_id;
  return new;
end;
$function$;

revoke all on function private.copy_lead_caller_phone_to_call() from public, anon, authenticated;

create trigger leads_copy_caller_phone_to_call
  after insert or update of caller_phone on public.leads
  for each row execute function private.copy_lead_caller_phone_to_call();

-- Phone-aware overload for non-lead outcomes. Keep the original four-argument
-- function intact for already deployed callers.
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
     or p_outcome not in ('in_progress', 'needs_information', 'duplicate', 'transfer_required', 'not_supported', 'failed')
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
    organization_id, location_id, source_call_id, caller_phone, request_type, outcome
  ) values (
    p_organization_id,
    p_location_id,
    pg_catalog.btrim(p_source_call_id),
    nullif(pg_catalog.btrim(p_caller_phone), ''),
    'event_lead',
    p_outcome
  )
  on conflict (location_id, source_call_id) do update
    set caller_phone = coalesce(excluded.caller_phone, public.calls.caller_phone),
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
