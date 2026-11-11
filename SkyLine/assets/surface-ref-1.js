/* Synthetic teaching model. No ephemeris, DEM, operational orbit or mission prediction. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const regions=[
 {name:'Shackleton rim',phase:0,offset:.1,description:'A low Sun can clear one ridge while Earth remains hidden behind another.'},
 {name:'Connecting ridge',phase:.9,offset:-.3,description:'A changed horizon shifts the balance of light and communication in this teaching model.'},
 {name:'de Gerlache rim',phase:1.8,offset:.35,description:'A different reference region creates a different sequence of open and blocked windows.'}
];
function horizon(az,site,height=2){const p=regions[site].phase,a=az*Math.PI/180;return .35+regions[site].offset+.62*Math.sin(a*3+p)+.37*Math.cos(a*7-p)+.85*Math.exp(-Math.pow((az-220-p*17)/24,2))-height*.055;}
function sample(hour,config){const site=Number(config.site)||0,height=Number(config.height)||0,margin=Number(config.margin)||0,p=regions[site].phase;const date=Date.parse(config.date+'T00:00:00Z');const dateShift=Number.isFinite(date)?(date-Date.UTC(2026,10,14))/86400000:0;const t=hour/24+dateShift;
 const sunAz=((t/29.5*360+36+p*15)%360+360)%360;
 const sunEl=1.45*Math.sin(TAU*t/29.5+p*.3)+.2;
 const earthAz=180+7*Math.sin(TAU*t/27.2+p);
 const earthEl=3.4*Math.sin(TAU*t/27.2+p*.5)+regions[site].offset;
 const sun=sunEl>horizon(sunAz,site,height),direct=earthEl>horizon(earthAz,site,height)+margin;
 const relayA=Math.cos(TAU*hour/12+p)>.05&&Math.sin(TAU*hour/22+.7)>-.7;
 const relayB=Math.cos(TAU*(hour+6)/12+p)>.05&&Math.sin(TAU*(hour+6)/22+.7)>-.7;
 const route=Number(config.relay)||0;
 return {sunAz,sunEl,earthAz,earthEl,sun,direct,relayA,relayB,combined:direct||(route>=1&&relayA)||(route>=2&&relayB)};
}
function evaluate(config){const samples=Array.from({length:720},(_,i)=>sample(i,config));let run=0,longest=0,darkRun=0,longestDark=0;let sumSun=0,sumDirect=0,sumCombined=0;
 for(const s of samples){sumSun+=Number(s.sun);sumDirect+=Number(s.direct);sumCombined+=Number(s.combined);run=s.combined?0:run+1;longest=Math.max(longest,run);darkRun=s.sun?0:darkRun+1;longestDark=Math.max(longestDark,darkRun);}
 return {samples,sun:sumSun/720*100,direct:sumDirect/720*100,contact:sumCombined/720*100,gap:longest,dark:longestDark};}
const api={regions,horizon,sample,evaluate};root.SkylineModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
