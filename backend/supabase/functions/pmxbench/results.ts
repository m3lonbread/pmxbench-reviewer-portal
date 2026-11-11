export const testReviewerSource='Website test fixture';
export function benchmarkResults(people:any[],allocations:any[],reviews:any[],comments:any[],cases:any[]){
 const testReviewers=new Set(people.filter(p=>p.source===testReviewerSource).map(p=>p.id));
 const testCases=new Set(cases.filter(c=>c.isTest===true).map(c=>c.id));
 const reviewers=people.filter(p=>!testReviewers.has(p.id));
 const assignments=allocations.filter(a=>!testReviewers.has(a.reviewer_id)&&!testCases.has(a.case_id));
 const caseReviews=reviews.filter(r=>!testReviewers.has(r.reviewer_id)&&!testCases.has(r.case_id));
 const feedback=comments.filter(c=>!testReviewers.has(c.reviewer_id)&&!(c.quotes??[]).some((q:any)=>testCases.has(q.caseId)));
 return {reviewers,assignments,caseReviews,comments:feedback,excludedTestData:{reviewers:people.length-reviewers.length,assignments:allocations.length-assignments.length,caseReviews:reviews.length-caseReviews.length,comments:comments.length-feedback.length}};
}
