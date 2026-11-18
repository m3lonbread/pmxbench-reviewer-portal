-- Alternate sign-in addresses belong to the existing private reviewer profile.
-- They do not create profiles, assignments, or coordinator access.
begin;
create or replace function public.pmx_valid_reviewer_email_aliases(p_aliases text[])
returns boolean language sql immutable parallel safe set search_path=pg_catalog as $$
 select coalesce(cardinality(p_aliases),0)<=5
  and not exists(select 1 from unnest(p_aliases) as a(email)
   where email is null or email<>lower(btrim(email))
    or email!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
  and coalesce(cardinality(p_aliases),0)=(select count(distinct email) from unnest(p_aliases) as a(email));
$$;
revoke all on function public.pmx_valid_reviewer_email_aliases(text[]) from public,anon,authenticated;
grant execute on function public.pmx_valid_reviewer_email_aliases(text[]) to service_role;
alter table public.pmx_experts add column if not exists login_email_aliases text[] not null default '{}';
alter table public.pmx_experts add constraint pmx_experts_email_aliases_valid
 check(public.pmx_valid_reviewer_email_aliases(login_email_aliases));
commit;
