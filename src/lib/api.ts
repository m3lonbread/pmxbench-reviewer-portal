import {supabase} from './supabase';
import {coordinatorMode,reviewerIdentity} from './identity';
export async function api<T=any>(path:string,options:RequestInit={},selectedReviewerId=reviewerIdentity()):Promise<T>{
 if(!supabase)throw new Error('The review workspace is being configured. Please contact the coordinator.');
 const {data,error}=await supabase.functions.invoke(coordinatorMode?'pmxbench':'pmxbench-reviewer',{body:{reviewerId:coordinatorMode?undefined:selectedReviewerId,path,method:options.method??'GET',payload:options.body?JSON.parse(String(options.body)):undefined}});
 if(error){let message='Unable to complete this request. Please retry.';try{const body=await error.context?.json();if(body?.error)message=body.error;}catch{}throw Object.assign(new Error(message),{status:error.context?.status??500});}
 if(data?.error)throw new Error(data.error);
 return data as T;
}
