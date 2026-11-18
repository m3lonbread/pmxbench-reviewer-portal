'use client';
import {Compass} from 'lucide-react';

export function ReviewInstructions({onStart}:{onStart:()=>void}){
 return <section className="workspace-instructions" aria-labelledby="review-instructions-title"><div className="instructions-heading"><h2 id="review-instructions-title">Review instructions</h2><button className="instruction-walkthrough" onClick={onStart}><Compass size={14}/>Start guided walkthrough</button></div><p><strong>The goal of PmxBench:</strong> Evaluate how well large language models reason through realistic pharmacometric and mechanistic modeling problems across PopPK, PBPK, and QSP.</p><p><strong>What we ask of you:</strong> Review the scientific soundness, clarity, and alignment of each case and its grading rubric. Read the prompt, material descriptions, and the rubric, then give ratings, comments, or both.</p></section>;
}
