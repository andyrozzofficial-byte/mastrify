/* v2 processing clock (dist-v2): demo clock unchanged; a live engine's bar is
 * paced (never past the engine, no jump to a front-loaded report, keeps
 * moving), eta and learned run times set the pace, finish glides to 100%. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../dist-v2/assets/engine/processing-flow.js','utf8');
function load(){let t=0;const store={};const context={performance:{now:()=>t},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);}},MastrifyConfig:{processingSeconds:{analyze:30,master:45}},MastrifyAudio:{getState:()=>({sources:{original:{loaded:true,duration:180}}})}};
 context.window=context;vm.createContext(context);vm.runInContext(src,context);
 return {clock:context.MastrifyProcessing,tick:(s,step=1/60)=>{const clock=context.MastrifyProcessing;for(let i=0;i<Math.round(s/step);i++){t+=step*1000;clock.advance(step);}},store};}

// demo: unchanged 36 s clock
{const {clock,tick}=load();clock.enter({demo:true,duration:36,loop:false});let last=0;
 for(let i=0;i<2160;i++){tick(1/60);const p=clock.getState().progress;assert(p>last&&p-last<.00047);last=p;}
 assert(Math.abs(last-1)<1e-9);clock.finish();assert.equal(clock.getState().progress,1);}

// front-loaded engine (the mastrify.com case): 90% after 1 s, done after 25 s
{const {clock,tick}=load();clock.enter({demo:false,kind:'analyze',duration:36});
 tick(1);clock.setProgress(.9);let last=clock.getState().progress,still=0,maxStill=0;
 for(let s=0;s<24;s+=.1){tick(.1);const p=clock.getState().progress;assert(p>=last-1e-12);assert(p<=.9+1e-12);if(p-last<1e-4){still+=.1;maxStill=Math.max(maxStill,still);}else still=0;last=p;}
 const at5=null;assert(last<.9,'the bar paces instead of sitting on 90%');assert(maxStill<.6,'never freezes for long: '+maxStill);
 clock.finish();tick(.5);assert.equal(clock.getState().progress,1);}

// the bar never passes the engine, and stale reports never pull it back
{const {clock,tick}=load();clock.enter({demo:false,kind:'analyze'});clock.setProgress(.2);tick(40);
 assert(Math.abs(clock.getState().progress-.2)<1e-3);clock.setProgress(.1);tick(1);assert(clock.getState().progress>=.199);}

// eta from the engine sets the pace: 10 s job, halfway at 5 s
{const {clock,tick}=load();clock.enter({demo:false,kind:'analyze'});clock.setProgress(.95,{eta:10});tick(5);
 const p=clock.getState().progress;assert(p>.4&&p<.55,'eta pace '+p);}

// learning: a finished 12 s run paces the next one to about 12 s
{const {clock,tick,store}=load();clock.enter({demo:false,kind:'master'});clock.setProgress(.99);tick(12);clock.finish();tick(1);
 assert(JSON.parse(store['mastrify-processing-times']).length===1);
 clock.enter({demo:false,kind:'master'});clock.setProgress(.99);tick(6);const p=clock.getState().progress;assert(p>.4&&p<.56,'learned pace '+p);}

// an engine that never reports stays at 0, then finish glides to 100% in under half a second
{const {clock,tick}=load();clock.enter({demo:false,kind:'analyze'});clock.setProgress(0);tick(8);assert.equal(clock.getState().progress,0);
 clock.finish();tick(.45);assert.equal(clock.getState().progress,1);}
// a fast, evenly reporting engine (the old test case): 11 s job, reports up to 95% at 9 s
{const {clock,tick}=load();clock.enter({demo:false,kind:'analyze'});
 const plan=[[.5,.05],[2,.30],[2.2,.35],[6,.60],[9,.95]];let t=0;
 for(const [at,p] of plan){tick(at-t);t=at;clock.setProgress(p);}tick(2);const p=clock.getState().progress;
 assert(p>.55&&p<=.95,'follows a fast engine '+p);clock.finish();tick(.3);assert.equal(clock.getState().progress,1);}
// work after the engine is part of the bar (a master's audition): demo master
{const {clock,tick,store}=load();clock.enter({demo:true,duration:36,loop:false,kind:'master'});let last=0,maxStep=0;
 for(let i=0;i<36*60;i++){tick(1/60);const p=clock.getState().progress;assert(p>=last);maxStep=Math.max(maxStep,p-last);last=p;}
 assert(last>.92&&last<.96,'engine part of a demo master ends near 36/38: '+last);
 tick(1);assert(clock.getState().progress<=36/38+1e-9,'waits for the engine before the after part');last=clock.getState().progress;
 clock.engineDone();for(let i=0;i<120;i++){tick(1/60);const p=clock.getState().progress;assert(p>=last);maxStep=Math.max(maxStep,p-last);last=p;}
 assert(last>.95&&last<.99,'keeps moving through the after part: '+last);
 tick(6);const held=clock.getState().progress;assert(held<.991,'never waits at 100%: '+held);assert(maxStep<.0015,'smooth: '+maxStep);
 assert(clock.getState().elapsed<=38+1e-9,'reading position ends with the track');
 clock.finish();tick(.45);assert.equal(clock.getState().progress,1);assert(clock.getState().elapsed<=38+1e-9);
 const runs=JSON.parse(store['mastrify-processing-times']);assert(runs.length===1&&runs[0].after>7&&runs[0].seconds===undefined,'the demo records only the after part');
 // learned: the next demo master leaves room for about 8 s after the engine
 clock.enter({demo:true,duration:36,loop:false,kind:'master'});tick(36);const p=clock.getState().progress;assert(Math.abs(p-36/(36+runs[0].after))<.01,'learned after part '+p);}

// live master with eta: the engine's share leaves room, the bar carries on after it
{const {clock,tick}=load();clock.enter({demo:false,kind:'master',loop:false});let t=0,last=0;
 for(;t<8;t+=.5){clock.setProgress(Math.min(.99,t<1?.9*t:.9+.09*(t-1)/7),{eta:8-t});tick(.5);const p=clock.getState().progress;assert(p>=last);last=p;}
 assert(last<.82,'engine part leaves room for the audition: '+last);
 clock.engineDone();for(let i=0;i<20;i++){tick(.1);const p=clock.getState().progress;assert(p>=last);last=p;}
 assert(last>.8&&last<.99,'moves on through the audition: '+last);
 clock.finish();tick(.45);assert.equal(clock.getState().progress,1);}

// analysis: nothing after the engine, engineDone changes nothing
{const {clock,tick}=load();clock.enter({demo:true,duration:36,loop:false,kind:'analyze'});tick(36);assert(Math.abs(clock.getState().progress-1)<1e-9);
 clock.engineDone();clock.finish();assert.equal(clock.getState().progress,1);}
console.log('PASS: demo clock, paced live bar (never past the engine, no jump, no freeze), eta and learned pace, finish glide, the audition after the engine inside the bar.');
