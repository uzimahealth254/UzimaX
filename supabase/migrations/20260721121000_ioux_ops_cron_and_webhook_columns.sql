-- IOUX production hardening: invoice fields + cron maintenance.
-- Safe to re-run (idempotent) on hosted Supabase.

-- P1.4 fields from go-live plan (commitment-to-pay + standing-order reference).
alter table public.invoices
  add column if not exists commitment_to_pay boolean not null default false,
  add column if not exists bank_standing_order_ref text;

-- Maintenance indexes for scheduled cleanup.
create index if not exists idx_otp_codes_expires_at on public.otp_codes (expires_at);
create index if not exists idx_refresh_tokens_expires_at on public.refresh_tokens (expires_at);

-- Ensure extensions are available (Supabase managed schema).
create extension if not exists pg_cron with schema extensions;

create or replace function public.ioux_nightly_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otp_deleted integer := 0;
  v_refresh_deleted integer := 0;
begin
  delete from public.otp_codes
  where expires_at < now() - interval '1 day';
  get diagnostics v_otp_deleted = row_count;

  delete from public.refresh_tokens
  where expires_at < now() - interval '7 days';
  get diagnostics v_refresh_deleted = row_count;

  insert into public.audit_log (
    actor_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    details,
    ip_address
  ) values (
    null,
    'system@ioux.africa',
    'system.cron.maintenance',
    'system',
    null,
    jsonb_build_object(
      'otp_deleted', v_otp_deleted,
      'refresh_tokens_deleted', v_refresh_deleted,
      'ran_at', now()
    ),
    '127.0.0.1'
  );

  return jsonb_build_object(
    'ok', true,
    'otp_deleted', v_otp_deleted,
    'refresh_tokens_deleted', v_refresh_deleted
  );
end;
$$;

revoke all on function public.ioux_nightly_maintenance() from public;
grant execute on function public.ioux_nightly_maintenance() to postgres;
grant execute on function public.ioux_nightly_maintenance() to service_role;

do $$
begin
  -- Replace existing schedule if present.
  if exists (select 1 from cron.job where jobname = 'ioux_nightly_maintenance') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'ioux_nightly_maintenance';
  end if;

  perform cron.schedule(
    'ioux_nightly_maintenance',
    '15 1 * * *', -- daily at 01:15 UTC
    $job$select public.ioux_nightly_maintenance();$job$
  );
exception
  when undefined_table then
    -- pg_cron catalog absent on some local setups; migration remains safe.
    null;
end $$;
