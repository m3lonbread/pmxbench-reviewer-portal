// Keep storage and historical quotations intact while presenting clean case labels.
export function caseView(c:any){
 return c.isTest&&c.testSourceCaseNumber?{...c,title:c.title.replace(/^Test copy · /,''),revision:c.revision+'-review-view-v1'}:c;
}
export function activeCase(c:any){return c.archived!==true;}
