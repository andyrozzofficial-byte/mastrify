/* One continuous presentation clock. Service updates are targets, never frame positions.
 *
 * Demo: a fixed clock (duration seconds), exactly as before.
 * Live engine (setProgress was called): the bar is paced, so it neither
 * jumps nor freezes. Two limits, and the bar follows the lower one:
 *   - the engine: the last progress it reported. The bar never passes it.
 *   - a steady schedule over the time the job is expected to take, so a
 *     report of 90% after one second does not throw the bar to 90%.
 * The expected time comes, in order, from the engine's own eta (seconds
 * remaining, optional), from earlier runs in this browser (per kind, scaled
 * by track length), from MastrifyConfig.processingSeconds, or from the
 * duration passed to enter(). Rising reports adjust it to the engine's own
 * speed, but never below half of it. Past about 85% of the expected time the
 * schedule slows down smoothly instead of stopping, so a slow engine still
 * shows movement. finish() glides the last stretch to 100% in under half a
 * second, then the result opens.
 *
 * Work after the engine (a master's A/B audition is prepared in the browser
 * once the engine is done) is part of the bar: its usual length is learned
 * per kind (DEFAULT_AFTER until then), the engine's share of the bar is
 * scaled down to leave room for it, and engineDone() lets the bar carry on
 * through it, so it never waits at 100%. The demo clock does the same. */
