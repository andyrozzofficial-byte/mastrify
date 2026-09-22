/* Integration boundary: replace window.MastrifyBackend before this script loads.
 * Only this adapter simulates analysis/mastering and payment. Files remain local. */
(() => {
 'use strict';
 const abort=()=>new DOMException('Operation cancelled','AbortError');
 const wait=(ms,signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(abort());
  const done=()=>{signal?.removeEventListener('abort',cancel);resolve();};
  const timer=setTimeout(done,ms),cancel=()=>{clearTimeout(timer);reject(abort());};
  signal?.addEventListener('abort',cancel,{once:true});
 });
 function uuid(){
  const source=typeof crypto!=='undefined'?crypto:null;
  if(source&&typeof source.randomUUID==='function')return source.randomUUID();
  const bytes=new Uint8Array(16);
  if(source&&typeof source.getRandomValues==='function')source.getRandomValues(bytes);
  else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 }
 /* v2: the demo reads the perceptual profile the browser measured
  * (audio-reactivity.js buildProfile) and speaks mastrify.com's vocabulary
  * (studio-copy.js). Still a demo: no audio is processed, and the numbers
  * are approximations shown with "≈". A real engine replaces this adapter. */
 const copy=()=>window.MastrifyCopy||null;
 const profileOf=()=>{try{return window.MastrifyAudio?.getState?.().sources?.original?.profile||null;}catch(_){return null;}};
 const fmt=v=>Number.isFinite(v)?(v<0?'−':'')+Math.abs(v).toFixed(1):'—';
 const lufs=v=>Number.isFinite(v)?`≈ ${fmt(v)} LUFS`:'—';
 const pctOf=v=>`${Math.round(Math.max(0,Math.min(1,v))*100)}%`;
 function normalise(profile){
  const p=profile||{};
  return {loudness:Number.isFinite(p.loudness)?p.loudness:-18,crest:Number.isFinite(p.crest)?p.crest:10,range:Number.isFinite(p.range)?p.range:8,
   width:Number.isFinite(p.width)?p.width:.4,widthSpread:Number(p.widthSpread)||0,bassShare:Number.isFinite(p.bassShare)?p.bassShare:.45,
   midShare:Number.isFinite(p.midShare)?p.midShare:.4,airShare:Number.isFinite(p.airShare)?p.airShare:.15,bassSpread:Number(p.bassSpread)||0,
   accent:Number(p.accent)||0,movement:Number(p.movement)||0,channels:Number(p.channels)||2,measured:!!profile};
 }
 function describe(p){
  const C=copy();
  const loud=p.loudness>-9?['Hot','Very little headroom is left; mastering will focus on tone and control rather than level.']:p.loudness>-14?['Release level','Already close to streaming level, so the master can stay transparent.']:p.loudness>-20?['Controlled','Headroom is healthy, with room to lift level in mastering without crushing dynamics.']:['Quiet','Plenty of headroom. The master can bring the whole song up without strain.'];
  const dyn=p.crest<7?['Dense','The level barely moves. A gentle touch keeps it from feeling flat.']:p.range<4?['Consistent','The level stays even across the arrangement, with transients intact.']:p.range<8?['Glued','Tight and consistent, with peaks under control.']:p.range<14?['Open','Big swings between loud and soft. A touch more glue could feel more release-ready.']:['Very open','Wide swings between sections. Some glue will help small speakers.'];
  const ste=p.channels<2?['Mono','A single channel. Width will not change in mastering.']:p.width<.18?['Narrow','The image sits close to the center; pads and effects could use more room.']:p.width<.3?['Focused','A tight, centered image with a little space at the sides.']:p.width<.5?['Balanced','A stable center with room at the sides.']:['Wide','The stereo field feels open and spacious, with good depth for streaming and clubs.'];
  const low=p.bassShare<.25?['Light','The foundation could carry more weight.']:p.bassShare<.72?['Balanced','Low end feels controlled and supportive, a solid anchor for the rest of the mix.']:['Heavy','The low end leads the mix; keep it controlled so it stays clean.'];
  const tone=p.airShare>.18?['Bright','Lots of top-end energy. Keep an eye on harshness.']:p.airShare<.025?['Dark','The top end is soft; a little air could open it up.']:p.bassShare>.6?['Warm','Weight below, gentle above. A little air could open the top end.']:['Even','Lows, mids and highs sit in a natural balance.'];
  const energy=(C?.ENERGY.levels||[]).find(l=>l.when(p))||{id:'Steady',text:'Energy feels even and controlled across the arrangement.',level:'Medium energy'};
  const pres=p.midShare<.2?['Soft','Vocals and leads sit slightly behind the mix.']:p.midShare<.5?['Clear','The lead elements have space to speak.']:['Forward','Mids lead the mix; detail is upfront.'];
  const high=p.airShare>.2?['Edgy','Top end could feel silkier and less edgy.']:p.airShare>.05?['Smooth','Keep the sheen gentle and natural.']:['Soft','Top end could use more air and presence.'];
  return [
   {label:'Loudness',value:loud[0],description:loud[1],detail:lufs(p.loudness)},
   {label:'Dynamics',value:dyn[0],description:dyn[1],detail:`${fmt(p.range)} dB range`},
   {label:'Stereo',value:ste[0],description:ste[1],detail:p.channels<2?'Mono':`${pctOf(p.width)} width`},
   {label:'Low end',value:low[0],description:low[1],detail:pctOf(p.bassShare)},
   {label:'Tone',value:tone[0],description:tone[1],detail:tone[0]},
   {label:'Energy',value:energy.id,description:energy.text,detail:energy.level,explanation:C?.ENERGY.description},
   {label:'Presence',value:pres[0],description:pres[1],detail:pres[0]},
   {label:'Highs',value:high[0],description:high[1],detail:high[0]}
  ];
 }
 function buildAnalysis(profile){
  const C=copy(),p=normalise(profile),metrics=describe(p);
  let issues=(C?.ISSUES||[]).filter(i=>{try{return i.when(p);}catch(_){return false;}});
  const seen=new Set();issues=issues.filter(i=>seen.has(i.metric)?false:(seen.add(i.metric),true)).sort((a,b)=>b.gain-a.gain).slice(0,4);
  const insights=issues.map((i,n)=>({title:i.title,subtitle:i.subtitle,text:i.advice,metric:i.metric,severity:n===0?'main':n===1?'medium':'low',gain:i.gain,tips:i.tips}));
  let readiness=92-issues.reduce((sum,i)=>sum+i.gain,0)-(p.loudness<-22?4:0);readiness=Math.max(18,Math.min(97,Math.round(readiness)));
  const tier=(C?.READINESS||[]).find(t=>readiness>=t.min)||{headline:'A strong foundation, with room for a final polish.',recommendation:'',focus:''};
  const good=metrics.filter(m=>['Release level','Controlled','Consistent','Glued','Open','Balanced','Wide','Even','Warm','Clear','Smooth','Punchy','Steady','Driven'].includes(m.value));
  const highlights=[];
  for(const m of good){
   if(m.label==='Stereo')highlights.push('Stereo width feels open enough for a modern, release-ready master.');
   else if(m.label==='Dynamics')highlights.push(m.value==='Open'?'Dynamics have room to breathe. Light bus glue can make the drop hit harder.':'Dynamics are consistent and controlled.');
   else if(m.label==='Loudness')highlights.push(`Integrated loudness sits around ${fmt(p.loudness)} LUFS, a solid starting point for mastering.`);
   else if(m.label==='Low end')highlights.push('The low end is controlled and supportive.');
   else if(m.label==='Tone')highlights.push('Tonal balance is even across lows, mids and highs.');
   if(highlights.length>=3)break;
  }
  if(!highlights.length)highlights.push(`Integrated loudness sits around ${fmt(p.loudness)} LUFS.`);
  const tipKey=(insights.find(i=>i.tips)||{}).tips,tips=tipKey&&C?C.TIPS[tipKey]:null;
  return {readiness,summary:tier.headline,recommendation:tier.recommendation,focus:tier.focus,highlights,metrics,insights,tips,measured:p.measured,profile:p};
 }
 function buildComparison(settings,profile){
  const C=copy(),p=normalise(profile),m=describe(p),by=label=>m.find(x=>x.label===label)||{};
  const target=Number(settings.target),wide=Number(settings.width)>60,tight=Number(settings.low)<=40,bright=Number(settings.clarity)>60;
  // pos: where original and master sit on each row's scale (0 to 1), for the
  // before/after bar. Illustrative in the demo; the engine replaces these.
  const u=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
  const rangeAfter=p.range<4?p.range:Math.max(3.5,p.range-(target>=-11?2.5:1.2));
  return [
   {label:'Loudness',family:'level',before:lufs(p.loudness),after:C?C.target(target).profile:`${target} LUFS`,afterDetail:`≈ ${fmt(target)} LUFS target`,pos:{before:u((p.loudness+26)/20),after:u((target+26)/20)}},
   {label:'Dynamics',family:'level',before:by('Dynamics').value,beforeDetail:by('Dynamics').detail,after:p.range<4?'Preserved':'Punch preserved',afterDetail:p.range<4?'Minimal touch':`≈ ${fmt(rangeAfter)} dB`,pos:{before:u(p.range/20),after:u(rangeAfter/20)}},
   {label:'Stereo image',family:'space',before:by('Stereo').value,beforeDetail:by('Stereo').detail,after:p.channels<2?'Mono':wide?'Open & spacious':'Focused',pos:{before:u(p.channels<2?0:p.width),after:u(p.channels<2?0:wide?p.width+.18:Math.max(.3,p.width))}},
   {label:'Low end',family:'space',before:by('Low end').value,after:tight?'Tight low-end':settings.style==='Club'?'Full lows':'Grounded',pos:{before:u(p.bassShare),after:u(tight?p.bassShare*.85:settings.style==='Club'?p.bassShare+.1:p.bassShare+.03)}},
   {label:'Presence',family:'drive',before:by('Presence').value,after:bright?'Clear':'Natural detail',pos:{before:u(p.midShare/.7),after:u((bright?p.midShare+.08:p.midShare+.03)/.7)}}
  ];
 }
 const demo={
  mode:'demo',
  async process({kind,file,settings,previewWindow,signal,onProgress}){
   if(!file?.size)throw new Error('Choose an audio file first.');
   if(kind==='master'&&(!previewWindow||!(previewWindow.duration>0)||previewWindow.duration>40||!Number.isFinite(previewWindow.start)))throw new Error('Choose a valid preview first.');
   // Prepare during the existing demo, not after the results transition. Only
   // an actual <=40s media asset is ever handed to the Master audition player.
   const previewJob=kind==='master'?(previewWindow.start===0&&previewWindow.end===previewWindow.sourceDuration
    ?Promise.resolve({audio:file}):window.MastrifyFiles.wav(file,{signal,start:previewWindow.start,duration:previewWindow.duration}).then(audio=>({audio}),error=>({error}))):null;
   const C=copy();
   const phases=(C?.PHASES[kind==='analyze'?'analyze':'master']||[]).map(x=>x[0]);
   if(!phases.length)phases.push(...(kind==='analyze'?['Reading dynamics','Mapping stereo field','Listening to tonal balance','Evaluating loudness','Tracing transient energy','Building your mix portrait']:['Listening to your mix','Balancing tone','Shaping dynamics','Refining stereo space','Finishing your master']));
   const started=performance.now();
   for(;;){
    if(signal?.aborted)throw abort();
    const progress=Math.min(1,(performance.now()-started)/36000);
    onProgress?.({progress,phase:phases[Math.min(phases.length-1,Math.floor(progress*phases.length))]});
    if(signal?.aborted)throw abort();
    if(progress>=1)break;
    await wait(180,signal);
   }
   const clip=previewJob?await previewJob:null;if(clip?.error)throw clip.error;if(signal?.aborted)throw abort();
   const profile=profileOf();
   return {id:uuid(),kind,demo:true,createdAt:new Date().toISOString(),name:file.name,
    preview:clip?{audio:clip.audio,sourceStart:previewWindow.start,duration:previewWindow.duration,sourceDuration:previewWindow.sourceDuration,cueTime:previewWindow.cueTime,method:previewWindow.method}:null,
    comparison:kind==='master'?buildComparison(settings,profile):null,
    masterName:kind==='master'&&C?C.masterName(settings):null,
    tags:kind==='master'&&C?C.masterTags(settings,normalise(profile)):[],
    loudnessNotes:kind==='master'&&C?C.loudnessNotes(settings,normalise(profile)):[],
    settings:{...settings},analysis:buildAnalysis(profile),
    // Passthrough is deliberate and identified in the player and export UI.
    audio:kind==='master'?file:null};
  },
  // The price for the dialog. Test codes: TEST50 (50 %), TESTFREE (free).
  async quote({resultId,discountCode,signal}){
   if(!resultId)throw new Error('Finish a master before checkout.');
   const code=String(discountCode||'').trim().toUpperCase();
   await wait(250,signal);
   if(code&&code!=='TEST50'&&code!=='TESTFREE')throw new Error((copy()?.STRINGS.invalidCode||'Invalid discount code.')+' Try TEST50 or TESTFREE.');
   const amount=code==='TESTFREE'?0:code==='TEST50'?4.5:9;
   return {amount,currency:'USD',free:amount===0,code,label:code==='TESTFREE'?'Free test code applied · $0.00':code==='TEST50'?'Test discount applied · 50% off':''};
  },
  // The demo never redirects: it resolves with the receipt at once.
  async checkout({resultId,discountCode,signal}){
   if(!resultId)throw new Error('Finish a master before checkout.');
   const code=String(discountCode||'').trim().toUpperCase();
   if(code&&code!=='TEST50'&&code!=='TESTFREE')throw new Error((copy()?.STRINGS.invalidCode||'Invalid discount code.')+' Use TEST50 for a 50% test discount, or TESTFREE for a free test export.');
   await wait(500,signal);
   const amount=code==='TESTFREE'?0:code==='TEST50'?4.5:9;
   return {id:'TEST-'+uuid().slice(0,8).toUpperCase(),resultId,test:true,amount,currency:'USD',charged:0,free:amount===0,code};
  },
  // Test mode: nothing is sent. A real backend emails the secure download link.
  async email({resultId,email,signal}){
   if(!resultId)throw new Error('Finish a master first.');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email||'').trim()))throw new Error('Enter a valid email address.');
   await wait(600,signal);
   return {sent:true,test:true,to:String(email).trim()};
  }
 };
 // The demo engine stays reachable, so backend.mock.js can pretend to be live.
 window.MastrifyDemo=demo;
 window.MastrifyService=window.MastrifyBackend||demo;
 window.MastrifySession={file:null,revision:0,settings:{style:'Balanced',target:-14,width:50,low:50,clarity:50},results:{analyze:null,master:null},receipt:null,
  replace(file){this.file=file;this.revision++;this.results={analyze:null,master:null};this.receipt=null;},
  reset(){this.replace(null);Object.assign(this.settings,{style:'Balanced',target:-14,width:50,low:50,clarity:50});}
 };
 // A small IndexedDB pocket for the round trip to a hosted payment page:
 // the master result and the original file survive the redirect.
 const pocket={
  open(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined')return reject(new Error('No storage'));const req=indexedDB.open('mastrify-pocket',1);req.onupgradeneeded=()=>{req.result.createObjectStore('items');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Storage failed'));});},
  async run(mode,fn){const db=await this.open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('items',mode),store=tx.objectStore('items'),req=fn(store);tx.oncomplete=()=>resolve(req&&req.result);tx.onerror=()=>reject(tx.error||new Error('Storage failed'));tx.onabort=()=>reject(tx.error||new Error('Storage failed'));});}finally{db.close();}}
 };
 const REPORT_PDF='/report-pdf.js?v=20260921-pdf2';let reportScript=null;
 const LITTLE_ENDIAN=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
 window.MastrifyFiles={
  stash(key,value){return pocket.run('readwrite',store=>store.put(value,key));},
  async unstash(key,{remove=false}={}){const value=await pocket.run('readonly',store=>store.get(key));if(remove)await pocket.run('readwrite',store=>store.delete(key));return value;},
  save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);},
  async wav(file,{signal,start=0,duration=Infinity}={}){
   const Context=window.AudioContext||window.webkitAudioContext,ctx=new Context();
   try{
    const buffer=await ctx.decodeAudioData(await file.arrayBuffer());
    if(signal?.aborted)throw abort();
    const channels=Math.min(2,buffer.numberOfChannels),first=Math.max(0,Math.min(buffer.length,Math.round(start*buffer.sampleRate)));
    const length=Math.max(0,Math.min(buffer.length-first,Math.floor(duration*buffer.sampleRate))),size=length*channels*2;
    if(!length)throw new Error('The selected preview contains no audio.');
    const data=new ArrayBuffer(44+size),view=new DataView(data);
    const str=(pos,s)=>{for(let i=0;i<s.length;i++)view.setUint8(pos+i,s.charCodeAt(i));};
    str(0,'RIFF');view.setUint32(4,36+size,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,size,true);
    const pcm=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
    if(LITTLE_ENDIAN){
     // Same samples as the DataView loop below, written straight into an
     // Int16Array: about a hundred times faster. Four seconds per slice.
     const out=new Int16Array(data,44,length*channels),step=buffer.sampleRate*4;
     for(let from=0;from<length;from+=step){
      if(signal?.aborted)throw abort();
      const to=Math.min(length,from+step);
      for(let c=0;c<channels;c++){const src=pcm[c];for(let i=from,o=from*channels+c;i<to;i++,o+=channels){const v=src[first+i],x=v<-1?-1:v>1?1:v;out[o]=Math.round(x*(x<0?32768:32767));}}
      await wait(0,signal);
     }
    }else{
     let offset=44;
     for(let from=0;from<length;from+=32768){
      if(signal?.aborted)throw abort();
      for(let i=from;i<Math.min(length,from+32768);i++)for(let c=0;c<channels;c++){
       const sample=Math.max(-1,Math.min(1,pcm[c][first+i]));view.setInt16(offset,Math.round(sample*(sample<0?32768:32767)),true);offset+=2;
      }
      await wait(0,signal);
     }
    }
    return new Blob([data],{type:'audio/wav'});
   }finally{await ctx.close();}
  },
  // The designed PDF lives in report-pdf.js and loads the first time someone
  // asks for a report. If it cannot load or draw, the plain one below is used.
  async report(result,options={}){
   try{
    if(!window.MastrifyReportPdf){
     reportScript=reportScript||new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=window.MastrifyAssetURLs?.reportPdf||REPORT_PDF;s.async=true;s.onload=resolve;s.onerror=()=>{reportScript=null;reject(new Error('The report layout could not load.'));};document.head.appendChild(s);});
     await reportScript;
    }
    return await window.MastrifyReportPdf.build(result,options);
   }catch(error){console.warn('[Mastrify] Plain report used:',error);return this.plainReport(result);}
  },
  plainReport(result){
   const safe=s=>String(s).replace(/−/g,'-').normalize('NFKD').replace(/[^\x20-\x7e]/g,' ').replace(/[\\()]/g,'\\$&');
   const lines=[['MASTRIFY',24],['MIX ANALYSIS',12],[result.name,16],[result.demo?'DEMO REPORT - illustrative data, not measurements of this track.':'Mix analysis report',10],['',10],[`Release readiness: ${result.analysis.readiness}%`,20],[result.analysis.summary,11],['',10],...result.analysis.metrics.flatMap(m=>[[`${m.label}: ${m.value} | ${m.detail}`,12],[m.description,10],['',6]]),['DETAILS TO EXPLORE',13],...result.analysis.insights.flatMap(i=>[[i.title,11],[i.text,10],['',6]])];
   let y=796,stream='0.08 0.06 0.14 rg\n';
   for(const [s,size] of lines){const words=String(s).split(' ');let line='';const wrapped=[];for(const word of words){if((line+' '+word).length>84){wrapped.push(line);line=word;}else line+=(line?' ':'')+word;}wrapped.push(line);for(const row of wrapped){stream+=`BT /F1 ${size} Tf 48 ${y} Td (${safe(row)}) Tj ET\n`;y-=size+7;}}
   const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`];
   let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
   return new Blob([pdf],{type:'application/pdf'});
  }
 };
})();
