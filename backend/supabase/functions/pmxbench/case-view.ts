// Keep storage and historical quotations intact while presenting clean case labels.
export function caseView(c:any){
 c={...c,sections:c.sections.map((s:any,i:number)=>i===0?{...s,title:'Case goal',type:'Case goal'}:s)};
 return c.isTest&&c.testSourceCaseNumber?{...c,title:c.title.replace(/^Test copy · /,''),revision:c.revision+'-review-view-v1'}:c;
}
export function literatureView(c:any){
 const section={id:`${c.id}-source-literature`,number:`${c.number}.6`,title:'Key source literature',type:'Source literature'};
 return {...c,sections:[...c.sections.filter((s:any)=>s.id!==section.id),section]};
}
export function activeCase(c:any){return c.archived!==true;}
