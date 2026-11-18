import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuotes,sourceRegistry} from '../backend/supabase/functions/pmxbench/domain.ts';
import {materialPassage,reviewMaterialSummary} from '../src/components/review/material-summary.ts';

test('revised material descriptions preserve exact old quotations in official cases and test copies',async()=>{
 for(const id of ['official','test-copy']){
  const oldFile={summary:'Earlier dictionary summary.',blocks:[],fields:[{id:'field-0',name:'time',text:'Earlier field meaning.'}]};
  const old={revision:'guide-old',objective:'Objective',scope:'Scope',files:{'input_variable_dictionary.csv':oldFile},review:{revision:'brief-old',goal:'Original goal?',materials:{'input_variable_dictionary.csv':'Earlier description with retired guidance.'}}};
  const currentFile={summary:'Current dictionary summary.',blocks:[],fields:[]};
  const c={id,number:1,title:'Synthetic case',revision:'packet-unchanged',subtitle:'Overview',prompt:'Prompt',rubric:[],sections:[{id:'goal',title:'Case goal'},{id:'prompt',title:'Prompt'},{id:'materials',title:'Materials description'}],materials:[{id:'dictionary',name:'input_variable_dictionary.csv',description:'Original file role.',guide:currentFile}],materialsGuide:{revision:'guide-new',objective:'Objective',scope:'Scope'},reviewGuide:{revision:'brief-new',goal:'Original goal?',materials:{'input_variable_dictionary.csv':'Defines identifiers, variables, units, and coding.'}},materialGuideHistory:[old]};
  const blockId=id+'-material-dictionary-brief',text=old.review.materials['input_variable_dictionary.csv'];
  const q={caseId:id,blockId,revision:'brief-old',start:0,end:text.length,text};
  assert.equal((await normalizeQuotes([q],[id],async()=>c))[0].text,text);
  assert.deepEqual(materialPassage(c,blockId,q.revision),{text,revision:q.revision});
  assert.equal(reviewMaterialSummary(c,c.materials[0]).text,c.reviewGuide.materials['input_variable_dictionary.csv']);
  assert.equal(sourceRegistry(c).get(blockId).revision,'brief-new');
  assert.equal(sourceRegistry(c,'guide-old').get(id+'-material-dictionary-field-0').text,'Earlier field meaning.');
  await assert.rejects(normalizeQuotes([{...q,text:'Invented text'}],[id],async()=>c),/could not be verified/);
  await assert.rejects(normalizeQuotes([{...q,revision:'unrecognized'}],[id],async()=>c),/could not be verified/);
  await assert.rejects(normalizeQuotes([q],['unassigned'],async()=>c),/not assigned/);
 }
});
