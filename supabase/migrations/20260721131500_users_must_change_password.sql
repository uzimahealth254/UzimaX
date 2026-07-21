-- Align public.users with Drizzle schema (must_change_password for invite flow).
alter table public.users
  add column if not exists must_change_password boolean default false;
