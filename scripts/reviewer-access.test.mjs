import test from 'node:test';import assert from 'node:assert/strict';
import {reviewerCredentials,reviewerNameMatches,assertReviewerMatch,newReviewerToken,hashReviewerValue} from '../backend/supabase/functions/pmxbench/picker.ts';
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
test('the actual reviewer handler requires a server-issued session and keeps it bound to current profile and assignments',async()=>{
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
 const person={id:'test-reviewer',name:'Synthetic Reviewer',status:'verified',login_email:'reviewer@example.test'};
 const sessions=new Map();let attempts=0;
 const packet={id:'assigned',number:1,title:'Test copy · Synthetic packet',revision:'r',isTest:true,testSourceCaseNumber:1,subtitle:'Overview',prompt:'A source passage',materials:[],rubric:[],sections:[{id:'overview',number:'1.1',title:'Overview'},{id:'prompt',number:'1.2',title:'Prompt'}]};
 globalThis.Deno={env:{get:n=>({PMXBENCH_FRONTEND_ORIGIN:'https://portal.example.test',SUPABASE_URL:'https://database.example.test',SUPABASE_SERVICE_ROLE_KEY:'unit-test-service-key'})[n]}};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input)),path=url.pathname.split('/').at(-1),method=init?.method??'GET',payload=init?.body?JSON.parse(init.body):null;
  let data=[];
  const one=url.searchParams.get('select')==='value'||String(init?.headers?.get?.('Accept')??init?.headers?.Accept??'').includes('vnd.pgrst.object');
  const eq=k=>url.searchParams.get(k)?.replace(/^eq\./,'');
  if(path==='pmx_settings')data={value:true};
  else if(path==='pmx_reserve_reviewer_attempt')data=++attempts<=10;
  else if(path==='pmx_experts')data=(eq('login_email')===person.login_email||eq('id')===person.id)?{...person}:null;
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
  assert.equal((await request('/api/session','GET',{...auth,reviewerId:'another-reviewer'})).status,403);
  assert.equal((await request('/api/cases/unassigned','GET',auth)).status,404);
  assert.equal((await request('/api/admin/results','GET',auth)).status,403);
  person.status='inactive';assert.equal((await request('/api/session','GET',auth)).status,401);person.status='verified';
  person.login_email='changed@example.test';assert.equal((await request('/api/session','GET',auth)).status,401);person.login_email='reviewer@example.test';
  const stored=sessions.get(await hashReviewerValue(login.data.token));stored.expires_at=new Date(0).toISOString();assert.equal((await request('/api/session','GET',auth)).status,401);stored.expires_at=new Date(Date.now()+60000).toISOString();
  assert.equal((await request('/api/reviewer-logout','POST',auth)).status,200);assert.equal((await request('/api/session','GET',auth)).status,401);
 }finally{globalThis.fetch=originalFetch;if(originalDeno)globalThis.Deno=originalDeno;else delete globalThis.Deno;}
});
