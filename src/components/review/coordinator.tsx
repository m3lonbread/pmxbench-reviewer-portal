'use client';
import {useEffect,useState} from 'react';
import {ArrowDownToLine,ArrowUpRight,Check,LoaderCircle,Plus,Search,Users} from 'lucide-react';
import {ratingFields,type ReviewCase} from '../../app/review-data';
import {csvCell,downloadBlob} from '../../app/materials';
import {fetchJson} from './session';

type Status='preliminary'|'verified'|'inactive';
type Person={id:string;name:string;email:string;login_email:string|null;affiliation:string;status:Status;modeling_area:string;research_focus:string;notes:string;source:string;source_row:number|null;outreach_status:string;linked:boolean;caseIds:string[];completed:number};
type Form={name:string;email:string;affiliation:string;status:Status;area:string;notes:string};
const emptyForm:Form={name:'',email:'',affiliation:'',status:'preliminary',area:'',notes:''};
const labels:Record<Status,string>={preliminary:'Preliminary',verified:'Verified',inactive:'Inactive'};
const formFor=(p:Person):Form=>({name:p.name,email:p.login_email??p.email??'',affiliation:p.affiliation,status:p.status,area:p.modeling_area,notes:p.notes});
const sorted=(ids:string[])=>JSON.stringify([...ids].sort());

