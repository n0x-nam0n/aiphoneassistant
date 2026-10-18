-- Platform operators can use the existing restaurant desk across all tenants.
-- Only trusted administration can grant or revoke this role.
create table private.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade
    check (user_id = '100f2a70-a8e2-4128-a4eb-0a0363d19cc0'::uuid),
  created_at timestamptz not null default now()
);
alter table private.platform_administrators enable row level security;
revoke all on private.platform_administrators from public, anon, authenticated;
grant select, insert, delete on private.platform_administrators to service_role;

-- Existing policies and authenticated retry endpoints share this access check.
create or replace function private.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from private.platform_administrators administrator
    where administrator.user_id = auth.uid()
  ) or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  );
$function$;
revoke all on function private.is_organization_owner(uuid) from public, anon;
grant execute on function private.is_organization_owner(uuid) to authenticated, service_role;
