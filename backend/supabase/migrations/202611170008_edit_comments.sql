begin;
alter table public.pmx_comments add column updated_at timestamptz;
alter table public.pmx_comments add column edit_version integer not null default 0;
create table public.pmx_comment_edits (
 id bigint generated always as identity primary key,
 comment_id uuid not null references public.pmx_comments(id),
 reviewer_id text not null,
 previous_text text not null,
 new_text text not null,
 edited_at timestamptz not null default now()
);
alter table public.pmx_comment_edits enable row level security;
revoke all on public.pmx_comment_edits from anon,authenticated;
grant all on public.pmx_comment_edits to service_role;
grant usage,select on sequence public.pmx_comment_edits_id_seq to service_role;
create function public.pmx_edit_comment(p_reviewer text,p_id uuid,p_text text,p_expected_version integer,p_visible_cases text[]) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare item public.pmx_comments;new_text text:=btrim(p_text);
begin
 if new_text is null or new_text='' or length(new_text)>20000 then raise exception 'Enter a comment of up to 20,000 characters.';end if;
 select * into item from public.pmx_comments where id=p_id and reviewer_id=p_reviewer and archived_at is null for update;
 if not found or exists(select 1 from jsonb_array_elements(item.quotes) q where not ((q->>'caseId')=any(p_visible_cases))) then raise exception using errcode='P0002',message='Comment not found.';end if;
 if p_expected_version is null or item.edit_version<>p_expected_version then raise exception using errcode='PT409',message='This comment changed elsewhere. Cancel editing and refresh before trying again.';end if;
 if item.text=new_text then return to_jsonb(item);end if;
 insert into public.pmx_comment_edits(comment_id,reviewer_id,previous_text,new_text) values(item.id,p_reviewer,item.text,new_text);
 update public.pmx_comments set text=new_text,updated_at=now(),edit_version=edit_version+1 where id=item.id returning * into item;
 return to_jsonb(item);
end $$;
revoke all on function public.pmx_edit_comment(text,uuid,text,integer,text[]) from public,anon,authenticated;
grant execute on function public.pmx_edit_comment(text,uuid,text,integer,text[]) to service_role;
commit;
