// Photo map: native scrolling keeps touch momentum, keyboard access and scrollbars.
(() => {
'use strict';
const $=id=>document.getElementById(id), viewport=$('satellite-viewport'),surface=$('satellite-surface'),image=$('satellite-image'),shell=$('satellite-shell'),data=window.SkylineImagery;
if(!viewport||!data)return;
let zoom=1,scale=1,padX=0,padY=0,ready=false,region=window.SkylineApp?.getState().site||0,drag=null,initialized=false;
const patchBoxes=[];data.regions.forEach(()=>{const box=document.createElement('div');box.className='satellite-patch';surface.append(box);patchBoxes.push(box);});
const markers=[];let picking=false,mouseMoved=false,cameraPoint=null;const cameraPin=document.createElement('div');cameraPin.className='satellite-camera-pin';cameraPin.hidden=true;cameraPin.setAttribute('aria-hidden','true');cameraPin.textContent='▲';surface.append(cameraPin);
function worldPoint(p){return{x:data.bounds.minX+p.x*data.exportResolutionM,y:data.bounds.maxY-p.y*data.exportResolutionM};}
function photoPoint(p){return{x:(p.x-data.bounds.minX)/data.exportResolutionM,y:(data.bounds.maxY-p.y)/data.exportResolutionM};}
function setPicking(value){picking=value;viewport.classList.toggle('picking',value);$('pick-surface').setAttribute('aria-pressed',String(value));$('navigator-status').textContent=value?'Click a location inside one of the three study patches.':shell.dataset.mode==='surface'?'Surface View · reconstructed from NASA terrain and orbital photos.':'Choose a study area, then enter Surface View.';}
function positionCameraPin(){if(!cameraPoint)return;const p=photoPoint(cameraPoint);cameraPin.hidden=false;cameraPin.style.left=(padX+p.x*scale)+'px';cameraPin.style.top=(padY+p.y*scale)+'px';cameraPin.style.transform=`translate(-50%,-50%) rotate(${cameraPoint.heading||0}rad)`;}

function point(r){return {x:(r.centerX-data.bounds.minX)/data.exportResolutionM,y:(data.bounds.maxY-r.centerY)/data.exportResolutionM};}
function center(){return{x:viewport.scrollLeft/scale,y:viewport.scrollTop/scale};}
function go(p){viewport.scrollLeft=padX+p.x*scale-viewport.clientWidth/2;viewport.scrollTop=padY+p.y*scale-viewport.clientHeight/2;}
function layout(p){if(!viewport.clientWidth||!viewport.clientHeight)return;padX=viewport.clientWidth/2;padY=viewport.clientHeight/2;scale=Math.max(viewport.clientWidth/data.width,viewport.clientHeight/data.height)*zoom;
const w=data.width*scale,h=data.height*scale;surface.style.width=`${w+padX*2}px`;surface.style.height=`${h+padY*2}px`;image.style.cssText=`left:${padX}px;top:${padY}px;width:${w}px;height:${h}px`;
markers.forEach((m,i)=>{const p=point(data.regions[i]);m.style.left=`${padX+p.x*scale}px`;m.style.top=`${padY+p.y*scale}px`;});
patchBoxes.forEach((box,i)=>{const r=data.regions[i],p=point(r),half=16000/data.exportResolutionM;box.style.cssText=`left:${padX+(p.x-half)*scale}px;top:${padY+(p.y-half)*scale}px;width:${half*2*scale}px;height:${half*2*scale}px`;});positionCameraPin();go(p||point(data.regions[region]));const pxPerKm=scale*1000/data.exportResolutionM;const km=pxPerKm*5>150?1:pxPerKm*10>150?5:10;$('satellite-scale-bar').style.width=`${pxPerKm*km}px`;$('satellite-scale-label').textContent=km+' km';$('satellite-zoom-in').disabled=zoom>=8;$('satellite-zoom-out').disabled=zoom<=.5;
}
function zoomTo(next,anchor){const p=anchor||center();zoom=Math.max(.5,Math.min(8,next));layout(p);}
function focusRegion(next,doFocus=true){region=next;document.querySelectorAll('.satellite-regions [data-site]').forEach(b=>{const selected=Number(b.dataset.site)===region;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});const r=data.regions[region];markers.forEach((m,i)=>{m.classList.toggle('active',i===region);m.setAttribute('aria-pressed',String(i===region));});$('satellite-coordinates').textContent=`${Math.abs(r.latitude).toFixed(2)}° S · ${Math.abs(r.longitude).toFixed(2)}° ${r.longitude<0?'W':'E'}`;if(doFocus){zoom=2;layout(point(r));}}
data.regions.forEach((r,i)=>{const m=document.createElement('button');m.className='satellite-pin';m.type='button';m.innerHTML=`<i>${String(i+1).padStart(2,'0')}</i><span>${r.name}</span>`;m.setAttribute('aria-label','Select '+r.name+' study center');m.addEventListener('click',()=>{if(picking){window.dispatchEvent(new CustomEvent('skyline:surface-enter',{detail:{x:r.centerX,y:r.centerY}}));return;}const select=$('site-select');select.value=i;select.dispatchEvent(new Event('change',{bubbles:true}));});$('satellite-markers').append(m);markers.push(m);});
$('satellite-zoom-in').addEventListener('click',()=>zoomTo(zoom*1.4));$('satellite-zoom-out').addEventListener('click',()=>zoomTo(zoom/1.4));$('satellite-reset').addEventListener('click',()=>{zoom=Math.min(viewport.clientWidth/data.width,viewport.clientHeight/data.height)/Math.max(viewport.clientWidth/data.width,viewport.clientHeight/data.height)*.95;layout({x:data.width/2,y:data.height/2});});
$('satellite-labels').addEventListener('change',e=>{$('satellite-markers').hidden=!e.target.checked;});
$('satellite-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{document.querySelector('.satellite-help').textContent='Fullscreen is unavailable here. Pan and zoom still work in the embedded map.';} });
// Touch uses native two-dimensional scrolling. Mouse drag supplements it.
viewport.addEventListener('pointerdown',e=>{mouseMoved=false;if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
viewport.addEventListener('pointermove',e=>{if(!drag)return;mouseMoved=mouseMoved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6;viewport.scrollLeft=drag.left-e.clientX+drag.x;viewport.scrollTop=drag.top-e.clientY+drag.y;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,()=>{drag=null;viewport.classList.remove('dragging');});
viewport.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;const b=viewport.getBoundingClientRect();const p={x:(viewport.scrollLeft+e.clientX-b.left-padX)/scale,y:(viewport.scrollTop+e.clientY-b.top-padY)/scale};zoomTo(zoom*1.6,p);});
viewport.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoomTo(zoom*Math.exp(-e.deltaY*.008));},{passive:false});
viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')$('satellite-reset').click();else zoomTo(zoom*(e.key==='-'?1/1.4:1.4));}else if(e.key.startsWith('Arrow')){e.preventDefault();viewport.scrollLeft+=e.key==='ArrowRight'?70:e.key==='ArrowLeft'?-70:0;viewport.scrollTop+=e.key==='ArrowDown'?70:e.key==='ArrowUp'?-70:0;}});
$('pick-surface').addEventListener('click',()=>{window.SkylineSurface?.setMode('satellite');setPicking(!picking);viewport.focus({preventScroll:true});});
viewport.addEventListener('click',e=>{if(!picking||mouseMoved||e.target.closest('button'))return;const b=viewport.getBoundingClientRect();const p={x:(viewport.scrollLeft+e.clientX-b.left-padX)/scale,y:(viewport.scrollTop+e.clientY-b.top-padY)/scale};const target=worldPoint(p);window.dispatchEvent(new CustomEvent('skyline:surface-enter',{detail:target}));});
window.addEventListener('skyline:surface-position',e=>{cameraPoint=e.detail;positionCameraPin();});
window.addEventListener('skyline:surface-opened',()=>setPicking(false));
window.SkylineMap={centerWorld:()=>worldPoint(center()),focusWorld:p=>{cameraPoint=p;zoom=2;layout(photoPoint(p));},setPicking};
function show(){requestAnimationFrame(()=>{if(!viewport.clientWidth)return;if(!initialized){initialized=true;focusRegion(region);}else layout(center());});}
const ro=new ResizeObserver(()=>{if(viewport.clientWidth&&viewport.clientHeight){const p=initialized?center():point(data.regions[region]);layout(p);}});ro.observe(viewport);
image.addEventListener('load',()=>{ready=true;shell.dataset.ready='true';$('satellite-error').hidden=true;show();});function imageError(){ready=false;$('satellite-error').hidden=false;shell.dataset.ready='false';}image.addEventListener('error',imageError);
window.addEventListener('skyline:tab',e=>{if(e.detail==='analyze')show();});window.addEventListener('skyline:scenario',()=>{const next=window.SkylineApp.getState().site;if(next!==region)focusRegion(next);});
window.SkylineViewer={getState:()=>({ready,region,mode:shell.dataset.mode||'satellite',zoom,source:data.name,center:center()}),render:show};
focusRegion(region,false);if(image.complete&&image.naturalWidth){ready=true;shell.dataset.ready='true';}else if(image.complete)imageError();if(!$('analyze').hidden)show();
})();
