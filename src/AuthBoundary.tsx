import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {LoaderCircle,Mail} from 'lucide-react';
import {supabase} from './lib/supabase';
import SessionBoundary from './app/page';
export function AuthBoundary(){
 const [session,setSession]=useState<Session|null|undefined>(undefined),[error,setError]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 useEffect(()=>{if(!supabase)return;void supabase.auth.getSession().then(({data,error})=>{setSession(data.session);if(error)setError(error.message);});const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe();},[]);
 async function signIn(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).href,shouldCreateUser:true}});if(error)throw error;setSent(true);}catch(e){setError(e instanceof Error?e.message:'Unable to send your sign-in link.');}finally{setBusy(false);}}
 if(session)return <SessionBoundary key={session.user.id}/>;
 return <div className="session-screen"><span className="brand-mark">p</span><h1>PmxBench expert review</h1>{!supabase?<p>The review workspace is being prepared. Please contact the coordinator.</p>:session===undefined?<p><LoaderCircle size={16} className="spin"/>Loading your workspace…</p>:<><p>Sign in to review your assigned cases.</p><form className="auth-form" onSubmit={signIn}><label htmlFor="signin-email">Email address</label><input autoComplete="email" id="signin-email" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setSent(false);}} placeholder="you@institution.edu"/><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={15} className="spin"/>:<Mail size={15}/>}Send sign-in link</button></form>{sent&&<p role="status">Check your email for a secure sign-in link. Open it in this browser to continue.</p>}</>}{error&&<p className="inline-error" role="alert">{error}</p>}</div>;
}
