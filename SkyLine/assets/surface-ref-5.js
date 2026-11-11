/* NASA-data prototype: separate from SkylineModel, the synthetic teaching lab. */
(function(root){'use strict';
const D=root.SkylineScienceData,epoch=Date.parse(D.start),HOUR=3600000;
function horizon(az,site){const h=D.regions[site].horizon,a=((az%360)+360)%360/D.horizonAzimuthStepDeg,i=Math.floor(a),t=a-i;return h[i%h.length]*(1-t)+h[(i+1)%h.length]*t;}
function startIndex(date){const i=(Date.parse(date+'T00:00:00Z')-epoch)/HOUR;if(!Number.isInteger(i)||i<0||i+720>=D.regions[0].angles.length)throw Error('Choose a start date from 1 Nov 2026 through 2 Jan 2027.');return i;}
function sample(site,index,margin=0){const r=D.regions[site],v=r.angles[index];if(!v)throw Error('Outside the precomputed data interval');const sunH=horizon(v[0],site),earthH=horizon(v[2],site);return{index,utc:new Date(epoch+index*HOUR).toISOString(),sunAz:v[0],sunEl:v[1],earthAz:v[2],earthEl:v[3],sunH,earthH,sunClearance:v[1]-sunH,earthClearance:v[3]-earthH,sun:v[1]>sunH+margin,earth:v[3]>earthH+margin};}
function evaluate(site,date,margin=0){const start=startIndex(date),samples=Array.from({length:721},(_,i)=>sample(site,start+i,margin));let sun=0,earth=0,gap=0,maxGap=0,dark=0,maxDark=0;for(const s of samples.slice(0,720)){sun+=s.sun;earth+=s.earth;gap=s.earth?0:gap+1;dark=s.sun?0:dark+1;maxGap=Math.max(maxGap,gap);maxDark=Math.max(maxDark,dark);}return{site,date,margin,start,samples,sun:sun/720*100,earth:earth/720*100,maxGap,maxDark};}
function transition(samples,at,key){const current=samples[at][key];for(let j=at+1;j<samples.length;j++)if(samples[j][key]!==current)return{type:current?'set':'rise',earliestHours:j-at-1,latestHours:j-at,from:samples[j-1].utc,to:samples[j].utc};return{type:current?'no-set':'no-rise',remainingHours:samples.length-1-at};}
const api={data:D,horizon,startIndex,sample,evaluate,transition};root.SkylineScience=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
