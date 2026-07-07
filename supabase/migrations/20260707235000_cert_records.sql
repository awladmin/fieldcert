-- Phase 1 of the editor roadmap: certificates get their number at creation
-- (not at issue), an optional job number for matching against external job
-- systems, and engineer/QS assignment that powers the list filters.
alter table certificates add column job_number text;
alter table certificates add column assigned_to uuid references profiles (id);
alter table certificates add column qs_member uuid references profiles (id);

-- Certificate numbers are unique within an org.
create unique index certificates_org_reference_key
  on certificates (org_id, reference)
  where reference is not null;
create index certificates_assigned_idx on certificates (org_id, assigned_to);
