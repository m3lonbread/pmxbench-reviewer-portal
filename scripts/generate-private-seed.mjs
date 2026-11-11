import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),emails=[];let contacts=false;
for(let i=0;i<args.length;i++){if(args[i]==='--coordinator-email'){const value=args[++i];if(!value)throw Error('Missing coordinator email.');emails.push(...value.split(',').map(e=>e.trim().toLowerCase()));}else if(args[i]==='--include-contacts')contacts=true;else throw Error('Use --coordinator-email and optional --include-contacts.');}
if(!emails.length||emails.some(e=>!/^\S+@\S+\.\S+$/.test(e)))throw Error('Provide the real coordinator sign-in email.');
const root=new URL('../backend/private/',import.meta.url),packets=JSON.parse(await readFile(new URL('case-packets.json',root),'utf8')),manifest=JSON.parse(await readFile(new URL('bootstrap-manifest.json',root),'utf8'));
const literal=value=>"'"+String(value).replaceAll("'","''")+"'",json=value=>literal(JSON.stringify(value))+'::jsonb';
const sql=['begin;',`insert into public.pmx_settings(key,value) values('coordinator_emails',${json([...new Set(emails)])}) on conflict(key) do update set value=excluded.value;`];
let criteria=0;
for(const [id,packet]of Object.entries(packets)){
 const digest=createHash('sha256').update(JSON.stringify(packet)).digest('hex');if(digest!==manifest.caseHashes[id])throw Error('Case checksum mismatch.');
 for(const name of ['stagedFiles','summaryCard','referencePapers','chunks','preview'])if(name in packet)throw Error('Case payload contains forbidden file access.');
 const {prompt,rubric,materials,...meta}=packet;criteria+=packet.criterionCount;
 sql.push(`insert into public.pmx_cases(id,meta,packet) values(${literal(id)},${json(meta)},${json(packet)}) on conflict(id) do update set meta=excluded.meta,packet=excluded.packet;`);
}
if(Object.keys(packets).length!==53||criteria!==1038)throw Error('Expected all 53 official cases and 1,038 criteria.');
let count=0;if(contacts){const data=JSON.parse(await readFile(new URL('optional-contact-tracker.json',root),'utf8'));for(const p of data.people){sql.push(`insert into public.pmx_experts(id,name,email,login_email,affiliation,status,modeling_area,research_focus,notes,source,source_row,outreach_status) values(${literal(p.id)},${literal(p.name)},${literal(p.email.toLowerCase())},${literal(p.email.toLowerCase())},${literal(p.affiliation)},'preliminary',${literal(p.modelingArea)},${literal(p.researchFocus)},${literal(p.notes)},${literal(data.source)},${Number(p.sourceRow)},${literal(p.outreachStatus)}) on conflict(id) do nothing;`);count++;}}
sql.push('commit;');await mkdir(root,{recursive:true});await writeFile(new URL('seed.sql',root),sql.join('\n')+'\n');
console.log(`Prepared private SQL for 53 cases, 1,038 criteria, ${emails.length} coordinator account(s), and ${count} preliminary contacts. This file stays outside Git and the Pages build.`);
