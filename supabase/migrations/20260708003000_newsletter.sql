-- Pre-launch newsletter signups from the marketing site. No RLS policies on
-- purpose: rows are written and read only via the service role.
create table newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'marketing',
  created_at timestamptz not null default now()
);
alter table newsletter_signups enable row level security;
