// Library support files only. Case PDFs remain in private backend storage.
import {cp,mkdir} from 'node:fs/promises';
for(const directory of ['cmaps','standard_fonts','wasm','iccs']){
 const target=new URL('../public/pdfjs/'+directory+'/',import.meta.url);
 await mkdir(target,{recursive:true});
 await cp(new URL('../node_modules/pdfjs-dist/'+directory+'/',import.meta.url),target,{recursive:true});
}

await cp(new URL('../node_modules/pdfjs-dist/LICENSE',import.meta.url),new URL('../public/pdfjs/LICENSE',import.meta.url));
