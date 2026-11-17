import test from 'node:test';import assert from 'node:assert/strict';
import {reviewerRubric,omittedRubricPassage} from '../src/components/review/rubric-structure.ts';
import {shouldShowTutorial} from '../src/components/review/tutorial-state.ts';
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
 const login={reviewerId:'reviewer-a',expiresAt:'2026-11-16T23:00:00Z'},seen={...login,version:1};
 assert.equal(shouldShowTutorial('reviewer',login,null),true);assert.equal(shouldShowTutorial('reviewer',login,seen),false);
 assert.equal(shouldShowTutorial('reviewer',{...login,expiresAt:'2026-11-17T23:00:00Z'},seen),true);assert.equal(shouldShowTutorial('reviewer',{...login,reviewerId:'reviewer-b'},seen),true);
 assert.equal(shouldShowTutorial('coordinator',login,null),false);assert.equal(shouldShowTutorial('preview',login,null),false);assert.equal(shouldShowTutorial('reviewer',null,null),false);
});
