import {ApiError} from './domain.ts';
// This is a deliberately unauthenticated, self-reported identity flow.
// The public handler never accepts coordinator routes or preview parameters.
export function assertReviewerRoute(path:string,method:string){
 const url=new URL(path,'https://pmxbench.invalid');
 if(url.search||url.hash||url.pathname!==path)throw new ApiError(403,'This action is not available to reviewers.');
 const allowed=(method==='GET'&&['/api/reviewers','/api/session','/api/reviews'].includes(path))
  ||(method==='GET'&&/^\/api\/cases\/[a-zA-Z0-9_-]+$/.test(path))
  ||(path==='/api/reviews'&&method==='PATCH')
  ||(path==='/api/comments'&&method==='POST');
 if(!allowed)throw new ApiError(403,'This action is not available to reviewers.');
}
export function publicReviewer(person:{id:string;name:string;affiliation:string},caseCount:number){
 return {id:person.id,name:person.name,affiliation:person.affiliation,caseCount};
}
