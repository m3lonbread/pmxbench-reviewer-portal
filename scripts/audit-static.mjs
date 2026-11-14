import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url),files=[];
async function walk(url){for(const entry of await readdir(url,{withFileTypes:true})){const target=new URL(entry.name+(entry.isDirectory()?'/':''),url);if(entry.isDirectory())await walk(target);else files.push(target);}}
await walk(root);const content=Buffer.concat(await Promise.all(files.map(p=>readFile(p)))).toString();
assert.ok(!files.some(p=>p.pathname.toLowerCase().endsWith('.pdf')),'Literature PDF found in public static output.');
const forbidden=['backend/private','SUPABASE_SERVICE_ROLE_KEY'];
// The Supabase browser SDK contains the literal prefix in its key classifier.
// Reject actual secret-key values while allowing that library code.
assert.ok(!/sb_secret_[A-Za-z0-9_-]{16,}/.test(content),'Server secret found in static output.');
try{const packets=JSON.parse(await readFile(new URL('../backend/private/case-packets.json',import.meta.url),'utf8'));for(const c of Object.values(packets))forbidden.push(c.title);}catch{}
try{const contacts=JSON.parse(await readFile(new URL('../backend/private/optional-contact-tracker.json',import.meta.url),'utf8'));for(const p of contacts.people)forbidden.push(p.email);}catch{}
try{const literature=JSON.parse(await readFile(new URL('../backend/private/literature-manifest.json',import.meta.url),'utf8'));for(const p of literature.papers)forbidden.push(p.meta.sha256);}catch{}
for(const value of forbidden)assert.ok(!content.includes(value),'Private/server content found in static output.');
const html=await readFile(new URL('index.html',root),'utf8');assert.ok(html.includes('/assets/'));assert.ok(!html.includes('src/main.tsx'));
console.log(`PASS: ${files.length} static build files; no case packets, contacts, or server credentials in the Pages artifact.`);
