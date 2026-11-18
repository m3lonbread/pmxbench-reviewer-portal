'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {MessageSquarePlus} from 'lucide-react';
import type {ReviewCase} from '../../app/review-data';
import type {Source} from './content';

export function selectionPosition(rect:{left:number;top:number;bottom:number;width:number},viewport:{width:number;height:number}){
 const width=154,height=40,gap=8;
 return {left:Math.max(gap,Math.min(rect.left+rect.width/2-width/2,viewport.width-width-gap)),top:Math.max(gap,Math.min(rect.bottom+gap+height<=viewport.height?rect.bottom+gap:rect.top-height-gap,viewport.height-height-gap))};
}
type Pending={sources:Source[];left:number;top:number};
export function useSelectionComment({root,cases,disabled,onAttach}:{root:RefObject<HTMLDivElement|null>;cases:ReviewCase[];disabled:boolean;onAttach:(sources:Source[])=>void}){
 const [pending,setPending]=useState<Pending|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const dismiss=useCallback(()=>setPending(null),[]);
 const capture=useCallback(()=>{
  const selection=window.getSelection(),container=root.current;
  if(disabled||!selection||selection.isCollapsed||!selection.rangeCount||!container){dismiss();return;}
  const range=selection.getRangeAt(0);
  if(!container.contains(range.commonAncestorContainer)){dismiss();return;}
  const sources:Source[]=[];
  container.querySelectorAll<HTMLElement>('[data-source-block]').forEach(block=>{
   if(!range.intersectsNode(block))return;
   const full=document.createRange();full.selectNodeContents(block);const part=range.cloneRange();
   try{
    if(part.compareBoundaryPoints(Range.START_TO_START,full)<0)part.setStart(full.startContainer,full.startOffset);
    if(part.compareBoundaryPoints(Range.END_TO_END,full)>0)part.setEnd(full.endContainer,full.endOffset);
    const raw=part.toString();if(!raw.trim())return;
    const prefix=document.createRange();prefix.selectNodeContents(block);prefix.setEnd(part.startContainer,part.startOffset);
    const start=prefix.toString().length+raw.length-raw.trimStart().length,text=raw.trim();
    const c=cases.find(c=>c.id===block.dataset.case),s=c?.sections.find(s=>s.id===block.dataset.section);if(!c||!s)return;
    sources.push({caseId:c.id,caseNumber:c.number,caseTitle:c.title,sectionId:s.id,sectionNumber:s.number,sectionTitle:s.title,contentType:block.dataset.kind??s.type,blockId:block.id,start,end:start+text.length,text,revision:block.dataset.revision??c.revision,...(block.dataset.fileName?{fileName:block.dataset.fileName}:{})});
   }catch{}
  });
  const bounds=range.getBoundingClientRect(),reading=container.getBoundingClientRect();
  if(!sources.length||bounds.bottom<reading.top||bounds.top>reading.bottom){dismiss();return;}
  setPending({sources,...selectionPosition(bounds,{width:window.innerWidth,height:window.innerHeight})});
 },[cases,disabled,dismiss,root]);
 useEffect(()=>{
  const schedule=()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(capture,180);};
  const pointer=(event:PointerEvent)=>{if(root.current?.contains(event.target as Node))schedule();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss();};
  document.addEventListener('selectionchange',schedule);document.addEventListener('pointerup',pointer);document.addEventListener('keydown',key);window.addEventListener('resize',dismiss);
  return()=>{document.removeEventListener('selectionchange',schedule);document.removeEventListener('pointerup',pointer);document.removeEventListener('keydown',key);window.removeEventListener('resize',dismiss);if(timer.current)clearTimeout(timer.current);};
 },[capture,dismiss,root]);
 useEffect(()=>{if(disabled)dismiss();},[disabled,dismiss]);
 const popup=pending&&!disabled?<div className="selection-comment-popup" role="toolbar" aria-label="Selected text actions" style={{left:pending.left,top:pending.top}}><button onPointerDown={e=>e.preventDefault()} onClick={()=>{onAttach(pending.sources);dismiss();window.getSelection()?.removeAllRanges();}}><MessageSquarePlus size={15}/>Add comment</button></div>:null;
 return {popup,dismiss};
}
