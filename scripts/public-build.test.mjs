import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublicConfig} from './validate-config.mjs';
test('frontend configuration rejects missing settings and server credentials',()=>{
 assert.throws(()=>validatePublicConfig({}),/before deployment/);
 assert.throws(()=>validatePublicConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_private'}),/never/);
 const jwt='a.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
 assert.throws(()=>validatePublicConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:jwt}),/Only the public anon/);
 assert.doesNotThrow(()=>validatePublicConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}));
});
