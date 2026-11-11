export const PROJECT_KEY = 'skyline-lifecycle-v1';
export const OBJECTIVES = [
  { id:'geology', title:'Human Geological Exploration', detail:'Historical reference: Apollo 15.' },
  { id:'polar', title:'South Polar Technology & Surface Science', detail:'Historical reference: IM-1 Odysseus.' },
  { id:'robotic', title:'Long-Duration Robotic Surface Science', detail:'Historical reference: Blue Ghost Mission 1.' }
];

export function createProject() {
  return {
    version:1, name:'Custom mission', description:'', template:null, objective:'geology', durationHours:168,
    constraints:{minSunPercent:70,maxDarkHours:12,minEarthPercent:60,sunlight:true,earthView:true,safeHaven:false},
    priority:'balanced',
    candidates:[0,1], customPoints:[null,null], start:'2026-11-14T00:00', end:'2026-11-21T00:00', sampleHours:1,
    selected:'a', notes:{brief:'',site:'',plan:'',review:'',debrief:''}, shortlist:'Both candidates',
    stations:[{id:'s1',name:'Science station 01',lat:-89.2,lon:0},{id:'s2',name:'Science station 02',lat:-88.8,lon:-40}],
    activities:[{id:'drive',name:'Traverse to station',start:0,duration:4,after:''},{id:'science',name:'Instrument survey',start:4,duration:2,after:'drive'}],
    training:{events:[],arrivalDelayHours:0,scheduleDelayHours:0,started:false}, landing:'Nominal commissioning',
    review:null, screening:null, dirty:true, savedAt:null
  };
}

export function normalizeProject(project) {
  const base=createProject();
  if(!project || project.version!==1) return base;
  if (!OBJECTIVES.some(item=>item.id===project.objective)) project.objective='geology';
  const training={...base.training,...project.training};
  training.started=Boolean(training.started||training.events?.length);
  const constraints={...base.constraints,...project.constraints};
  for(const [key,max] of [['minSunPercent',100],['maxDarkHours',672],['minEarthPercent',100]]) {
    const value=Number(constraints[key]);
    constraints[key]=constraints[key]===null || constraints[key]==='' || !Number.isFinite(value) ? base.constraints[key] : Math.max(0,Math.min(max,value));
  }
  if(!['balanced','solar','comms'].includes(project.priority)) project.priority='balanced';
  return {...base,...project, priority:project.priority, constraints, notes:{...base.notes,...project.notes}, training, stations:Array.isArray(project.stations)?project.stations:base.stations, activities:Array.isArray(project.activities)?project.activities:base.activities};
}

export function invalidateSiteStudy(project, changes={}) {
  return {...project,...changes,screening:null,review:null,dirty:true};
}

export function resetTraining(project) {
  const base=createProject();
  return {...project,activities:base.activities,training:base.training,start:base.start,end:base.end,landing:base.landing,screening:null,review:null,dirty:true};
}

export function buildReport(project, advice=[]) {
  const screening=project.screening;
  const result=screening?.candidates?.map(c=>`${c.letter}: ${c.name} | Sun ${c.sun.percent.toFixed(1)}% visible, longest gap ${c.sun.longest.toFixed(1)} h | Earth ${c.earth.percent.toFixed(1)}% visible, longest gap ${c.earth.longest.toFixed(1)} h`).join('\n');
  return `SKYLINE / MISSION BRIEF\n${project.name}${project.description?`\n${project.description}`:''}\n\nStudy window: ${project.start} to ${project.end} UTC\nDuration: ${project.durationHours} h\nMission constraints: Sun visibility ≥${project.constraints.minSunPercent}%; maximum continuous darkness ≤${project.constraints.maxDarkHours} h; direct Earth visibility ≥${project.constraints.minEarthPercent}%\nPriority: ${project.priority}\n\nRESULT — ${screening?.origin ?? 'Unavailable'}\n${result || project.unavailableReason || 'Results unavailable or need reassessment.'}\n\nRECOMMENDATION — LOCAL RULES\n${advice.map(item=>`- ${item}`).join('\n') || 'No recommendation available.'}\n\nVerify terrain and hazards, power and storage, thermal limits, and communications coverage and link budget. Visibility screening does not establish system feasibility.`;
}
