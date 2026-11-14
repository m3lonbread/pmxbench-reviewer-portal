import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,LoaderCircle,Minus,Plus} from 'lucide-react';
import {getDocument,GlobalWorkerOptions,TextLayer,type PDFDocumentProxy,type RenderTask} from 'pdfjs-dist';
import workerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerSource;

export default function PaperPreview({url,title}:{url:string;title:string}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[pageNumber,setPageNumber]=useState(1),[zoom,setZoom]=useState(1),[width,setWidth]=useState(800),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const reader=useRef<HTMLDivElement>(null),mount=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=reader.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,entry.contentRect.width-40)));observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let alive=true;setPdf(null);setPageNumber(1);setError('');setBusy(true);
  const assets=new URL(import.meta.env.BASE_URL+'pdfjs/',window.location.origin).href;
  const task=getDocument({url,cMapUrl:assets+'cmaps/',cMapPacked:true,standardFontDataUrl:assets+'standard_fonts/',wasmUrl:assets+'wasm/',iccUrl:assets+'iccs/',verbosity:0});
  task.promise.then(doc=>{if(alive)setPdf(doc);}).catch(()=>{if(alive){setError('The paper preview could not load. You can still open or download the PDF above.');setBusy(false);}});
  return()=>{alive=false;void task.destroy().catch(()=>{});};
 },[url]);
 useEffect(()=>{
  if(!pdf||!mount.current)return;let alive=true,render:RenderTask|undefined,textLayer:TextLayer|undefined;setBusy(true);setError('');
  const target=mount.current;
  pdf.getPage(pageNumber).then(async page=>{
   if(!alive)return;const base=page.getViewport({scale:1}),scale=Math.min(width,950)/base.width*zoom,viewport=page.getViewport({scale}),pixelRatio=Math.min(window.devicePixelRatio||1,2);
   const surface=document.createElement('div');surface.className='paper-page';surface.style.width=viewport.width+'px';surface.style.height=viewport.height+'px';surface.style.setProperty('--total-scale-factor',String(viewport.scale*viewport.userUnit));
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width*pixelRatio);canvas.height=Math.ceil(viewport.height*pixelRatio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-hidden','true');
   const text=document.createElement('div');text.className='textLayer paper-text-layer';surface.append(canvas,text);target.replaceChildren(surface);
   render=page.render({canvas,viewport,transform:pixelRatio===1?undefined:[pixelRatio,0,0,pixelRatio,0,0]});await render.promise;
   if(!alive)return;textLayer=new TextLayer({textContentSource:page.streamTextContent(),container:text,viewport});await textLayer.render();
   if(alive){setBusy(false);reader.current?.scrollTo({top:0,left:0});}
  }).catch(e=>{if(alive&&e?.name!=='RenderingCancelledException'){setError('This page could not be previewed. Use the PDF download above to read the paper.');setBusy(false);}});
  return()=>{alive=false;render?.cancel();textLayer?.cancel();};
 },[pdf,pageNumber,width,zoom]);
 return <div className="paper-preview"><div className="paper-page-controls" aria-label="PDF page controls"><div><button aria-label="Previous PDF page" disabled={!pdf||pageNumber===1} onClick={()=>setPageNumber(p=>p-1)}><ChevronLeft size={17}/></button><label>Page <input aria-label="PDF page number" type="number" min={1} max={pdf?.numPages??1} value={pageNumber} onChange={e=>{const n=Number(e.target.value);if(pdf&&Number.isInteger(n)&&n>=1&&n<=pdf.numPages)setPageNumber(n);}}/> of {pdf?.numPages??'…'}</label><button aria-label="Next PDF page" disabled={!pdf||pageNumber===pdf.numPages} onClick={()=>setPageNumber(p=>p+1)}><ChevronRight size={17}/></button></div><div><button aria-label="Zoom out PDF" disabled={zoom<=.5} onClick={()=>setZoom(z=>Math.max(.5,z-.25))}><Minus size={15}/></button><button className="paper-fit" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}% · Fit width</button><button aria-label="Zoom in PDF" disabled={zoom>=2.5} onClick={()=>setZoom(z=>Math.min(2.5,z+.25))}><Plus size={15}/></button></div></div>
  <div className="paper-scroll" ref={reader} aria-label={`PDF: ${title}`} aria-busy={busy}>
   {busy&&<div className="paper-page-loading" role="status"><LoaderCircle size={18} className="spin"/>Loading page…</div>}
   {error?<div className="paper-reader-status" role="alert">{error}</div>:<div ref={mount} className="paper-page-mount" aria-label={`Page ${pageNumber} of ${pdf?.numPages??'…'}`}/>}
  </div>
 </div>;
}
