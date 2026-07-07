-- FieldCert core schema: orgs, membership, customers, properties, certificates, evidence.
-- Tenancy: strict per-org isolation via RLS on every table (deliberate contrast with
-- Tutaris's app-layer scoping) — a user only ever sees rows for orgs they belong to.

create type org_role as enum ('admin', 'qs', 'engineer', 'office');
create type certificate_kind as enum ('EICR', 'EIC', 'MEIWC');
create type certificate_status as enum ('draft', 'pending_approval', 'approved', 'issued', 'void');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- logo, colours, footer text for branded PDFs
  branding jsonb not null default '{}'::jsonb,
  -- org-level policy rules layered over the statutory set (never replacing it)
  policy_rules jsonb not null default '[]'::jsonb,
  qs_approval_required boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references orgs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role org_role not null default 'engineer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index customers_org_idx on customers (org_id);

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  address jsonb not null default '{}'::jsonb,
  postcode text,
  created_at timestamptz not null default now()
);
create index properties_org_idx on properties (org_id);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  property_id uuid references properties (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  kind certificate_kind not null,
  status certificate_status not null default 'draft',
  reference text,
  -- the full certificate document, shaped by @fieldcert/cert-schemas
  data jsonb not null default '{}'::jsonb,
  -- last validation run: issues, counts, issuable flag (denormalised for lists)
  validation jsonb,
  created_by uuid not null references profiles (id),
  approved_by uuid references profiles (id),
  issued_at timestamptz,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index certificates_org_idx on certificates (org_id);
create index certificates_org_status_idx on certificates (org_id, status);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  certificate_id uuid not null references certificates (id) on delete cascade,
  storage_path text not null,
  kind text not null default 'photo',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);
create index evidence_cert_idx on evidence (certificate_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so policies can check membership without recursive RLS.
create or replace function is_org_member(check_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = check_org and user_id = auth.uid()
  );
$$;

create or replace function org_role_of(check_org uuid)
returns org_role
language sql
security definer
set search_path = public
stable
as $$
  select role from org_members
  where org_id = check_org and user_id = auth.uid();
$$;

alter table profiles enable row level security;
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table customers enable row level security;
alter table properties enable row level security;
alter table certificates enable row level security;
alter table evidence enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "members read org" on orgs
  for select using (is_org_member(id));
create policy "admins update org" on orgs
  for update using (org_role_of(id) = 'admin');

create policy "members read membership" on org_members
  for select using (is_org_member(org_id));
create policy "admins manage membership" on org_members
  for all using (org_role_of(org_id) = 'admin')
  with check (org_role_of(org_id) = 'admin');

create policy "members read customers" on customers
  for select using (is_org_member(org_id));
create policy "members write customers" on customers
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "members read properties" on properties
  for select using (is_org_member(org_id));
create policy "members write properties" on properties
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "members read certificates" on certificates
  for select using (is_org_member(org_id));
create policy "members insert certificates" on certificates
  for insert with check (is_org_member(org_id) and created_by = auth.uid());
create policy "members update certificates" on certificates
  for update using (is_org_member(org_id));

create policy "members read evidence" on evidence
  for select using (is_org_member(org_id));
create policy "members write evidence" on evidence
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger certificates_updated_at
  before update on certificates
  for each row execute function set_updated_at();

-- Private storage bucket for evidence photos and issued PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fieldcert',
  'fieldcert',
  false,
  26214400, -- 25MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']
);

create policy "org members read own org files" on storage.objects
  for select using (
    bucket_id = 'fieldcert'
    and is_org_member(((string_to_array(name, '/'))[1])::uuid)
  );
create policy "org members upload to own org" on storage.objects
  for insert with check (
    bucket_id = 'fieldcert'
    and is_org_member(((string_to_array(name, '/'))[1])::uuid)
  );
