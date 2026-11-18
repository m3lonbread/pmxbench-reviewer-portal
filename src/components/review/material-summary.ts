import type {CaseDetail,MaterialDescription} from '../../app/review-data';

// Display a verbatim prefix so quotation offsets still match the stored source.
export function materialSummary(m:MaterialDescription,limit=240){
 const full=m.guide?.summary||m.description;
 const firstSentence=full.match(/^.*?[.!?](?:\s|$)/s)?.[0].trimEnd();
 const concise=m.name==='model_construction_contract.json'&&firstSentence?firstSentence:full;
 const end=concise.length<=limit?concise.length:Math.max(concise.lastIndexOf(' ',limit),limit-25);
 const text=concise.slice(0,end).trimEnd();
 return {text,full,suffix:m.guide?'-summary':'',truncated:text.length<concise.length};
}

// Older comments can still open the one passage they cited without restoring the field catalog.
export function materialPassage(c:CaseDetail,blockId:string){
 const revision=c.materialsGuide?.revision;
 for(const key of ['objective','scope'] as const)if(blockId===`${c.id}-materials-${key}`&&c.materialsGuide?.[key])return {text:c.materialsGuide[key],revision};
 for(const m of c.materials){
  const prefix=`${c.id}-material-${m.id}`;
  if(blockId===prefix)return {text:m.description,revision:undefined};
  if(!m.guide)continue;
  if(blockId===prefix+'-summary')return {text:m.guide.summary,revision};
  if(blockId===prefix+'-endpoints'&&m.guide.endpointCoverage)return {text:m.guide.endpointCoverage,revision};
  const part=[...m.guide.blocks,...m.guide.fields].find(b=>blockId===prefix+'-'+b.id);
  if(part)return {text:part.text,revision};
 }
 return null;
}
