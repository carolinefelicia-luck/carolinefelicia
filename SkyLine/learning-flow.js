// Appended into the main module so the guide and existing simulation share state.
let journeyStep=1,freeExploration=false;
const journeyCopy={
 student:[['Choose one investigation.','Read its question. Choose one thing to change and decide what should stay the same.'],['Predict, then try.','Write a prediction before using the model. Keep your investigation’s variable in mind; the orbit controls are a separate experiment.'],['Collect two observations.','Save the first moment, change one thing, then compare. Capture both observations to use as evidence.'],['Explain using your evidence.','Describe what you changed, what happened, and whether it supported your prediction. Download your investigation.']],
};
function setJourneyStep(step,scroll=false){journeyStep=Math.max(1,Math.min(4,step));const copy=journeyCopy.student[journeyStep-1];$('#journey-role').textContent='YOUR INVESTIGATION · PREDICT, TEST, EXPLAIN';$('#journey-current-title').textContent=journeyStep+'. '+copy[0];$('#journey-current-copy').textContent=copy[1];$('#journey-continue').textContent=['Go to the activities ↗','Go to the 3D model ↗','Go to the comparison ↗','Go to my field notes ↗'][journeyStep-1];for(const b of $$('[data-learning-step]')){const n=+b.dataset.learningStep;b.classList.toggle('active',n===journeyStep);b.classList.toggle('complete',n<journeyStep);b.setAttribute('aria-current',n===journeyStep?'step':'false');}if(scroll){if(journeyStep===4){$('#fieldnotes').hidden=false;$('#discovery-invitation').hidden=true;}$('#'+['experiment','understand-simulation','horizon-section','fieldnotes'][journeyStep-1]).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}}
for(const b of $$('[data-learning-step]'))b.onclick=()=>setJourneyStep(+b.dataset.learningStep,true);
$('#journey-continue').onclick=()=>setJourneyStep(journeyStep,true);
$('#prediction-station').hidden=false;
for(const b of $$('[data-lesson]'))b.onclick=()=>{freeExploration=false;setLesson(+b.dataset.lesson);observer={x:0,z:3};update();$('#activity-summary').textContent='Selected: '+lessons[lesson].title;setJourneyStep(2,true);};
$('#choose-free').onclick=()=>{freeExploration=true;$('#activity-summary').textContent='Selected: free orbit exploration';for(const b of $$('[data-lesson]'))b.classList.remove('active');setCamera('system',true);setJourneyStep(2,true);};
$('#start-test').onclick=()=>{if(!$('#prediction').value.trim()){toast('Write what you think will happen first.');$('#prediction').focus();return;}stage(1);setCamera('landscape');$('#scene').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});toast('Prediction saved. Try one change in the model.');};
$('#capture-moment').onclick=()=>{$('#capture').click();setJourneyStep(3);};
$('#journey-notes').onclick=()=>setJourneyStep(4,true);
$('#invitation-notes').onclick=()=>setJourneyStep(4,true);
$('#record-discovery').onclick=()=>setJourneyStep(4,true);
// Walking belongs to the geographic viewer in Explore. Here the observer stays fixed.
$('#scene').onkeydown=previousSceneKeys;
$('#orbit-play').textContent='▶ Run spacecraft';
setJourneyStep(1);
