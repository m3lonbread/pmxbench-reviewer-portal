'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,ChevronUp,Compass,X} from 'lucide-react';
import {walkthroughSteps,type TutorialTarget} from './tutorial-steps';

export function ReviewerTutorial({onClose,onStep,onOverview}:{onClose:()=>void;onStep:(target:TutorialTarget)=>string;onOverview:()=>void}){
 const [index,setIndex]=useState(-1),[selector,setSelector]=useState(''),[minimized,setMinimized]=useState(false),[placeLeft,setPlaceLeft]=useState(false);
 const dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),previous=useRef<HTMLElement|null>(null);
 const step=index>=0?walkthroughSteps[index]:null;
 useEffect(()=>{previous.current=document.activeElement as HTMLElement|null;return()=>previous.current?.focus();},[]);
 useEffect(()=>{
  if(index<0)close.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(index<0&&event.key==='Tab'){
    const controls=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 },[index,onClose]);
 useEffect(()=>{
  if(index<0||!selector)return;
  let target:HTMLElement|null=null;
  const locate=()=>{
   const candidate=document.querySelector<HTMLElement>(selector);if(!candidate||candidate.getBoundingClientRect().width===0)return;
   target=candidate;observer.disconnect();candidate.classList.add('tour-spotlight');
   const bounds=candidate.getBoundingClientRect();setPlaceLeft(bounds.left>window.innerWidth/2);
   if(!candidate.closest('.topbar,.sidebar,.chat-panel'))candidate.scrollIntoView({behavior:'smooth',block:'center'});
  };
  const observer=new MutationObserver(locate);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});locate();
  return()=>{observer.disconnect();target?.classList.remove('tour-spotlight');};
 },[index,selector]);
 function show(next:number){setMinimized(false);setIndex(next);setSelector(onStep(walkthroughSteps[next].target));}
 function overview(){setIndex(-1);setSelector('');onOverview();}
 if(!step)return <div className="tutorial-backdrop"><div className="reviewer-tutorial walkthrough-welcome" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="walkthrough-welcome-title">
  <div className="tutorial-top"><span className="eyebrow">PMXBENCH · GUIDED REVIEW</span><button ref={close} className="icon-button" aria-label="Close tutorial" onClick={onClose}><X size={20}/></button></div>
  <div className="walkthrough-welcome-body"><span className="walkthrough-symbol"><Compass size={26}/></span><h2 id="walkthrough-welcome-title">Your review, step by step.</h2><p>We’ll walk through the actual tools in your workspace and show you how to review each case.</p>
  <ol className="walkthrough-outline"><li><span>1</span><div><strong>Read and assess</strong><p>Prompt, supporting materials, source papers, and rubric.</p></div></li><li><span>2</span><div><strong>Compare and give feedback</strong><p>Side by Side Tool, overall ratings, and source-linked comments.</p></div></li><li><span>3</span><div><strong>Revise and finish</strong><p>Edit comments, check saved progress, and mark each case reviewed.</p></div></li></ol>
  <div className="tutorial-note"><BookOpen size={17}/><p>Your task is to assess scientific soundness, clarity, and task/rubric alignment. Give ratings, comments, or both.</p></div><p className="tutorial-reopen">{walkthroughSteps.length} short steps. You can skip, minimize, or reopen this walkthrough anytime from <strong>Review guide</strong>.</p></div>
  <div className="tutorial-controls"><button className="tutorial-skip" onClick={onClose}>Skip for now</button><button className="button primary" onClick={()=>show(0)}>Start walkthrough<ArrowRight size={15}/></button></div>
 </div></div>;
 return <section className={`tutorial-coach ${placeLeft?'coach-left':''} ${minimized?'coach-minimized':''} ${step.target==='general-comment'||step.target==='quoted-comment'?'coach-chat':''}`} role="region" aria-label="Guided review walkthrough">
  <div className="coach-top"><span>STEP {index+1} OF {walkthroughSteps.length}</span><div><button className="icon-button" aria-label={minimized?'Expand walkthrough':'Minimize walkthrough'} onClick={()=>setMinimized(v=>!v)}>{minimized?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button><button className="icon-button" aria-label="Close tutorial" onClick={onClose}><X size={16}/></button></div></div>
  <div className="coach-copy" aria-live="polite"><h2>{step.title}</h2>{!minimized&&<><p>{step.body}</p><div className="coach-task"><Check size={14}/><p>{step.task}</p></div>{step.target==='materials'&&<button className="coach-paper-link" onClick={()=>setSelector(onStep('papers'))}><BookOpen size={13}/>Show source papers</button>}</>}</div>
  <div className="coach-controls"><button className="coach-overview" onClick={overview}>Overview</button><div><button className="button outline" disabled={index===0} onClick={()=>show(index-1)}><ArrowLeft size={12}/>Back</button><button className="button primary" onClick={()=>index===walkthroughSteps.length-1?onClose():show(index+1)}>{index===walkthroughSteps.length-1?'Finish tour':'Next'}<ArrowRight size={12}/></button></div></div>
 </section>;
}
