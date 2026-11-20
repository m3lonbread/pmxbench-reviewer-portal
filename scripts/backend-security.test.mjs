import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeQuotes,validateRatingPatch,requireCoordinator,requireWrite,assertCases} from '../backend/supabase/functions/pmxbench/domain.ts';
import {assertReviewerRoute} from '../backend/supabase/functions/pmxbench/picker.ts';
test('PostgreSQL keeps private data inaccessible and applies review changes atomically',async t=>{
 const pg=new PGlite();
 try{
  await pg.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);');
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611100001_review_portal.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611100002_name_selection.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611100003_three_case_assignments.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611120004_reviewer_email_access.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611130005_archive_feedback.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611130006_source_literature.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611150007_case_material_guides.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611170008_edit_comments.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611180009_reviewer_email_aliases.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611190010_scoped_case_access.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611190011_add_only_case_reviewers.sql',import.meta.url),'utf8'));
  for(const id of ['case1','case2','case3','case4'])await pg.query('insert into pmx_cases(id,meta,packet) values($1,$2::jsonb,$3::jsonb)',[id,JSON.stringify({id}),JSON.stringify({id,prompt:'private prompt'})]);
  async function as(role,run){await pg.exec('set role '+role);try{return await run();}finally{await pg.exec('reset role');}}
  await t.test('anonymous and authenticated clients cannot read private tables or invoke privileged RPCs',async()=>{
   for(const role of ['anon','authenticated'])await as(role,async()=>{for(const table of ['pmx_case_groups','pmx_case_group_members','pmx_comment_edits','pmx_material_guides','pmx_literature','pmx_cases','pmx_experts','pmx_reviews','pmx_comments','pmx_assignments','pmx_settings','pmx_reviewer_sessions','pmx_reviewer_access_attempts'])await assert.rejects(pg.query('select * from '+table),/permission denied/);await assert.rejects(pg.query("select pmx_write_review('victim','case1','{}',true,'rev')"),/permission denied/);await assert.rejects(pg.query("select pmx_save_expert(null,'{}','attacker')"),/permission denied/);await assert.rejects(pg.query("select pmx_reserve_reviewer_attempt(repeat('a',64))"),/permission denied/);});
  });
  await t.test('one-to-three-case plans work; invalid case selections cannot partially activate an expert',async()=>{
   await as('service_role',async()=>{
    const created=await pg.query('select pmx_save_expert(null,$1::jsonb,$2) result',[JSON.stringify({name:'Synthetic expert',loginEmail:'expert@example.test',caseIds:['case1']}),'coordinator@example.test']);
    const id=created.rows[0].result.id;
    await assert.rejects(pg.query('select pmx_save_expert($1,$2::jsonb,$3)',[id,JSON.stringify({status:'verified',caseIds:['case1','case2','case3','case4']}),'coordinator@example.test']),/three different cases/);
    let row=(await pg.query('select status from pmx_experts where id=$1',[id])).rows[0];assert.equal(row.status,'preliminary');
    assert.equal((await pg.query('select count(*)::int n from pmx_assignments where reviewer_id=$1',[id])).rows[0].n,1);
    await pg.query('select pmx_save_expert($1,$2::jsonb,$3)',[id,JSON.stringify({status:'verified',caseIds:['case1','case2','case3']}),'coordinator@example.test']);
    assert.equal((await pg.query('select count(*)::int n from pmx_assignments where reviewer_id=$1',[id])).rows[0].n,3);
   });
  });
  await t.test('name selection starts disabled, and experts can be added without email',async()=>{
   const setting=(await pg.query("select value from pmx_settings where key='name_selection_enabled'")).rows[0];
   assert.equal(setting.value,false);
   await as('service_role',async()=>{
    const created=await pg.query('select pmx_save_expert(null,$1::jsonb,$2) result',[JSON.stringify({name:'Name-only expert',status:'verified',caseIds:['case1']}),'coordinator@example.test']);
    const row=(await pg.query('select login_email,email,status from pmx_experts where id=$1',[created.rows[0].result.id])).rows[0];
    assert.equal(row.login_email,null);assert.equal(row.email,'');assert.equal(row.status,'verified');
   });
  });
  await t.test('email matching attempts are bounded per bucket and reset after the time window',async()=>{
   await as('service_role',async()=>{
    for(let n=1;n<=11;n++)assert.equal((await pg.query("select pmx_reserve_reviewer_attempt(repeat('a',64)) allowed")).rows[0].allowed,n<=10);
    assert.equal((await pg.query("select pmx_reserve_reviewer_attempt(repeat('b',64)) allowed")).rows[0].allowed,true);
    await pg.query("update pmx_reviewer_access_attempts set window_started_at=now()-interval '16 minutes' where bucket_hash=repeat('a',64)");
    assert.equal((await pg.query("select pmx_reserve_reviewer_attempt(repeat('a',64)) allowed")).rows[0].allowed,true);
   });
  });
  await t.test('alternate reviewer emails are explicit, normalized and private',async()=>{
   await as('service_role',async()=>{
    const created=await pg.query('select pmx_save_expert(null,$1::jsonb,$2) result',[JSON.stringify({name:'Alias reviewer',loginEmail:'primary@example.test',status:'verified',caseIds:['case1']}),'coordinator@example.test']),id=created.rows[0].result.id;
    assert.deepEqual((await pg.query('select login_email_aliases from pmx_experts where id=$1',[id])).rows[0].login_email_aliases,[]);
    await pg.query('update pmx_experts set login_email_aliases=$2 where id=$1',[id,['alternate@example.test']]);
    assert.equal((await pg.query('select login_email from pmx_experts where id=$1',[id])).rows[0].login_email,'primary@example.test');
    for(const aliases of [[' ALTERNATE@example.test'],['alternate@example.test','alternate@example.test'],['invalid'],[null]])await assert.rejects(pg.query('update pmx_experts set login_email_aliases=$2 where id=$1',[id,aliases]),/email_aliases_valid/);
   });
   for(const role of ['anon','authenticated'])await as(role,()=>assert.rejects(pg.query("select login_email_aliases from pmx_experts"),/permission denied/));
  });
  await t.test('comment edits enforce ownership, source visibility and optimistic versions while preserving quotations',async()=>{
   const id='11111111-1111-4111-8111-111111111111',quotes=[{caseId:'case1',blockId:'source',text:'Original quotation'}];
   await pg.query('insert into pmx_comments(id,reviewer_id,text,quotes,reviewer_name) values($1,$2,$3,$4,$5)',[id,'owner','Original comment',quotes,'Original reviewer']);
   const original=(await pg.query('select to_jsonb(c) item from pmx_comments c where id=$1',[id])).rows[0].item;
   const edit=(owner,text,version,ids=['case1'])=>pg.query('select pmx_edit_comment($1,$2,$3,$4,$5) item',[owner,id,text,version,ids]);
   for(const role of ['anon','authenticated'])await as(role,()=>assert.rejects(edit('owner','Unauthorized',0),/permission denied/));
   await as('service_role',async()=>{
    await assert.rejects(edit('other','Other reviewer',0),/Comment not found/);
    await assert.rejects(edit('owner','Unassigned',0,['case2']),/Comment not found/);
    await assert.rejects(edit('owner',' ',0),/Enter a comment/);
    const item=(await edit('owner','Revised comment',0)).rows[0].item;
    assert.equal(item.text,'Revised comment');assert.equal(item.edit_version,1);assert.ok(item.updated_at);
    for(const key of ['quotes','reviewer_id','reviewer_name','created_at','identity_method'])assert.deepEqual(item[key],original[key]);
    await assert.rejects(edit('owner','Stale edit',0),e=>e.code==='PT409'&&/changed elsewhere/.test(e.message));
    assert.equal((await pg.query('select count(*)::int n from pmx_comment_edits')).rows[0].n,1);
    await edit('owner','Revised comment',1);assert.equal((await pg.query('select count(*)::int n from pmx_comment_edits')).rows[0].n,1);
    await pg.query('update pmx_comments set archived_at=now() where id=$1',[id]);
    await assert.rejects(edit('owner','Archived edit',1),/Comment not found/);
   });
  });
  await t.test('case admins can only append reviewer allocations; existing profiles and assignment rows stay intact',async()=>{
   const uid='22222222-2222-4222-8222-222222222222';
   await pg.query('insert into auth.users(id) values($1)',[uid]);
   for(const [id,email]of [['scoped-admin','admin@example.test'],['scoped-expert','faculty@example.test'],['outside-expert','outside@example.test']])await pg.query("insert into pmx_experts(id,name,login_email,status) values($1,$1,$2,'verified')",[id,email]);
   await pg.query("insert into pmx_case_groups(id,label,source_case_ids) values('scope','Synthetic scope',array['case1','case2'])");
   await pg.query("insert into pmx_case_group_members(reviewer_id,group_id,role) values('scoped-admin','scope','case_admin')");
   const activate=()=>pg.query("select pmx_activate_case_group('scope','live','manage','owner@example.test')");
   await assert.rejects(activate(),/Finish creating/);
   await pg.query("update pmx_case_group_members set auth_user_id=$1 where reviewer_id='scoped-admin'",[uid]);
   await activate();await assert.rejects(activate(),/already active/);
   for(const [person,id]of [['scoped-expert','case1'],['scoped-expert','case3'],['outside-expert','case4']])await pg.query("insert into pmx_assignments(reviewer_id,case_id,assigned_by) values($1,$2,'original')",[person,id]);
   await pg.query("update pmx_experts set login_email_aliases=array['faculty-alias@example.test'] where id='scoped-expert'");
   const before=(await pg.query("select * from pmx_assignments order by reviewer_id,case_id")).rows;
   const profile=(await pg.query("select * from pmx_experts where id='scoped-expert'")).rows[0];
   const add=(name,email,cases)=>pg.query("select pmx_add_scoped_reviewer('scope',$1,$2,$3,'admin@example.test') item",[name,email,cases]);
   const result=(await as('service_role',()=>add('scoped-expert','faculty@example.test',['case2']))).rows[0].item;
   assert.equal(result.addedAssignments,1);assert.equal(result.created,false);
   for(const row of before)assert.deepEqual((await pg.query('select * from pmx_assignments where reviewer_id=$1 and case_id=$2',[row.reviewer_id,row.case_id])).rows[0],row);
   assert.deepEqual((await pg.query("select * from pmx_experts where id='scoped-expert'")).rows[0],profile);
   const after=(await pg.query("select * from pmx_assignments order by reviewer_id,case_id")).rows;
   assert.equal((await add('scoped-expert','faculty-alias@example.test',['case1','case2'])).rows[0].item.addedAssignments,0);
   assert.deepEqual((await pg.query("select * from pmx_assignments order by reviewer_id,case_id")).rows,after);
   for(const [name,email,cases]of [['Wrong name','faculty@example.test',['case1']],['scoped-expert','faculty@example.test',['case3']],['New invalid','new-invalid@example.test',['case1','case1']],['New invalid','new-invalid@example.test',[]],['scoped-expert','different@example.test',['case1']],['scoped-admin','admin@example.test',['case1']]])await assert.rejects(add(name,email,cases));
   await pg.query("update pmx_case_groups set case_ids=array['case1','case2','case4'] where id='scope'");
   await assert.rejects(add('scoped-expert','faculty@example.test',['case4']),/three-case limit/);
   assert.deepEqual((await pg.query("select * from pmx_assignments order by reviewer_id,case_id")).rows,after);
   const fresh=(await add('New synthetic reviewer',' NEW@example.test ',['case1','case2'])).rows[0].item;
   assert.equal(fresh.created,true);assert.equal(fresh.addedAssignments,2);
   const newPerson=(await pg.query('select * from pmx_experts where id=$1',[fresh.id])).rows[0];assert.equal(newPerson.status,'verified');assert.equal(newPerson.login_email,'new@example.test');
   for(const status of ['preliminary','inactive']){await pg.query('update pmx_experts set status=$1 where id=$2',[status,fresh.id]);await assert.rejects(add(newPerson.name,newPerson.login_email,['case4']),/coordinator/);}
   await pg.query("insert into pmx_settings values('coordinator_emails',$1::jsonb)",[JSON.stringify(['owner@example.test'])]);
   await assert.rejects(add('Owner','owner@example.test',['case1']),/coordinator/);
   await pg.query("update pmx_case_groups set admin_mode='view_export' where id='scope'");
   await assert.rejects(add('Another reviewer','another@example.test',['case1']),/not enabled/);
   assert.equal((await pg.query("select count(*)::int n from pmx_experts where login_email='another@example.test'")).rows[0].n,0);
   const old=()=>pg.query("select pmx_save_scoped_assignments('scope','scoped-expert',array['case2'],'admin@example.test')");
   await assert.rejects(old(),/protected/);
   for(const role of ['anon','authenticated','service_role'])await as(role,()=>assert.rejects(old(),/permission denied/));
   for(const role of ['anon','authenticated'])await as(role,()=>assert.rejects(add('Unauthorized','unauthorized@example.test',['case1']),/permission denied/));
   // The full owner still has the existing explicit edit capability.
   await as('service_role',()=>pg.query("select pmx_save_expert('scoped-expert','{\"caseIds\":[\"case1\",\"case3\"]}'::jsonb,'owner@example.test')"));
   assert.deepEqual((await pg.query("select case_id from pmx_assignments where reviewer_id='scoped-expert' order by case_id")).rows.map(r=>r.case_id),['case1','case3']);
  });
  await t.test('a test workspace copies current scientific content and keeps the original packet unchanged',async()=>{
   const original={id:'case4',number:4,title:'Synthetic case',prompt:'Original prompt',rubric:[{id:'original-rubric',text:'Complete gate'}],materials:[{name:'data.csv'}],revision:'original-r1',sections:[{id:'original-section',number:'4.1',title:'Goal'}]};
   await pg.query("update pmx_cases set packet=$1,meta=$2 where id='case4'",[JSON.stringify(original),JSON.stringify({id:'case4',number:4,title:original.title})]);
   await pg.query("insert into pmx_case_groups(id,label,source_case_ids) values('sandbox','Synthetic sandbox',array['case4'])");
   await pg.query("insert into pmx_experts(id,name) values('sandbox-admin','Synthetic sandbox admin')");
   await pg.query("insert into auth.users(id) values('33333333-3333-4333-8333-333333333333')");
   await pg.query("insert into pmx_case_group_members values('sandbox-admin','sandbox','case_admin','33333333-3333-4333-8333-333333333333')");
   await pg.query("select pmx_activate_case_group('sandbox','test','view_export','owner@example.test')");
   const copy=(await pg.query("select packet from pmx_cases where id='group-sandbox--case4'")).rows[0].packet;
   assert.equal(copy.prompt,original.prompt);assert.deepEqual(copy.materials,original.materials);assert.equal(copy.rubric[0].text,original.rubric[0].text);assert.equal(copy.testSourceCaseId,'case4');assert.equal(copy.isTest,true);
   assert.deepEqual((await pg.query("select packet from pmx_cases where id='case4'")).rows[0].packet,original);
   assert.deepEqual((await pg.query("select case_ids from pmx_case_groups where id='sandbox'")).rows[0].case_ids,['group-sandbox--case4']);
  });
  await t.test('granular rating saves merge, missing values clear, and separate reviewers remain separate',async()=>{
   await as('service_role',async()=>{
    const save=(owner,patch,reviewed=null)=>pg.query('select pmx_write_review($1,$2,$3::jsonb,$4,$5)',[owner,'case1',JSON.stringify(patch),reviewed,'revision-one']);
    await Promise.all([save('reviewer-one',{values:{difficulty:'High'}}),save('reviewer-one',{values:{scientificSoundness:'Adequate'}})]);
    await save('reviewer-two',{values:{difficulty:'Low'}});
    await save('reviewer-one',{values:{difficulty:null}},true);
    const rows=(await pg.query('select * from pmx_reviews order by reviewer_id')).rows;
    assert.deepEqual(rows[0].rating.values,{scientificSoundness:'Adequate'});assert.equal(rows[0].reviewed,true);assert.equal(rows[1].rating.values.difficulty,'Low');
   });
  });
 }finally{await pg.close();}
});
test('source context is verified against the assigned passage, including UTF-16 offsets',async()=>{
 const c={id:'case1',number:1,title:'Private case',subtitle:'Overview',revision:'r1',prompt:'A 👋 selected passage\n\nSecond paragraph',sections:[{id:'s0',number:'1.1',title:'Overview'},{id:'s1',number:'1.2',title:'Participant prompt'},{id:'s2',number:'1.3',title:'Materials description'},{id:'s3',number:'1.4',title:'Rubric'}],rubric:[],materials:[]};
 const text='👋 selected',start=c.prompt.indexOf(text),q={caseId:'case1',blockId:'case1-prompt-0',start,end:start+text.length,text,revision:'r1',caseTitle:'Forged title',sectionTitle:'Wrong source'};
 const [quote]=await normalizeQuotes([q],['case1'],async()=>c);assert.equal(quote.caseTitle,'Private case');assert.equal(quote.sectionNumber,'1.2');assert.equal(quote.contentType,'Participant prompt');
 await assert.rejects(normalizeQuotes([q],['other-case'],async()=>c),/not assigned/);
 await assert.rejects(normalizeQuotes([{...q,text:'invented'}],['case1'],async()=>c),/could not be verified/);
 await assert.rejects(normalizeQuotes([{...q,revision:'old'}],['case1'],async()=>c),/could not be verified/);
 assert.deepEqual(await normalizeQuotes([],[],async()=>{throw Error('General feedback must not infer a source');}),[]);
 assert.throws(()=>requireCoordinator({coordinator:false}),/Coordinator/);assert.throws(()=>requireWrite({preview:true}),/read-only/);
 assert.throws(()=>validateRatingPatch({values:{difficulty:'invented'}}),/Unknown rating/);
});

