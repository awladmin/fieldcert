-- Account types, mock billing state, team invites, and peer profile visibility.

alter table orgs add column account_type text not null default 'business';
alter table orgs add column plan text;
alter table orgs add column subscription_status text not null default 'incomplete';
alter table orgs add column seats int not null default 1;

alter table profiles add column email text;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create table invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  email text not null,
  role org_role not null default 'engineer',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index invites_pending_idx on invites (org_id, lower(email)) where accepted_at is null;
alter table invites enable row level security;
create policy "admins manage invites" on invites
  for all using (org_role_of(org_id) = 'admin')
  with check (org_role_of(org_id) = 'admin');

-- Invited users join their org on first login: match pending invites by email.
create or replace function claim_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  claimed int := 0;
  inv record;
begin
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    return 0;
  end if;
  for inv in
    select * from invites where lower(email) = lower(user_email) and accepted_at is null
  loop
    insert into org_members (org_id, user_id, role)
    values (inv.org_id, auth.uid(), inv.role)
    on conflict do nothing;
    update invites set accepted_at = now() where id = inv.id;
    claimed := claimed + 1;
  end loop;
  return claimed;
end;
$$;
revoke all on function claim_invites() from public;
grant execute on function claim_invites() to authenticated;

-- Team pages need to show colleagues' names and emails.
create or replace function shares_org_with(other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from org_members a
    join org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create policy "members read org peers" on profiles
  for select using (shares_org_with(id));

-- create_org now records the account type
create or replace function create_org(org_name text, org_slug text, org_account_type text default 'business')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into orgs (name, slug, account_type)
  values (org_name, org_slug, org_account_type)
  returning id into new_org_id;
  insert into org_members (org_id, user_id, role)
  values (new_org_id, auth.uid(), 'admin');
  return new_org_id;
end;
$$;
