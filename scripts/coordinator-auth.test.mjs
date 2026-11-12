import test from 'node:test';
import assert from 'node:assert/strict';
import {signInCoordinator,coordinatorAuthFailure} from '../src/lib/coordinator-auth.ts';
test('password coordinator sign-in does not send email, including on invalid credentials',async()=>{
 const calls=[];const client={auth:{async signInWithPassword(value){calls.push({method:'password',email:value.email});return {error:{code:'invalid_credentials'}};},async signInWithOtp(){throw Error('Password sign-in must not request email');}}};
 await assert.rejects(signInCoordinator(client,' owner@example.test ','synthetic-password'),error=>error.code==='invalid_credentials');
 assert.deepEqual(calls,[{method:'password',email:'owner@example.test'}]);
});
test('password sign-in reports invalid credentials, throttling, and unfinished account setup',async()=>{
 assert.match(coordinatorAuthFailure({code:'invalid_credentials'}).message,/email or password did not match/);
 assert.match(coordinatorAuthFailure({status:429}).message,/Wait a few minutes/);
 assert.match(coordinatorAuthFailure({code:'email_not_confirmed'}).message,/account has not been confirmed/);
});
