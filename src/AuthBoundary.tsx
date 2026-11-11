import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {ArrowRight,LoaderCircle,Mail,UserRound} from 'lucide-react';
import {supabase} from './lib/supabase';
import {api} from './lib/api';
import {coordinatorMode,reviewerIdentity,selectReviewer} from './lib/identity';
import SessionBoundary from './app/page';

type Reviewer={id:string;name:string;affiliation:string;caseCount:number};
export function AuthBoundary(){return coordinatorMode?<CoordinatorSignIn/>:<ReviewerEntry/>;}
function ReviewerEntry(){
 const [current,setCurrent]=useState(reviewerIdentity),[people,setPeople]=useState<Reviewer[]>([]),[choice,setChoice]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const change=()=>setCurrent(reviewerIdentity());window.addEventListener('pmxbench-identity-change',change);return()=>window.removeEventListener('pmxbench-identity-change',change);},[]);
 useEffect(()=>{if(current)return;let active=true;setLoading(true);setError('');
  void api<{reviewers:Reviewer[]}>('/api/reviewers').then(result=>{if(active)setPeople(result.reviewers);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load the reviewer list.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[current]);
 if(current)return <SessionBoundary key={current}/>;
 return <div className="session-screen reviewer-entry"><div className="entry-card"><span className="brand-mark">p</span><span className="eyebrow">PMXBENCH · EXPERT REVIEW</span><h1>Your expertise.<br/>A better benchmark.</h1><p>Select your name to open your assigned cases. Give quick ratings, leave comments, or do both.</p>
 {!supabase?<p role="status">The review workspace is being prepared.</p>:loading?<p role="status"><LoaderCircle size={16} className="spin"/>Loading reviewers…</p>:error?<><p className="inline-error" role="alert">{error}</p><button className="button outline" onClick={()=>window.location.reload()}>Retry</button></>:people.length?<form className="auth-form" onSubmit={e=>{e.preventDefault();if(choice)selectReviewer(choice);}}><label htmlFor="reviewer-choice"><UserRound size={15}/>Your name</label><select id="reviewer-choice" required value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose your name…</option>{people.map(person=><option key={person.id} value={person.id}>{person.name}{person.affiliation?` · ${person.affiliation}`:''}</option>)}</select><button className="button primary" disabled={!choice}>Open my cases<ArrowRight size={15}/></button><span className="entry-help">No account or email sign-in required. Your answers save automatically under the name you choose.</span></form>:<div className="entry-empty"><UserRound size={22}/><strong>Reviews are being assigned</strong><p>Your name will appear when the coordinator activates your assigned cases.</p></div>}
 <div className="entry-footer"><span>Please choose only your own name.</span><a href={`${import.meta.env.BASE_URL}?coordinator=1`}>Coordinator access</a></div></div></div>;
}
function CoordinatorSignIn(){
 const [session,setSession]=useState<Session|null|undefined>(undefined),[error,setError]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 useEffect(()=>{if(!supabase)return;void supabase.auth.getSession().then(({data,error})=>{setSession(data.session);if(error)setError(error.message);});const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe();},[]);
 async function signIn(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const redirect=new URL(import.meta.env.BASE_URL,window.location.origin);redirect.searchParams.set('coordinator','1');const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirect.href,shouldCreateUser:true}});if(error)throw error;setSent(true);}catch(e){setError(e instanceof Error?e.message:'Unable to send your sign-in link.');}finally{setBusy(false);}}
 if(session)return <SessionBoundary key={session.user.id}/>;
 return <div className="session-screen"><span className="brand-mark">p</span><h1>Coordinator access</h1>{!supabase?<p>The workspace is being prepared.</p>:session===undefined?<p><LoaderCircle size={16} className="spin"/>Loading your workspace…</p>:<><p>Enter your coordinator email, then open the link in your inbox to manage reviewers, assignments, and exports.</p><form className="auth-form" onSubmit={signIn}><label htmlFor="signin-email">Coordinator email</label><input autoComplete="email" id="signin-email" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setSent(false);}} placeholder="you@institution.edu"/><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={15} className="spin"/>:<Mail size={15}/>}Send coordinator sign-in link</button></form>{sent&&<p role="status">Check your email for your coordinator sign-in link. Open it in this browser.</p>}</>}{error&&<p className="inline-error" role="alert">{error}</p>}<a className="entry-link" href={import.meta.env.BASE_URL}>Back to reviewer name selection</a></div>;
}
