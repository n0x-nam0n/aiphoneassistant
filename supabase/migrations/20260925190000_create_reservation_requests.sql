create table if not exists public.reservation_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  idempotency_key text not null unique,
  business_id text not null,
  source_call_id text not null,
  request_type text not null check (request_type = 'reservation_request'),
  name text not null check (char_length(name) between 1 and 160),
  phone text not null check (char_length(phone) between 3 and 40),
  date date not null,
  time time not null,
  party_size integer not null check (party_size between 1 and 8),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'PENDING_REVIEW'
    check (status in ('PENDING_REVIEW', 'LARGE_PARTY_REVIEW', 'CONFIRMED', 'DECLINED', 'CANCELLED')),
  confirmed boolean not null default false,
  environment text not null default 'test' check (environment in ('test', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reservation_requests is
  'Reservation requests for human review. A stored row is not a confirmed reservation.';
comment on column public.reservation_requests.environment is
  'Defaults to test. Production use must be explicitly configured.';

alter table public.reservation_requests enable row level security;
revoke all on public.reservation_requests from anon, authenticated;
grant select, insert on public.reservation_requests to service_role;