test('typed reviewer access does not expose a directory or coordinator routes',()=>{
 for(const [path,method]of [['/api/reviewer-access','POST'],['/api/reviewer-logout','POST'],['/api/session','GET'],['/api/cases/case_1','GET'],['/api/cases/case_1/papers/'+ 'a'.repeat(32),'GET'],['/api/reviews','PATCH'],['/api/comments/11111111-1111-4111-8111-111111111111','PATCH'],['/api/comments','POST']])assert.doesNotThrow(()=>assertReviewerRoute(path,method));
 for(const [path,method]of [['/api/reviewers','GET'],['/api/admin/reviewers','GET'],['/api/admin/results','GET'],['/api/admin/assignments/expert1','PUT'],['/api/session?preview=reviewer-demo','GET'],['/api/reviewer-access','GET'],['/api/comments/invalid','PATCH'],['/api/comments/11111111-1111-4111-8111-111111111111','PUT'],['https://evil.invalid/api/session','GET'],['/api/cases/../admin/results','GET'],['/api/cases/case_1/papers/../../secret','GET'],['/api/cases/case_1/papers/'+ 'a'.repeat(32),'POST']])assert.throws(()=>assertReviewerRoute(path,method),/not available/);
});

test('assignment validation allows three cases, rejects four and duplicate IDs',()=>{
 assert.deepEqual(assertCases(['a','b','c']),['a','b','c']);
 assert.throws(()=>assertCases(['a','b','c','d']),/three different cases/);
 assert.throws(()=>assertCases(['a','a']),/three different cases/);
});
