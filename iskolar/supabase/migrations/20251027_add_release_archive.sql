-- Adds isArchived column to releases table
alter table releases add column if not exists "isArchived" boolean default false not null;

-- Update RLS policies for archived releases
create policy "Admins can read archived releases"
  on releases for select
  to authenticated
  using (
    exists (
      select 1 from users
      where id = auth.uid()
      and role = 'admin'
    )
  );