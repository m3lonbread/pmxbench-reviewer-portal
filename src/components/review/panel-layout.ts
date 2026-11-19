import {useCallback,useEffect,useState} from 'react';

function useBreakpoint(query:string){
 const [matches,setMatches]=useState(()=>typeof window!=='undefined'&&window.matchMedia(query).matches);
 useEffect(()=>{const media=window.matchMedia(query),update=()=>setMatches(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[query]);
 return matches;
}

export function useReviewPanels(){
 const isMobile=useBreakpoint('(max-width:650px)'),isAssistantOverlay=useBreakpoint('(max-width:900px)');
 const [casesCollapsed,setCasesCollapsed]=useState(false),[assistantCollapsed,setAssistantCollapsed]=useState(false);
 const [navOpen,setNavOpen]=useState(false),[chatOpen,setChatOpen]=useState(false);
 useEffect(()=>{if(!isMobile)setNavOpen(false);},[isMobile]);
 useEffect(()=>{if(!isAssistantOverlay)setChatOpen(false);},[isAssistantOverlay]);
 const openCases=useCallback(()=>{setCasesCollapsed(false);setNavOpen(isMobile);},[isMobile]);
 const closeCases=useCallback(()=>{if(isMobile)setNavOpen(false);else setCasesCollapsed(true);},[isMobile]);
 const toggleCases=useCallback(()=>{if(isMobile)setNavOpen(v=>!v);else setCasesCollapsed(v=>!v);},[isMobile]);
 const openAssistant=useCallback(()=>{setAssistantCollapsed(false);setChatOpen(isAssistantOverlay);},[isAssistantOverlay]);
 const closeAssistant=useCallback(()=>{if(isAssistantOverlay)setChatOpen(false);else setAssistantCollapsed(true);},[isAssistantOverlay]);
 const toggleAssistant=useCallback(()=>{if(isAssistantOverlay)setChatOpen(v=>!v);else setAssistantCollapsed(v=>!v);},[isAssistantOverlay]);
 return {isMobile,casesCollapsed,assistantCollapsed,navOpen,setNavOpen,chatOpen,setChatOpen,openCases,closeCases,toggleCases,openAssistant,closeAssistant,toggleAssistant,casesExpanded:isMobile?navOpen:!casesCollapsed,assistantExpanded:isAssistantOverlay?chatOpen:!assistantCollapsed};
}
