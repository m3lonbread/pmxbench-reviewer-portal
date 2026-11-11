begin;
create table public.pmx_settings (key text primary key,value jsonb not null);
create table public.pmx_experts (
 id text primary key default gen_random_uuid()::text,name text not null,email text not null,login_email text not null unique check(login_email=lower(btrim(login_email))),
 affiliation text not null default '',status text not null default 'preliminary' check(status in ('preliminary','verified','inactive')),
 modeling_area text not null default '',research_focus text not null default '',notes text not null default '',source text not null default 'Added by coordinator',source_row integer,outreach_status text not null default '',
 auth_user_id uuid unique references auth.users(id) on delete set null,updated_at timestamptz not null default now()
);
create table public.pmx_cases (id text primary key,meta jsonb not null,packet jsonb not null);
create table public.pmx_assignments (reviewer_id text references public.pmx_experts(id),case_id text references public.pmx_cases(id),assigned_at timestamptz not null default now(),assigned_by text not null,primary key(reviewer_id,case_id));
create table public.pmx_reviews (reviewer_id text not null,case_id text references public.pmx_cases(id),rating jsonb not null default '{}',reviewed boolean not null default false,source_revision text not null,updated_at timestamptz not null default now(),primary key(reviewer_id,case_id));
create table public.pmx_comments (id uuid primary key,reviewer_id text not null,text text not null,quotes jsonb not null default '[]',reviewer_name text not null,created_at timestamptz not null default now());
create table public.pmx_assignment_events (id uuid primary key default gen_random_uuid(),reviewer_id text not null,case_ids jsonb not null,changed_by text not null,created_at timestamptz not null default now());
create index pmx_comment_owner on public.pmx_comments(reviewer_id,created_at);
-- Private application tables have no anonymous or authenticated REST access.
-- The authenticated Edge Function checks identity, roles, and case scope, then
-- uses its server-only service role for these tables. Browser keys cannot read them.
alter table public.pmx_settings enable row level security;
alter table public.pmx_experts enable row level security;
alter table public.pmx_cases enable row level security;
alter table public.pmx_assignments enable row level security;
alter table public.pmx_reviews enable row level security;
alter table public.pmx_comments enable row level security;
alter table public.pmx_assignment_events enable row level security;
revoke all on public.pmx_settings,public.pmx_experts,public.pmx_cases,public.pmx_assignments,public.pmx_reviews,public.pmx_comments,public.pmx_assignment_events from anon,authenticated;
grant all on public.pmx_settings,public.pmx_experts,public.pmx_cases,public.pmx_assignments,public.pmx_reviews,public.pmx_comments,public.pmx_assignment_events to service_role;

create function public.pmx_merge_rating(old jsonb,patch jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select (coalesce(old,'{}')||(coalesce(patch,'{}')-'values')) || case when patch ? 'values' then jsonb_build_object('values',jsonb_strip_nulls(coalesce(old->'values','{}')||(patch->'values'))) else '{}'::jsonb end
$$;
create function public.pmx_write_review(p_reviewer text,p_case text,p_patch jsonb,p_reviewed boolean,p_revision text) returns void language sql set search_path=public,pg_temp as $$
 insert into public.pmx_reviews(reviewer_id,case_id,rating,reviewed,source_revision) values(p_reviewer,p_case,public.pmx_merge_rating('{}',p_patch),coalesce(p_reviewed,false),p_revision)
 on conflict(reviewer_id,case_id) do update set rating=public.pmx_merge_rating(pmx_reviews.rating,p_patch),reviewed=coalesce(p_reviewed,pmx_reviews.reviewed),source_revision=p_revision,updated_at=now()
$$;
create function public.pmx_save_expert(p_id text,p_profile jsonb,p_changed_by text) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare person public.pmx_experts;target text:=coalesce(p_id,gen_random_uuid()::text);ids jsonb:=p_profile->'caseIds';name_value text;email_value text;status_value text;case_value text;
begin
 if p_id is not null then select * into person from public.pmx_experts where id=p_id for update;if not found then raise exception 'Expert not found';end if;end if;
 name_value:=btrim(coalesce(p_profile->>'name',person.name,''));email_value:=lower(btrim(coalesce(p_profile->>'loginEmail',person.login_email,'')));status_value:=coalesce(p_profile->>'status',person.status,'preliminary');
 if name_value='' or length(name_value)>150 or length(email_value)>254 or email_value !~ '^\S+@\S+\.\S+$' then raise exception 'Enter an expert name and valid sign-in email';end if;
 if status_value not in ('preliminary','verified','inactive') then raise exception 'Choose a valid expert status';end if;
 if ids is not null then
  if jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>2 then raise exception 'Choose up to two different cases';end if;
  if (select count(distinct value) from jsonb_array_elements_text(ids))<>jsonb_array_length(ids) then raise exception 'Choose different cases';end if;
 end if;
 insert into public.pmx_experts(id,name,email,login_email,affiliation,status,modeling_area,notes)
 values(target,name_value,email_value,email_value,coalesce(p_profile->>'affiliation',''),status_value,coalesce(p_profile->>'modelingArea',''),coalesce(p_profile->>'notes',''))
 on conflict(id) do update set name=name_value,login_email=email_value,affiliation=coalesce(p_profile->>'affiliation',pmx_experts.affiliation),status=status_value,modeling_area=coalesce(p_profile->>'modelingArea',pmx_experts.modeling_area),notes=coalesce(p_profile->>'notes',pmx_experts.notes),auth_user_id=case when pmx_experts.login_email=email_value then pmx_experts.auth_user_id else null end,updated_at=now();
 if ids is not null then
  delete from public.pmx_assignments where reviewer_id=target;
  for case_value in select jsonb_array_elements_text(ids) loop
   insert into public.pmx_assignments(reviewer_id,case_id,assigned_by) values(target,case_value,p_changed_by);
  end loop;
  insert into public.pmx_assignment_events(reviewer_id,case_ids,changed_by) values(target,ids,p_changed_by);
 end if;
 return jsonb_build_object('saved',true,'id',target,'status',status_value);
end
$$;
revoke all on function public.pmx_merge_rating(jsonb,jsonb),public.pmx_write_review(text,text,jsonb,boolean,text),public.pmx_save_expert(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.pmx_merge_rating(jsonb,jsonb),public.pmx_write_review(text,text,jsonb,boolean,text),public.pmx_save_expert(text,jsonb,text) to service_role;
commit;
