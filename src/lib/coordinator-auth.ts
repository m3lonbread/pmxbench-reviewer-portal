type AuthClient={auth:{signInWithPassword:(credentials:{email:string;password:string})=>Promise<{error:unknown}>}};
export async function signInCoordinator(client:AuthClient,email:string,password:string){
 const result=await client.auth.signInWithPassword({email:email.trim(),password});
 if(result.error)throw result.error;
}
export function coordinatorAuthFailure(error:unknown){
 const e=error as {code?:string;status?:number;message?:string}|null;
 if(e?.status===429||e?.code==='over_request_rate_limit')return {message:'Too many sign-in attempts. Wait a few minutes, then try again.'};
 if(e?.code==='invalid_credentials')return {message:'The coordinator email or password did not match. Use the password created for this PmxBench portal.'};
 if(e?.code==='email_not_confirmed')return {message:'This coordinator account has not been confirmed yet. The workspace owner must finish its account setup.'};
 return {message:typeof e?.message==='string'?e.message:'Unable to sign in. Please try again.'};
}
