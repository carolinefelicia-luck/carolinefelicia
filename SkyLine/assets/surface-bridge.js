const regionButtons=[...document.querySelectorAll(".satellite-regions button")];window.addEventListener("message",e=>{if(e.origin!==location.origin||e.data?.type!=="skyline-region")return;regionButtons[e.data.site]?.click();});for(const b of regionButtons)b.addEventListener("click",()=>parent.postMessage({type:"skyline-surface-region",site:Number(b.dataset.site)},location.origin));parent.postMessage({type:"skyline-surface-ready"},location.origin);
const reportHeight=()=>{const v=document.querySelector('.lunar-viewer-section');if(v)parent.postMessage({type:'skyline-viewer-height',height:Math.ceil(v.getBoundingClientRect().height)+12},location.origin);};new ResizeObserver(reportHeight).observe(document.querySelector('.lunar-viewer-section'));window.addEventListener('load',reportHeight);

// Keep the position map updated independently of the movement animation.
window.addEventListener('skyline:surface-position',()=>{const mini=document.querySelector('.surface-minimap');if(mini){mini.style.visibility='visible';mini.style.opacity='1';}});
document.querySelector('#surface-home').setAttribute('title','Return to the study center if you lose your bearings');
document.querySelector('#surface-back-map').setAttribute('title','Open the satellite map at your current position');
