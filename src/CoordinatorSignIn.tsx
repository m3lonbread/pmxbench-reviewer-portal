import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {KeyRound,LoaderCircle,Mail} from 'lucide-react';
import {supabase} from './lib/supabase';
import {coordinatorAuthFailure,signInCoordinator,type SignInMethod} from './lib/coordinator-auth';
import SessionBoundary from './app/page';

const cooldownKey='pmxbench-coordinator-email-cooldown';
function savedCooldown(){try{return Number(sessionStorage.getItem(cooldownKey))||0;}catch{return 0;}}
export function CoordinatorSignIn(){
 const [session,setSession]=useState<Session|null|undefined>(undefined);
 const [method,setMethod]=useState<SignInMethod>('password'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 const [nextEmailAt,setNextEmailAt]=useState(savedCooldown),[now,setNow]=useState(Date.now);
 useEffect(()=>{if(!supabase)return;let active=true;void supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);if(error)setError(error.message);}});const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next);});return()=>{active=false;data.subscription.unsubscribe();};},[]);
 useEffect(()=>{if(nextEmailAt<=Date.now())return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[nextEmailAt]);
 function pauseEmail(until:number){setNextEmailAt(until);setNow(Date.now());try{sessionStorage.setItem(cooldownKey,String(until));}catch{}}
 const emailPaused=nextEmailAt>now;
 async function signIn(event:React.FormEvent){
  event.preventDefault();if(!supabase||busy||(method==='email'&&emailPaused))return;
  setBusy(true);setError('');setSent(false);
  try{
   const redirect=new URL(import.meta.env.BASE_URL,window.location.origin);redirect.searchParams.set('coordinator','1');
   await signInCoordinator(supabase,method,email,password,redirect.href);
   if(method==='email'){setSent(true);pauseEmail(Date.now()+60000);}else setPassword('');
  }catch(e){const failure=coordinatorAuthFailure(e,method);setError(failure.message);if(failure.retryAt)pauseEmail(failure.retryAt);}
  finally{setBusy(false);}
 }
 if(session)return <SessionBoundary key={session.user.id}/>;
 return <div className="session-screen coordinator-entry"><span className="brand-mark">p</span><h1>Coordinator access</h1>
 {!supabase?<p>The workspace is being prepared.</p>:session===undefined?<p><LoaderCircle size={16} className="spin"/>Loading your workspace…</p>:<>
  <p>{method==='password'?'Use your PmxBench coordinator email and password to manage reviewers, assignments, and exports.':'Request a sign-in link, then open it in this browser. Email delivery is limited; password sign-in is available above.'}</p>
  <div className="auth-methods" role="tablist" aria-label="Coordinator sign-in method">{(['password','email'] as const).map(value=><button type="button" key={value} role="tab" aria-selected={method===value} disabled={busy} onClick={()=>{setMethod(value);setError('');setSent(false);setPassword('');}}>{value==='password'?<KeyRound size={14}/>:<Mail size={14}/>} {value==='password'?'Password':'Email link'}</button>)}</div>
  <form className="auth-form" onSubmit={signIn}>
   <label htmlFor="signin-email">Coordinator email</label><input autoComplete="username" id="signin-email" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setSent(false);}} placeholder="you@institution.edu"/>
   {method==='password'&&<><label htmlFor="signin-password">Password</label><input autoComplete="current-password" id="signin-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></>}
   <button className="button primary" disabled={busy||(method==='email'&&emailPaused)}>{busy?<LoaderCircle size={15} className="spin"/>:method==='password'?<KeyRound size={15}/>:<Mail size={15}/>} {busy?'Signing in…':method==='password'?'Sign in':emailPaused?'Email sending paused':'Send coordinator sign-in link'}</button>
   {method==='password'&&<span className="entry-help">Use the password set for this portal, which may differ from your GitHub password.</span>}
   {method==='email'&&emailPaused&&<span className="entry-help" role="status">Email resend paused for {Math.ceil((nextEmailAt-now)/60000)} minute{Math.ceil((nextEmailAt-now)/60000)===1?'':'s'}. You can use Password now.</span>}
  </form>
  {sent&&<p role="status">Check your inbox and spam folder for the sign-in link. Open it in this browser.</p>}
 </>}
 {error&&<p className="inline-error auth-error" role="alert">{error}</p>}
 <a className="entry-link" href={import.meta.env.BASE_URL}>Back to reviewer access</a></div>;
}
