export const testReviewerSource='Website test fixture';
export const caseAccessSource='Case workspace access';
export function benchmarkResults(people:any[],allocations:any[],reviews:any[],comments:any[],cases:any[]){
 const accessIds=new Set(people.filter(p=>p.source===caseAccessSource).map(p=>p.id));
 const excludedCaseAccessData={reviewers:accessIds.size,assignments:allocations.filter(a=>accessIds.has(a.reviewer_id)).length,caseReviews:reviews.filter(r=>accessIds.has(r.reviewer_id)).length,comments:comments.filter(c=>accessIds.has(c.reviewer_id)).length};
 people=people.filter(p=>!accessIds.has(p.id));allocations=allocations.filter(a=>!accessIds.has(a.reviewer_id));reviews=reviews.filter(r=>!accessIds.has(r.reviewer_id));comments=comments.filter(c=>!accessIds.has(c.reviewer_id));
 const testReviewers=new Set(people.filter(p=>p.source===testReviewerSource).map(p=>p.id));
 const testCases=new Set(cases.filter(c=>c.isTest===true).map(c=>c.id));
 const reviewers=people.filter(p=>!testReviewers.has(p.id));
 const assignments=allocations.filter(a=>!testReviewers.has(a.reviewer_id)&&!testCases.has(a.case_id));
 const caseReviews=reviews.filter(r=>!testReviewers.has(r.reviewer_id)&&!testCases.has(r.case_id));
 const feedback=comments.filter(c=>!testReviewers.has(c.reviewer_id)&&!(c.quotes??[]).some((q:any)=>testCases.has(q.caseId)));
 return {reviewers,assignments,caseReviews,comments:feedback,excludedTestData:{reviewers:people.length-reviewers.length,assignments:allocations.length-assignments.length,caseReviews:reviews.length-caseReviews.length,comments:comments.length-feedback.length},excludedCaseAccessData};
}
