import version from './packet-version.json';
export type Section = {id:string;number:string;title:string;type:string};
export type ReviewCase = {isTest?:boolean;id:string;slug:string;number:number;title:string;track:string;trackCode:string;subtitle:string;revision:string;sourceRoot:string;fileCount:number;criterionCount:number;sections:Section[]};
export type MaterialDescription={id:string;name:string;description:string;format:string};
export type RubricBlock = {id:string;text?:string;style?:string;rows?:string[][]};
export type CaseDetail = ReviewCase & {prompt:string;rubric:RubricBlock[];materials:MaterialDescription[]};
export const packetRevision=version.revision;
export const ratingFields=[
 {key:'scientificSoundness',label:'Scientific soundness',hint:'Are the scientific assumptions and methods sound?',options:['Adequate','Minor concerns','Major concerns','Unable to assess']},
 {key:'writingClarity',label:'Writing clarity',hint:'Is the task clear, precise, and understandable?',options:['Adequate','Minor concerns','Major concerns','Unable to assess']},
 {key:'materialsSupport',label:'Materials support',hint:'Are the described data and literature appropriate for the task?',options:['Adequate','Minor concerns','Major concerns','Unable to assess']},
 {key:'taskRubricAlignment',label:'Task / rubric alignment',hint:'Does the rubric fairly assess what the task requests?',options:['Adequate','Minor concerns','Major concerns','Unable to assess']},
 {key:'difficulty',label:'Difficulty',hint:'How demanding is this case overall?',options:['Low','Moderate','High','Very high','Unable to assess']},
 {key:'modelingExpertise',label:'Modeling expertise required',hint:'Approximate hands-on modeling experience needed to complete this case.',options:['Foundational','Intermediate','Advanced','Specialist','Unable to assess']}
] as const;
export type RatingKey=typeof ratingFields[number]['key'];
export type CaseRating={values:Partial<Record<RatingKey,string>>;difficultyFeedback:string;improvements:string;recommendation:string;updatedAt:string};
export const blankRating=():CaseRating=>({values:{},difficultyFeedback:'',improvements:'',recommendation:'',updatedAt:''});

export const expertiseScaleVersion='hands-on-experience-v1';
export const expertiseLevels=[
 {value:'Foundational',range:'0–1 year',description:'Apply established modeling workflows with guidance.'},
 {value:'Intermediate',range:'1–3 years',description:'Build, fit, and diagnose standard PK/PD models independently.'},
 {value:'Advanced',range:'3–5 years',description:'Develop custom models and assess identifiability, uncertainty, and complex model choices.'},
 {value:'Specialist',range:'5+ years + domain depth',description:'Design and critically evaluate specialized mechanistic models in the relevant domain.'}
] as const;
