begin;
alter table public.pmx_comments drop constraint pmx_comments_identity_method_check;
alter table public.pmx_comments add constraint pmx_comments_identity_method_check check(identity_method in ('verified_email','self_selected_name','name_email_match'));
create table public.pmx_reviewer_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 reviewer_id text not null references public.pmx_experts(id),
 matched_email text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz
);
create index pmx_reviewer_session_expiry on public.pmx_reviewer_sessions(expires_at);
create table public.pmx_reviewer_access_attempts (
 bucket_hash text primary key check(bucket_hash ~ '^[a-f0-9]{64}$'),
 window_started_at timestamptz not null default now(),
 attempts integer not null default 1 check(attempts>0)
);
alter table public.pmx_reviewer_sessions enable row level security;
alter table public.pmx_reviewer_access_attempts enable row level security;
revoke all on public.pmx_reviewer_sessions,public.pmx_reviewer_access_attempts from anon,authenticated;
grant all on public.pmx_reviewer_sessions,public.pmx_reviewer_access_attempts to service_role;
create function public.pmx_reserve_reviewer_attempt(p_bucket text) returns boolean language plpgsql set search_path=public,pg_temp as $$
declare count_value integer;
begin
 delete from public.pmx_reviewer_access_attempts where window_started_at<now()-interval '1 day';
 delete from public.pmx_reviewer_sessions where expires_at<now()-interval '1 day';
 insert into public.pmx_reviewer_access_attempts(bucket_hash) values(p_bucket)
 on conflict(bucket_hash) do update set
 attempts=case when pmx_reviewer_access_attempts.window_started_at<=now()-interval '15 minutes' then 1 else pmx_reviewer_access_attempts.attempts+1 end,
 window_started_at=case when pmx_reviewer_access_attempts.window_started_at<=now()-interval '15 minutes' then now() else pmx_reviewer_access_attempts.window_started_at end
 returning attempts into count_value;
 return count_value<=10;
end
$$;
revoke all on function public.pmx_reserve_reviewer_attempt(text) from public,anon,authenticated;
grant execute on function public.pmx_reserve_reviewer_attempt(text) to service_role;
insert into public.pmx_settings(key,value)
select 'reviewer_access_enabled',value from public.pmx_settings where key='name_selection_enabled'
on conflict(key) do nothing;
update public.pmx_settings set value='false'::jsonb where key='name_selection_enabled';
commit;
