-- Retain retired feedback while hiding it from active reviewer workspaces.
alter table public.pmx_comments add column if not exists archived_at timestamptz;
