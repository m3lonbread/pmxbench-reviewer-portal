import test from 'node:test';import assert from 'node:assert/strict';
import {reviewerRubric,omittedRubricPassage} from '../src/components/review/rubric-structure.ts';
import {shouldShowTutorial} from '../src/components/review/tutorial-state.ts';
import {ratingFields} from '../src/app/review-data.ts';
import {walkthroughSteps} from '../src/components/review/tutorial-steps.ts';
import {materialSummary,materialPassage,reviewMaterialSummary,materialGroup,materialOrder} from '../src/components/review/material-summary.ts';
test('review rubrics keep scored content and all gate rows while omitting supplementary notes',()=>{
 const scored={id:'criteria',rows:[['Criterion','Points','Assessment','Evidence'],['C5.1','10','Scored requirement','Full evidence']]};
 const gateHeading={id:'gates-heading',style:'Heading1',text:'Required pass fail gates'};
 const gateIntro={id:'gates-intro',text:'All three gates must pass.'};
 const gates={id:'gates',rows:[['Gate','Pass criterion'],['1 Executable file','Runs'],['2 Prediction coverage','Complete'],['3 Output artifacts','Valid']]};
 const appendix=[{id:'metrics',style:'Heading1',text:'Metric definitions and uncertainty'},{id:'metrics-body',text:'Extra definitions'},{id:'questions',style:'Heading1',text:'Question ownership'},{id:'reference',text:'Curator reference context'}];
 const intro={id:'intro',text:'Scoring policy'},blocks=[intro,scored,...appendix,gateHeading,gateIntro,gates,{id:'trailing',text:'Other supplemental notes'}];
 assert.deepEqual(reviewerRubric(blocks),[intro,scored,gateHeading,gateIntro,gates]);assert.equal(blocks.length,10);
 assert.equal(omittedRubricPassage(blocks,'metrics-body'),true);assert.equal(omittedRubricPassage(blocks,'criteria-r1-c3'),false);assert.equal(omittedRubricPassage(blocks,'gates-r3-c1'),false);
 assert.deepEqual(reviewerRubric([intro,scored,gateHeading,gateIntro,gates]),[intro,scored,gateHeading,gateIntro,gates]);
 assert.deepEqual(reviewerRubric([intro]),[intro]);
});
test('the tutorial opens on each reviewer login, stays dismissed on refresh, and skips coordinator views',()=>{
 const login={reviewerId:'reviewer-a',expiresAt:'2026-11-16T23:00:00Z'},seen={...login,version:2};
 assert.equal(shouldShowTutorial('reviewer',login,null),true);assert.equal(shouldShowTutorial('reviewer',login,seen),false);
 assert.equal(shouldShowTutorial('reviewer',{...login,expiresAt:'2026-11-17T23:00:00Z'},seen),true);assert.equal(shouldShowTutorial('reviewer',{...login,reviewerId:'reviewer-b'},seen),true);
 assert.equal(shouldShowTutorial('coordinator',login,null),false);assert.equal(shouldShowTutorial('preview',login,null),false);assert.equal(shouldShowTutorial('reviewer',null,null),false);
});
test('concise material summaries retain canonical quotation offsets and older passages remain addressable',()=>{
 const summary='Measured evidence. '+('Preserve the observed endpoint and its original scientific units. ').repeat(8);
 const material={id:'observed',name:'observed_data.csv',description:'Original description',guide:{summary,blocks:[{id:'use',label:'Use',text:'Previously described use'}],fields:[{id:'field-0',name:'time',text:'Original time definition'}],endpointCoverage:'Original endpoint units'}};
 const preview=materialSummary(material);assert.ok(preview.text.length<=240);assert.equal(summary.slice(0,preview.text.length),preview.text);assert.equal(preview.suffix,'-summary');assert.equal(preview.truncated,true);
 const c={id:'case1',materials:[material],materialsGuide:{revision:'guide-v1',objective:'Original objective',scope:'Original scope'}};
 assert.deepEqual(materialPassage(c,'case1-material-observed-field-0'),{text:'Original time definition',revision:'guide-v1'});
 assert.deepEqual(materialPassage(c,'case1-material-observed'),{text:'Original description',revision:undefined});
 assert.equal(materialPassage(c,'unrelated'),null);
 assert.equal(materialSummary({...material,name:'model_construction_contract.json',guide:{...material.guide,summary:'Model requirements. A much longer explanation.'}}).text,'Model requirements.');
});

test('the guided review covers the complete workflow without marking or submitting reviews',()=>{
 assert.deepEqual(walkthroughSteps.map(s=>s.target),['cases','prompt','materials','rubric','compare','ratings','quoted-comment','general-comment','finish']);
 assert.ok(walkthroughSteps.find(s=>s.target==='general-comment').body.includes('Edit'));
});

test('operational/data groups use specific source briefs and five active rating categories',()=>{
 assert.deepEqual(ratingFields.map(f=>f.key),['scientificSoundness','writingClarity','taskRubricAlignment','difficulty','modelingExpertise']);
 for(const n of ['input_variable_dictionary.csv','model_construction_contract.json','prediction_targets.csv'])assert.equal(materialGroup(n),'Operational');
 for(const n of ['observed_data.csv','treatment_events.csv','literature.zip','subject_covariates.csv'])assert.equal(materialGroup(n),'Data');
 assert.ok(materialOrder('observed_data.csv')<materialOrder('literature.zip'));
 const m={id:'obs',name:'observed_data.csv',description:'Original description',guide:{summary:'100 rows × 8 columns'}};
 const c={id:'case1',materials:[m],reviewGuide:{revision:'brief-v1',goal:'How does treatment affect the response?',materials:{'observed_data.csv':'Concentration and response measurements linked to dosing and sampling time.'}}};
 const b=reviewMaterialSummary(c,m);assert.equal(b.suffix,'-brief');assert.equal(b.revision,'brief-v1');assert.ok(!/rows|columns/.test(b.text));
 assert.deepEqual(materialPassage(c,'case1-material-obs-brief'),{text:b.text,revision:'brief-v1'});
});
