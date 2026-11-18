
'use client';
import {reviewerRubric} from './rubric-structure';
import {reviewMaterialSummary,materialPassage,materialGroup,materialOrder} from './material-summary';
import type {CaseDetail,ReviewCase,Section} from '../../app/review-data';
export type Source={caseId:string;caseNumber:number;caseTitle:string;sectionId:string;sectionNumber:string;sectionTitle:string;contentType:string;blockId:string;start:number;end:number;text:string;revision:string;fileName?:string};
export type Flash={blockId:string;start:number;end:number}|null;
export function SourceText({c,s,id,text,kind,flash,tag='p',file,row,column,revision}:{c:ReviewCase;s:Section;id:string;text:string;kind?:string;flash:Flash;tag?:'p'|'span'|'h2'|'h4';file?:{id:string;name:string};row?:number;column?:string;revision?:string}){
 const Tag=tag;const f=flash?.blockId===id?flash:null;
 return <Tag id={id} data-source-block="true" data-revision={revision} data-case={c.id} data-section={s.id} data-kind={kind??s.type} data-file-id={file?.id} data-file-name={file?.name} data-row={row} data-column={column} className={f?'source-text passage-flash':'source-text'}>{f?<>{text.slice(0,f.start)}<mark>{text.slice(f.start,f.end)}</mark>{text.slice(f.end)}</>:text}</Tag>;
}
export function Rubric({c,flash,notify}:{c:CaseDetail;flash:Flash;notify:(s:string)=>void}){
 const s=c.sections[3];
 return <div className="complete-rubric"><div className="document-toolbar"><span>Complete rubric · {c.criterionCount} scored criteria</span><span>Full scoring criteria and pass/fail gates</span></div>{reviewerRubric(c.rubric).map(b=>{
  if(b.text)return <SourceText key={b.id} c={c} s={s} id={b.id} text={b.text} flash={flash} tag={/heading|title/i.test(b.style??'')?'h4':'p'}/>;
  if(b.rows?.some(row=>row.length===4))return <div className="rubric-criteria" key={b.id}>{b.rows.map((row,i)=>row.length===4?<div className="full-criterion" key={i}><div className="criterion-meta">{row.slice(0,2).map((cell,col)=><SourceText key={col} c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span" kind="Grading rubric · criterion metadata"/>)}</div><SourceText c={c} s={s} id={`${b.id}-r${i}-c2`} text={row[2]} flash={flash} tag="h4" kind="Grading rubric · criterion"/><SourceText c={c} s={s} id={`${b.id}-r${i}-c3`} text={row[3]} flash={flash} kind="Grading rubric · complete scoring evidence"/></div>:<div key={i} className="rubric-dimension-note">{row.map((cell,col)=><SourceText key={col} c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span"/>)}</div>)}</div>;
  return <div className="rubric-table-wrap" key={b.id}><table className="rubric-table"><tbody>{b.rows?.map((row,i)=><tr key={i}>{row.map((cell,col)=><td key={col}><SourceText c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span"/></td>)}</tr>)}</tbody></table></div>;
 })}</div>;
}

export function MaterialsDescription({c,flash,reference,onDismissReference}:{c:CaseDetail;flash:Flash;reference?:Source|null;onDismissReference?:()=>void}){
 const section=c.sections[2];
 const ref=reference?.caseId===c.id&&reference.sectionId===section.id?reference:null;
 const visibleIds=new Set(c.materials.map(m=>`${c.id}-material-${m.id}${reviewMaterialSummary(c,m).suffix}`));
 const historical=ref&&!visibleIds.has(ref.blockId)?materialPassage(c,ref.blockId,ref.revision):null;
 return <div className="materials-description concise-materials"><p className="section-intro">Files supplied to the model builder. These summaries explain what each file contributes to the task.</p>
  {(['Operational','Data'] as const).map(group=><section className="material-group" key={group}><h4 className="material-group-title">{group}</h4><p className="material-group-intro">{group==='Operational'?'Definitions, modeling rules, and requested predictions.':'Measurements, dosing, subject context, and scientific references.'}</p>
  {c.materials.filter(m=>materialGroup(m.name)===group).sort((a,b)=>materialOrder(a.name)-materialOrder(b.name)).map(m=>{const summary=reviewMaterialSummary(c,m),id=`${c.id}-material-${m.id}${summary.suffix}`,previous=ref?.blockId===id&&ref.revision!==summary.revision?materialPassage(c,id,ref.revision):null,expanded=ref?.blockId===id&&ref.end>summary.text.length;return <div className="material-description" key={m.id}><span className="file-extension">{m.format}</span><div className="material-content"><h4>{m.name}</h4>{previous&&<strong>Previously quoted passage</strong>}<SourceText c={c} s={section} id={id} text={previous?.text??(expanded?summary.full:summary.text)} kind={`Material description · ${m.name}`} flash={flash} revision={previous?.revision??summary.revision}/>{summary.truncated&&!expanded&&!previous&&<span className="summary-ellipsis" aria-hidden="true">…</span>}{(expanded||previous)&&<button className="reference-dismiss" onClick={onDismissReference}>Back to summaries</button>}</div></div>;})}
  </section>)}
  {historical&&ref&&<aside className="referenced-material"><div><strong>Previously quoted passage</strong><button className="reference-dismiss" onClick={onDismissReference}>Back to summaries</button></div><SourceText c={c} s={section} id={ref.blockId} text={historical.text} kind={ref.contentType} flash={flash} revision={historical.revision}/></aside>}
 </div>;
}
