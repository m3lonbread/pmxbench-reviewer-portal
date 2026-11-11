import test from 'node:test';
import assert from 'node:assert/strict';
import {signInCoordinator,coordinatorAuthFailure} from '../src/lib/coordinator-auth.ts';
test('password coordinator sign-in does not send email, including on invalid credentials',async()=>{
 const calls=[];const client={auth:{async signInWithPassword(value){calls.push({method:'password',email:value.email});return {error:{code:'invalid_credentials'}};},async signInWithOtp(){throw Error('Password sign-in must not request email');}}};
 await assert.rejects(signInCoordinator(client,'password',' owner@example.test ','synthetic-password','https://example.test/'),error=>error.code==='invalid_credentials');
 assert.deepEqual(calls,[{method:'password',email:'owner@example.test'}]);
});
test('email fallback avoids account creation and rate-limit errors set a bounded resend pause',async()=>{
 const calls=[];const client={auth:{async signInWithPassword(){throw Error('Not the selected method');},async signInWithOtp(value){calls.push(value);return {error:null};}}};
 await signInCoordinator(client,'email',' owner@example.test ','','https://example.test/?coordinator=1');
 assert.deepEqual(calls,[{email:'owner@example.test',options:{emailRedirectTo:'https://example.test/?coordinator=1',shouldCreateUser:false}}]);
 const failure=coordinatorAuthFailure({code:'over_email_send_rate_limit'},'email',1000);
 assert.equal(failure.retryAt,3601000);assert.match(failure.message,/Use Password/);
 assert.equal(coordinatorAuthFailure({code:'invalid_credentials'},'password',1000).retryAt,0);
});
