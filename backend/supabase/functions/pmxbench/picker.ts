import {ApiError} from './domain.ts';
// Matching known details is an access check, not proof of email ownership.
// No public directory or coordinator/preview route is available here.
export const reviewerAccessError='The name and email do not match an active reviewer. Check your details or contact the coordinator.';
export function assertReviewerRoute(path:string,method:string){
 const url=new URL(path,'https://pmxbench.invalid');
 if(url.search||url.hash||url.pathname!==path)throw new ApiError(403,'This action is not available to reviewers.');
 const allowed=(method==='GET'&&['/api/session','/api/reviews'].includes(path))
  ||(method==='GET'&&/^\/api\/cases\/[a-zA-Z0-9_-]+$/.test(path))
  ||(method==='GET'&&/^\/api\/cases\/[a-zA-Z0-9_-]+\/papers\/[a-f0-9]{32}$/.test(path))
  ||(path==='/api/reviews'&&method==='PATCH')
  ||(method==='POST'&&['/api/reviewer-access','/api/reviewer-logout','/api/comments'].includes(path));
 if(!allowed)throw new ApiError(403,'This action is not available to reviewers.');
}
const normalizeName=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/^(?:(?:dr|prof|professor)\.?\s+)+/u,'').replace(/[^\p{L}\p{N}]/gu,'');
export function reviewerNameMatches(input:string,stored:string){
 const alternatives=[stored,stored.replace(/\([^)]*\)/gu,'').replace(/[“"‘'][^”"’']+[”"’']/gu,'')];
 const nickname=stored.match(/[“"]([^”"]+)[”"]/u)?.[1];
 if(nickname)alternatives.push(nickname+' '+stored.trim().split(/\s+/u).at(-1));
 return Boolean(normalizeName(input))&&alternatives.some(n=>normalizeName(n)===normalizeName(input));
}
export function reviewerCredentials(input:unknown){
 const data=input as {name?:unknown;email?:unknown}|null;
 if(!data||typeof data.name!=='string'||typeof data.email!=='string'||!data.name.trim()||data.name.length>150||data.email.length>254)throw new ApiError(403,reviewerAccessError);
 const email=data.email.trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))throw new ApiError(403,reviewerAccessError);
 return {name:data.name.trim(),email};
}
export function assertReviewerMatch(person:{name:string;status:string;login_email:string|null}|null,credentials:{name:string;email:string}){
 if(!person||person.status!=='verified'||!person.login_email||person.login_email.trim().toLowerCase()!==credentials.email||!reviewerNameMatches(credentials.name,person.name))throw new ApiError(403,reviewerAccessError);
}
export async function hashReviewerValue(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function newReviewerToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');}
