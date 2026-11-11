import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeQuotes,validateRatingPatch,requireCoordinator,requireWrite} from '../backend/supabase/functions/pmxbench/domain.ts';
test('PostgreSQL keeps private data inaccessible and applies review changes atomically',async t=>{
 const pg=new PGlite();
 try{
  await pg.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);');
  await pg.exec(await readFile(new URL('../backend/supabase/migrations/202611100001_review_portal.sql',import.meta.url),'utf8'));
  for(const id of ['case1','case2','case3'])await pg.query('insert into pmx_cases(id,meta,packet) values($1,$2::jsonb,$3::jsonb)',[id,JSON.stringify({id}),JSON.stringify({id,prompt:'private prompt'})]);
  async function as(role,run){await pg.exec('set role '+role);try{return await run();}finally{await pg.exec('reset role');}}
  await t.test('anonymous and authenticated clients cannot read private tables or invoke privileged RPCs',async()=>{
   for(const role of ['anon','authenticated'])await as(role,async()=>{for(const table of ['pmx_cases','pmx_experts','pmx_reviews','pmx_comments','pmx_assignments','pmx_settings'])await assert.rejects(pg.query('select * from '+table),/permission denied/);await assert.rejects(pg.query("select pmx_write_review('victim','case1','{}',true,'rev')"),/permission denied/);await assert.rejects(pg.query("select pmx_save_expert(null,'{}','attacker')"),/permission denied/);});
  });
  await t.test('one/two-case plans work; invalid case selections cannot partially activate an expert',async()=>{
   await as('service_role',async()=>{
    const created=await pg.query('select pmx_save_expert(null,$1::jsonb,$2) result',[JSON.stringify({name:'Synthetic expert',loginEmail:'expert@example.test',caseIds:['case1']}),'coordinator@example.test']);
    const id=created.rows[0].result.id;
    await assert.rejects(pg.query('select pmx_save_expert($1,$2::jsonb,$3)',[id,JSON.stringify({status:'verified',caseIds:['case1','case2','case3']}),'coordinator@example.test']),/two different cases/);
    let row=(await pg.query('select status from pmx_experts where id=$1',[id])).rows[0];assert.equal(row.status,'preliminary');
    assert.equal((await pg.query('select count(*)::int n from pmx_assignments where reviewer_id=$1',[id])).rows[0].n,1);
    await pg.query('select pmx_save_expert($1,$2::jsonb,$3)',[id,JSON.stringify({status:'verified',caseIds:['case1','case2']}),'coordinator@example.test']);
    assert.equal((await pg.query('select count(*)::int n from pmx_assignments where reviewer_id=$1',[id])).rows[0].n,2);
   });
  });
  await t.test('granular rating saves merge, missing values clear, and separate reviewers remain separate',async()=>{
   await as('service_role',async()=>{
    const save=(owner,patch,reviewed=null)=>pg.query('select pmx_write_review($1,$2,$3::jsonb,$4,$5)',[owner,'case1',JSON.stringify(patch),reviewed,'revision-one']);
    await Promise.all([save('reviewer-one',{values:{difficulty:'High'}}),save('reviewer-one',{values:{scientificSoundness:'Adequate'}})]);
    await save('reviewer-two',{values:{difficulty:'Low'}});
    await save('reviewer-one',{values:{difficulty:null}},true);
    const rows=(await pg.query('select * from pmx_reviews order by reviewer_id')).rows;
    assert.deepEqual(rows[0].rating.values,{scientificSoundness:'Adequate'});assert.equal(rows[0].reviewed,true);assert.equal(rows[1].rating.values.difficulty,'Low');
   });
  });
 }finally{await pg.close();}
});
test('source context is verified against the assigned passage, including UTF-16 offsets',async()=>{
 const c={id:'case1',number:1,title:'Private case',subtitle:'Overview',revision:'r1',prompt:'A 👋 selected passage\n\nSecond paragraph',sections:[{id:'s0',number:'1.1',title:'Overview'},{id:'s1',number:'1.2',title:'Participant prompt'},{id:'s2',number:'1.3',title:'Materials description'},{id:'s3',number:'1.4',title:'Rubric'}],rubric:[],materials:[]};
 const text='👋 selected',start=c.prompt.indexOf(text),q={caseId:'case1',blockId:'case1-prompt-0',start,end:start+text.length,text,revision:'r1',caseTitle:'Forged title',sectionTitle:'Wrong source'};
 const [quote]=await normalizeQuotes([q],['case1'],async()=>c);assert.equal(quote.caseTitle,'Private case');assert.equal(quote.sectionNumber,'1.2');assert.equal(quote.contentType,'Participant prompt');
 await assert.rejects(normalizeQuotes([q],['other-case'],async()=>c),/not assigned/);
 await assert.rejects(normalizeQuotes([{...q,text:'invented'}],['case1'],async()=>c),/could not be verified/);
 await assert.rejects(normalizeQuotes([{...q,revision:'old'}],['case1'],async()=>c),/could not be verified/);
 assert.deepEqual(await normalizeQuotes([],[],async()=>{throw Error('General feedback must not infer a source');}),[]);
 assert.throws(()=>requireCoordinator({coordinator:false}),/Coordinator/);assert.throws(()=>requireWrite({preview:true}),/read-only/);
 assert.throws(()=>validateRatingPatch({values:{difficulty:'invented'}}),/Unknown rating/);
});
