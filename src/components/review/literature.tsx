'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDownToLine,ArrowUpRight,BookOpen,FileText,LoaderCircle,X} from 'lucide-react';
import type {CaseDetail,LiteraturePaper} from '../../app/review-data';
import {api} from '../../lib/api';
import {SourceText,type Flash} from './content';
type PaperLinks={url:string;downloadUrl:string;expiresAt:string};
const PaperPreview=lazy(()=>import('./paper-preview'));

export function SourceLiterature({c,flash,previewQuery}:{c:CaseDetail;flash:Flash;previewQuery:string}){
 const [paper,setPaper]=useState<LiteraturePaper|null>(null),[links,setLinks]=useState<PaperLinks|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 const section=c.sections.find(s=>s.type==='Source literature')!;
 useEffect(()=>{
  if(!paper)return;let active=true;setLinks(null);setError('');
  api<PaperLinks>(`/api/cases/${c.id}/papers/${paper.id}${previewQuery}`).then(result=>{if(active)setLinks(result);}).catch(e=>{if(active)setError(e.message??'Unable to open this paper.');});
  return()=>{active=false;};
 },[c.id,paper,previewQuery,attempt]);
 useEffect(()=>{
  if(!paper)return;const previous=document.activeElement as HTMLElement|null;close.current?.focus();
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();setPaper(null);}
   if(e.key==='Tab'){
    const items=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)');if(!items?.length)return;
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);previous?.focus();};
 },[paper]);
 return <div className="source-literature"><div className="literature-intro"><BookOpen size={19}/><div><h3>Read the source papers</h3><p>Optional reading for this case. Preview a paper here, or open and download the PDF.</p></div></div>
  {(c.literature??[]).length?<div className="literature-list">{c.literature.map(p=><div className="literature-card" key={p.id}>
   <span className="literature-file-icon"><FileText size={20}/><small>PDF</small></span><div className="literature-details"><SourceText c={c} s={section} id={`${c.id}-paper-${p.id}`} text={p.title} kind="Source literature · paper" flash={flash} tag="h4"/><p>{p.pages} pages<span>·</span>{(p.bytes/1024/1024).toFixed(1)} MB</p><details><summary>File name</summary><small>{p.fileName}</small></details></div>
   <button className="button outline literature-open" aria-label={`Read PDF: ${p.title}`} onClick={()=>{setLinks(null);setError('');setPaper(p);}}><BookOpen size={14}/>Read PDF</button>
  </div>)}</div>:<p className="section-intro">No source PDFs have been added for this case yet.</p>}
  {paper&&createPortal(<div className="paper-reader-backdrop" onClick={()=>setPaper(null)}><div className="paper-reader" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="paper-reader-title" onClick={e=>e.stopPropagation()}>
   <div className="paper-reader-heading"><div><span className="eyebrow">CASE {c.number} · SOURCE LITERATURE</span><h2 id="paper-reader-title">{paper.title}</h2></div><button ref={close} className="icon-button" aria-label="Close paper" onClick={()=>setPaper(null)}><X size={21}/></button></div>
   <div className="paper-reader-toolbar"><span>{paper.pages} pages · PDF</span><div>{links&&<><a className="button outline" href={links.url} target="_blank" rel="noopener noreferrer">Open in new tab<ArrowUpRight size={14}/></a><a className="button primary" href={links.downloadUrl} target="_blank" rel="noopener noreferrer"><ArrowDownToLine size={14}/>Download PDF</a></>}<button className="button outline" onClick={()=>setAttempt(n=>n+1)}>Refresh paper</button></div></div>
   {error?<div className="paper-reader-status" role="alert"><p>{error}</p><button className="button primary" onClick={()=>setAttempt(n=>n+1)}>Retry</button></div>:links?<Suspense fallback={<div className="paper-reader-status" role="status"><LoaderCircle size={24} className="spin"/>Opening paper…</div>}><PaperPreview url={links.url} title={paper.title}/></Suspense>:<div className="paper-reader-status" role="status"><LoaderCircle size={24} className="spin"/>Opening paper…</div>}
   <p className="paper-reader-footer">Close the paper to return to your review. If the preview is unavailable, use “Open in new tab” or “Download PDF.”</p>
  </div></div>,document.body)}
 </div>;
}
