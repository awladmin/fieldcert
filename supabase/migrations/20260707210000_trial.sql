-- 30-day free trial: no card up front, full product, converts to paid via billing.
alter table orgs add column trial_ends_at timestamptz;
