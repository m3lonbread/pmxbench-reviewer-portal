type Login={reviewerId:string;expiresAt:string};
export type TutorialVisit=Login&{version:2};
export const tutorialStorageKey='pmxbench-reviewer-tutorial-v2';

export function shouldShowTutorial(role:string,login:Login|null,seen:TutorialVisit|null){
 return role==='reviewer'&&Boolean(login)&&(!seen||seen.version!==2||seen.reviewerId!==login!.reviewerId||seen.expiresAt!==login!.expiresAt);
}

export function readTutorialVisit():TutorialVisit|null{
 try{return JSON.parse(sessionStorage.getItem(tutorialStorageKey)??'null');}catch{return null;}
}

export function rememberTutorialVisit(login:Login|null){
 if(!login)return;
 try{sessionStorage.setItem(tutorialStorageKey,JSON.stringify({reviewerId:login.reviewerId,expiresAt:login.expiresAt,version:2}));}catch{}
}
