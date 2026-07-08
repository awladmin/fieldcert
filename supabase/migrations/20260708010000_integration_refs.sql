-- Platform integration keys: external systems (Tutaris and other FSM
-- platforms) identify records by their own ids, and social housing thinks in
-- UPRNs. These let the API upsert and link records deterministically instead
-- of matching on typed addresses.
alter table customers add column external_ref text;
alter table properties add column external_ref text;
alter table properties add column uprn text;

create unique index customers_org_external_ref_key
  on customers (org_id, external_ref) where external_ref is not null;
create unique index properties_org_external_ref_key
  on properties (org_id, external_ref) where external_ref is not null;
create unique index properties_org_uprn_key
  on properties (org_id, uprn) where uprn is not null;
