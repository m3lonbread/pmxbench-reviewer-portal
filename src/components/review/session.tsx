'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CaseRating,ReviewCase} from '../../app/review-data';
import type {Source} from './content';
export type Feedback={id:string;text:string;quotes:Source[];createdAt:string;reviewer:string;identityMethod?:string};
export type ReviewState={ratings:Record<string,CaseRating>;reviewed:string[];feedback:Feedback[]};
export type ReviewSession={user:{id:string;name:string;email:string};role:'coordinator'|'reviewer'|'preview';reviewerId:string;identityMethod:'verified_email'|'self_selected_name';readOnly:boolean;samplePreview:boolean;reviewerStatus:'preliminary'|'verified'|'inactive';cases:ReviewCase[];review:ReviewState};
export {api as fetchJson} from '../../lib/api';
import {api as fetchJson} from '../../lib/api';
type Patch={caseId:string;ratingPatch?:Record<string,unknown>;reviewed?:boolean};
function merge(a:Patch,b:Patch):Patch{const ratingPatch={...a.ratingPatch,...b.ratingPatch};if(a.ratingPatch?.values||b.ratingPatch?.values)ratingPatch.values={...(a.ratingPatch?.values as object??{}),...(b.ratingPatch?.values as object??{})};return {...a,...b,ratingPatch};}
export function useCloudReview(session:ReviewSession,previewQuery:string){
 const [ratings,setRatings]=useState(session.review.ratings),[reviewed,setReviewed]=useState(session.review.reviewed),[feedback,setFeedback]=useState(session.review.feedback);
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[submitting,setSubmitting]=useState(false);
 const ratingsRef=useRef(ratings),pending=useRef(new Map<string,Patch>()),active=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
 const outbox=`pmxbench-pending-v3:${session.user.id}:${session.reviewerId}`;
 const persist=useCallback(()=>{try{localStorage.setItem(outbox,JSON.stringify([...pending.current.values()]));}catch{}},[outbox]);
 const flush=useCallback(async()=>{
  if(active.current||session.readOnly)return;active.current=true;
  if(alive.current)setSaving(true);
  try{while(pending.current.size){const [id,patch]=pending.current.entries().next().value!;pending.current.delete(id);try{await fetchJson('/api/reviews'+previewQuery,{method:'PATCH',body:JSON.stringify(patch)},session.reviewerId);persist();}catch(e){pending.current.set(id,pending.current.has(id)?merge(patch,pending.current.get(id)!):patch);persist();throw e;}}if(alive.current)setError('');}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'Unable to save.');}
  finally{active.current=false;if(alive.current)setSaving(false);}
 },[persist,previewQuery,session.readOnly,session.reviewerId]);
 useEffect(()=>{alive.current=true;try{const saved=JSON.parse(localStorage.getItem(outbox)??'[]');if(Array.isArray(saved)&&!session.readOnly){const updated={...ratingsRef.current};for(const p of saved){if(!p||!session.cases.some(c=>c.id===p.caseId))continue;pending.current.set(p.caseId,p);if(p.ratingPatch){const prev=updated[p.caseId]??{values:{},difficultyFeedback:'',improvements:'',recommendation:'',updatedAt:''};const values={...prev.values,...p.ratingPatch.values};for(const k of Object.keys(values))if(values[k]===null)delete values[k];updated[p.caseId]={...prev,...p.ratingPatch,values};}}ratingsRef.current=updated;setRatings(updated);if(pending.current.size)void flush();}}catch{}return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);void flush();};},[outbox]);
 function queue(patch:Patch){if(session.readOnly)return;pending.current.set(patch.caseId,pending.current.has(patch.caseId)?merge(pending.current.get(patch.caseId)!,patch):patch);persist();setSaving(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),650);}
 function updateRating(id:string,next:CaseRating){if(session.readOnly)return;const previous=ratingsRef.current[id],values:Record<string,string|null>={};for(const key of new Set([...Object.keys(previous?.values??{}),...Object.keys(next.values)])){const k=key as keyof CaseRating['values'];if(previous?.values[k]!==next.values[k])values[key]=next.values[k]??null;}const patch:Record<string,unknown>={};if(Object.keys(values).length)patch.values=values;for(const key of ['difficultyFeedback','improvements','recommendation'] as const)if(previous?.[key]!==next[key])patch[key]=next[key];ratingsRef.current={...ratingsRef.current,[id]:next};setRatings(ratingsRef.current);if(Object.keys(patch).length)queue({caseId:id,ratingPatch:patch});}
 function toggleReviewed(id:string){if(session.readOnly)return;const value=!reviewed.includes(id);setReviewed(prev=>value?[...prev,id]:prev.filter(x=>x!==id));queue({caseId:id,reviewed:value});}
 async function postComment(data:{id:string;text:string;quotes:Source[]}){if(session.readOnly)throw new Error('Reviewer previews are read-only.');setSubmitting(true);try{const entry=await fetchJson('/api/comments'+previewQuery,{method:'POST',body:JSON.stringify(data)},session.reviewerId) as Feedback;setFeedback(prev=>prev.some(c=>c.id===entry.id)?prev:[...prev,entry]);return entry;}finally{setSubmitting(false);}}
 return {ratings,reviewed,feedback,saving,error,submitting,updateRating,toggleReviewed,postComment,retry:flush};
}
