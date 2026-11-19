begin;
-- Private, explicit case grants. These never add emails to the global owner list.
create table public.pmx_case_groups (
 id text primary key check(id ~ '^[a-z0-9-]{1,80}$'),
 label text not null,
 source_case_ids text[] not null check(cardinality(source_case_ids) between 1 and 20),
 case_ids text[] not null default '{}',
 active boolean not null default false,
 workspace_mode text check(workspace_mode in ('live','test')),
 admin_mode text check(admin_mode in ('view_export','manage')),
 activated_by text,activated_at timestamptz,
 check(not active or (workspace_mode is not null and admin_mode is not null and cardinality(case_ids)>0))
);
create table public.pmx_case_group_members (
 reviewer_id text primary key references public.pmx_experts(id),
 group_id text not null references public.pmx_case_groups(id),
 role text not null check(role in ('case_admin','case_viewer')),
 auth_user_id uuid unique references auth.users(id)
);
alter table public.pmx_case_groups enable row level security;
alter table public.pmx_case_group_members enable row level security;
revoke all on public.pmx_case_groups,public.pmx_case_group_members from public,anon,authenticated;
grant all on public.pmx_case_groups,public.pmx_case_group_members to service_role;

-- Activate only after the owner has reviewed the scope and created admin credentials.
-- Test copies retain real scientific content but cannot enter benchmark exports.
create function public.pmx_activate_case_group(p_group text,p_mode text,p_admin_mode text,p_changed_by text)
returns void language plpgsql set search_path=public,pg_temp as $$
declare g public.pmx_case_groups;c public.pmx_cases;packet_value jsonb;meta_value jsonb;copy_id text;next_number integer;ids text[]:='{}';source_id text;
begin
 perform pg_advisory_xact_lock(hashtext('pmxbench-case-group-activation'));
 select * into g from public.pmx_case_groups where id=p_group for update;
 if not found or g.active then raise exception 'Access group is missing or already active';end if;
 if p_mode not in ('live','test') or p_admin_mode not in ('view_export','manage') or p_mode is null or p_admin_mode is null then raise exception 'Choose a workspace and admin permissions';end if;
 if not exists(select 1 from public.pmx_case_group_members where group_id=p_group and role='case_admin') or exists(select 1 from public.pmx_case_group_members where group_id=p_group and role='case_admin' and auth_user_id is null) then raise exception 'Finish creating the admin accounts first';end if;
 if cardinality(g.source_case_ids)<>(select count(distinct x) from unnest(g.source_case_ids) x) then raise exception 'Case scope contains duplicates';end if;
 select coalesce(max((meta->>'number')::int),0)+1 into next_number from public.pmx_cases;
 foreach source_id in array g.source_case_ids loop
  select * into c from public.pmx_cases where id=source_id;
  if not found or coalesce((c.meta->>'isTest')::boolean,false) or coalesce((c.meta->>'archived')::boolean,false) then raise exception 'A source case is unavailable';end if;
  if p_mode='live' then ids:=array_append(ids,source_id);continue;end if;
  copy_id:='group-'||g.id||'--'||source_id;
  packet_value:=c.packet||jsonb_build_object('id',copy_id,'slug',copy_id,'number',next_number,'title','Test copy · '||(c.packet->>'title'),'isTest',true,'testSourceCaseId',source_id,'testSourceCaseNumber',c.meta->'number','testSourceRevision',c.packet->>'revision','sourceRoot','case-groups/'||g.id);
  packet_value:=jsonb_set(packet_value,'{sections}',(select jsonb_agg(value||jsonb_build_object('id',copy_id||'-section-'||ordinality,'number',next_number||'.'||ordinality) order by ordinality) from jsonb_array_elements(c.packet->'sections') with ordinality));
  packet_value:=jsonb_set(packet_value,'{rubric}',coalesce((select jsonb_agg(value||jsonb_build_object('id',copy_id||'-rubric-'||(ordinality-1)) order by ordinality) from jsonb_array_elements(c.packet->'rubric') with ordinality),'[]'));
  packet_value:=packet_value||jsonb_build_object('revision','groupcopy-'||md5(packet_value::text));
  meta_value:=packet_value-'prompt'-'rubric'-'materials';
  insert into public.pmx_cases(id,meta,packet) values(copy_id,meta_value,packet_value);
  ids:=array_append(ids,copy_id);next_number:=next_number+1;
 end loop;
 update public.pmx_experts set status='verified',updated_at=now() where id in(select reviewer_id from public.pmx_case_group_members where group_id=p_group);
 update public.pmx_case_groups set case_ids=ids,workspace_mode=p_mode,admin_mode=p_admin_mode,active=true,activated_at=now(),activated_by=p_changed_by where id=p_group;
end
$$;

-- Scoped admins can change only assignments already represented in their roster.
-- Lock the same expert row as the full coordinator RPC, preserving outside cases.
create function public.pmx_save_scoped_assignments(p_group text,p_reviewer text,p_cases text[],p_changed_by text)
returns void language plpgsql set search_path=public,pg_temp as $$
declare g public.pmx_case_groups;all_ids text[];
begin
 select * into g from public.pmx_case_groups where id=p_group and active for share;
 if not found or g.admin_mode<>'manage' then raise exception 'Assignment management is not enabled for this scope';end if;
 perform 1 from public.pmx_experts where id=p_reviewer for update;
 if not found or exists(select 1 from public.pmx_case_group_members where reviewer_id=p_reviewer) then raise exception 'Expert not available in this scope';end if;
 if not exists(select 1 from public.pmx_assignments where reviewer_id=p_reviewer and case_id=any(g.case_ids)) then raise exception 'Expert not available in this scope';end if;
 if p_cases is null or cardinality(p_cases)<>(select count(distinct x) from unnest(p_cases) x) or not p_cases<@g.case_ids then raise exception 'Choose different cases within this scope';end if;
 select coalesce(array_agg(case_id),'{}') into all_ids from public.pmx_assignments where reviewer_id=p_reviewer and not case_id=any(g.case_ids);
 all_ids:=all_ids||p_cases;
 if cardinality(all_ids)>3 then raise exception 'This expert has no remaining capacity for that selection';end if;
 delete from public.pmx_assignments where reviewer_id=p_reviewer and case_id=any(g.case_ids) and not case_id=any(p_cases);
 insert into public.pmx_assignments(reviewer_id,case_id,assigned_by) select p_reviewer,x,p_changed_by from unnest(p_cases) x on conflict do nothing;
 insert into public.pmx_assignment_events(reviewer_id,case_ids,changed_by) values(p_reviewer,to_jsonb(all_ids),p_changed_by);
end
$$;
revoke all on function public.pmx_activate_case_group(text,text,text,text),public.pmx_save_scoped_assignments(text,text,text[],text) from public,anon,authenticated;
grant execute on function public.pmx_activate_case_group(text,text,text,text),public.pmx_save_scoped_assignments(text,text,text[],text) to service_role;
commit;
