import type {RubricBlock} from '../../app/review-data';

const isGateHeading=(b:RubricBlock)=>/^(?:(?:required|mandatory)\s+)?pass[\s/–—-]*fail\s+gates?\s*$/i.test(b.text?.trim()??'');
const isGateTable=(b:RubricBlock)=>/^gate$/i.test(b.rows?.[0]?.[0]?.trim()??'');
const isRubricSummary=(b:RubricBlock)=>/^\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+Five dimensions\s+100 points\.?$/i.test(b.text?.trim()??'');
const isInternalSection=(b:RubricBlock)=>/^(?:Threshold provenance|Evidence and execution)$/i.test(b.text?.trim()??'');

// Keep original block IDs and text so existing quotations retain their sources.
export function reviewerRubric(blocks:RubricBlock[]):RubricBlock[]{
 let internal=false;
 blocks=blocks.filter(b=>{
  if(isRubricSummary(b))return false;
  if(isInternalSection(b)){internal=true;return false;}
  if(/heading|title/i.test(b.style??'')||b.rows?.some(row=>row.length===4)||isGateHeading(b)||isGateTable(b))internal=false;
  return !internal;
 });
 const lastCriterion=blocks.reduce((last,b,i)=>b.rows?.some(row=>row.length===4)?i:last,-1);
 if(lastCriterion<0)return blocks;
 const result=blocks.slice(0,lastCriterion+1);
 let gateStart=-1;
 for(let i=lastCriterion+1;i<blocks.length;i++){
  if(isGateHeading(blocks[i]))gateStart=i;
  if(isGateTable(blocks[i])){
   result.push(...blocks.slice(gateStart<0?i:gateStart,i+1));
   gateStart=-1;
  }
 }
 // Some source rubrics express the gates as paragraphs instead of a table.
 if(gateStart>=0){
  let end=gateStart+1;
  while(end<blocks.length&&!/heading|title/i.test(blocks[end].style??''))end++;
  result.push(...blocks.slice(gateStart,end));
 }
 return result;
}

export function omittedRubricPassage(blocks:RubricBlock[],blockId:string){
 const visible=new Set(reviewerRubric(blocks).map(b=>b.id));
 return blocks.some(b=>!visible.has(b.id)&&(blockId===b.id||blockId.startsWith(b.id+'-')));
}
