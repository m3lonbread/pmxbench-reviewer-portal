import {createClient} from '@supabase/supabase-js';
import {benchmarkResults,caseAccessSource} from './results.ts';
import {activeCase,caseView,literatureView} from './case-view.ts';
import {assertReviewerRoute,assertReviewerMatch,hashReviewerValue,newReviewerToken,reviewerAccessError,reviewerCredentials,reviewerEmailMatches} from './picker.ts';
import {ApiError,assertCases,assertProfile,normalizeQuotes,requireCoordinator,requireWrite,validateRatingPatch} from './domain.ts';
import {isAdmin,isCaseAdmin,requireOwner,withinScope,scopedComment,limitedPerson,scopedResults,type PortalActor} from './case-access.ts';
const origin=Deno.env.get('PMXBENCH_FRONTEND_ORIGIN')??'';
const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??secrets.default;
const db=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
const personColumns='id,name,email,login_email,affiliation,status,modeling_area,research_focus,notes,source,source_row,outreach_status,updated_at';
async function query(request:PromiseLike<{data:any;error:any}>):Promise<any>{const {data,error}=await request;if(error){if(error.code==='P0002')throw new ApiError(404,error.message);if(error.code==='PT409')throw new ApiError(409,error.message);if(error.code==='23505')throw new ApiError(409,'That sign-in email or record already exists.');if(['23503','23514','P0001'].includes(error.code))throw new ApiError(400,error.code==='P0001'?error.message:'Invalid expert or case details.');throw new ApiError(500,'Unable to complete this request. Please retry.');}return data;}
async function collect(build:()=>any){const rows:any[]=[];for(let offset=0;;offset+=1000){const page=await query(build().range(offset,offset+999));rows.push(...page);if(page.length<1000)return rows;}}
async function groupActor(person:any,userId:string,email:string,identityMethod:string):Promise<PortalActor|null>{
 const member=await query(db.from('pmx_case_group_members').select('*').eq('reviewer_id',person.id).maybeSingle());
 if(!member)return null;
 const group=await query(db.from('pmx_case_groups').select('*').eq('id',member.group_id).maybeSingle());
 if(!group?.active||person.status!=='verified')throw new ApiError(403,'This case workspace has not been activated.');
 const passwordAdmin=identityMethod==='verified_email'&&member.role==='case_admin';
 if(passwordAdmin&&member.auth_user_id!==userId)throw new ApiError(403,'This admin account has not been linked by the workspace owner.');
 return {userId,email,name:person.name,coordinator:false,reviewerId:person.id,identityMethod,caseAdmin:passwordAdmin,caseAccess:{id:group.id,label:group.label,caseIds:group.case_ids,workspaceMode:group.workspace_mode,adminMode:group.admin_mode}};
}
async function actor(token:string):Promise<PortalActor>{
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user||!user.email||!user.email_confirmed_at)throw new ApiError(401,'Sign in with a verified email to access your assigned cases.');
 const email=user.email.trim().toLowerCase(),settings=await query(db.from('pmx_settings').select('value').eq('key','coordinator_emails').maybeSingle());
 const emails=Array.isArray(settings?.value)?settings.value.map((e:unknown)=>String(e).toLowerCase()):[];
 if(!emails.length)throw new ApiError(503,'The review workspace is being configured.');
 if(emails.includes(email))return {userId:user.id,email,name:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:email,coordinator:true,reviewerId:`coordinator:${user.id}`,identityMethod:'verified_email'};
 let person=await query(db.from('pmx_experts').select('*').eq('auth_user_id',user.id).maybeSingle());
 if(!person)person=await query(db.from('pmx_experts').select('*').eq('login_email',email).maybeSingle());
 if(!person)throw new ApiError(403,'This account has no expert profile yet. Contact the coordinator.');
 const scoped=await groupActor(person,user.id,email,'verified_email');if(scoped)return scoped;
 if(person.status!=='verified')throw new ApiError(403,person.status==='inactive'?'Your expert profile is inactive. Contact the coordinator.':'Your expert profile is preliminary. The coordinator will confirm your details and activate your cases.');
 if(person.auth_user_id&&person.auth_user_id!==user.id)throw new ApiError(403,'This expert profile is linked to another sign-in. Contact the coordinator.');
 if(!person.auth_user_id){const linked=await query(db.from('pmx_experts').update({auth_user_id:user.id}).eq('id',person.id).is('auth_user_id',null).select('auth_user_id').maybeSingle());if(!linked){const current=await query(db.from('pmx_experts').select('auth_user_id').eq('id',person.id).single());if(current.auth_user_id!==user.id)throw new ApiError(403,'This profile was linked to another sign-in.');}}
 return {userId:user.id,email,name:person.name,coordinator:false,reviewerId:person.id,identityMethod:'verified_email'};
}
type Actor=Awaited<ReturnType<typeof actor>>;
async function meta(includeArchived=false){return (await query(db.from('pmx_cases').select('meta'))).map((r:any)=>r.meta).filter((c:any)=>includeArchived||activeCase(c)).map(caseView).sort((a:any,b:any)=>a.number-b.number);}
async function assigned(id:string){return (await query(db.from('pmx_assignments').select('case_id').eq('reviewer_id',id))).map((r:any)=>r.case_id);}
async function scope(a:Actor,preview:string|null){
 if(a.caseAccess){
  const all=(await meta()).filter((c:any)=>a.caseAccess!.caseIds.includes(c.id));
  if(preview){
   if(!isCaseAdmin(a)||preview==='reviewer-demo')throw new ApiError(403,'This preview is not available in your case scope.');
   const ids=withinScope(await assigned(preview),a.caseAccess.caseIds);
   if(!ids.length)throw new ApiError(404,'Expert not available in this scope.');
   const p=await query(db.from('pmx_experts').select('id,name,status').eq('id',preview).maybeSingle());if(!p)throw new ApiError(404,'Expert not available in this scope.');
   return {actor:a,reviewerId:p.id,name:p.name,email:'',cases:all.filter((c:any)=>ids.includes(c.id)),preview:true,samplePreview:false,status:p.status};
  }
  return {actor:a,reviewerId:a.reviewerId,name:a.name,email:a.email,cases:all,preview:false,samplePreview:false,status:'verified'};
 }
 if(preview){requireCoordinator(a);if(preview==='reviewer-demo')return {actor:a,reviewerId:'preview:example-reviewer',name:'Example reviewer',email:a.email,cases:(await meta()).filter((c:any)=>!c.isTest).slice(0,2),preview:true,samplePreview:true,status:'verified'};const p=await query(db.from('pmx_experts').select('*').eq('id',preview).maybeSingle());if(!p)throw new ApiError(404,'Expert not found.');const ids=await assigned(p.id);return {actor:a,reviewerId:p.id,name:p.name,email:p.login_email,cases:ids.length?(await query(db.from('pmx_cases').select('meta').in('id',ids))).map((r:any)=>r.meta).filter(activeCase).map(caseView).sort((x:any,y:any)=>x.number-y.number):[],preview:true,samplePreview:false,status:p.status};}
 const ids=a.coordinator?null:await assigned(a.reviewerId);
 const cases=ids===null?await meta():ids.length?(await query(db.from('pmx_cases').select('meta').in('id',ids))).map((r:any)=>r.meta).filter(activeCase).map(caseView).sort((x:any,y:any)=>x.number-y.number):[];
 return {actor:a,reviewerId:a.reviewerId,name:a.name,email:a.email,cases,preview:false,samplePreview:false,status:'verified'};
}
type Scope=Awaited<ReturnType<typeof scope>>;
async function accessGroups(a:Actor){
 requireOwner(a);
 const [groups,members,people,cases]=await Promise.all([query(db.from('pmx_case_groups').select('*').order('label')),query(db.from('pmx_case_group_members').select('reviewer_id,group_id,role,auth_user_id')),query(db.from('pmx_experts').select('id,name,login_email')),meta()]);
 return {groups:groups.map((g:any)=>({id:g.id,label:g.label,active:g.active,workspaceMode:g.workspace_mode,adminMode:g.admin_mode,cases:cases.filter((c:any)=>g.source_case_ids.includes(c.id)),members:members.filter((m:any)=>m.group_id===g.id).map((m:any)=>{const p=people.find((p:any)=>p.id===m.reviewer_id);return {id:m.reviewer_id,name:p?.name,email:p?.login_email,role:m.role,passwordReady:Boolean(m.auth_user_id)};})}))};
}
async function activateGroup(a:Actor,id:string,data:Record<string,any>){
 requireOwner(a);
 if(!['live','test'].includes(data.workspaceMode)||!['view_export','manage'].includes(data.adminMode)||typeof data.password!=='string'||data.password.length<12||data.password.length>128)throw new ApiError(400,'Choose the workspace, admin permissions, and a password of 12–128 characters.');
 const group=await query(db.from('pmx_case_groups').select('*').eq('id',id).maybeSingle());
 if(!group||group.active)throw new ApiError(409,'This group is missing or has already been activated. Refresh the setup.');
 const members=await query(db.from('pmx_case_group_members').select('*').eq('group_id',id));
 const admins=members.filter((m:any)=>m.role==='case_admin');
 if(!admins.length)throw new ApiError(400,'This group has no prepared admin members.');
 // Only the owner can submit this form. The password is forwarded directly to
 // Supabase Auth; it is never returned, logged, or stored in application tables.
 for(const m of admins){
  const p=await query(db.from('pmx_experts').select('name,login_email').eq('id',m.reviewer_id).single());
  if(!p.login_email)throw new ApiError(400,'An admin member has no recorded email.');
  if(m.auth_user_id){
   const existing=await db.auth.admin.getUserById(m.auth_user_id);
   if(existing.error||existing.data.user?.email?.toLowerCase()!==p.login_email)throw new ApiError(409,'An admin account needs owner inspection. No existing password was changed.');
   continue;
  }
  const created=await db.auth.admin.createUser({email:p.login_email,password:data.password,email_confirm:true,user_metadata:{full_name:p.name}});
  if(created.error||!created.data.user)throw new ApiError(409,'An admin account could not be created. The group remains inactive. Existing passwords are retained; if setup was partial, retry with the same password or ask the owner to inspect existing accounts.');
  await query(db.from('pmx_case_group_members').update({auth_user_id:created.data.user.id}).eq('reviewer_id',m.reviewer_id).is('auth_user_id',null));
 }
 await query(db.rpc('pmx_activate_case_group',{p_group:id,p_mode:data.workspaceMode,p_admin_mode:data.adminMode,p_changed_by:a.email}));
 return {activated:true};
}
async function scopedAdmin(a:Actor,p:string,method:string,data:Record<string,any>){
 if(!isCaseAdmin(a)||!a.caseAccess)throw new ApiError(403,'Scoped admin access is required.');
 const access=a.caseAccess,ids=access.caseIds;
 if(p==='/api/admin/reviewers'&&method==='GET'){
  const allocations=await collect(()=>db.from('pmx_assignments').select('reviewer_id,case_id').in('case_id',ids).order('reviewer_id').order('case_id'));
  const reviewerIds=[...new Set(allocations.map((r:any)=>r.reviewer_id))];
  const [people,progress]=reviewerIds.length?await Promise.all([collect(()=>db.from('pmx_experts').select('id,name,status').in('id',reviewerIds).order('name').order('id')),collect(()=>db.from('pmx_reviews').select('reviewer_id,case_id,reviewed').in('case_id',ids).order('reviewer_id').order('case_id'))]):[[],[]];
  return {scoped:true,canAddReviewers:access.adminMode==='manage',reviewers:people.map((person:any)=>{const caseIds=allocations.filter((r:any)=>r.reviewer_id===person.id).map((r:any)=>r.case_id);return {...limitedPerson(person),caseIds,completed:progress.filter((r:any)=>r.reviewer_id===person.id&&caseIds.includes(r.case_id)&&r.reviewed).length};}),cases:(await meta()).filter((c:any)=>ids.includes(c.id))};
 }
 if(p==='/api/admin/results'&&method==='GET'){
  const [people,allocations,reviews,comments]=await Promise.all([collect(()=>db.from('pmx_experts').select('id,name,status,source').order('name').order('id')),collect(()=>db.from('pmx_assignments').select('reviewer_id,case_id').in('case_id',ids).order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_reviews').select('*').in('case_id',ids).order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_comments').select('*').order('created_at').order('id'))]);
  const allowedCases=(await meta(true)).filter((c:any)=>ids.includes(c.id));
  const filtered=access.workspaceMode==='live'?benchmarkResults(people,allocations,reviews,comments,allowedCases):{reviewers:people,assignments:allocations,caseReviews:reviews,comments};
  return {schemaVersion:6,exportedAt:new Date().toISOString(),scope:{label:access.label,caseIds:ids,workspaceMode:access.workspaceMode},...scopedResults(filtered.reviewers,filtered.assignments,filtered.caseReviews,filtered.comments,ids)};
 }
 if(p==='/api/admin/reviewers'&&method==='POST'){
  if(access.adminMode!=='manage')throw new ApiError(403,'Adding reviewers is not enabled for this scope.');
  if(Object.keys(data).some(k=>!['name','loginEmail','caseIds'].includes(k)))throw new ApiError(400,'Only the reviewer name, email, and new case selections can be supplied.');
  assertProfile(data);
  if(typeof data.name!=='string'||!data.name.trim()||typeof data.loginEmail!=='string'||!/^\S+@\S+\.\S+$/.test(data.loginEmail.trim()))throw new ApiError(400,'Enter a full name and valid reviewer email.');
  assertCases(data.caseIds);
  if(!data.caseIds.length)throw new ApiError(400,'Choose one to three cases.');
  if(data.caseIds.some((id:string)=>!ids.includes(id)))throw new ApiError(403,'Choose cases within your case scope.');
  return query(db.rpc('pmx_add_scoped_reviewer',{p_group:access.id,p_name:data.name.trim(),p_email:data.loginEmail.trim().toLowerCase(),p_cases:data.caseIds,p_changed_by:a.email}));
 }
 throw new ApiError(403,'This action is outside your case admin permissions.');
}
async function packet(s:Scope,id:string){if(!s.cases.some((c:any)=>c.id===id))throw new ApiError(404,'This case is not assigned to you.');const row=await query(db.from('pmx_cases').select('packet').eq('id',id).maybeSingle());if(!row)throw new ApiError(404,'Case not found.');const c=literatureView(caseView(row.packet)),sourceId=c.testSourceCaseId??c.id;const [papers,guide]=await Promise.all([query(db.from('pmx_literature').select('meta,is_key_source').eq('case_id',sourceId).order('paper_id')),query(db.from('pmx_material_guides').select('payload').eq('case_id',sourceId).maybeSingle())]);return {...c,...(guide?{reviewGoal:guide.payload.goalStatement,reviewGuide:guide.payload.review,materialGuideHistory:guide.payload.history??[],materialsGuide:{revision:guide.payload.revision,objective:guide.payload.objective,scope:guide.payload.scope},materials:c.materials.map((m:any)=>({...m,guide:guide.payload.files[m.name]}))}:{}),literature:papers.filter((p:any)=>p.is_key_source).map((p:any)=>p.meta).sort((a:any,b:any)=>(a.sourceOrder??0)-(b.sourceOrder??0)),legacyLiterature:papers.filter((p:any)=>!p.is_key_source).map((p:any)=>p.meta)};}
function commentView(c:any){return {id:c.id,text:c.text,quotes:c.quotes,createdAt:c.created_at,updatedAt:c.updated_at??undefined,version:c.edit_version??0,reviewer:c.reviewer_name,identityMethod:c.identity_method};}
async function state(s:Scope){
 if(s.samplePreview)return {ratings:{},reviewed:[],feedback:[]};
 const [reviews,comments]=await Promise.all([collect(()=>db.from('pmx_reviews').select('*').eq('reviewer_id',s.reviewerId).order('case_id')),collect(()=>db.from('pmx_comments').select('*').eq('reviewer_id',s.reviewerId).order('created_at').order('id'))]);
 const ids=s.cases.map((c:any)=>c.id),ratings:Record<string,any>={},reviewed:string[]=[];
 for(const r of reviews){if(!ids.includes(r.case_id))continue;ratings[r.case_id]={values:{},difficultyFeedback:'',improvements:'',recommendation:'',...r.rating,updatedAt:r.updated_at};if(r.reviewed)reviewed.push(r.case_id);}
 return {ratings,reviewed,feedback:comments.filter((c:any)=>!c.archived_at&&(s.actor.caseAccess?scopedComment(c,ids):!c.quotes.length||c.quotes.every((q:any)=>ids.includes(q.caseId)))).map(commentView)};
}
async function route(a:Actor,path:string,method:string,data:Record<string,any>){
 if(!path.startsWith('/api/'))throw new ApiError(404,'Not found.');
 const url=new URL(path,'https://pmxbench.invalid'),s=await scope(a,url.searchParams.get('preview')),p=url.pathname;
 if(p==='/api/session'&&method==='GET')return {user:{id:a.userId,name:s.name,email:s.email},role:s.preview?'preview':a.coordinator?'coordinator':isCaseAdmin(a)?'case_admin':a.caseAccess?'case_viewer':'reviewer',access:a.caseAccess,reviewerId:s.reviewerId,readOnly:s.preview||Boolean(a.caseAccess),samplePreview:s.samplePreview,reviewerStatus:s.status,identityMethod:a.identityMethod,cases:s.cases,review:await state(s)};
 if(a.caseAccess&&method!=='GET'&&!p.startsWith('/api/admin/'))throw new ApiError(403,'This case workspace is read-only.');
 const paperMatch=p.match(/^\/api\/cases\/([a-zA-Z0-9_-]+)\/papers\/([a-f0-9]{32})$/);
 if(paperMatch&&method==='GET'){
  const c=await packet(s,paperMatch[1]),paper=[...c.literature,...c.legacyLiterature].find((p:any)=>p.id===paperMatch[2]);
  if(!paper)throw new ApiError(404,'This paper is not part of your assigned case.');
  const row=await query(db.from('pmx_literature').select('object_path').eq('case_id',c.testSourceCaseId??c.id).eq('paper_id',paper.id).maybeSingle());
  if(!row||!/^[a-f0-9]{64}\.pdf$/.test(row.object_path))throw new ApiError(404,'Paper not found.');
  const bucket=db.storage.from('pmxbench-literature');
  const [read,download]=await Promise.all([bucket.createSignedUrl(row.object_path,300),bucket.createSignedUrl(row.object_path,300,{download:paper.fileName})]);
  if(read.error||download.error)throw new ApiError(503,'This paper could not be opened. Please retry.');
  return {url:read.data.signedUrl,downloadUrl:download.data.signedUrl,expiresAt:new Date(Date.now()+300000).toISOString()};
 }
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
  return commentView(row);
 }
 const commentMatch=p.match(/^\/api\/comments\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
 if(commentMatch&&method==='PATCH'){
  requireWrite(s);
  if(Object.keys(data).some(k=>!['text','version'].includes(k))||typeof data.text!=='string'||!data.text.trim()||data.text.length>20000||!Number.isInteger(data.version)||data.version<0)throw new ApiError(400,'Enter a comment of up to 20,000 characters.');
  const row=await query(db.rpc('pmx_edit_comment',{p_reviewer:s.reviewerId,p_id:commentMatch[1],p_text:data.text,p_expected_version:data.version,p_visible_cases:s.cases.map((c:any)=>c.id)}));
  return commentView(row);
 }
 if(p.startsWith('/api/admin/')){
  if(!isAdmin(a))throw new ApiError(403,'Coordinator access is required.');if(s.preview)throw new ApiError(403,'Return to the coordinator workspace to manage experts.');
  if(a.caseAccess)return scopedAdmin(a,p,method,data);
  if(p==='/api/admin/access-groups'&&method==='GET')return accessGroups(a);
  if(p.match(/^\/api\/admin\/access-groups\/[a-z0-9-]+\/activate$/)&&method==='POST')return activateGroup(a,p.split('/')[4],data);
  if(p==='/api/admin/reviewers'&&method==='GET'){
   const [people,allocations,progress]=await Promise.all([collect(()=>db.from('pmx_experts').select(personColumns+',auth_user_id').order('name').order('id')),collect(()=>db.from('pmx_assignments').select('reviewer_id,case_id').order('reviewer_id').order('case_id')),collect(()=>db.from('pmx_reviews').select('reviewer_id,case_id,reviewed').order('reviewer_id').order('case_id'))]);
   return {reviewers:people.filter((p:any)=>p.source!==caseAccessSource).map((person:any)=>{const ids=allocations.filter((r:any)=>r.reviewer_id===person.id).map((r:any)=>r.case_id);return {...person,auth_user_id:undefined,linked:Boolean(person.auth_user_id),caseIds:ids,completed:progress.filter((r:any)=>r.reviewer_id===person.id&&ids.includes(r.case_id)&&r.reviewed).length};}),cases:await meta()};
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
    let person=await query(db.from('pmx_experts').select('id,name,status,login_email,login_email_aliases').eq('login_email',credentials.email).maybeSingle());
    if(!person)person=await query(db.from('pmx_experts').select('id,name,status,login_email,login_email_aliases').contains('login_email_aliases',[credentials.email]).maybeSingle());
    assertReviewerMatch(person,credentials);
    if(!await groupActor(person,`selected:${person.id}`,credentials.email,'name_email_match')&&!(await assigned(person.id)).length)throw new ApiError(403,reviewerAccessError);
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
   const person=await query(db.from('pmx_experts').select('id,name,status,login_email,login_email_aliases').eq('id',access.reviewer_id).maybeSingle());
   if(!person||person.status!=='verified'||!reviewerEmailMatches(person,access.matched_email))throw new ApiError(401,'Your review session ended. Enter your name and email again.');
   const group=await groupActor(person,`selected:${person.id}`,person.login_email,'name_email_match');
   if(!group&&!(await assigned(person.id)).length)throw new ApiError(401,'Your review session ended. Enter your name and email again.');
   if(input.reviewerId!==undefined&&input.reviewerId!==person.id)throw new ApiError(403,'This action is not available to reviewers.');
   a=group??{userId:`selected:${person.id}`,email:person.login_email,name:person.name,coordinator:false,reviewerId:person.id,identityMethod:'name_email_match'};
  }else{
   const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)throw new ApiError(401,'Sign in to access the coordinator workspace.');
   a=await actor(token);
  }
  return reply(await route(a,input.path,input.method,input.payload??{}));
 }catch(e){return e instanceof ApiError?reply({error:e.message},e.status):reply({error:'Unable to complete this request. Please retry.'},500);}
};}