(function(root){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
 const now=()=>typeof root.performance?.now==='function'?root.performance.now():Date.now();
 const HISTORY_KEY='mastrify-processing-times',HISTORY_LENGTH=5;
 const DEFAULT_AFTER={master:2,analyze:0};
 const DEFAULT_MINIMUM={analyze:15};
 // An engine that only says "started" and "finished" would leave the bar
 // standing still. After this many seconds without a rising report, the bar
 // is paced by the clock instead, up to QUIET_CEILING.
 const QUIET_AFTER=4,QUIET_CEILING=.95;
 let active=false,elapsed=0,duration=36,progress=0,target=0,demo=true,loop=true,generation=0,startedAt=0;
 let kind=null,goal=null,character=null;
 let finishing=false,etaTotal=null,expectedHint=null,lastReport=null,pairTotal=null;
 let after=0,engineAt=null,clock=0,minimum=0;

 function readHistory(){try{const list=JSON.parse(root.localStorage?.getItem(HISTORY_KEY)||'[]');return Array.isArray(list)?list:[];}catch(_){return [];}}
 function writeHistory(list){try{root.localStorage?.setItem(HISTORY_KEY,JSON.stringify(list.slice(-HISTORY_LENGTH*4)));}catch(_){}}
 const median=values=>{const v=values.filter(Number.isFinite).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};
 function audioSeconds(){const o=root.MastrifyAudio?.getState?.()?.sources?.original;return o?.loaded&&Number.isFinite(o.duration)&&o.duration>0?o.duration:null;}
 function learnedAfter(){
  const runs=readHistory().filter(r=>r&&r.kind===kind&&Number.isFinite(r.after)&&r.after>=0).slice(-HISTORY_LENGTH);
  const learned=median(runs.map(r=>r.after));
  return Math.min(20,learned??DEFAULT_AFTER[kind]??0);
 }
 function learnedSeconds(){
  const runs=readHistory().filter(r=>r&&r.kind===kind&&Number.isFinite(r.seconds)&&r.seconds>0).slice(-HISTORY_LENGTH);
  if(!runs.length)return null;
  const track=audioSeconds(),perSecond=median(runs.filter(r=>r.audio>0).map(r=>r.seconds/r.audio));
  return track&&perSecond?perSecond*track:median(runs.map(r=>r.seconds));
 }
 function expectedSeconds(){
  const floor=kind==='analyze'?minimum:0;
  if(Number.isFinite(etaTotal)&&etaTotal>0)return Math.max(2,floor,etaTotal+after);
  const configured=root.MastrifyConfig?.processingSeconds?.[kind];
  const base=learnedSeconds()??(Number.isFinite(configured)&&configured>0?configured:null)??expectedHint??duration;
  // an engine that reports slowly tells us the job is longer than we thought
  const lowerBound=target>.04?elapsed/target:0;
  // two rising reports show the engine's own speed; trust it down to half
  // the expected time (an engine that front-loads its numbers stays paced)
  const paced=Number.isFinite(pairTotal)?Math.max(pairTotal+after,base*.5):base;
  return Math.max(2,floor,paced,lowerBound);
 }
 // Where a steady bar would be after `elapsed` of `total` seconds.
 function schedule(total){const s=elapsed/total;return s<.85?s:.85+.14*(1-Math.exp(-(s-.85)/.35));}
 // The engine's share of the bar; the rest is the work after it.
 function engineShare(){return after>0?Math.max(.75,Math.min(1,1-after/expectedSeconds())):1;}
 // Demo with work after the engine: linear, then a soft approach to 99%.
 const demoCurve=s=>s<.97?s:.97+.02*(1-Math.exp(-(s-.97)/.03));

 function enter(options={}){active=true;elapsed=0;progress=target=0;finishing=false;etaTotal=null;lastReport=null;pairTotal=null;kind=options.kind==='analyze'||options.kind==='master'?options.kind:null;goal=Number.isFinite(options.goal)?options.goal:null;character=typeof options.character==='string'&&options.character?options.character:null;demo=options.demo!==false;loop=options.loop!==false;startedAt=now();duration=Number.isFinite(options.duration)?Math.max(1,options.duration):36;expectedHint=Number.isFinite(options.expected)&&options.expected>0?options.expected:null;engineAt=null;clock=0;after=kind&&!loop?learnedAfter():0;const floor=kind==='analyze'?root.MastrifyConfig?.minimumSeconds?.analyze:null;minimum=kind==='analyze'&&!loop?(Number.isFinite(floor)&&floor>=0?floor:DEFAULT_MINIMUM.analyze||0):0;generation++;}
 function leave(){active=false;finishing=false;}
 function advance(seconds){
  if(!active||!Number.isFinite(seconds)||seconds<=0)return;
  if(demo&&!finishing&&!after){elapsed=loop?(elapsed+seconds)%(duration+1.2):Math.min(duration,Math.max(elapsed+seconds,(now()-startedAt)/1000));progress=Math.min(1,elapsed/duration);return;}
  if(demo&&!finishing){
   // the demo engine takes `duration`; the bar spans it plus the work after
   const span=duration+after;clock=Math.max(clock+seconds,(now()-startedAt)/1000);elapsed=Math.min(span,clock);
   const aim=Math.min(engineAt===null?duration/span:1,demoCurve(clock/span));
   if(aim>progress)progress+=(aim-progress)*(1-Math.exp(-seconds/.35));return;
  }
  elapsed=Math.max(elapsed+seconds,(now()-startedAt)/1000);
  if(demo)elapsed=Math.min(duration+after,elapsed);  // the demo's reading position ends with the track
  if(finishing){progress=Math.min(1,progress+Math.max(seconds*2.4,(1-progress)*(1-Math.exp(-seconds/.1))));return;}
  const quiet=kind==='analyze'&&root.MastrifyConfig?.pacedWhenQuiet!==false&&(!lastReport||(now()-startedAt)/1000-lastReport.t>QUIET_AFTER);
  // analyze quiet with no reports: pace toward QUIET_CEILING. Once the engine
  // has reported, the bar still never passes it (same rule as master).
  const ceiling=quiet&&!lastReport?Math.max(target,QUIET_CEILING):target;
  const aim=Math.min(ceiling,schedule(expectedSeconds()));
  if(aim>progress)progress+=(aim-progress)*(1-Math.exp(-seconds/.35));
 }
 // value: 0..1 from the engine. options.eta: seconds the engine still needs (optional).
 function setProgress(value,options={}){
  if(!Number.isFinite(value))throw new TypeError('Progress must be finite.');
  active=true;demo=false;const t=Math.max(0,(now()-startedAt)/1000),v=clamp(value);
  if(v>(lastReport?lastReport.p:0)){
   if(lastReport&&t>lastReport.t){const estimate=t+(1-v)*(t-lastReport.t)/(v-lastReport.p);pairTotal=Number.isFinite(pairTotal)?pairTotal*.5+estimate*.5:estimate;}
   lastReport={t,p:v};
  }
  const eta=Number(options&&options.eta);
  if(Number.isFinite(eta)&&eta>=0)etaTotal=t+eta;
  if(engineAt===null)target=Math.max(target,v*engineShare());
 }
 // The engine is done; what follows (the master's audition) is the rest of
 // the bar. Without work after the engine this changes nothing.
 function engineDone(){
  if(!active||engineAt!==null)return;
  engineAt=Math.max(0,(now()-startedAt)/1000);
  if(after>0&&!demo)target=Math.max(target,.99);
 }
 // Seconds still to wait before the screen has been shown for `minimum`.
 function holdSeconds(){
  if(kind!=='analyze'||!active||finishing||!minimum)return 0;
  return Math.max(0,minimum-(now()-startedAt)/1000);
 }
 function finish(){
  loop=false;
  if(demo&&!after){progress=target=1;elapsed=duration;return;}
  // remember how long a real job took, so the next bar is paced to it, and
  // how long the work after the engine took (the demo's too: that is real)
  if(active&&!finishing&&kind){
   const total=(now()-startedAt)/1000,took=engineAt===null?undefined:Math.round(Math.max(0,total-engineAt)*100)/100;
   if(!demo&&elapsed>.5||took!==undefined){const list=readHistory();list.push({kind,seconds:demo?undefined:Math.round(elapsed*10)/10,audio:audioSeconds(),after:took});writeHistory(list);}
  }
  target=1;finishing=true;
 }
 function getState(){const original=root.MastrifyAudio?.getState()?.sources?.original;const sourceDuration=original?.loaded?original.duration:180;return {active,progress,elapsed,duration,sourceTime:progress*sourceDuration,sourceDuration,complete:progress>=1,demo,generation,hasSource:!!original?.loaded,speed:sourceDuration/(demo?duration+after:duration),kind,goal,character};}
 root.MastrifyProcessing=Object.freeze({enter,leave,advance,setProgress,engineDone,holdSeconds,finish,getState});
})(typeof window!=='undefined'?window:globalThis);
