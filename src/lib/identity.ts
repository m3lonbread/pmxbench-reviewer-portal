import {supabase} from './supabase';
const storageKey='pmxbench-selected-reviewer-v1';
export const coordinatorMode=new URLSearchParams(window.location.search).get('coordinator')==='1';
let selectedId='';
try{selectedId=localStorage.getItem(storageKey)??'';}catch{}
export function reviewerIdentity(){return selectedId;}
export function selectReviewer(id:string){
 selectedId=id;
 try{if(id)localStorage.setItem(storageKey,id);else localStorage.removeItem(storageKey);}catch{}
 window.dispatchEvent(new Event('pmxbench-identity-change'));
}
export async function leaveWorkspace(){
 if(coordinatorMode)await supabase?.auth.signOut();
 else selectReviewer('');
}
