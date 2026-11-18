'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCheck,FileText,ListTree,MessageSquare,Quote,SlidersHorizontal,X} from 'lucide-react';

const steps=[
 {title:'Find your assigned cases.',eyebrow:'Your review workspace',body:'Use the case list to jump to a case or subsection. Sections expand and collapse as you read, and the list follows your place.',note:'On a smaller screen, use Cases to open the navigation.',area:'cases'},
 {title:'Read, compare, and check the sources.',eyebrow:'Case materials',body:'Materials contains the prompt, short file summaries, scoring criteria, and pass/fail gates. Use Side by Side Tool to compare sections. Open Key source literature within a case to read the primary papers.',note:'Each file summary explains its role at a glance.',area:'materials'},
 {title:'Quick ratings are enough.',eyebrow:'Your overall assessment',body:'Open Case ratings within your case to assess scientific soundness, clarity, materials, alignment, difficulty, and modeling experience. Rate any of the six areas without writing a comment.',note:'The experience scale includes approximate years and practical modeling skills.',area:'ratings'},
 {title:'Highlight a passage, then comment.',eyebrow:'Feedback with source context',body:'Select text, then choose Add comment in the popup to attach its quotation and source to the chat. Add your comment and press the send arrow. Click the source reference to return to the passage.',note:'Highlighting alone does not attach a quotation. For general feedback, type directly in the chat.',area:'comments'},
 {title:'Save your progress and return anytime.',eyebrow:'Finishing your review',body:'Ratings save automatically. Chat comments save after you press Send. Look for the saved confirmation before leaving. When you finish a case, choose Mark reviewed.',note:'You can return later using the same name and email. Review summary and Export review let you keep your own copy.',area:'finish'}
] as const;

export function ReviewerTutorial({onClose}:{onClose:()=>void}){
 const [index,setIndex]=useState(0),dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 const step=steps[index];
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;close.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const controls=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
 },[onClose]);
 const active=(area:string)=>step.area===area||step.area==='finish';
 return <div className="tutorial-backdrop" onClick={onClose}><div className="reviewer-tutorial" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-description" onClick={e=>e.stopPropagation()}>
  <div className="tutorial-top"><span className="eyebrow">PMXBENCH · QUICK TOUR</span><button ref={close} className="icon-button" aria-label="Close tutorial" onClick={onClose}><X size={20}/></button></div>
  <div className="tutorial-progress"><span>Step {index+1} of {steps.length}</span><div aria-hidden="true">{steps.map((_,i)=><span className={i===index?'current':i<index?'complete':''} key={i}/>)}</div></div>
  <div className="tutorial-copy" aria-live="polite"><span className="tutorial-eyebrow">{step.eyebrow}</span><h2 id="tutorial-title">{step.title}</h2><p id="tutorial-description">{step.body}</p></div>
  {step.area==='ratings'?<div className="tutorial-rating-preview" aria-label="The six quick-rating areas"><span><SlidersHorizontal size={17}/>Quick ratings</span><div>{['Scientific soundness','Writing clarity','Materials support','Task / rubric alignment','Difficulty','Modeling experience'].map(label=><div key={label}><strong>{label}</strong><span>Choose a rating<Check size={11}/></span></div>)}</div></div>:step.area==='comments'?<div className="tutorial-comment-preview" aria-label="Example source-linked comment"><div><Quote size={15}/><span>Selected passage</span><p>“The scoring criterion you highlighted…”</p><small>Case N → N.4 Grading rubric</small></div><div><MessageSquare size={15}/><span>Your comment</span><p>Please clarify what evidence would satisfy this criterion.</p></div></div>:<div className="tutorial-map" aria-label="The three review areas"><div className={active('cases')?'highlighted':''}><ListTree size={20}/><strong>Cases</strong><span>Jump to a section</span><i/><i/><i/></div><div className={active('materials')?'highlighted':''}><BookOpen size={20}/><strong>Review materials</strong><span>Read or compare</span><div className="tutorial-mini-document"><FileText size={16}/><i/><i/></div></div><div className={active('comments')?'highlighted':''}><MessageSquare size={20}/><strong>Comments</strong><span>Quote or give feedback</span><i/><i/></div></div>}
  <div className="tutorial-note">{step.area==='finish'?<CheckCheck size={17}/>:<BookOpen size={17}/>}<p>{step.note}</p></div>
  <div className="tutorial-reopen">You can reopen this tour anytime from <strong>Review guide</strong>.</div>
  <div className="tutorial-controls"><button className="tutorial-skip" onClick={onClose}>Skip tutorial</button><div><button className="button outline" disabled={index===0} onClick={()=>setIndex(n=>n-1)}><ArrowLeft size={14}/>Back</button><button className="button primary" onClick={()=>index===steps.length-1?onClose():setIndex(n=>n+1)}>{index===steps.length-1?'Start reviewing':'Next'}<ArrowRight size={14}/></button></div></div>
 </div></div>;
}
