export function validatePublicConfig(env){
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before deployment.');
 const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error('Use the HTTPS Supabase project origin.');
 if(key.startsWith('sb_secret_'))throw Error('A secret key must never be put in the frontend.');
 if(!key.startsWith('sb_publishable_')){let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{throw Error('Use a Supabase publishable key or the legacy public anon key.');}if(claims.role!=='anon')throw Error('Only the public anon role can be used in frontend configuration.');}
}
if(import.meta.url===new URL(process.argv[1],'file:').href){if(process.env.ALLOW_UNCONFIGURED_BUILD==='1'&&process.env.CI!=='true')console.log('Local unconfigured build; deployment remains disabled.');else validatePublicConfig(process.env);}
