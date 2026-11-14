create table if not exists public.pmx_literature (
 case_id text not null references public.pmx_cases(id),
 paper_id text not null check(paper_id ~ '^[a-f0-9]{32}$'),
 object_path text not null check(object_path ~ '^[a-f0-9]{64}\.pdf$'),
 meta jsonb not null,
 primary key(case_id,paper_id)
);
alter table public.pmx_literature enable row level security;
revoke all on public.pmx_literature from public,anon,authenticated;
grant select,insert,update,delete on public.pmx_literature to service_role;
