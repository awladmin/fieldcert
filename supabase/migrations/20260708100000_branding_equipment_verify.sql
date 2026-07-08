-- Branding, signatures, equipment register and verification, in one pass.
-- orgs.branding (jsonb, already present) carries: color, logoPath,
-- schemeLogoPath, enrolmentNumber, address, phone, website.

-- Engineer's drawn/uploaded signature, rendered on certificates they sign.
alter table profiles add column signature_path text;

-- SHA-256 of the issued PDF: the anchor for public verification.
alter table certificates add column pdf_sha256 text;

-- The test equipment register: instruments with serials and calibration.
create table org_equipment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  kind text not null, -- multifunction | continuity | insulationResistance | earthFaultLoop | rcd | earthElectrode
  name text not null,
  serial text not null,
  calibration_due date,
  created_at timestamptz not null default now()
);
create index org_equipment_org_idx on org_equipment (org_id);

alter table org_equipment enable row level security;
create policy "members read equipment" on org_equipment
  for select using (is_org_member(org_id));
create policy "members write equipment" on org_equipment
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
