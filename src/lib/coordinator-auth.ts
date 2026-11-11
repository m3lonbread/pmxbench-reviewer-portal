export type SignInMethod='password'|'email';
type AuthClient={auth:{signInWithPassword:(credentials:{email:string;password:string})=>Promise<{error:unknown}>;signInWithOtp:(credentials:{email:string;options:{emailRedirectTo:string;shouldCreateUser:boolean}})=>Promise<{error:unknown}>}};
export async function signInCoordinator(client:AuthClient,method:SignInMethod,email:string,password:string,redirect:string){
 // Password attempts never fall back to sending email automatically.
 const result=method==='password'
  ?await client.auth.signInWithPassword({email:email.trim(),password})
  :await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirect,shouldCreateUser:false}});
 if(result.error)throw result.error;
}
export function coordinatorAuthFailure(error:unknown,method:SignInMethod,now=Date.now()){
 const e=error as {code?:string;status?:number;message?:string}|null;
 if(e?.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(e?.message??''))return {message:'The email sender has reached its hourly limit. Use Password, or wait up to an hour before requesting another email. An unused sign-in link already in your inbox may still work.',retryAt:method==='email'?now+3600000:0};
 if(e?.status===429||e?.code==='over_request_rate_limit')return {message:'Too many sign-in attempts. Wait a few minutes, then try again.',retryAt:method==='email'?now+60000:0};
 if(e?.code==='invalid_credentials')return {message:'The coordinator email or password did not match. Use the password created for this PmxBench portal.',retryAt:0};
 if(e?.code==='email_not_confirmed')return {message:'This coordinator account has not been confirmed yet. The workspace owner must finish its account setup.',retryAt:0};
 return {message:typeof e?.message==='string'?e.message:'Unable to sign in. Please try again.',retryAt:0};
}
