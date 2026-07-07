-- Org creation must be atomic (org + creator's admin membership) and must
-- work under RLS: you can't insert your own admin membership before you're
-- an admin, so this runs SECURITY DEFINER.
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
  insert into orgs (name, slug) values (org_name, org_slug)
  returning id into new_org_id;
  insert into org_members (org_id, user_id, role)
  values (new_org_id, auth.uid(), 'admin');
  return new_org_id;
end;
$$;

revoke all on function create_org(text, text) from public;
grant execute on function create_org(text, text) to authenticated;
