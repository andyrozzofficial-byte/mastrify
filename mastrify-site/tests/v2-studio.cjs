/* v2 studio: vocabulary, measured demo analysis, free code, email (dist-v2). */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const frames=[Float32Array.from([-1,-.5,0,.5,1]),Float32Array.from([1,.5,0,-.5,-1])];
let ms=0;
class Decoder {async decodeAudioData(){return {numberOfChannels:2,length:5,sampleRate:48000,getChannelData:i=>frames[i]};}async close(){}}
const profile={loudness:-21.2,peakDb:-6,crest:15.2,range:0.8,movement:.05,accent:.27,width:.31,widthSpread:.1,bassShare:.74,midShare:.23,airShare:.02,bassSpread:.1,channels:2,frames:900};
const win={AudioContext:Decoder,MastrifyAudio:{getState:()=>({sources:{original:{profile}}})}};
const context={performance:{now:()=>ms},window:win,crypto:webcrypto,DOMException,AbortController,Blob,TextEncoder,setTimeout:(f,t)=>{if(t===180)ms+=t;return setTimeout(f,t===180?0:t);},clearTimeout};
vm.createContext(context);
for(const file of ['dist-v2/studio-copy.js','dist-v2/studio-service.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
(async()=>{
 const copy=win.MastrifyCopy,service=win.MastrifyService;
 assert.equal(copy.STYLES.length,5);assert.equal(copy.style('Open').tagline,'Wide & spacious');assert.equal(copy.style('Club').worksWellFor.join(','),'House,Techno,Festival,Dance');
 assert.equal(copy.target(-11).label,'Spotify Loud');assert.equal(copy.sliderHint('low',10),copy.SLIDERS.low.hints[0]);assert.equal(copy.sliderHint('low',90),copy.SLIDERS.low.hints[2]);
 assert.equal(copy.ISSUES.length,16);assert.equal(Object.keys(copy.TIPS).length,4);
 assert.equal(copy.masterName({style:'Club',target:-9,low:50}),'Adaptive Club Master');assert.equal(copy.masterName({style:'Warm',target:-14,low:20}),'Tight Low-End Master');
 const file={size:12,name:'Song.wav',arrayBuffer:async()=>new ArrayBuffer(1)},settings={style:'Club',target:-9,width:61,low:42,clarity:55};
 const result=await service.process({kind:'analyze',file,settings,signal:new AbortController().signal,onProgress(){}});
 const a=result.analysis;
 assert(a.measured);assert(a.readiness>=18&&a.readiness<=97);assert.equal(a.metrics.length,8);
 assert.equal(a.metrics[0].value,'Quiet');assert(a.metrics[0].detail.includes('21.2 LUFS'));assert.equal(a.metrics[1].value,'Consistent');
 assert.equal(a.insights.map(i=>i.title).join('|'),'Low output level|Low end muddy|Lacking brightness');assert.equal(a.insights[0].severity,'main');
 assert.equal(a.tips.title,'Low output level');assert.equal(a.tips.items.length,4);assert(a.summary.length>10);assert(a.highlights.length>=1);
 const master=await service.process({kind:'master',file,settings,previewWindow:{start:0,end:5/48000,duration:5/48000,sourceDuration:5/48000},signal:new AbortController().signal,onProgress(){}});
 assert.equal(master.masterName,'Adaptive Club Master');assert(master.tags.includes('Full lows'));assert.equal(master.loudnessNotes[0],'Adaptive loudness protection applied');
 assert.equal(master.comparison[0].after,'Club Optimized');assert.equal(master.comparison.length,5);
 await assert.rejects(service.checkout({resultId:master.id,discountCode:'BAD'}),/TEST50/);
 const free=await service.checkout({resultId:master.id,discountCode:'TESTFREE'});assert.equal(free.amount,0);assert.equal(free.free,true);assert.equal(free.charged,0);
 const half=await service.checkout({resultId:master.id,discountCode:'TEST50'});assert.equal(half.amount,4.5);
 await assert.rejects(service.email({resultId:master.id,email:'nope'}),/valid email/);
 const sent=await service.email({resultId:master.id,email:'linus@example.com'});assert.equal(sent.test,true);assert.equal(sent.to,'linus@example.com');
 console.log('PASS: v2 vocabulary, measured analysis, master naming, free code and test email.');
})().catch(e=>{console.error(e);process.exitCode=1;});
