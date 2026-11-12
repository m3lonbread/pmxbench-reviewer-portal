import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {KeyRound,LoaderCircle} from 'lucide-react';
import {supabase} from './lib/supabase';
import {coordinatorAuthFailure,signInCoordinator} from './lib/coordinator-auth';
import SessionBoundary from './app/page';

export function CoordinatorSignIn(){
 const [session,setSession]=useState<Session|null|undefined>(undefined);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!supabase)return;let active=true;void supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);if(error)setError(error.message);}});const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next);});return()=>{active=false;data.subscription.unsubscribe();};},[]);
 async function signIn(event:React.FormEvent){
  event.preventDefault();if(!supabase||busy)return;
  setBusy(true);setError('');
  try{
   await signInCoordinator(supabase,email,password);
   setPassword('');
  }catch(e){setError(coordinatorAuthFailure(e).message);}
  finally{setBusy(false);}
 }
 if(session)return <SessionBoundary key={session.user.id}/>;
 return <div className="session-screen coordinator-entry"><span className="brand-mark">p</span><h1>Coordinator access</h1>
 {!supabase?<p>The workspace is being prepared.</p>:session===undefined?<p><LoaderCircle size={16} className="spin"/>Loading your workspace…</p>:<>
  <p>Use your PmxBench coordinator email and password to manage reviewers, assignments, and exports.</p>
  <form className="auth-form" onSubmit={signIn}>
   <label htmlFor="signin-email">Coordinator email</label><input autoComplete="username" id="signin-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@institution.edu"/>
   <label htmlFor="signin-password">Password</label><input autoComplete="current-password" id="signin-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>
   <button className="button primary" disabled={busy}>{busy?<LoaderCircle size={15} className="spin"/>:<KeyRound size={15}/>} {busy?'Signing in…':'Sign in'}</button>
   <span className="entry-help">Use the password set for this portal, which may differ from your GitHub password.</span>
  </form>
 </>}
 {error&&<p className="inline-error auth-error" role="alert">{error}</p>}
 <a className="entry-link" href={import.meta.env.BASE_URL}>Back to reviewer access</a></div>;
}
