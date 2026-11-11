import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkResults,testReviewerSource} from '../backend/supabase/functions/pmxbench/results.ts';
test('benchmark export excludes test identities, test cases, and mixed test quotations',()=>{
 const people=[{id:'real',source:'Tracker'},{id:'test',source:testReviewerSource}];
 const allocations=[{reviewer_id:'real',case_id:'official'},{reviewer_id:'test',case_id:'dummy'},{reviewer_id:'real',case_id:'dummy'}];
 const reviews=[...allocations];
 const comments=[{id:'keep',reviewer_id:'real',quotes:[]},{id:'test-general',reviewer_id:'test',quotes:[]},{id:'mixed',reviewer_id:'real',quotes:[{caseId:'official'},{caseId:'dummy'}]},{id:'quoted',reviewer_id:'real',quotes:[{caseId:'official'}]}];
 const result=benchmarkResults(people,allocations,reviews,comments,[{id:'official'},{id:'dummy',isTest:true}]);
 assert.deepEqual(result.reviewers,[people[0]]);assert.deepEqual(result.assignments,[allocations[0]]);assert.deepEqual(result.caseReviews,[reviews[0]]);
 assert.deepEqual(result.comments.map(c=>c.id),['keep','quoted']);
 assert.deepEqual(result.excludedTestData,{reviewers:1,assignments:2,caseReviews:2,comments:2});
});
