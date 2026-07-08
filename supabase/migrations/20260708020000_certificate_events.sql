-- The audit trail: an append-only event log per certificate. Who created,
-- submitted, approved, issued, voided, shared - the document's whole life,
-- demonstrable in one query. Events are never updated; deleting a draft
-- certificate cascades its history away with it, but issued and voided
-- certificates cannot be deleted through the app, so their history is
-- permanent alongside them.
create table certificate_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  certificate_id uuid not null references certificates (id) on delete cascade,
  event text not null,
  actor uuid references profiles (id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index certificate_events_cert_idx on certificate_events (certificate_id, created_at);

alter table certificate_events enable row level security;
create policy "members read events" on certificate_events
  for select using (is_org_member(org_id));
create policy "members append events" on certificate_events
  for insert with check (is_org_member(org_id) and (actor is null or actor = auth.uid()));

-- Append-only, enforced for every client including the service role.
create or replace function certificate_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Certificate events are append-only';
end;
$$;
create trigger certificate_events_no_update
  before update on certificate_events
  for each row execute function certificate_events_append_only();
