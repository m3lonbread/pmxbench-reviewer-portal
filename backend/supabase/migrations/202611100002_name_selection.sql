begin;
alter table public.pmx_comments add column identity_method text not null default 'verified_email' check(identity_method in ('verified_email','self_selected_name'));
alter table public.pmx_experts alter column login_email drop not null;
alter table public.pmx_experts alter column email set default '';
insert into public.pmx_settings(key,value) values('name_selection_enabled','false'::jsonb) on conflict(key) do nothing;
create or replace function public.pmx_save_expert(p_id text,p_profile jsonb,p_changed_by text) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare person public.pmx_experts;target text:=coalesce(p_id,gen_random_uuid()::text);ids jsonb:=p_profile->'caseIds';name_value text;email_value text;status_value text;case_value text;
begin
 if p_id is not null then select * into person from public.pmx_experts where id=p_id for update;if not found then raise exception 'Expert not found';end if;end if;
 name_value:=btrim(coalesce(p_profile->>'name',person.name,''));email_value:=lower(btrim(coalesce(p_profile->>'loginEmail',person.login_email,'')));status_value:=coalesce(p_profile->>'status',person.status,'preliminary');
 if name_value='' or length(name_value)>150 or length(email_value)>254 or (email_value<>'' and email_value !~ '^\S+@\S+\.\S+$') then raise exception 'Enter an expert name and a valid contact email, if provided';end if;
 if status_value not in ('preliminary','verified','inactive') then raise exception 'Choose a valid expert status';end if;
 if ids is not null then
  if jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>2 then raise exception 'Choose up to two different cases';end if;
  if (select count(distinct value) from jsonb_array_elements_text(ids))<>jsonb_array_length(ids) then raise exception 'Choose different cases';end if;
 end if;
 insert into public.pmx_experts(id,name,email,login_email,affiliation,status,modeling_area,notes)
 values(target,name_value,email_value,nullif(email_value,''),coalesce(p_profile->>'affiliation',''),status_value,coalesce(p_profile->>'modelingArea',''),coalesce(p_profile->>'notes',''))
 on conflict(id) do update set name=name_value,email=email_value,login_email=nullif(email_value,''),affiliation=coalesce(p_profile->>'affiliation',pmx_experts.affiliation),status=status_value,modeling_area=coalesce(p_profile->>'modelingArea',pmx_experts.modeling_area),notes=coalesce(p_profile->>'notes',pmx_experts.notes),auth_user_id=case when pmx_experts.login_email=email_value then pmx_experts.auth_user_id else null end,updated_at=now();
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
commit;
