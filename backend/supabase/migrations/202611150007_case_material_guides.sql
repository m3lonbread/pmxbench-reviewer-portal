alter table public.pmx_literature add column if not exists is_key_source boolean not null default false;
create table if not exists public.pmx_material_guides(
 case_id text primary key references public.pmx_cases(id),
 payload jsonb not null
);
alter table public.pmx_material_guides enable row level security;
revoke all on public.pmx_material_guides from public,anon,authenticated;
grant select,insert,update,delete on public.pmx_material_guides to service_role;
