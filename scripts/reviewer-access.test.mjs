import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeQuotes} from '../backend/supabase/functions/pmxbench/domain.ts';
import {reviewerCredentials,reviewerNameMatches,assertReviewerMatch,newReviewerToken,hashReviewerValue,reviewerEmailMatches} from '../backend/supabase/functions/pmxbench/picker.ts';
test('typed details accept harmless formatting, honorifics, and recorded nickname variants without accepting another name',()=>{
 assert.deepEqual(reviewerCredentials({name:'  Dr. Liang Zhao ',email:' Test@Example.test '}),{name:'Dr. Liang Zhao',email:'test@example.test'});
 for(const [typed,stored]of [['Liang Zhao','Dr. Liang Zhao'],['Gregory Calip','Gregory “Greg” Calip'],['Greg Calip','Gregory “Greg” Calip'],['Dongyang Liu','Dongyang Liu (刘东阳)'],['Eric Chun Yong Chan','Eric Chun Yong Chan']])assert.equal(reviewerNameMatches(typed,stored),true);
 assert.equal(reviewerNameMatches('Anne','Anne Talkington'),false);assert.equal(reviewerNameMatches('Other Name','Dr. Liang Zhao'),false);
 const credentials={name:'Synthetic Reviewer',email:'reviewer@example.test'},person={name:'Synthetic Reviewer',status:'verified',login_email:'reviewer@example.test'};
 assert.doesNotThrow(()=>assertReviewerMatch(person,credentials));
 const messages=[];for(const p of [null,{...person,status:'preliminary'},{...person,status:'inactive'},{...person,login_email:null},{...person,name:'Someone Else'}]){try{assertReviewerMatch(p,credentials);assert.fail();}catch(e){assert.equal(e.status,403);messages.push(e.message);}}
 assert.equal(new Set(messages).size,1);
});
test('reviewer tokens are random opaque values and only irreversible hashes are used for storage',async()=>{
 const first=newReviewerToken(),second=newReviewerToken();assert.match(first,/^[a-f0-9]{64}$/);assert.notEqual(first,second);
 const hash=await hashReviewerValue(first);assert.match(hash,/^[a-f0-9]{64}$/);assert.notEqual(hash,first);assert.equal(await hashReviewerValue(first),hash);
});
test('explicit alternate emails retain the same name and active-profile checks',()=>{
 const person={name:'Synthetic Reviewer',status:'verified',login_email:'primary@example.test',login_email_aliases:['alternate@example.test']};
 for(const email of ['primary@example.test','alternate@example.test'])assert.doesNotThrow(()=>assertReviewerMatch(person,reviewerCredentials({name:person.name,email:email.toUpperCase()})));
 assert.equal(reviewerEmailMatches(person,' ALTERNATE@EXAMPLE.TEST '),true);
 for(const [profile,details]of [[person,{name:'Wrong Reviewer',email:'alternate@example.test'}],[person,{name:person.name,email:'unlisted@example.test'}],[{...person,status:'inactive'},{name:person.name,email:'alternate@example.test'}],[{...person,login_email:null},{name:person.name,email:'alternate@example.test'}],[{...person,login_email_aliases:[]},{name:person.name,email:'alternate@example.test'}]])assert.throws(()=>assertReviewerMatch(profile,details),e=>e.status===403);
});
test('the actual reviewer handler requires a server-issued session and keeps it bound to current profile and assignments',async()=>{
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
 const person={id:'test-reviewer',name:'Synthetic Reviewer',status:'verified',login_email:'reviewer@example.test',login_email_aliases:['alternate@example.test']};
 const sessions=new Map();let attempts=0,signCalls=0,editCalls=0,scopedAccess=false;
 const packet={id:'assigned',number:1,title:'Test copy · Synthetic packet',revision:'r',isTest:true,testSourceCaseNumber:1,testSourceCaseId:'official-source',subtitle:'Overview',prompt:'A source passage',materials:[{id:'observed',name:'observed_data.csv',description:'Original review focus',format:'CSV'}],rubric:[],sections:[{id:'overview',number:'1.1',title:'Overview'},{id:'prompt',number:'1.2',title:'Prompt'},{id:'materials',number:'1.3',title:'Materials description'},{id:'rubric',number:'1.4',title:'Rubric'},{id:'ratings',number:'1.5',title:'Ratings'}]};
 globalThis.Deno={env:{get:n=>({PMXBENCH_FRONTEND_ORIGIN:'https://portal.example.test',SUPABASE_URL:'https://database.example.test',SUPABASE_SERVICE_ROLE_KEY:'unit-test-service-key'})[n]}};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input)),path=url.pathname.split('/').at(-1),method=init?.method??'GET',payload=init?.body?JSON.parse(init.body):null;
  let data=[];
  const one=url.searchParams.get('select')==='value'||String(init?.headers?.get?.('Accept')??init?.headers?.Accept??'').includes('vnd.pgrst.object');
  const eq=k=>url.searchParams.get(k)?.replace(/^eq\./,'');
  if(url.pathname.startsWith('/storage/v1/object/sign/pmxbench-literature/')){signCalls++;assert.equal(payload.expiresIn,300);data={signedURL:'/object/sign/pmxbench-literature/'+ 'a'.repeat(64)+'.pdf?token=synthetic'};}
  else if(path==='pmx_literature'){assert.equal(eq('case_id'),'official-source');data=url.searchParams.get('select')==='object_path'?{object_path:'a'.repeat(64)+'.pdf'}:[{is_key_source:true,meta:{id:'a'.repeat(32),title:'Source paper',fileName:'source.pdf',bytes:100,pages:1,sha256:'a'.repeat(64)}},{is_key_source:false,meta:{id:'c'.repeat(32),title:'Earlier background paper',fileName:'prior.pdf',bytes:100,pages:1,sha256:'c'.repeat(64)}}];}
  else if(path==='pmx_material_guides'){assert.equal(eq('case_id'),'official-source');data={payload:{revision:'guide-r1',objective:'Case objective',scope:'Case scope',files:{'observed_data.csv':{summary:'65 source observations with declared units.',blocks:[],fields:[{id:'field-0',name:'record_id',text:'Stable observation identifier.'}]}}}};}
  else if(path==='pmx_edit_comment'){editCalls++;if(payload.p_expected_version===99)return new Response(JSON.stringify({code:'PT409',message:'This comment changed elsewhere.'}),{status:409,headers:{'Content-Type':'application/json'}});assert.equal(payload.p_reviewer,person.id);assert.deepEqual(payload.p_visible_cases,['assigned']);data={id:payload.p_id,text:payload.p_text,quotes:[],reviewer_name:person.name,created_at:'2026-11-17T00:00:00Z',updated_at:'2026-11-17T01:00:00Z',edit_version:1};}
  else if(path==='pmx_case_group_members')data=scopedAccess?{group_id:'synthetic-scope',role:'case_admin',auth_user_id:'different-auth-user'}:null;
  else if(path==='pmx_case_groups')data={id:'synthetic-scope',label:'Synthetic case scope',active:true,case_ids:['assigned'],workspace_mode:'live',admin_mode:'manage'};
  else if(path==='pmx_settings')data={value:true};
  else if(path==='pmx_reserve_reviewer_attempt')data=++attempts<=10;
  else if(path==='pmx_experts')data=(eq('login_email')===person.login_email||eq('id')===person.id||person.login_email_aliases.some(email=>url.searchParams.get('login_email_aliases')==='cs.{'+email+'}'))?{...person}:null;
  else if(path==='pmx_assignments')data=[{case_id:'assigned'},{case_id:'retired'}];
  else if(path==='pmx_reviewer_sessions'){
   if(method==='POST'){sessions.set(payload.token_hash,{...payload,revoked_at:null});data=null;}
   else if(method==='PATCH'){const row=sessions.get(eq('token_hash'));if(row)Object.assign(row,payload);data=null;}
   else data=sessions.get(eq('token_hash'))??null;
  }else if(path==='pmx_cases')data=url.searchParams.get('select')==='packet'?{packet}:[{meta:packet},{meta:{...packet,id:'retired',archived:true}}];
  else if(path==='pmx_comments')data=[{id:'retired-feedback',text:'Earlier feedback',quotes:[],archived_at:'2026-11-13T20:00:00Z'},{id:'active-feedback',text:'Current general feedback',quotes:[],archived_at:null}];
  else if(path!=='pmx_reviews')throw Error('Unexpected database operation: '+path);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const {portalHandler}=await import('../backend/supabase/functions/pmxbench/service.ts');const handler=portalHandler('name-picker');
  async function request(path,method='GET',extra={}){const r=await handler(new Request('https://function.example.test',{method:'POST',headers:{Origin:'https://portal.example.test'},body:JSON.stringify({path,method,...extra})}));return {status:r.status,data:await r.json()};}
  assert.equal((await request('/api/reviewers')).status,403);
  assert.equal((await request('/api/session','GET',{reviewerId:person.id})).status,401);
  const wrongName=await request('/api/reviewer-access','POST',{payload:{name:'Wrong Person',email:person.login_email}}),wrongEmail=await request('/api/reviewer-access','POST',{payload:{name:person.name,email:'wrong@example.test'}});
  assert.equal(wrongName.status,403);assert.deepEqual(wrongName,wrongEmail);
  const login=await request('/api/reviewer-access','POST',{payload:{name:person.name,email:person.login_email}});assert.equal(login.status,200);assert.match(login.data.token,/^[a-f0-9]{64}$/);
  assert.equal(sessions.has(login.data.token),false);
  const auth={reviewerToken:login.data.token,reviewerId:person.id};
  const state=await request('/api/session','GET',auth);assert.equal(state.status,200);assert.equal(state.data.role,'reviewer');assert.equal(state.data.identityMethod,'name_email_match');assert.equal(state.data.cases.length,1);assert.equal(state.data.cases[0].title,'Synthetic packet');assert.equal(state.data.cases[0].revision,'r-review-view-v1');assert.equal((await request('/api/cases/retired','GET',auth)).status,404);
  assert.deepEqual(state.data.review.feedback.map(c=>c.id),['active-feedback']);
  scopedAccess=true;const scoped=await request('/api/session','GET',auth);assert.equal(scoped.status,200);assert.equal(scoped.data.role,'case_viewer');assert.equal(scoped.data.readOnly,true);assert.equal((await request('/api/admin/results','GET',auth)).status,403);assert.equal((await request('/api/comments','POST',{...auth,payload:{text:'No admin elevation'}})).status,403);scopedAccess=false;
  const aliasLogin=await request('/api/reviewer-access','POST',{payload:{name:person.name,email:' ALTERNATE@EXAMPLE.TEST '}});assert.equal(aliasLogin.status,200);assert.equal(aliasLogin.data.reviewerId,login.data.reviewerId);
  const aliasAuth={reviewerToken:aliasLogin.data.token,reviewerId:person.id};assert.equal((await request('/api/session','GET',aliasAuth)).status,200);assert.equal((await request('/api/admin/results','GET',aliasAuth)).status,403);
  assert.equal((await request('/api/reviewer-access','POST',{payload:{name:'Other Person',email:'alternate@example.test'}})).status,403);
  person.login_email_aliases=[];assert.equal((await request('/api/session','GET',aliasAuth)).status,401);assert.equal((await request('/api/session','GET',auth)).status,200);person.login_email_aliases=['alternate@example.test'];
  assert.equal((await request('/api/reviewer-logout','POST',aliasAuth)).status,200);
  const editPath='/api/comments/11111111-1111-4111-8111-111111111111';
  const edited=await request(editPath,'PATCH',{...auth,payload:{text:'Revised comment',version:0}});assert.equal(edited.status,200);assert.equal(edited.data.version,1);assert.ok(edited.data.updatedAt);assert.equal(editCalls,1);
  assert.equal((await request(editPath,'PATCH',{...auth,payload:{text:'Try altering context',version:1,quotes:[]}})).status,400);assert.equal(editCalls,1);
  assert.equal((await request(editPath,'PATCH',{...auth,reviewerId:'other-reviewer',payload:{text:'Other owner',version:1}})).status,403);assert.equal(editCalls,1);
  assert.equal((await request(editPath,'PATCH',{...auth,payload:{text:'Stale update',version:99}})).status,409);
  const paperPath='/api/cases/assigned/papers/'+'a'.repeat(32);
  assert.equal((await request(paperPath)).status,401);
  assert.equal((await request('/api/cases/unassigned/papers/'+'a'.repeat(32),'GET',auth)).status,404);
  assert.equal((await request('/api/cases/assigned/papers/'+'b'.repeat(32),'GET',auth)).status,404);
  assert.equal(signCalls,0);const paper=await request(paperPath,'GET',auth);assert.equal(paper.status,200);assert.equal(signCalls,2);assert.ok(paper.data.url.startsWith('https://database.example.test/storage/v1/object/sign/pmxbench-literature/'));
  const content=await request('/api/cases/assigned','GET',auth);assert.equal(content.data.literature.length,1);assert.equal(content.data.sections.at(-1).title,'Key source literature');assert.equal(content.data.legacyLiterature.length,1);assert.equal(content.data.materials[0].description,'Original review focus');
  const guideQ={caseId:'assigned',blockId:'assigned-material-observed-summary',revision:'guide-r1',start:0,end:39,text:'65 source observations with declared units.'};guideQ.end=guideQ.text.length;const [normalized]=await normalizeQuotes([guideQ],['assigned'],async()=>content.data);assert.equal(normalized.revision,'guide-r1');assert.equal(normalized.sectionTitle,'Materials description');await assert.rejects(normalizeQuotes([{...guideQ,revision:'old-guide'}],['assigned'],async()=>content.data),/could not be verified/);assert.equal(JSON.stringify(content.data).includes('object_path'),false);
  assert.equal((await request('/api/session','GET',{...auth,reviewerId:'another-reviewer'})).status,403);
  assert.equal((await request('/api/cases/unassigned','GET',auth)).status,404);
  assert.equal((await request('/api/admin/results','GET',auth)).status,403);
  person.status='inactive';assert.equal((await request('/api/session','GET',auth)).status,401);person.status='verified';
  person.login_email='changed@example.test';assert.equal((await request('/api/session','GET',auth)).status,401);person.login_email='reviewer@example.test';
  const stored=sessions.get(await hashReviewerValue(login.data.token));stored.expires_at=new Date(0).toISOString();assert.equal((await request('/api/session','GET',auth)).status,401);stored.expires_at=new Date(Date.now()+60000).toISOString();
  assert.equal((await request('/api/reviewer-logout','POST',auth)).status,200);assert.equal((await request('/api/session','GET',auth)).status,401);
 }finally{globalThis.fetch=originalFetch;if(originalDeno)globalThis.Deno=originalDeno;else delete globalThis.Deno;}
});
