-- Legal and marketing consent captured at signup, stored on the profile.
alter table profiles add column terms_accepted_at timestamptz;
alter table profiles add column marketing_opt_in boolean not null default false;
