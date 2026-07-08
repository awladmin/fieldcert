-- Certificate integrity, enforced where it cannot be bypassed: the database.
-- Once a certificate is issued it is a legal record. The only permitted
-- change is voiding it (status -> 'void', everything else identical), and it
-- can never be deleted. This binds every path: the app, the API, PostgREST
-- with a member's own JWT, and even the service role.
--
-- UPLOADED records are exempt: they are archived copies of certificates
-- produced by other systems, not certificates we issued, so a mis-upload can
-- be removed.
create or replace function protect_issued_certificate()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'issued' or old.kind = 'UPLOADED' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Issued certificates are permanent records and cannot be deleted';
  end if;

  -- The one legal transition: void, with every other column untouched.
  if new.status = 'void'
     and to_jsonb(new) - 'status' - 'updated_at' = to_jsonb(old) - 'status' - 'updated_at' then
    return new;
  end if;

  raise exception 'Issued certificates cannot be modified; void the certificate and reissue instead';
end;
$$;

create trigger certificates_protect_issued
  before update or delete on certificates
  for each row execute function protect_issued_certificate();
