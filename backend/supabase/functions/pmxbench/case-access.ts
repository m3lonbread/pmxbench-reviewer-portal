import {ApiError} from './domain.ts';

export type CaseAccess={id:string;label:string;caseIds:string[];adminMode:'view_export'|'manage';workspaceMode:'live'|'test'};
export type PortalActor={userId:string;email:string;name:string;coordinator:boolean;reviewerId:string;identityMethod:string;caseAdmin?:boolean;caseAccess?:CaseAccess};
export function isCaseAdmin(a:PortalActor){return a.caseAdmin===true&&Boolean(a.caseAccess)&&a.identityMethod==='verified_email';}
export function isAdmin(a:PortalActor){return a.coordinator||isCaseAdmin(a);}
export function requireOwner(a:PortalActor){if(!a.coordinator)throw new ApiError(403,'Only the workspace owner can manage access.');}
export function withinScope(ids:string[],allowed:string[]){return ids.filter(id=>allowed.includes(id));}
// Never redact only a quotation: the surrounding comment may discuss that source.
// General feedback has no case anchor, so it is unavailable to case-scoped admins.
export function scopedComment(c:any,ids:string[]){return Array.isArray(c.quotes)&&c.quotes.length>0&&c.quotes.every((q:any)=>ids.includes(q.caseId));}
export function limitedPerson(p:any){return {id:p.id,name:p.name,status:p.status};}
export function scopedResults(people:any[],allocations:any[],reviews:any[],comments:any[],caseIds:string[]){
 const assignments=allocations.filter(a=>caseIds.includes(a.case_id)).map(a=>({reviewer_id:a.reviewer_id,case_id:a.case_id}));
 const caseReviews=reviews.filter(r=>caseIds.includes(r.case_id));
 const feedback=comments.filter(c=>scopedComment(c,caseIds));
 const visible=new Set([...assignments,...caseReviews,...feedback].map(x=>x.reviewer_id));
 return {reviewers:people.filter(p=>visible.has(p.id)).map(limitedPerson),assignments,caseReviews,comments:feedback,omittedGeneralFeedback:true};
}
