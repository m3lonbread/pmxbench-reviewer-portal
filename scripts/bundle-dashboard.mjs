// Produces the same handler as the CLI entrypoints in single-file form for
// Supabase's browser editor. Generated code contains no project secrets/data.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../backend/supabase/functions/pmxbench/',import.meta.url);
const chunks=await Promise.all(['domain.ts','picker.ts','results.ts','case-view.ts','service.ts'].map(async name=>(await readFile(new URL(name,root),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'')));
const directory=new URL('../backend/.deploy/',import.meta.url);await mkdir(directory,{recursive:true});
for(const [name,mode]of [['pmxbench','authenticated'],['pmxbench-reviewer','name-picker']])await writeFile(new URL(name+'.ts',directory),"import {createClient} from 'npm:@supabase/supabase-js@2.119.0';\n"+chunks.join('\n')+`\nDeno.serve(portalHandler('${mode}'));\n`);
console.log('Prepared coordinator and name-picker dashboard bundles.');
