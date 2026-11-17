
'use client';
import {reviewerRubric} from './rubric-structure';
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

export function MaterialsDescription({c,flash}:{c:CaseDetail;flash:Flash}){
 const section=c.sections[2],revision=c.materialsGuide?.revision;
 const text=(id:string,value:string,kind:string)=> <SourceText c={c} s={section} id={id} text={value} kind={kind} flash={flash} revision={revision}/>;
 return <div className="materials-description detailed-materials"><p className="section-intro">Case-specific descriptions of the files supplied to the model builder, with their analytical roles, contents, units, and limitations.</p>
  {c.materialsGuide&&<div className="materials-case-context"><h4>What these materials need to support</h4>{text(`${c.id}-materials-objective`,c.materialsGuide.objective,'Material description · case objective')}{c.materialsGuide.scope&&<><h5>Case scope and interpretation</h5>{text(`${c.id}-materials-scope`,c.materialsGuide.scope,'Material description · case scope')}</>}</div>}
  {c.materials.map(m=><div className="material-description" key={m.id}><span className="file-extension">{m.format}</span><div className="material-content"><h4>{m.name}</h4>{m.guide?<>
   {text(`${c.id}-material-${m.id}-summary`,m.guide.summary,`Material description · ${m.name}`)}
   {m.guide.blocks.map(b=><div className="material-detail-block" key={b.id}><h5>{b.label}</h5>{text(`${c.id}-material-${m.id}-${b.id}`,b.text,`Material description · ${m.name} · ${b.label}`)}</div>)}
   {m.guide.endpointCoverage&&<details className="material-expand"><summary>Endpoint coverage and units</summary>{text(`${c.id}-material-${m.id}-endpoints`,m.guide.endpointCoverage,`Material endpoint coverage · ${m.name}`)}</details>}
   {m.guide.fields.length>0&&<details className="material-expand"><summary>Field guide · {m.guide.fields.length} columns</summary><div className="material-field-guide">{m.guide.fields.map(f=><div key={f.id}><code>{f.name}</code>{text(`${c.id}-material-${m.id}-${f.id}`,f.text,`Material field guide · ${m.name} · ${f.name}`)}</div>)}</div></details>}
   <details className="material-expand material-assessment"><summary>Review focus</summary><SourceText c={c} s={section} id={`${c.id}-material-${m.id}`} text={m.description} kind={`Material description · ${m.name}`} flash={flash}/></details>
  </>:<SourceText c={c} s={section} id={`${c.id}-material-${m.id}`} text={m.description} kind={`Material description · ${m.name}`} flash={flash}/>}</div></div>)}
 </div>;
}
