import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceRegistry,normalizeQuotes} from '../backend/supabase/functions/pmxbench/domain.ts';

test('goal statements have their own sources and retain older goal quotations',async()=>{
 const c={id:'example',number:1,title:'Example',subtitle:'Original description',revision:'packet-v1',prompt:'Example prompt',rubric:[],materials:[],sections:[{id:'goal',number:'1.1',title:'Case goal',type:'Case goal'}],reviewGuide:{revision:'brief-v1',goal:'How can a model explain the response?',materials:{}}};
 const oldSources=sourceRegistry(c),updated={...c,reviewGoal:{text:'Construct a model to explain the response.',revision:'statement-v1'}},sources=sourceRegistry(updated);
 for(const [id,value]of oldSources)assert.deepEqual(sources.get(id),value);
 assert.equal(sources.size,oldSources.size+1);
 const oldGoal=sources.get('example-review-goal'),newGoal=sources.get('example-review-goal-statement');
 const quotes=await normalizeQuotes([{blockId:'example-review-goal',...oldGoal},{blockId:'example-review-goal-statement',...newGoal}].map(q=>({caseId:c.id,blockId:q.blockId,text:q.text,start:0,end:q.text.length,revision:q.revision})),[c.id],async()=>updated);
 assert.equal(quotes[0].text,c.reviewGuide.goal);assert.equal(quotes[1].text,updated.reviewGoal.text);assert.equal(quotes[1].sectionTitle,'Case goal');assert.equal(quotes[1].contentType,'Case goal');
});
