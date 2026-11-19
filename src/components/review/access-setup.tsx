import {useEffect,useState} from 'react';
import {Check,KeyRound,LoaderCircle} from 'lucide-react';
import {fetchJson} from './session';
type Group={id:string;label:string;active:boolean;workspaceMode:string|null;adminMode:string|null;cases:{id:string;number:number;title:string}[];members:{id:string;name:string;email:string;role:string;passwordReady:boolean}[]};
export function AccessSetup(){
 const [groups,setGroups]=useState<Group[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState(''),[mode,setMode]=useState(''),[permissions,setPermissions]=useState(''),[password,setPassword]=useState('');
 const group=groups.find(g=>g.id===selected);
 useEffect(()=>{setMode(group?.workspaceMode??'');setPermissions(group?.adminMode??'');setPassword('');},[group?.id,group?.workspaceMode,group?.adminMode]);
 async function load(){try{const data=await fetchJson('/api/admin/access-groups');setGroups(data.groups);setSelected(prev=>prev||data.groups[0]?.id||'');}catch(e){setError(e instanceof Error?e.message:'Unable to load access setup.');}}
 useEffect(()=>{void load();},[]);
 async function activate(e:React.FormEvent){e.preventDefault();if(!group||busy)return;setBusy(true);setError('');setNotice('');try{await fetchJson(`/api/admin/access-groups/${group.id}/activate`,{method:'POST',body:JSON.stringify({workspaceMode:mode,adminMode:permissions,password})});setPassword('');await load();setNotice('Access activated. Admin members use Coordinator access with their own email and the password you entered. Viewers use their name and recorded email.');}catch(e){setError(e instanceof Error?e.message:'Unable to activate access.');}finally{setPassword('');setBusy(false);}}
 if(!groups.length&&!error)return null;
 return <details className="case-access-setup" open={!groups.every(g=>g.active)}><summary><KeyRound size={17}/>Restricted case access <span>Owner only</span></summary>
  <p>Review the prepared people and case scope before creating password access. This does not send invitation emails.</p>
  {groups.length>1&&<label>Access group<select value={selected} onChange={e=>{setSelected(e.target.value);setPassword('');setMode('');setPermissions('');}}>{groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>}
  {group&&<><h3>{group.label}</h3><div className="access-scope-columns"><div><strong>People</strong><ul>{group.members.map(m=><li key={m.id}><b>{m.name}</b><span>{m.email}</span><small>{m.role==='case_admin'?'Case admin · password required':'Case viewer · name and email'}</small></li>)}</ul></div><div><strong>Six-case scope</strong><ul>{group.cases.map(c=><li key={c.id}>{c.number}. {c.title}</li>)}</ul></div></div>
   {group.active?<p className="assignment-notice"><Check size={15}/>Active · {group.workspaceMode==='test'?'Separate test copies':'Live cases'} · {group.adminMode==='manage'?'Case assignments and feedback exports':'Feedback viewing and exports'}</p>:<form className="access-activation-form" onSubmit={activate}>
    <label>Workspace<select aria-label="Restricted workspace" required value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}><option value="">Choose a workspace</option><option value="live">Live cases and existing expert feedback</option><option value="test">Test copies with separate feedback</option></select></label>
    <label>Admin permissions<select aria-label="Restricted admin permissions" required value={permissions} onChange={e=>setPermissions(e.target.value)} disabled={busy}><option value="">Choose admin permissions</option><option value="view_export">View and export feedback only</option><option value="manage">Manage case assignments and view/export feedback</option></select></label>
    <p>Admins see only these cases, ratings, and comments whose quotations all refer to this scope. General comments without a case reference are omitted. Global contacts, coordinator notes, account settings, and other cases stay private. Assignment changes preserve cases outside this scope.</p>
    <label htmlFor="case-admin-new-password">Password for the prepared admin accounts<input id="case-admin-new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
    <span>The password is sent to Supabase Auth and is not saved in portal records. Existing passwords are never reset by this form. If retrying partial setup, use the same password.</span>
    <button className="button primary" disabled={busy||!mode||!permissions||password.length<12}>{busy?<LoaderCircle size={16} className="spin"/>:<KeyRound size={16}/>}Create admin accounts and activate access</button>
   </form>}
  </>}
  {error&&<p className="inline-error" role="alert">{error}</p>}{notice&&<p className="assignment-notice" role="status">{notice}</p>}
 </details>;
}
