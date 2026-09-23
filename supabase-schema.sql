create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 320),
  business_name text not null check (char_length(business_name) between 2 and 160),
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

drop policy if exists "Anyone can submit contact form" on public.contact_submissions;
create policy "Anyone can submit contact form"
  on public.contact_submissions for insert
  to anon, authenticated
  with check (status = 'new');

revoke all on public.contact_submissions from anon, authenticated;
grant insert on public.contact_submissions to anon, authenticated;

-- Read/update contact submissions only from a trusted server or dashboard role.
