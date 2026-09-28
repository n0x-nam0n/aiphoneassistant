-- Mark demo/test workspaces and all records that belong to them. The desk hides
-- these by default while keeping them available through its test-record toggle.
alter table public.locations
  add column is_test boolean not null default false;

update public.locations
set is_test = true
where name ilike '%test%' or name ilike '%demo%';

alter table public.calls
  add column is_test boolean not null default false;

alter table public.leads
  add column is_test boolean not null default false;

update public.calls call_row
set is_test = location.is_test
from public.locations location
where location.id = call_row.location_id;

update public.leads lead_row
set is_test = location.is_test
from public.locations location
where location.id = lead_row.location_id;

create or replace function private.apply_location_test_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  select coalesce((
    select location.is_test
    from public.locations location
    where location.id = new.location_id
  ), false) into new.is_test;
  return new;
end;
$function$;

revoke all on function private.apply_location_test_flag() from public, anon, authenticated;

create trigger calls_apply_location_test_flag
  before insert on public.calls
  for each row execute function private.apply_location_test_flag();

create trigger leads_apply_location_test_flag
  before insert on public.leads
  for each row execute function private.apply_location_test_flag();
