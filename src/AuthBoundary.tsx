import {useEffect,useState} from 'react';
import {ArrowRight,LoaderCircle,Mail,UserRound} from 'lucide-react';
import {supabase} from './lib/supabase';
import {api} from './lib/api';
import {coordinatorMode,reviewerIdentity,selectReviewer,type ReviewerAccess} from './lib/identity';
import SessionBoundary from './app/page';
import {CoordinatorSignIn} from './CoordinatorSignIn';

export function AuthBoundary(){return coordinatorMode?<CoordinatorSignIn/>:<ReviewerEntry/>;}
function ReviewerEntry(){
 const [current,setCurrent]=useState(reviewerIdentity),[name,setName]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const change=()=>setCurrent(reviewerIdentity());window.addEventListener('pmxbench-identity-change',change);return()=>window.removeEventListener('pmxbench-identity-change',change);},[]);
 async function openReview(event:React.FormEvent){
  event.preventDefault();if(busy||!supabase)return;setBusy(true);setError('');
  try{const result=await api<ReviewerAccess>('/api/reviewer-access',{method:'POST',body:JSON.stringify({name,email})});setEmail('');setName('');selectReviewer(result);}
  catch(e){setError(e instanceof Error?e.message:'Unable to open your review. Please retry.');}
  finally{setBusy(false);}
 }
 if(current)return <SessionBoundary key={current}/>;
 return <div className="session-screen reviewer-entry"><div className="entry-card"><span className="brand-mark">p</span><span className="eyebrow">PMXBENCH · EXPERT REVIEW</span><h1>A Zhao Lab Initiative to Benchmark LLM Capabilities in Structural Modeling</h1><p>Enter your name and the email you used to reply to our invitation. Give quick ratings, leave comments, or do both.</p>
 {!supabase?<p role="status">The review workspace is being prepared.</p>:<form className="auth-form" onSubmit={openReview}>
  <label htmlFor="reviewer-name-entry"><UserRound size={15}/>Your full name</label><input id="reviewer-name-entry" name="name" autoComplete="name" required maxLength={150} value={name} onChange={e=>setName(e.target.value)} disabled={busy} placeholder="First and last name"/>
  <label htmlFor="reviewer-email-entry"><Mail size={15}/>Your email</label><input id="reviewer-email-entry" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} placeholder="Email used in your reply"/>
  <button className="button primary" disabled={busy||!name.trim()||!email.trim()}>{busy?<LoaderCircle size={15} className="spin"/>:<ArrowRight size={15}/>} {busy?'Opening your review…':'Open my cases'}</button>
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <span className="entry-help">Your details are checked against your reviewer record. Your answers save automatically.</span>
 </form>}
 <div className="entry-footer"><span>Use the details from your invitation reply.</span><a href={`${import.meta.env.BASE_URL}?coordinator=1`}>Coordinator access</a></div></div></div>;
}
