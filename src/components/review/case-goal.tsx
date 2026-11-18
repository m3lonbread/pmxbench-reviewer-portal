'use client';
import type {CaseDetail} from '../../app/review-data';
import {SourceText,type Flash,type Source} from './content';

export function CaseGoal({c,flash,reference}:{c:CaseDetail;flash:Flash;reference:Source|null}){
 const current=c.reviewGoal;
 const id=current?`${c.id}-review-goal-statement`:c.reviewGuide?`${c.id}-review-goal`:`${c.id}-overview`;
 const historical=reference?.caseId===c.id&&reference.blockId!==id?(reference.blockId===`${c.id}-overview`?{id:reference.blockId,text:c.subtitle,revision:undefined}:reference.blockId===`${c.id}-review-goal`&&c.reviewGuide?{id:reference.blockId,text:c.reviewGuide.goal,revision:c.reviewGuide.revision}:null):null;
 return <div className="case-goal"><SourceText c={c} s={c.sections[0]} id={id} text={current?.text??c.reviewGuide?.goal??c.subtitle} kind="Case goal" revision={current?.revision??c.reviewGuide?.revision} flash={flash}/>{historical&&<aside className="referenced-material"><strong>Previously quoted case description</strong><SourceText c={c} s={c.sections[0]} id={historical.id} text={historical.text} revision={historical.revision} flash={flash}/></aside>}</div>;
}
