-- Keep the provider caller ID and the caller-confirmed callback number distinct,
-- and reflect a real escalation requirement in the call's transfer state.
revoke all on function public.record_event_call_outcome(uuid, uuid, text, text, text)
  from public, anon, authenticated;
drop function public.record_event_call_outcome(uuid, uuid, text, text, text);

create function public.record_event_call_outcome(
  p_organization_id uuid,
  p_location_id uuid,
  p_source_call_id text,
  p_outcome text,
  p_caller_phone text,
  p_callback_phone text default null
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
     or (p_caller_phone is not null and char_length(p_caller_phone) not between 3 and 40)
     or (p_callback_phone is not null and char_length(p_callback_phone) not between 3 and 40) then
    return false;
  end if;

  select active into location_is_active
  from public.locations
  where id = p_location_id and organization_id = p_organization_id;

  if location_is_active is distinct from true then
    return false;
  end if;

  insert into public.calls (
    organization_id, location_id, source_call_id, source_caller_phone,
    callback_phone, request_type, outcome, transfer_state
  ) values (
    p_organization_id,
    p_location_id,
    pg_catalog.btrim(p_source_call_id),
    nullif(pg_catalog.btrim(p_caller_phone), ''),
    nullif(pg_catalog.btrim(p_callback_phone), ''),
    'event_lead',
    p_outcome,
    case when p_outcome = 'transfer_required' then 'required' else 'not_required' end
  )
  on conflict (location_id, source_call_id) do update
    set source_caller_phone = coalesce(excluded.source_caller_phone, public.calls.source_caller_phone),
        callback_phone = coalesce(excluded.callback_phone, public.calls.callback_phone),
        outcome = case
          when public.calls.outcome = 'accepted' then public.calls.outcome
          else excluded.outcome
        end,
        transfer_state = case
          when excluded.outcome = 'transfer_required' then 'required'
          else public.calls.transfer_state
        end;

  return true;
end;
$function$;

revoke all on function public.record_event_call_outcome(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_event_call_outcome(uuid, uuid, text, text, text, text)
  to service_role;

-- Repair existing records where the outcome already proves transfer was needed.
update public.calls
set transfer_state = 'required'
where outcome = 'transfer_required'
  and transfer_state = 'not_required';

-- If no different callback number was supplied, the inbound number is the
-- callback number. Keep the source number separately for caller-ID reporting.
update public.calls
set callback_phone = source_caller_phone
where callback_phone is null
  and source_caller_phone is not null;
