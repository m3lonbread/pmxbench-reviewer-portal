begin;
-- Retire replacement-style edits for every case-scoped admin, including old clients.
create or replace function public.pmx_save_scoped_assignments(p_group text,p_reviewer text,p_cases text[],p_changed_by text)
returns void language plpgsql set search_path=public,pg_temp as $$
begin
 raise exception 'Existing assignments are protected. Add reviewers instead.';
end
$$;
revoke all on function public.pmx_save_scoped_assignments(text,text,text[],text) from public,anon,authenticated,service_role;

-- Append allocations only. Existing expert profiles and assignment rows are immutable here.
create function public.pmx_add_scoped_reviewer(p_group text,p_name text,p_email text,p_cases text[],p_changed_by text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare g public.pmx_case_groups;person public.pmx_experts;target text;name_value text:=btrim(coalesce(p_name,''));email_value text:=lower(btrim(coalesce(p_email,'')));matches integer;total integer;added integer;created boolean:=false;
begin
 select * into g from public.pmx_case_groups where id=p_group and active for share;
 if not found or g.admin_mode<>'manage' then raise exception 'Adding reviewers is not enabled for this scope';end if;
 if name_value='' or length(name_value)>150 or length(email_value)>254 or email_value !~ '^\S+@\S+\.\S+$' then raise exception 'Enter a full name and valid reviewer email';end if;
 if p_cases is null or cardinality(p_cases) not between 1 and 3 or cardinality(p_cases)<>(select count(distinct x) from unnest(p_cases) x) or not p_cases<@g.case_ids then raise exception 'Choose one to three different cases within this scope';end if;
 if (select count(*) from public.pmx_cases where id=any(p_cases) and not coalesce((meta->>'archived')::boolean,false))<>cardinality(p_cases) then raise exception 'A selected case is unavailable';end if;
 if exists(select 1 from public.pmx_settings s cross join lateral jsonb_array_elements_text(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) e where s.key='coordinator_emails' and lower(btrim(e.value))=email_value) then raise exception 'This reviewer needs coordinator confirmation';end if;
 perform pg_advisory_xact_lock(hashtext('pmxbench-scoped-reviewer:'||email_value));
 select count(*) into matches from public.pmx_experts where login_email=email_value or email_value=any(login_email_aliases);
 if matches>1 then raise exception 'This reviewer needs coordinator confirmation';end if;
 if matches=1 then
  select * into person from public.pmx_experts where login_email=email_value or email_value=any(login_email_aliases) for update;
  if not found then raise exception 'This reviewer needs coordinator confirmation';end if;
  if person.status<>'verified' or lower(btrim(person.name))<>lower(name_value) or exists(select 1 from public.pmx_case_group_members where reviewer_id=person.id) or (g.workspace_mode='live' and person.source='Website test fixture') or (g.workspace_mode='test' and person.source<>'Website test fixture') then raise exception 'Use the recorded reviewer details, or ask the coordinator to confirm this profile';end if;
  target:=person.id;
 else
  if exists(select 1 from public.pmx_experts where lower(btrim(name))=lower(name_value)) then raise exception 'This reviewer needs coordinator confirmation';end if;
  target:=gen_random_uuid()::text;created:=true;
  insert into public.pmx_experts(id,name,email,login_email,status,source,notes)
  values(target,name_value,email_value,email_value,'verified',case when g.workspace_mode='test' then 'Website test fixture' else 'Added by case admin' end,'Added through restricted case scope '||g.label||'.');
 end if;
 -- Full-owner edits use the same expert row lock, so the total limit is atomic.
 select count(*) into total from (select case_id from public.pmx_assignments where reviewer_id=target union select unnest(p_cases)) combined;
 if total>3 then raise exception 'This reviewer cannot receive that selection within the three-case limit. Ask the coordinator to review their allocation.';end if;
 insert into public.pmx_assignments(reviewer_id,case_id,assigned_by)
 select target,x,p_changed_by from unnest(p_cases) x on conflict do nothing;
 get diagnostics added=row_count;
 if added>0 then
  insert into public.pmx_assignment_events(reviewer_id,case_ids,changed_by)
  select target,jsonb_agg(case_id order by case_id),p_changed_by from public.pmx_assignments where reviewer_id=target;
 end if;
 return jsonb_build_object('saved',true,'id',target,'created',created,'addedAssignments',added);
end
$$;
revoke all on function public.pmx_add_scoped_reviewer(text,text,text,text[],text) from public,anon,authenticated;
grant execute on function public.pmx_add_scoped_reviewer(text,text,text,text[],text) to service_role;
commit;
