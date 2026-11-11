import {supabase} from './supabase';
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
 if(!supabase)throw new Error('The review workspace is being configured. Please contact the coordinator.');
 const {data,error}=await supabase.functions.invoke('pmxbench',{body:{path,method:options.method??'GET',payload:options.body?JSON.parse(String(options.body)):undefined}});
 if(error){let message='Unable to complete this request. Please retry.';try{const body=await error.context?.json();if(body?.error)message=body.error;}catch{}throw Object.assign(new Error(message),{status:error.context?.status??500});}
 if(data?.error)throw new Error(data.error);
 return data as T;
}
