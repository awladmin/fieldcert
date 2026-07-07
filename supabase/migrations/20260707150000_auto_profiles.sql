-- Profiles must exist for every auth user: org_members.user_id references
-- profiles(id), so a missing profile breaks org creation. Create profiles
-- automatically on signup, and defensively inside create_org.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill any existing users without a profile
insert into profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function create_org(org_name text, org_slug text)
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
  -- Safety net: ensure the caller has a profile row
  insert into profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into orgs (name, slug) values (org_name, org_slug)
  returning id into new_org_id;
  insert into org_members (org_id, user_id, role)
  values (new_org_id, auth.uid(), 'admin');
  return new_org_id;
end;
$$;