export function CoordinatorPanel({onPreview,onChanged}:{onPreview:(id:string)=>void;onChanged:()=>void}){
 const [people,setPeople]=useState<Person[]>([]),[cases,setCases]=useState<ReviewCase[]>([]),[selected,setSelected]=useState(''),[ids,setIds]=useState<string[]>([]),[form,setForm]=useState<Form>(emptyForm);
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('current'),[caseSearch,setCaseSearch]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const person=people.find(p=>p.id===selected),isNew=selected==='new';
 const dirty=isNew||Boolean(person&&(JSON.stringify(form)!==JSON.stringify(formFor(person))||sorted(ids)!==sorted(person.caseIds)));
 async function load(){setLoading(true);try{const data=await fetchJson('/api/admin/reviewers');setPeople(data.reviewers);setCases(data.cases);setError('');return data.reviewers as Person[];}catch(e){setError(e instanceof Error?e.message:String(e));return [];}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 function select(p:Person){setSelected(p.id);setIds(p.caseIds);setForm(formFor(p));setNotice('');setError('');setCaseSearch('');}
 function add(){setSelected('new');setIds([]);setForm({...emptyForm});setNotice('');setError('');setCaseSearch('');}
 function update<K extends keyof Form>(key:K,value:Form[K]){setForm(p=>({...p,[key]:value}));}
 async function save(){
  if(!selected)return;setBusy(true);setError('');
  try{
   const result=await fetchJson(isNew?'/api/admin/reviewers':`/api/admin/reviewers/${selected}`,{method:isNew?'POST':'PATCH',body:JSON.stringify({name:form.name,loginEmail:form.email,affiliation:form.affiliation,status:form.status,modelingArea:form.area,notes:form.notes,caseIds:ids})});
   const latest=await load(),saved=latest.find(p=>p.id===result.id);if(saved)select(saved);
   setNotice(form.status==='preliminary'?'Saved as preliminary. Planned cases are drafts until you mark this expert Verified.':form.status==='inactive'?'Saved as inactive. Assignments and existing feedback are retained; reviewer access is paused.':'Saved. This expert’s assigned cases will sync when they select their name or refresh.');
   onChanged();
  }catch(e){setError(e instanceof Error?e.message:'Unable to save this expert.');}finally{setBusy(false);}
 }
 function csv(rows:unknown[][],filename:string){downloadBlob(new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),filename);}
 function exportRoster(){csv([['Expert','Status','Original tracker email','Contact email','Affiliation','Modeling area','Research focus','Planned case numbers','Planned case titles','Reviewer access','Source','Source row','Coordinator notes'],...people.map(p=>[p.name,labels[p.status],p.email,p.login_email,p.affiliation,p.modeling_area,p.research_focus,p.caseIds.map(id=>cases.find(c=>c.id===id)?.number??id).join('; '),p.caseIds.map(id=>cases.find(c=>c.id===id)?.title??id).join('; '),p.status==='verified'&&p.caseIds.length?'Active':'Not active',p.source,p.source_row??'',p.notes])],'pmxbench-expert-roster.csv');}
 async function exportResults(asCsv:boolean){
  setBusy(true);try{
   const data=await fetchJson('/api/admin/results');
   if(!asCsv){downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'pmxbench-all-reviewer-results.json');return;}
   const rows:unknown[][]=[['Reviewer','Expert status','Assignment state','Contact email','Case title',...ratingFields.map(f=>f.label),'Difficulty / expertise feedback','Potential improvements feedback','Overall recommendation','Case ID','Review status','Source revision','Identity method']];
   for(const p of data.reviewers){
    const assigned=data.assignments.filter((a:{reviewer_id:string})=>a.reviewer_id===p.id).map((a:{case_id:string})=>a.case_id);
    const caseIds=new Set<string>([...assigned,...data.caseReviews.filter((r:{reviewer_id:string})=>r.reviewer_id===p.id).map((r:{case_id:string})=>r.case_id)]);
    for(const id of caseIds){const c=cases.find(c=>c.id===id),r=data.caseReviews.find((r:{reviewer_id:string;case_id:string})=>r.reviewer_id===p.id&&r.case_id===id);rows.push([p.name,labels[p.status as Status],!assigned.includes(id)?'Historical':p.status==='verified'?'Active':'Draft / inactive',p.login_email,c?.title??id,...ratingFields.map(f=>r?.rating.values?.[f.key]??''),r?.rating.difficultyFeedback??'',r?.rating.improvements??'',r?.rating.recommendation??'',id,r?.reviewed?'Reviewed':r?'In progress':'Not started',r?.source_revision??c?.revision??'',r?.rating.identityMethod??'']);}
   }
   csv(rows,'pmxbench-all-reviewer-ratings.csv');
  }catch(e){setError(e instanceof Error?e.message:'Unable to export.');}finally{setBusy(false);}
 }
 const isTestReviewer=(p:Person)=>p.source==='Website test fixture';
 const current=people.filter(p=>p.status!=='inactive'&&!isTestReviewer(p));
 const benchmarkCases=cases.filter(c=>!c.isTest);
 const visible=people.filter(p=>(filter==='all'||filter==='current'&&p.status!=='inactive'||p.status===filter)&&`${p.name} ${p.affiliation} ${p.login_email} ${p.modeling_area}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="coordinator-panel">
  <div className="coordinator-heading"><span className="modal-icon"><Users size={23}/></span><div><div className="eyebrow">COORDINATOR WORKSPACE</div><h2>Experts & assignments</h2><p>Build your preliminary roster and plan up to three cases per expert. Confirm details as your reviewer list develops.</p></div></div>
  <div className="assignment-stats"><span><strong>{current.length}</strong> potential experts</span><span><strong>{people.filter(p=>p.status==='verified'&&!isTestReviewer(p)).length}</strong> verified</span><span><strong>{current.filter(p=>p.caseIds.length>0).length}</strong> with planned cases</span><span><strong>{new Set(people.filter(p=>p.status==='verified'&&!isTestReviewer(p)).flatMap(p=>p.caseIds).filter(id=>benchmarkCases.some(c=>c.id===id))).size} / {benchmarkCases.length}</strong> cases active</span></div>
  <div className="assignment-access-note"><Check size={14}/><p>Preliminary assignments are drafts. Mark an expert <strong>Verified</strong> after confirming their details to activate their cases. Activated experts select their name to review; email sign-in is not required. Anyone with the portal link can select an active reviewer name. Contact details remain coordinator-only.</p></div>
  <div className="roster-toolbar"><button className="button outline" disabled={busy||dirty} onClick={()=>onPreview('reviewer-demo')}>Preview reviewer view<ArrowUpRight size={14}/></button><button className="button primary" disabled={busy||dirty} onClick={add}><Plus size={14}/>Add expert</button><button className="button outline" disabled={loading||busy} onClick={exportRoster}><ArrowDownToLine size={14}/>Export roster</button><span>No invitations are sent when you save.</span></div>
  {error&&<div className="inline-error" role="alert">{error}</div>}
  {loading?<div className="packet-loading"><LoaderCircle size={17} className="spin"/>Loading experts…</div>:<div className="assignment-layout">
   <div className="reviewer-list-pane"><div className="case-search"><Search size={14}/><input aria-label="Find an expert" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an expert or modeling area"/></div><label className="roster-filter">Show<select aria-label="Filter experts by status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="current">Current experts</option><option value="preliminary">Preliminary</option><option value="verified">Verified</option><option value="inactive">Inactive</option><option value="all">All records</option></select></label>
    {visible.map(p=><button key={p.id} className={`reviewer-person ${selected===p.id?'selected':''}`} disabled={busy||Boolean(dirty&&selected!==p.id)} onClick={()=>select(p)}><span className="reviewer-initials">{p.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.affiliation}</small><span className={`expert-status ${p.status}`}>{isTestReviewer(p)?'Test reviewer':labels[p.status]}</span><em>{p.caseIds.length?`${p.caseIds.length} ${p.status==='verified'?'active':'planned'} case${p.caseIds.length===1?'':'s'}${p.status==='verified'?` · ${p.completed} reviewed`:''}`:'No cases planned'}</em></span></button>)}
    {!visible.length&&<p className="roster-no-results">No experts match this view.</p>}
   </div>
   <div className="assignment-editor">{!selected?<div className="assignment-empty"><Users size={29}/><h3>A roster that can grow</h3><p>Select a potential expert to review their details and plan up to three cases. Add new people as you identify them.</p></div>:<>
    <div className="assignment-person-heading"><h3>{isNew?'Add potential expert':person?.name}</h3><span>{person?.status==='verified'?'Name selection enabled':'Not in reviewer picker'}</span></div>
    <label className="assignment-field">Expert name<input aria-label="Expert name" value={form.name} onChange={e=>update('name',e.target.value)} maxLength={150}/></label>
    <label className="assignment-field">Verification status<select aria-label="Expert verification status" value={form.status} onChange={e=>update('status',e.target.value as Status)}><option value="preliminary">Preliminary — details not yet verified</option><option value="verified">Verified — activate assigned cases</option><option value="inactive">Inactive — retain record and feedback</option></select></label>
    <label className="assignment-field">Contact email (optional)<input aria-label="Expert contact email" type="email" value={form.email} onChange={e=>update('email',e.target.value)} maxLength={254}/></label>
    <label className="assignment-field">Affiliation<input aria-label="Expert affiliation" value={form.affiliation} onChange={e=>update('affiliation',e.target.value)} maxLength={500}/></label>
    <label className="assignment-field">Modeling area<input aria-label="Expert modeling area" value={form.area} onChange={e=>update('area',e.target.value)} maxLength={500}/></label>
    {person?.research_focus&&<div className="expert-research"><strong>Research focus from tracker</strong><p>{person.research_focus}</p></div>}
    {person&&<div className="assignment-contact">Source: {person.source}{person.source_row?` · row ${person.source_row}`:''}<br/>Contact email: {person.email}{person.outreach_status&&<> · Outreach: {person.outreach_status}</>}</div>}
    <label className="assignment-field">Coordinator notes<textarea aria-label="Coordinator notes" value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Verification details or assignment context" rows={3} maxLength={10000}/></label>
    <div className="assignment-choose-heading"><strong>{form.status==='verified'?'Assigned cases':'Planned cases'}</strong><span className={ids.length>0&&ids.length<=3?'all-rated':''}>{ids.length} / 3 selected</span></div>
    <p className="assignment-draft-help">{form.status==='verified'?'Up to three cases appear when this expert selects their name.':'Choose up to three draft cases. They become available to the expert after verification.'}</p>
    <div className="case-search"><Search size={14}/><input aria-label="Find a case to assign" placeholder="Find a case to assign" value={caseSearch} onChange={e=>setCaseSearch(e.target.value)}/></div>
    <div className="assignment-case-options">{cases.filter(c=>`${c.title} ${c.trackCode}`.toLowerCase().includes(caseSearch.toLowerCase())).map(c=><label key={c.id} className={ids.includes(c.id)?'checked':''}><input type="checkbox" aria-label={`Assign case ${c.number}: ${c.title}`} checked={ids.includes(c.id)} disabled={busy||!ids.includes(c.id)&&ids.length>=3} onChange={e=>setIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><span><strong>{c.number}. {c.title}</strong><small>{c.track}</small></span></label>)}</div>
    <div className="assignment-save-actions"><span>{dirty?'Unsaved changes':ids.length?form.status==='verified'?'Saved assignment':'Saved draft assignment':'No cases planned yet'}</span><button className="button outline" disabled={!dirty||busy} onClick={()=>person?select(person):(setSelected(''),setForm({...emptyForm}),setIds([]))}>Discard changes</button><button className="button primary" disabled={!dirty||busy||ids.length>3||!form.name.trim()||(Boolean(form.email.trim())&&!/^\S+@\S+\.\S+$/.test(form.email.trim()))} onClick={save}>{busy?<LoaderCircle size={13} className="spin"/>:<Check size={13}/>}Save expert</button></div>
    {notice&&<p className="assignment-notice" role="status">{notice}</p>}
    {!isNew&&<button className="preview-reviewer" disabled={dirty||busy||ids.length===0} onClick={()=>onPreview(selected)}>{form.status==='verified'?'Preview reviewer workspace':'Preview draft workspace'}<ArrowUpRight size={14}/></button>}
   </>}</div>
  </div>}
  <div className="coordinator-export"><div><strong>Collected reviews</strong><p>Export benchmark ratings and source-linked comments. Website test data is excluded.</p></div><button className="button outline" disabled={busy} onClick={()=>exportResults(true)}><ArrowDownToLine size={14}/>Ratings CSV</button><button className="button primary" disabled={busy} onClick={()=>exportResults(false)}><ArrowDownToLine size={14}/>Complete JSON</button></div>
 </div>;
}
