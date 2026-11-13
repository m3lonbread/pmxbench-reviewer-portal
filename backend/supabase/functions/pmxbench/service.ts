import {createClient} from '@supabase/supabase-js';
import {benchmarkResults} from './results.ts';
import {activeCase,caseView} from './case-view.ts';
import {assertReviewerRoute,assertReviewerMatch,hashReviewerValue,newReviewerToken,reviewerAccessError,reviewerCredentials} from './picker.ts';
import {ApiError,assertCases,assertProfile,normalizeQuotes,requireCoordinator,requireWrite,validateRatingPatch} from './domain.ts';
const origin=Deno.env.get('PMXBENCH_FRONTEND_ORIGIN')??'';
const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??secrets.default;
const db=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
const personColumns='id,name,email,login_email,affiliation,status,modeling_area,research_focus,notes,source,source_row,outreach_status,updated_at';
async function query(request:PromiseLike<{data:any;error:any}>):Promise<any>{const {data,error}=await request;if(error){if(error.code==='23505')throw new ApiError(409,'That sign-in email or record already exists.');if(['23503','23514','P0001'].includes(error.code))throw new ApiError(400,error.code==='P0001'?error.message:'Invalid expert or case details.');throw new ApiError(500,'Unable to complete this request. Please retry.');}return data;}
async function collect(build:()=>any){const rows:any[]=[];for(let offset=0;;offset+=1000){const page=await query(build().range(offset,offset+999));rows.push(...page);if(page.length<1000)return rows;}}
async function actor(token:string){
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user||!user.email||!user.email_confirmed_at)throw new ApiError(401,'Sign in with a verified email to access your assigned cases.');
 const email=user.email.trim().toLowerCase(),settings=await query(db.from('pmx_settings').select('value').eq('key','coordinator_emails').maybeSingle());
 const emails=Array.isArray(settings?.value)?settings.value.map((e:unknown)=>String(e).toLowerCase()):[];
 if(!emails.length)throw new ApiError(503,'The review workspace is being configured.');
 if(emails.includes(email))return {userId:user.id,email,name:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:email,coordinator:true,reviewerId:`coordinator:${user.id}`,identityMethod:'verified_email'};
 let person=await query(db.from('pmx_experts').select('*').eq('auth_user_id',user.id).maybeSingle());
 if(!person)person=await query(db.from('pmx_experts').select('*').eq('login_email',email).maybeSingle());
 if(!person)throw new ApiError(403,'This account has no expert profile yet. Contact the coordinator.');
 if(person.status!=='verified')throw new ApiError(403,person.status==='inactive'?'Your expert profile is inactive. Contact the coordinator.':'Your expert profile is preliminary. The coordinator will confirm your details and activate your cases.');
 if(person.auth_user_id&&person.auth_user_id!==user.id)throw new ApiError(403,'This expert profile is linked to another sign-in. Contact the coordinator.');
 if(!person.auth_user_id){const linked=await query(db.from('pmx_experts').update({auth_user_id:user.id}).eq('id',person.id).is('auth_user_id',null).select('auth_user_id').maybeSingle());if(!linked){const current=await query(db.from('pmx_experts').select('auth_user_id').eq('id',person.id).single());if(current.auth_user_id!==user.id)throw new ApiError(403,'This profile was linked to another sign-in.');}}
 return {userId:user.id,email,name:person.name,coordinator:false,reviewerId:person.id,identityMethod:'verified_email'};
}
type Actor=Awaited<ReturnType<typeof actor>>;
async function meta(includeArchived=false){return (await query(db.from('pmx_cases').select('meta'))).map((r:any)=>r.meta).filter((c:any)=>includeArchived||activeCase(c)).map(caseView).sort((a:any,b:any)=>a.number-b.number);}
async function assigned(id:string){return (await query(db.from('pmx_assignments').select('case_id').eq('reviewer_id',id))).map((r:any)=>r.case_id);}
async function scope(a:Actor,preview:string|null){
 if(preview){requireCoordinator(a);if(preview==='reviewer-demo')return {actor:a,reviewerId:'preview:example-reviewer',name:'Example reviewer',email:a.email,cases:(await meta()).filter((c:any)=>!c.isTest).slice(0,2),preview:true,samplePreview:true,status:'verified'};const p=await query(db.from('pmx_experts').select('*').eq('id',preview).maybeSingle());if(!p)throw new ApiError(404,'Expert not found.');const ids=await assigned(p.id);return {actor:a,reviewerId:p.id,name:p.name,email:p.login_email,cases:ids.length?(await query(db.from('pmx_cases').select('meta').in('id',ids))).map((r:any)=>r.meta).filter(activeCase).map(caseView).sort((x:any,y:any)=>x.number-y.number):[],preview:true,samplePreview:false,status:p.status};}
 const ids=a.coordinator?null:await assigned(a.reviewerId);
 const cases=ids===null?await meta():ids.length?(await query(db.from('pmx_cases').select('meta').in('id',ids))).map((r:any)=>r.meta).filter(activeCase).map(caseView).sort((x:any,y:any)=>x.number-y.number):[];
 return {actor:a,reviewerId:a.reviewerId,name:a.name,email:a.email,cases,preview:false,samplePreview:false,status:'verified'};
}
type Scope=Awaited<ReturnType<typeof scope>>;
async function packet(s:Scope,id:string){if(!s.cases.some((c:any)=>c.id===id))throw new ApiError(404,'This case is not assigned to you.');const row=await query(db.from('pmx_cases').select('packet').eq('id',id).maybeSingle());if(!row)throw new ApiError(404,'Case not found.');return caseView(row.packet);}
async function state(s:Scope){
 if(s.samplePreview)return {ratings:{},reviewed:[],feedback:[]};
 const [reviews,comments]=await Promise.all([collect(()=>db.from('pmx_reviews').select('*').eq('reviewer_id',s.reviewerId).order('case_id')),collect(()=>db.from('pmx_comments').select('*').eq('reviewer_id',s.reviewerId).order('created_at').order('id'))]);
 const ids=s.cases.map((c:any)=>c.id),ratings:Record<string,any>={},reviewed:string[]=[];
 for(const r of reviews){if(!ids.includes(r.case_id))continue;ratings[r.case_id]={values:{},difficultyFeedback:'',improvements:'',recommendation:'',...r.rating,updatedAt:r.updated_at};if(r.reviewed)reviewed.push(r.case_id);}
 return {ratings,reviewed,feedback:comments.filter((c:any)=>!c.archived_at&&(!c.quotes.length||c.quotes.every((q:any)=>ids.includes(q.caseId)))).map((c:any)=>({id:c.id,text:c.text,quotes:c.quotes,createdAt:c.created_at,reviewer:c.reviewer_name,identityMethod:c.identity_method}))};
}
async function route(a:Actor,path:string,method:string,data:Record<string,any>){
 if(!path.startsWith('/api/'))throw new ApiError(404,'Not found.');
 const url=new URL(path,'https://pmxbench.invalid'),s=await scope(a,url.searchParams.get('preview')),p=url.pathname;
 if(p==='/api/session'&&method==='GET')return {user:{id:a.userId,name:s.name,email:s.email},role:s.preview?'preview':a.coordinator?'coordinator':'reviewer',reviewerId:s.reviewerId,readOnly:s.preview,samplePreview:s.samplePreview,reviewerStatus:s.status,identityMethod:a.identityMethod,cases:s.cases,review:await state(s)};
 if(p.startsWith('/api/cases/')&&method==='GET')return packet(s,decodeURIComponent(p.slice('/api/cases/'.length)));
 if(p==='/api/reviews'&&method==='GET')return state(s);
 if(p==='/api/reviews'&&method==='PATCH'){
  requireWrite(s);const c=await packet(s,data.caseId),patch=data.ratingPatch===undefined?{}:validateRatingPatch(data.ratingPatch);
  if(data.reviewed!==undefined&&typeof data.reviewed!=='boolean')throw new ApiError(400,'Invalid review status.');
  await query(db.rpc('pmx_write_review',{p_reviewer:s.reviewerId,p_case:c.id,p_patch:{...patch,identityMethod:a.identityMethod},p_reviewed:data.reviewed??null,p_revision:c.revision}));return {saved:true,updatedAt:new Date().toISOString()};
 }
 if(p==='/api/comments'&&method==='POST'){
  requireWrite(s);if(typeof data.id!=='string'||!/^[a-f0-9-]{36}$/i.test(data.id)||typeof data.text!=='string'||!data.text.trim()||data.text.length>20000)throw new ApiError(400,'Enter a comment of up to 20,000 characters.');
  const quotes=await normalizeQuotes(data.quotes,s.cases.map((c:any)=>c.id),id=>packet(s,id));
  await query(db.from('pmx_comments').upsert({id:data.id,reviewer_id:s.reviewerId,text:data.text.trim(),quotes,reviewer_name:s.name,identity_method:a.identityMethod},{onConflict:'id',ignoreDuplicates:true}));
  const row=await query(db.from('pmx_comments').select('*').eq('id',data.id).single());if(row.reviewer_id!==s.reviewerId)throw new ApiError(409,'Please retry this comment.');
  return {id:row.id,text:row.text,quotes:row.quotes,createdAt:row.created_at,reviewer:row.reviewer_name,identityMethod:row.identity_method};
 }
 if(p.startsWith('/api/admin/')){
  requireCoordinator(a);if(s.preview)throw new ApiError(403,'Return to the coordinator workspace to manage experts.');
  if(p==='/api/admin/reviewers'&&method==='GET'){
   const [people,allocations,progress]=await Promise.all([collect(()=>db.from('pmx_experts').select(personColumns+',auth_user_id').order('name').order('id')),collect(()=>db.from('pmx_assignments').select('reviewer_id,case_id').order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_reviews').select('reviewer_id,case_id,reviewed').order('reviewer_id').order('case_id'))]);
   return {reviewers:people.map((person:any)=>{const ids=allocations.filter((r:any)=>r.reviewer_id===person.id).map((r:any)=>r.case_id);return {...person,auth_user_id:undefined,linked:Boolean(person.auth_user_id),caseIds:ids,completed:progress.filter((r:any)=>r.reviewer_id===person.id&&ids.includes(r.case_id)&&r.reviewed).length};}),cases:await meta()};
  }
  if(p==='/api/admin/results'&&method==='GET'){
   const [people,allocations,reviews,comments]=await Promise.all([collect(()=>db.from('pmx_experts').select(personColumns).order('name').order('id')),collect(()=>db.from('pmx_assignments').select('*').order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_reviews').select('*').order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_comments').select('*').order('created_at').order('id'))]);
   return {schemaVersion:5,exportedAt:new Date().toISOString(),expertiseScaleVersion:'hands-on-experience-v1',...benchmarkResults(people,allocations,reviews,comments,await meta(true))};
  }
  if(p==='/api/admin/reviewers'&&method==='POST'||p.startsWith('/api/admin/reviewers/')&&method==='PATCH'){
   assertProfile(data);if(data.caseIds!==undefined)assertCases(data.caseIds);
   const id=method==='POST'?null:decodeURIComponent(p.slice('/api/admin/reviewers/'.length));
   return query(db.rpc('pmx_save_expert',{p_id:id,p_profile:data,p_changed_by:a.email}));
  }
  if(p.startsWith('/api/admin/assignments/')&&method==='PUT'){
   assertCases(data.caseIds);const id=decodeURIComponent(p.slice('/api/admin/assignments/'.length));
   return query(db.rpc('pmx_save_expert',{p_id:id,p_profile:{caseIds:data.caseIds},p_changed_by:a.email}));
  }
 }
 throw new ApiError(404,'Not found.');
}
export function portalHandler(mode:'authenticated'|'name-picker'){return async(request:Request)=>{
 const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 try{
  if(!origin)throw new ApiError(503,'The review workspace is being configured.');
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==origin)throw new ApiError(403,'This origin is not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')throw new ApiError(405,'Method not allowed.');
  const raw=await request.text();if(new TextEncoder().encode(raw).length>256000)throw new ApiError(413,'This comment is too large. Submit it in smaller parts.');
  let input;try{input=JSON.parse(raw);}catch{throw new ApiError(400,'Invalid request.');}
  if(typeof input.path!=='string'||input.path.length>2000||!['GET','POST','PUT','PATCH'].includes(input.method))throw new ApiError(400,'Invalid request.');
  let a:Actor;
  if(mode==='name-picker'){
   const setting=await query(db.from('pmx_settings').select('value').eq('key','reviewer_access_enabled').maybeSingle());
   if(setting?.value!==true)throw new ApiError(503,'Reviewer access is being prepared. Please check back with the coordinator.');
   assertReviewerRoute(input.path,input.method);
   if(input.path==='/api/reviewer-access'){
    const credentials=reviewerCredentials(input.payload);
    const allowed=await query(db.rpc('pmx_reserve_reviewer_attempt',{p_bucket:await hashReviewerValue('email:'+credentials.email)}));
    if(!allowed)throw new ApiError(429,'Too many attempts for these details. Try again in 15 minutes.');
    const person=await query(db.from('pmx_experts').select('id,name,status,login_email').eq('login_email',credentials.email).maybeSingle());
    assertReviewerMatch(person,credentials);
    if(!(await assigned(person.id)).length)throw new ApiError(403,reviewerAccessError);
    const token=newReviewerToken(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
    await query(db.from('pmx_reviewer_sessions').insert({token_hash:await hashReviewerValue(token),reviewer_id:person.id,matched_email:credentials.email,expires_at:expiresAt}));
    return reply({reviewerId:person.id,token,expiresAt});
   }
   if(typeof input.reviewerToken!=='string'||!/^[a-f0-9]{64}$/.test(input.reviewerToken))throw new ApiError(401,'Enter your name and email to open your review.');
   const tokenHash=await hashReviewerValue(input.reviewerToken);
   if(input.path==='/api/reviewer-logout'){
    await query(db.from('pmx_reviewer_sessions').update({revoked_at:new Date().toISOString()}).eq('token_hash',tokenHash));return reply({signedOut:true});
   }
   const access=await query(db.from('pmx_reviewer_sessions').select('reviewer_id,matched_email,expires_at,revoked_at').eq('token_hash',tokenHash).maybeSingle());
   if(!access||access.revoked_at||Date.parse(access.expires_at)<=Date.now())throw new ApiError(401,'Your review session ended. Enter your name and email again.');
   const person=await query(db.from('pmx_experts').select('id,name,status,login_email').eq('id',access.reviewer_id).maybeSingle());
   if(!person||person.status!=='verified'||person.login_email?.toLowerCase()!==access.matched_email||!(await assigned(person.id)).length)throw new ApiError(401,'Your review session ended. Enter your name and email again.');
   if(input.reviewerId!==undefined&&input.reviewerId!==person.id)throw new ApiError(403,'This action is not available to reviewers.');
   a={userId:`selected:${person.id}`,email:person.login_email,name:person.name,coordinator:false,reviewerId:person.id,identityMethod:'name_email_match'};
  }else{
   const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)throw new ApiError(401,'Sign in to access the coordinator workspace.');
   a=await actor(token);
  }
  return reply(await route(a,input.path,input.method,input.payload??{}));
 }catch(e){return e instanceof ApiError?reply({error:e.message},e.status):reply({error:'Unable to complete this request. Please retry.'},500);}
};}
