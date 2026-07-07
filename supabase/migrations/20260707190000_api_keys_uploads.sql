-- Public API keys (the core integration feature) and legacy certificate uploads.

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  name text not null,
  -- SHA-256 hex of the full key; the key itself is shown once and never stored
  key_hash text not null unique,
  -- first characters of the key, for display in the dashboard
  prefix text not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_org_idx on api_keys (org_id);

alter table api_keys enable row level security;
create policy "admins manage api keys" on api_keys
  for all using (org_role_of(org_id) = 'admin')
  with check (org_role_of(org_id) = 'admin');

-- Uploaded legacy certificates (old PDFs from other systems) live in the same
-- register with their file in the private bucket.
alter type certificate_kind add value if not exists 'UPLOADED';
