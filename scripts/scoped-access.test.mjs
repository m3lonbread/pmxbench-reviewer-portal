import test from 'node:test';import assert from 'node:assert/strict';
import {scopedResults,isCaseAdmin} from '../backend/supabase/functions/pmxbench/case-access.ts';
test('scoped feedback preserves full source links and omits mixed-source and unscoped comments',()=>{
 const people=[{id:'in',name:'Inside',status:'verified',login_email:'private@example.test',notes:'Private outside-case note'},{id:'out',name:'Outside'}];
 const comments=[{id:'permitted',reviewer_id:'in',quotes:[{caseId:'case1',text:'Exact source'}],text:'Allowed'},{id:'mixed',reviewer_id:'in',quotes:[{caseId:'case1'},{caseId:'outside'}],text:'Mixed'},{id:'general',reviewer_id:'in',quotes:[],text:'Discusses the outside case'},{id:'outside',reviewer_id:'out',quotes:[{caseId:'outside'}]}];
 const result=scopedResults(people,[{reviewer_id:'in',case_id:'case1',assigned_by:'private-owner-email'},{reviewer_id:'out',case_id:'outside'}],[{reviewer_id:'in',case_id:'case1'},{reviewer_id:'out',case_id:'outside'}],comments,['case1']);
 assert.deepEqual(result.reviewers,[{id:'in',name:'Inside',status:'verified'}]);assert.deepEqual(result.comments,[comments[0]]);assert.deepEqual(result.assignments,[{reviewer_id:'in',case_id:'case1'}]);assert.equal(result.caseReviews.length,1);
 assert.equal(isCaseAdmin({caseAdmin:true,caseAccess:{},identityMethod:'name_email_match'}),false);
});
test('the actual handler limits authenticated case admins across packets, previews, exports and mutations',async()=>{
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
 const allowed=Array.from({length:6},(_,i)=>'case'+(i+1));
 const group={id:'scope',label:'Synthetic six-case scope',active:true,case_ids:allowed,source_case_ids:allowed,workspace_mode:'live',admin_mode:'view_export'};
 const admin={id:'admin',name:'Synthetic Admin',login_email:'admin@example.test',status:'verified',source:'Case collaboration'};
 const member={reviewer_id:'admin',group_id:'scope',role:'case_admin',auth_user_id:'user-admin'};
 let currentEmail=admin.login_email,currentId='user-admin',writes=0;
 const allCases=[...allowed,'outside'].map((id,i)=>({id,number:i+1,title:id,sections:[],materials:[],rubric:[],prompt:'Private '+id,revision:'r'}));
 const comments=[{id:'inside',reviewer_id:'faculty',text:'Inside feedback',quotes:[{caseId:'case1',text:'Source'}]},{id:'general',reviewer_id:'faculty',text:'Outside-case details',quotes:[]},{id:'mixed',reviewer_id:'faculty',text:'Mixed details',quotes:[{caseId:'case1'},{caseId:'outside'}]}];
 globalThis.Deno={env:{get:n=>({PMXBENCH_FRONTEND_ORIGIN:'https://portal.example.test',SUPABASE_URL:'https://scoped-database.example.test',SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-key'})[n]}};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input)),path=url.pathname.split('/').at(-1),method=init?.method??'GET';
  const eq=k=>url.searchParams.get(k)?.replace(/^eq\./,'');
  let data=[];
  if(url.pathname==='/auth/v1/user')data={id:currentId,email:currentEmail,email_confirmed_at:'2026-01-01T00:00:00Z'};
  else if(path==='pmx_settings')data={value:['owner@example.test']};
  else if(path==='pmx_case_group_members')data=member;
  else if(path==='pmx_case_groups')data=group;
  else if(path==='pmx_experts'){
   if(eq('auth_user_id'))data=null;
   else if(eq('login_email'))data=admin;
   else if(eq('id'))data={id:eq('id'),name:'Synthetic Faculty',status:'verified'};
   else data=[{id:'faculty',name:'Synthetic Faculty',status:'verified',source:'Added by coordinator'}];
  }else if(path==='pmx_cases')data=url.searchParams.get('select')==='packet'?{packet:allCases.find(c=>c.id===eq('id'))}:allCases.map(meta=>({meta}));
  else if(path==='pmx_assignments')data=eq('reviewer_id')?(eq('reviewer_id')==='faculty'?[{case_id:'case1'},{case_id:'outside'}]:[{case_id:'outside'}]):[{reviewer_id:'faculty',case_id:'case1'}];
  else if(path==='pmx_reviews')data=eq('reviewer_id')?[]:[{reviewer_id:'faculty',case_id:'case1',rating:{values:{}},reviewed:false}];
  else if(path==='pmx_comments')data=eq('reviewer_id')?(eq('reviewer_id')==='faculty'?comments:[]):comments;
  else if(path==='pmx_literature')data=[];
  else if(path==='pmx_material_guides')data=null;
  else if(path==='pmx_save_scoped_assignments'){writes++;data=null;}
  else throw Error('Unexpected operation '+path+' '+method);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const {portalHandler}=await import('../backend/supabase/functions/pmxbench/service.ts');const handler=portalHandler('authenticated');
  const request=async(path,method='GET',payload={})=>{const r=await handler(new Request('https://function.example.test',{method:'POST',headers:{Origin:'https://portal.example.test',Authorization:'Bearer synthetic-token'},body:JSON.stringify({path,method,payload})}));return {status:r.status,data:await r.json()};};
  const session=await request('/api/session');assert.equal(session.status,200);assert.equal(session.data.role,'case_admin');assert.equal(session.data.readOnly,true);assert.equal(session.data.cases.length,6);
  assert.equal((await request('/api/cases/outside')).status,404);assert.equal((await request('/api/cases/case1')).status,200);
  assert.equal((await request('/api/cases/outside/papers/'+'a'.repeat(32))).status,404);
  assert.equal((await request('/api/session?preview=outside-person')).status,404);
  assert.equal((await request('/api/session?preview=reviewer-demo')).status,403);
  const preview=await request('/api/session?preview=faculty');assert.equal(preview.status,200);assert.deepEqual(preview.data.cases.map(c=>c.id),['case1']);assert.deepEqual(preview.data.review.feedback.map(c=>c.id),['inside']);
  const result=await request('/api/admin/results');assert.equal(result.status,200);assert.deepEqual(result.data.comments.map(c=>c.id),['inside']);assert.deepEqual(Object.keys(result.data.reviewers[0]).sort(),['id','name','status']);
  assert.equal((await request('/api/admin/access-groups')).status,403);
  assert.equal((await request('/api/admin/access-groups/scope/activate','POST',{password:'synthetic-password'})).status,403);
  assert.equal((await request('/api/admin/reviewers/faculty','PATCH',{status:'inactive'})).status,403);
  assert.equal((await request('/api/admin/reviewers','POST',{name:'New expert'})).status,403);
  assert.equal((await request('/api/admin/assignments/faculty','PUT',{caseIds:['case1']})).status,403);assert.equal(writes,0);
  group.admin_mode='manage';assert.equal((await request('/api/admin/assignments/faculty','PUT',{caseIds:['outside']})).status,403);assert.equal(writes,0);
  assert.equal((await request('/api/admin/assignments/faculty','PUT',{caseIds:['case1']})).status,200);assert.equal(writes,1);
  assert.equal((await request('/api/comments','POST',{text:'No submissions in collaborator view'})).status,403);
  assert.equal((await request('/api/reviews','PATCH',{caseId:'case1',reviewed:true})).status,403);
  member.auth_user_id='other-user';assert.equal((await request('/api/session')).status,403);member.auth_user_id='user-admin';
  member.role='case_viewer';const viewer=await request('/api/session');assert.equal(viewer.data.role,'case_viewer');assert.equal((await request('/api/admin/results')).status,403);member.role='case_admin';
  group.active=false;assert.equal((await request('/api/session')).status,403);group.active=true;
  currentEmail='owner@example.test';currentId='user-owner';const owner=await request('/api/session');assert.equal(owner.data.role,'coordinator');assert.equal(owner.data.cases.length,7);
 }finally{globalThis.fetch=originalFetch;if(originalDeno)globalThis.Deno=originalDeno;else delete globalThis.Deno;}
});
test('restricted collaborators do not enter the faculty benchmark export',async()=>{
 const {benchmarkResults}=await import('../backend/supabase/functions/pmxbench/results.ts');
 const result=benchmarkResults([{id:'collaborator',source:'Case workspace access'},{id:'faculty',source:'Added by coordinator'}],[],[{reviewer_id:'collaborator',case_id:'case1'}],[{reviewer_id:'collaborator',quotes:[]}],[{id:'case1'}]);
 assert.deepEqual(result.reviewers.map(p=>p.id),['faculty']);assert.equal(result.caseReviews.length,0);assert.equal(result.comments.length,0);assert.equal(result.excludedCaseAccessData.reviewers,1);
});
