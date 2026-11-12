import {supabase} from './supabase';
export type ReviewerAccess={reviewerId:string;token:string;expiresAt:string};
const storageKey='pmxbench-reviewer-access-v2';
export const coordinatorMode=new URLSearchParams(window.location.search).get('coordinator')==='1';
let access:ReviewerAccess|null=null;
try{
 localStorage.removeItem('pmxbench-selected-reviewer-v1');
 const saved=JSON.parse(sessionStorage.getItem(storageKey)??'null');
 if(saved&&typeof saved.reviewerId==='string'&&/^[a-f0-9]{64}$/.test(saved.token)&&Date.parse(saved.expiresAt)>Date.now())access=saved;
 else sessionStorage.removeItem(storageKey);
}catch{}
export function reviewerAccess(){return access;}
export function reviewerIdentity(){return access?.reviewerId??'';}
export function selectReviewer(next:ReviewerAccess|null){
 access=next;
 try{if(next)sessionStorage.setItem(storageKey,JSON.stringify(next));else sessionStorage.removeItem(storageKey);}catch{}
 window.dispatchEvent(new Event('pmxbench-identity-change'));
}
export async function leaveWorkspace(){
 if(coordinatorMode){await supabase?.auth.signOut();return;}
 const previous=access;selectReviewer(null);
 if(previous)try{await supabase?.functions.invoke('pmxbench-reviewer',{body:{path:'/api/reviewer-logout',method:'POST',reviewerToken:previous.token}});}catch{}
}
