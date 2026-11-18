'use client';
import {useState} from 'react';
import {Check,LoaderCircle,Pencil,X} from 'lucide-react';
import type {Feedback} from './session';

export function EditableComment({item,readOnly,onSave}:{item:Feedback;readOnly:boolean;onSave:(id:string,text:string,version:number)=>Promise<void>}){
 const [editing,setEditing]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 function cancel(){if(busy)return;setEditing(false);setText('');setError('');}
 async function save(){if(busy||!text.trim())return;setBusy(true);setError('');try{await onSave(item.id,text.trim(),item.version??0);setEditing(false);setText('');}catch(e){setError(e instanceof Error?e.message:'Unable to save your changes.');}finally{setBusy(false);}}
 return <div className="comment-text-editor">{editing?<><label htmlFor={'edit-comment-'+item.id}>Edit your comment</label><textarea id={'edit-comment-'+item.id} autoFocus maxLength={20000} value={text} disabled={busy} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cancel();}if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();void save();}}}/><p className="comment-edit-note">The attached quotation and source stay with this comment.</p>{error&&<p className="comment-edit-error" role="alert">{error}</p>}<div className="comment-edit-actions"><button disabled={busy} onClick={cancel}><X size={12}/>Cancel</button><button disabled={busy||!text.trim()} onClick={()=>void save()}>{busy?<LoaderCircle size={12} className="spin"/>:<Check size={12}/>}Save changes</button></div></>:<><p className="expert-comment">{item.text}</p><div className="comment-edit-meta">{item.updatedAt&&<span title={new Date(item.updatedAt).toLocaleString()}>Edited</span>}{!readOnly&&<button aria-label="Edit comment" onClick={()=>{setText(item.text);setError('');setEditing(true);}}><Pencil size={11}/>Edit</button>}</div></>}</div>;
}
