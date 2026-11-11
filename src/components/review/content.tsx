
'use client';
import type {CaseDetail,ReviewCase,Section} from '../../app/review-data';
export type Source={caseId:string;caseNumber:number;caseTitle:string;sectionId:string;sectionNumber:string;sectionTitle:string;contentType:string;blockId:string;start:number;end:number;text:string;revision:string;fileName?:string};
export type Flash={blockId:string;start:number;end:number}|null;
export function SourceText({c,s,id,text,kind,flash,tag='p',file,row,column}:{c:ReviewCase;s:Section;id:string;text:string;kind?:string;flash:Flash;tag?:'p'|'span'|'h2'|'h4';file?:{id:string;name:string};row?:number;column?:string}){
 const Tag=tag;const f=flash?.blockId===id?flash:null;
 return <Tag id={id} data-source-block="true" data-case={c.id} data-section={s.id} data-kind={kind??s.type} data-file-id={file?.id} data-file-name={file?.name} data-row={row} data-column={column} className={f?'source-text passage-flash':'source-text'}>{f?<>{text.slice(0,f.start)}<mark>{text.slice(f.start,f.end)}</mark>{text.slice(f.end)}</>:text}</Tag>;
}
export function Rubric({c,flash,notify}:{c:CaseDetail;flash:Flash;notify:(s:string)=>void}){
 const s=c.sections[3];
 return <div className="complete-rubric"><div className="document-toolbar"><span>Complete rubric · {c.criterionCount} scored criteria</span><span>Full scoring criteria and pass/fail gates</span></div>{c.rubric.map(b=>{
  if(b.text)return <SourceText key={b.id} c={c} s={s} id={b.id} text={b.text} flash={flash} tag={/heading|title/i.test(b.style??'')?'h4':'p'}/>;
  if(b.rows?.some(row=>row.length===4))return <div className="rubric-criteria" key={b.id}>{b.rows.map((row,i)=>row.length===4?<div className="full-criterion" key={i}><div className="criterion-meta">{row.slice(0,2).map((cell,col)=><SourceText key={col} c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span" kind="Grading rubric · criterion metadata"/>)}</div><SourceText c={c} s={s} id={`${b.id}-r${i}-c2`} text={row[2]} flash={flash} tag="h4" kind="Grading rubric · criterion"/><SourceText c={c} s={s} id={`${b.id}-r${i}-c3`} text={row[3]} flash={flash} kind="Grading rubric · complete scoring evidence"/></div>:<div key={i} className="rubric-dimension-note">{row.map((cell,col)=><SourceText key={col} c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span"/>)}</div>)}</div>;
  return <div className="rubric-table-wrap" key={b.id}><table className="rubric-table"><tbody>{b.rows?.map((row,i)=><tr key={i}>{row.map((cell,col)=><td key={col}><SourceText c={c} s={s} id={`${b.id}-r${i}-c${col}`} text={cell} flash={flash} tag="span"/></td>)}</tr>)}</tbody></table></div>;
 })}</div>;
}

export function MaterialsDescription({c,flash}:{c:CaseDetail;flash:Flash}){
 return <div className="materials-description"><p className="section-intro">Descriptions of the materials staged for this case.</p>{c.materials.map(m=><div className="material-description" key={m.id}><span className="file-extension">{m.format}</span><div><h4>{m.name}</h4><SourceText c={c} s={c.sections[2]} id={`${c.id}-material-${m.id}`} text={m.description} kind={`Material description · ${m.name}`} flash={flash}/></div></div>)}</div>;
}
