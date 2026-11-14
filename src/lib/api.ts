import {supabase} from './supabase';
import {coordinatorMode,reviewerAccess,reviewerIdentity,selectReviewer} from './identity';
export async function api<T=any>(path:string,options:RequestInit={},selectedReviewerId=reviewerIdentity()):Promise<T>{
 if(!supabase)throw new Error('The review workspace is being configured. Please contact the coordinator.');
 const access=reviewerAccess();
 if(!coordinatorMode&&selectedReviewerId&&access?.reviewerId!==selectedReviewerId)throw Object.assign(new Error('Enter your name and email again.'),{status:401});
 const {data,error}=await supabase.functions.invoke(coordinatorMode?'pmxbench':'pmxbench-reviewer',{body:{reviewerId:coordinatorMode||!selectedReviewerId?undefined:selectedReviewerId,reviewerToken:coordinatorMode?undefined:access?.token,path,method:options.method??'GET',payload:options.body?JSON.parse(String(options.body)):undefined}});
 if(error){let message='Unable to complete this request. Please retry.';try{const body=await error.context?.json();if(body?.error)message=body.error;}catch{}const status=error.context?.status??500;if(!coordinatorMode&&status===401&&access?.token===reviewerAccess()?.token)selectReviewer(null);throw Object.assign(new Error(message),{status});}
 if(data?.error)throw new Error(data.error);
 if(path.split('?')[0]==='/api/session'&&Array.isArray(data?.cases))data.cases=data.cases.map((c:any)=>({...c,sections:[...c.sections.filter((s:any)=>s.id!==`${c.id}-source-literature`),{id:`${c.id}-source-literature`,number:`${c.number}.6`,title:'Source literature',type:'Source literature'}]}));
 return data as T;
}
