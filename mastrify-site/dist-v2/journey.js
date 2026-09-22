/* The studio owns its steps; the shared LP and waveform follow this state. */
window.createMastrifyJourney=function(host){
 'use strict';
 const $=id=>document.getElementById(id),el=host.container,audio=MastrifyAudio,session=MastrifySession,service=MastrifyService,COPY=window.MastrifyCopy,STR=COPY?COPY.STRINGS:{};
 const events=new AbortController(),isAnalysis=host.page==='analyze',kind=host.page;
 const on=(node,event,fn)=>node?.addEventListener(event,fn,{signal:events.signal});
 const put=(id,value)=>{const n=$(id);if(n&&n.textContent!==String(value))n.textContent=String(value);};
 const phaseRows=COPY?COPY.PHASES[isAnalysis?'analyze':'master']:null;
 const checkSteps=phaseRows?phaseRows.map(r=>r[0]):kind==='analyze'?['Reading dynamics','Mapping stereo field','Listening to tonal balance','Evaluating loudness','Tracing transient energy','Building your mix portrait']:['Listening to your mix','Balancing tone','Shaping dynamics','Refining stereo space','Finishing your master'];
 const checkDetails=phaseRows?phaseRows.map(r=>r[1]):[];
 let checkedCount=-1,lastControls='';
 // Processing stage proposals (?process=ring|chain|console) live in process-views.js.
 const processView=()=>window.MastrifyProcessViews?.[new URLSearchParams(location.search).get('process')||'meters']||null;
 const processCtx=()=>({kind:isAnalysis?'Analysis':'Mastering',steps:checkSteps,details:checkDetails,hint:service.mode==='demo'?'Engine demo · about 36 seconds':(STR.processingHint||'Keep this page open')});
 const metricNotes={Loudness:'Loudness describes how strong the whole song feels over time. Leave room for the loudest moments so the final level can rise without losing their impact.',Dynamics:'Dynamics are the space between quiet detail and strong peaks. Keeping that contrast helps drums, accents and phrasing feel alive.',Stereo:'The stereo field places sounds between the left and right speakers. A grounded centre and open sides can give the mix width without losing focus in mono.', 'Low end':'Kick and bass share the foundation. A controlled low end gives both room to speak and keeps heavier sections from overwhelming the rest of the song.',Tone:'Tonal balance is the relationship between lows, mids and highs. Small broad changes can add openness while keeping the character of the original mix.',Energy:'Energy follows how the arrangement builds and relaxes. A steady foundation lets choruses and transitions make their own impact.',Presence:'Presence helps vocals and lead instruments feel close and easy to follow. The aim is definition with enough space around the other parts.',Highs:'The top end holds air, cymbal detail and brightness. A smooth finish keeps that sparkle while avoiding sharp edges.'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
 let step='upload',emptyState=false,job=null,disposed=false,result=session.results[kind],exportBlob=null,exportResultId=null,exportJob=null,exportBusy=false,checkoutBusy=false,checkoutJob=null;
 const settings=session.settings;
 const styleIcons=[['Balanced','Natural and versatile','M4 12v8m5-13v18m5-22v26m5-20v14'],['Warm','Soft, intimate and smooth','M3 23c0-14 18-14 18 0M7 23c0-8 10-8 10 0M12 2v4M2 7l3 3m17-3-3 3'],['Punchy','Upfront with a firm attack','m14 2-11 16h8l-1 12 11-18h-8Z'],['Club','Weight and impact','M4 24h16M6 19V11m6 8V4m6 15V8'],['Open','Wide, lifted and airy','M3 12V4h8m2 0h8v8M3 20v8h8m2 0h8v-8M3 4l7 8m11-8-7 8M3 28l7-8m11 8-7-8']];
 const styles=styleIcons.map(([name,description,path])=>[name,COPY?COPY.style(name).tagline:description,path]);
 const styleGenres=name=>COPY?'Works well for: '+COPY.style(name).worksWellFor.join(', '):'';
 const goals=COPY?COPY.TARGETS.map(t=>[t.value,t.label]):[[-14,'Streaming'],[-13,'Balanced lift'],[-11,'Loud'],[-9,'Club']];
 const goalHint=value=>COPY?COPY.target(value).description:'More negative = more room for dynamics.';
 // A real minus sign in front of LUFS values.
 const minus=v=>String(v).replace(/^-/,'\u2212');
 const sliderLabel=key=>COPY?COPY.SLIDERS[key].short:({width:'Stereo width',low:'Low end',clarity:'Clarity'})[key];
 const sliderHint=(key,value)=>COPY?COPY.sliderHint(key,value):'';
 const heading=document.createElement('h1');heading.id='flow-title';heading.className='sr-only';
 $('brain').after(heading);
 const compare=document.createElement('div');compare.id='compare-controls';compare.className='compare-controls';compare.hidden=true;
 compare.innerHTML='<div class="ab-switch" role="group" aria-label="Listen and compare"><button id="compare-original" data-slot="original" aria-pressed="true">▷ Original</button><button id="compare-master" data-slot="master" aria-pressed="false">▷ Master</button></div><span id="ab-note"></span>';
 $('track-stage').before(compare);
 el.innerHTML=`<div id="upload-stage" class="flow-surface"><ol class="upload-steps" aria-label="${isAnalysis?'Analysis':'Mastering'} steps"><li><button id="step-upload" type="button" aria-current="step"><span class="step-number">1</span><span>Upload</span></button></li><li><button id="step-settings" type="button" disabled><span class="step-number">2</span><span>${isAnalysis?'Analyze':'Settings'}</span></button></li><li><button id="step-master" type="button" disabled><span class="step-number">3</span><span>${isAnalysis?'Results':'Master'}</span></button></li></ol><section class="upload-source" data-drop="original"><label class="upload-button file-label"><span class="upload-orbit" aria-hidden="true"><img src="/assets/logo.svg" alt=""></span><span class="upload-copy"><strong id="upload-title">${isAnalysis?'Add your track':'Add your mix'}</strong><span id="upload-hint">Choose a file or drop it here</span><small>WAV · AIFF · FLAC · MP3 · M4A</small></span><span class="upload-plus" aria-hidden="true">+</span><input type="file" id="original-file" accept="${STR.acceptList||'audio/*,.wav,.aiff,.aif,.flac,.mp3'}" aria-label="Choose original audio file"></label><div class="loaded-track" id="loaded-track" hidden><span class="loaded-check" aria-hidden="true">✓</span><div><output id="original-name"></output><small id="source-meta"></small></div><button id="original-clear" class="plain-action">Remove</button></div></section><div class="flow-actions"><button id="continue-flow" class="button primary" hidden>${isAnalysis?'<span class="analyze-signal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 10v4m4-7v10m5-13v16m5-13v10m4-7v4"/></svg></span>':''}<span class="cta-label">${isAnalysis?'Analyze my mix':'Shape my master'}</span><span class="cta-arrow">↗</span></button><button id="analyze-first" class="plain-action" hidden>Analyze first</button><button id="sample-flow" class="plain-action">Try a sample track ↗</button></div><ul id="upload-promises" class="upload-promises${isAnalysis?' promises-long':''}">${isAnalysis?'<li>Understand loudness, width, and tone with engineer-level clarity</li><li>Know exactly what to fix in the mix, and what is already working</li><li>Flow straight into mastering the moment your material is ready</li>':'<li>Perceptual processing tuned to your mix, not a one-size chain</li><li>Style and loudness goals you control before the final render</li><li>The same cinematic engine that powers processing and results</li>'}</ul><p class="flow-caption">Audio stays on this device · Up to 100 MiB / 20 min</p></div>
<section id="settings-stage" class="flow-surface settings-surface" hidden><div class="settings-file"><button id="back-upload" class="plain-action">← Change track</button><span id="settings-file-name"></span></div><fieldset class="compact-styles"><legend>01 <span>Choose a character</span><button type="button" class="info-button" data-guide="character" aria-label="About character and loudness">i</button></legend><div class="character-grid">${styles.map(([name,description,path])=>`<label class="style-option character"><input type="radio" name="master-style" value="${name}" ${settings.style===name?'checked':''}><svg viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg><strong>${name}</strong></label>`).join('')}</div><p id="style-description" class="control-hint" aria-live="polite">${styles.find(s=>s[0]===settings.style)[1]}</p><p id="style-genres" class="control-hint style-genres">${styleGenres(settings.style)}</p></fieldset><fieldset class="compact-target"><legend>02 <span>Set the loudness</span><small>LUFS</small></legend><div class="loudness-grid">${goals.map(([value,label])=>`<label class="target-choice"><input type="radio" name="loudness-target" value="${value}" ${settings.target===value?'checked':''}><strong>${minus(value)}</strong><span>${label}</span></label>`).join('')}</div><p id="target-hint" class="control-hint" aria-live="polite">${goalHint(settings.target)}</p></fieldset><div class="tune-heading"><span>Fine-tune your sound</span><span class="tune-flag" id="tune-summary">Optional</span><button type="button" class="info-button" data-guide="tune" aria-label="About fine-tuning your sound">i</button></div><div class="fine-tune"><div class="tune-grid">${['width','low','clarity'].map(key=>{const label=sliderLabel(key);return `<label><span>${label}</span><output id="${key}-value">${settings[key]}%</output><input id="${key}-setting" type="range" min="0" max="100" value="${settings[key]}" aria-label="${label}"><small id="${key}-hint" class="slider-hint">${sliderHint(key,settings[key])}</small></label>`;}).join('')}</div></div><div class="settings-submit"><span>Listen before you export.</span><button id="start-mastering" class="button primary">Create my master <span>↗</span></button></div></section>
${(()=>{const pv=processView();if(!pv)return `<section id="processing-stage" class="flow-surface processing-surface" hidden><div class="job-status"><span class="job-dot"></span><strong>THE MASTRIFY TOUCH</strong><output id="job-percent">0%</output></div><div class="job-rail" role="progressbar" aria-label="\${isAnalysis?'Analysis':'Mastering'} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="job-fill"></i></div><ol class="job-checklist">\${checkSteps.map((label,i)=>\`<li data-check="\${i}" data-state="waiting"><span class="check-orbit" aria-hidden="true"><svg class="check-charge" viewBox="0 0 24 24"><defs><linearGradient id="\${kind}-charge-\${i}" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0" stop-color="#b999ff"/><stop offset=".5" stop-color="#8dbfff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><circle cx="12" cy="12" r="10" pathLength="1" stroke="url(#\${kind}-charge-\${i})"/></svg><svg class="check-mark" viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg><i></i></span><span>\${label}</span><small class="check-status">Waiting</small></li>\`).join('')}</ol><p id="job-phase" class="sr-only" role="status">Listening to your mix</p><div class="job-bottom"><span>\${service.mode==='demo'?'Engine demo · about 36 seconds':(STR.processingHint||'Keep this page open')}</span><button id="cancel-flow" class="plain-action">Cancel</button></div></section>`;return pv.markup(processCtx()).replace('<section id="processing-stage" class="flow-surface processing-surface pv','<section hidden id="processing-stage" class="flow-surface processing-surface pv');})()}
<section id="result-stage" hidden></section><p id="studio-error" class="studio-error" role="alert"></p>
<dialog id="guide-dialog" class="guide-dialog checkout-dialog" aria-labelledby="guide-title"><button id="close-guide" class="dialog-close icon-button" aria-label="Close sound guide">×</button><span class="eyebrow" id="guide-eyebrow">A LITTLE GUIDANCE</span><h2 id="guide-title"></h2><div id="guide-content"></div><button id="guide-done" class="button primary">Got it</button></dialog>
<dialog id="checkout-dialog" class="checkout-dialog" aria-labelledby="checkout-title"><button id="close-checkout" class="dialog-close icon-button" aria-label="Close checkout">×</button><span class="demo-chip">${service.mode==='demo'?'TEST CHECKOUT':'SECURE CHECKOUT'}</span><h2 id="checkout-title">Your next release.</h2><p id="checkout-track"></p><div class="checkout-total"><span>WAV export</span><strong id="checkout-price">${service.mode==='demo'?'$9.00':'…'}</strong></div><details class="code-disclosure"><summary>${service.mode==='demo'?'Have a test discount code?':'Have a discount code?'}</summary><div class="discount"><input id="discount-code" aria-label="Discount code" placeholder="${service.mode==='demo'?'TEST50':'Code'}" autocomplete="off"><button id="apply-code" class="button small">Apply</button></div><p id="discount-status" role="status"></p></details><p class="checkout-note">${service.mode==='demo'?'No card needed. You will not be charged.<br>The demo WAV contains your original, unprocessed audio.':'Secure payment. Your full-quality WAV and a download link by email, ready right after.'}</p><button id="confirm-checkout" class="button primary">${service.mode==='demo'?'Complete test checkout ↗':'Complete checkout ↗'}</button><p id="checkout-error" role="alert"></p></dialog>
<dialog id="email-dialog" class="checkout-dialog email-dialog" aria-labelledby="email-title" closedby="none"><span class="demo-chip">${service.mode==='demo'?'TEST MODE':'YOUR MASTER'}</span><h2 id="email-title">Payment complete.</h2><p id="email-lead">${esc((STR.paymentComplete||'Payment complete. Enter your email to receive your mastered track and secure download link.').replace(/^Payment complete\.\s*/,''))}</p><label class="contact-field"><span class="contact-label">Email</span><input id="email-address" type="email" autocomplete="email" inputmode="email" maxlength="160" placeholder="you@example.com"></label><div class="email-actions"><button id="email-send" class="button primary">${esc(STR.emailMaster||'Email my master')}</button></div><p id="email-status" role="status"></p></dialog>`;

 function stageTitle(s){return s==='upload'?(isAnalysis?'Hear what your mix needs.':'Make it release ready.'):s==='settings'?'Shape your sound.':s==='processing'?(isAnalysis?'Inside your mix.':'Finding the finish.'):isAnalysis?'Your mix, understood.':'Your master, ready to explore.';}
 function show(next,{scroll=false}={}){
  const scrollTop=scroll?$('experience').offsetTop:0;
  if(next!=='results'||isAnalysis)audio.clearPreviewWindow();
  if(next!=='results')emptyState=false;
  step=next;document.body.dataset.step=next;
  for(const name of ['upload','settings','processing','result'])$(name+'-stage').hidden=name!==(next==='results'?'result':next);
  heading.textContent=stageTitle(next);
  $('brain').hidden=false;compare.hidden=next!=='results'||emptyState;$('compare-master').hidden=isAnalysis;
  $('page-content').hidden=true;
  syncScene();host.refresh();
  if(scroll)window.scrollTo({top:scrollTop,behavior:'instant'});
 }
 function syncScene(){
  const hidden=(node,value)=>{if(node.hidden!==value)node.hidden=value;};
  const visible=(step==='processing'||step==='results')&&!emptyState;hidden($('track-stage'),!visible);
  hidden($('transport'),step!=='results'||!audio.getState().loaded);hidden($('processing-line'),true);
  hidden($('level-match').closest('label'),isAnalysis);
 }
 function cancel(){job?.abort();job=null;exportJob?.abort();exportJob=null;checkoutJob?.abort();checkoutJob=null;audio.pause();MastrifyProcessing.leave();}
 function readSettings(){return {...settings};}
 // Load a master result's preview into the A/B player. Shared by start()
 // and the return from a hosted payment page.
 function cutOriginal(file,w,signal){
  return window.MastrifyFiles.wav(file,{signal,start:w.start,duration:w.duration}).then(audio=>({audio,start:w.start,duration:w.duration}),error=>({error}));
 }
 async function adoptMaster(value,file,signal,originalCut=null){
  const preview=value.preview;
  if(!preview?.audio||!Number.isFinite(preview.sourceStart)||preview.sourceStart<0||!(preview.duration>0)||preview.duration>40||!Number.isFinite(preview.sourceDuration)||preview.sourceStart+preview.duration>preview.sourceDuration+.01)
   throw new Error('The master preview is not available yet. Try again.');
  if(value.demo&&preview.audio===file&&preview.sourceStart===0&&preview.sourceDuration<=40)await audio.duplicateOriginal(file,{signal});
  else{
   await audio.load(preview.audio,'master',{signal,sourceOffset:preview.sourceStart});
   // Original spelas i förhandslyssningen från en lika kort WAV av samma
   // bit som Master, så att ljudet och bilden går i takt (audio-reactivity.js
   // useClip). I demon är förhandsklippet just originalets bit.
   // the clip cut during processing, when the engine kept the suggested window
   const early=originalCut?await originalCut:null;
   const originalClip=value.demo?preview.audio:early?.audio&&early.start===preview.sourceStart&&early.duration===preview.duration?early.audio:await window.MastrifyFiles.wav(file,{signal,start:preview.sourceStart,duration:preview.duration});
   await audio.useClip('original',originalClip,preview.sourceStart,{signal});
  }
  const clipDuration=audio.getState().sources.master.duration;
  if(clipDuration>40.01||Math.abs(clipDuration-preview.duration)>.1){audio.clear('master');throw new Error('The master preview must be a short audio clip.');}
  await host.preparePreview(preview);
 }
 // Back from a hosted payment page: restore the master and the original
 // from the stash, ask the backend to verify the payment, show the result.
 async function resumeAfterCheckout(){
  const stash=await MastrifyFiles.unstash('checkout-return').catch(()=>null);
  const params=new URLSearchParams(location.search),returnKey=(window.MastrifyConfig&&window.MastrifyConfig.checkoutReturnParam)||'session_id';
  if(!stash||stash.kind!==kind||!(params.has(returnKey)||params.has('checkout')))return false;
  if(typeof service.verify!=='function'||!stash.file||!stash.result)return false;
  await MastrifyFiles.unstash('checkout-return',{remove:true}).catch(()=>{});
  const query=Object.fromEntries(params.entries());
  history.replaceState(null,'',location.pathname+'?step=results');
  await host.loadFile(stash.file,'original');
  if(disposed||!session.file)return false;
  Object.assign(settings,stash.settings||{});
  const controller=new AbortController();job=controller;
  try{
   const restored={...stash.result,sourceRevision:session.revision,settings:{...(stash.result.settings||settings)}};
   await adoptMaster(restored,session.file,controller.signal);
   if(disposed||controller.signal.aborted)return false;
   result=restored;session.results[kind]=result;job=null;
   renderResults();show('results');await host.setMode('master');syncScene();
   // cancelled on the payment page (cancel_url ...?checkout=cancelled): the master is back, nothing to verify
   if(/^cancel/i.test(params.get('checkout')||'')){$('export-status').textContent=STR.checkoutCancelled||'Checkout cancelled. Your master is still here.';return true;}
   try{const receipt=await service.verify({resultId:result.id,query,signal:events.signal});session.receipt=receipt;
    $('checkout-open').textContent='Download WAV ↓';$('export-status').textContent=receipt.free?'Free export unlocked · your WAV is ready.':'Your WAV is ready.';openEmail();}
   catch(error){if(error.name!=='AbortError'){$('export-status').textContent=error.message||(STR.verifyFailed||'Could not verify payment.');host.report(error);}}
   return true;
  }catch(error){job=null;if(error.name!=='AbortError')host.report(error);return false;}
 }
 async function start(){
  if(host.isLoading()||!session.file||job)return;
  cancel();const controller=new AbortController();job=controller;
  const revision=session.revision,snapshot=readSettings(),file=session.file;
  result=null;session.results[kind]=null;if(!isAnalysis)session.receipt=null;exportBlob=null;
  if(!isAnalysis)audio.clear('master');
  $('studio-error').textContent='';checkedCount=-1;show('processing',{scroll:true});
  try{
   await host.setMode('active');if(controller.signal.aborted)return;
   MastrifyProcessing.enter({demo:service.mode==='demo',duration:36,loop:false,kind,goal:settings.target,character:settings.style});updateProgress(0);
   const previewWindow=isAnalysis?null:{...audio.suggestPreview(),sourceDuration:audio.getState().sources.original.duration};
   // A live master: cut the original's audition clip while the engine works
   // (the demo service does the same), so less is left for after it.
   const originalCut=previewWindow&&service.mode!=='demo'?cutOriginal(file,previewWindow,controller.signal):null;
   const value=await service.process({kind,file,settings:snapshot,previewWindow,signal:controller.signal,onProgress({progress,phase,eta}){
    if(disposed||controller.signal.aborted||revision!==session.revision)return;
    if(service.mode!=='demo'){MastrifyProcessing.setProgress(Math.min(.99,Math.max(0,Number(progress)||0)),{eta});put('job-phase',phase);}
   }});
   if(disposed||controller.signal.aborted||revision!==session.revision)return;
   MastrifyProcessing.engineDone();
   if(!isAnalysis)await adoptMaster(value,file,controller.signal,originalCut);
   if(disposed||controller.signal.aborted||revision!==session.revision)return;
   MastrifyProcessing.finish();updateProgress(MastrifyProcessing.getState().progress);
   await new Promise((resolve,reject)=>{const timer=setTimeout(done,650);function done(){controller.signal.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));}controller.signal.addEventListener('abort',stop,{once:true});});
   if(disposed||controller.signal.aborted||revision!==session.revision)return;
   result={...value,sourceRevision:revision,settings:snapshot};session.results[kind]=result;job=null;
   renderResults();show('results');await host.setMode(isAnalysis?'original':'master');syncScene();
  }catch(error){
   if(error.name==='AbortError'||disposed)return;
   job=null;await host.setMode('idle');show(isAnalysis?'upload':'settings');host.report(error);
  }
 }
 function updateProgress(p){
  p=Math.max(0,Math.min(1,p));const count=Math.min(checkSteps.length,Math.floor(p*checkSteps.length));
  const pv=processView();if(pv){const st=pv.update(processCtx(),p);if(count!==checkedCount){checkedCount=count;put('job-phase',st.label);}return;}
  put('job-percent',Math.round(p*100)+'%');$('job-fill').style.transform=`scaleX(${p})`;
  $('job-fill').parentElement.setAttribute('aria-valuenow',Math.round(p*100));
  const charging=el.querySelector(`[data-check="${count}"]`);if(charging)charging.style.setProperty('--charge',(p*checkSteps.length-count).toFixed(4));
  if(count===checkedCount)return;checkedCount=count;
  $('processing-stage').style.setProperty('--completion',count/checkSteps.length);
  el.querySelectorAll('[data-check]').forEach((row,i)=>{const state=i<count?'done':i===count?'active':'waiting';if(row.dataset.state!==state){row.dataset.state=state;if(state!=='active')row.style.setProperty('--charge',state==='done'?'1':'0');row.querySelector('.check-status').textContent=state==='done'?'Complete':state==='active'?(checkDetails[i]||'Listening'):'Waiting';}});
  put('job-phase',count===checkSteps.length?'Every detail, connected.':checkSteps[count]);
 }
 function closeReportCards(restoreFocus=false,metricsOnly=false){el.querySelectorAll(metricsOnly?'.metric-toggle[aria-expanded=true]':'.metric-toggle[aria-expanded=true],.insight-toggle[aria-expanded=true]').forEach(button=>{const panel=$(button.getAttribute('aria-controls'));if(restoreFocus&&panel.contains(document.activeElement))button.focus({preventScroll:true});button.setAttribute('aria-expanded','false');panel.inert=true;});}
 on(document,'click',event=>{if(!event.target.closest('.metric-card,.sound-insight'))closeReportCards();});
 on(document,'keydown',event=>{if(event.key==='Escape')closeReportCards(true);});
 const metricViews={
  Loudness:['Overall level','<path d="M5 17v-4m7 4V7m7 10V4M3 20h18"/>'],
  Dynamics:['Punch & contrast','<path d="M2 12h3l2-7 4 14 3-12 3 10 2-5h3"/>'],
  Stereo:['Left-to-right space','<path d="M10 12H3M7 8l-4 4 4 4M14 12h7M17 8l4 4-4 4"/>'],
  'Low end':['Bass foundation','<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'],
  Tone:['Tonal colour','<path d="M5 3v7m0 4v7M12 3v3m0 4v11M19 3v11m0 4v3"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>'],
  Energy:['Drive & movement','<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>'],
  Presence:['Voice & detail','<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8"/>'],
  Highs:['Air & brightness','<path d="M3 9c3-4 6-4 9 0s6 4 9 0M3 16c3-4 6-4 9 0s6 4 9 0"/>']
 };
 function metricIcon(label){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(metricViews[label]||metricViews.Presence)[1]}</svg>`;}
 // Varje mätvärde har en av karaktärernas fem färger. Nyckeln sätts på
 // omslaget som data-tone, så CSS kan måla ikonen utan att känna till texten.
 // metricKey normaliserar också "Stereo image", som annars faller tillbaka på
 // Presence-ikonen i mätkorten.
 const metricTones={Loudness:'neutral',Dynamics:'coral',Stereo:'blue','Low end':'violet',Presence:'amber',Tone:'amber',Energy:'coral',Highs:'blue'};
 function metricKey(label){return label==='Stereo image'?'Stereo':label;}
 function soundMark(label,kind){const key=metricKey(label);return `<span class="${kind}" data-tone="${metricTones[key]||'neutral'}">${metricIcon(key)}</span>`;}
 function metricMarkup(m,i){
  const cue=(metricViews[m.label]||['Sound character'])[0];
  return `<article class="metric-card"><button class="metric-toggle" aria-expanded="false" aria-controls="metric-detail-${i}"><span class="metric-top">${soundMark(m.label,'sound-icon')}<span class="metric-label">${esc(m.label)}</span></span><strong>${esc(m.value)}</strong><small class="metric-cue">${esc(cue)}</small>${m.detail?`<small class="metric-readout">${esc(m.detail)}</small>`:''}<i aria-hidden="true">+</i></button><div class="metric-reveal" id="metric-detail-${i}" inert><div><div class="metric-reading"><span>${result.demo?(result.analysis?.measured?'MEASURED · APPROX.':'EXAMPLE PROFILE'):'SOUND PROFILE'}</span><strong>${esc(m.detail)}</strong></div><p>${esc(m.description)}</p><div class="metric-meaning"><span>WHAT IT DESCRIBES</span><p class="metric-explanation">${esc(m.explanation||metricNotes[m.label]||cue)}</p></div></div></div></article>`;
 }
 // Every issue's illustration lives in issue-sketches.js.
 const insightViews=window.MastrifyIssueSketches?.views||{};
 function insightMarkup(insight,n){
  const view=window.MastrifyIssueSketches?.find(insight)||insightViews[insight.title],label=insight.metric||view?.label||'Mix detail';
  const readiness=Number(result?.analysis?.readiness)||0;
  return `<article class="sound-insight"><button class="insight-toggle" aria-expanded="false" aria-controls="insight-detail-${n}">${soundMark(label,'sound-icon')}<span class="insight-copy"><span class="insight-category"><i class="insight-dot" data-severity="${esc(insight.severity||'low')}" aria-hidden="true"></i>${insight.severity==='main'?'<b class="insight-flag">MAIN ISSUE</b>':''}${esc(label)}</span><strong>${esc(insight.title)}</strong>${insight.subtitle?`<small class="insight-subtitle">${esc(insight.subtitle)}</small>`:''}${Number.isFinite(Number(insight.gain))?`<small class="insight-lift">Readiness ${Math.round(readiness)}% <b>→</b> ${Math.round(Math.min(100,readiness+Number(insight.gain)))}%</small>`:''}</span>${Number.isFinite(Number(insight.gain))?`<span class="insight-gain">+${Math.round(Number(insight.gain))}%</span>`:''}<i aria-hidden="true">+</i></button><div class="insight-reveal" id="insight-detail-${n}" inert><div>${view?`<figure class="sound-sketch" data-sketch="${view.kind}"><span>ILLUSTRATION · HOW IT WORKS</span><svg viewBox="0 0 300 150" role="img" aria-labelledby="sketch-title-${n}"><title id="sketch-title-${n}">${esc(view.description)}</title><defs><linearGradient id="sketch-colour-${n}"><stop stop-color="#b789ff"/><stop offset=".55" stop-color="#91c9ff"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="sketch-wash-${n}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a97cf6" stop-opacity=".26"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></linearGradient></defs><g style="--sketch-colour:url(#sketch-colour-${n});--sketch-wash:url(#sketch-wash-${n})">${view.drawing}</g></svg><figcaption>${esc(view.caption)}</figcaption></figure>`:''}<div class="insight-advice"><span class="advice-label">TRY THIS</span><p>${esc(insight.text)}</p>${view?`<div class="listening-cue"><span class="guide-dot" aria-hidden="true"></span><p>${esc(view.listen)}</p></div>`:''}</div></div></div></article>`;
 }
 /* Rubrikblocket över resultatkorten, byggt som analysens kort: rubriken
    till vänster, samma upphöjda ratt till höger och detaljerna under.
    Allt här räknas fram ur det vi redan har i sessionen: vald karaktär,
    valt loudnessmål, bredden och filnamnet. Inget är påhittat och ingen
    artist finns att visa, den uppgiften får vi inte från filen. */
 const loudnessProfiles={'-14':['Adaptive Streaming Master','Level tuned for streaming platforms, with headroom kept.'],'-13':['Adaptive Balanced Master','A measured lift that keeps the mix breathing.'],'-11':['Adaptive Loud Master','Loudness pushed forward while transients stay intact.'],'-9':['Adaptive Club Master','Built for big rooms, with weight and level up front.']};
 const characterMarks={Balanced:'BALANCED',Warm:'SMOOTH',Punchy:'DYNAMIC',Club:'WEIGHTED',Open:'AIRY'};
 /* Masterns loudnessmätare (Linus 20 sep: en helt annan, rektangulär mätare
    i samma stil som analysens runda ratt). En upphöjd platta i rattens
    material: sidokant, ovansida med violett ljus, en fas som är ljus uppe
    till vänster och mörk nere till höger, och en nedsänkt skål. I skålen
    står målet i LUFS och en vågrät skala från -18 till -6 LUFS med samma
    färger som ratten hade, från blått mot rosa ju högre målet är, och en
    ljuspunkt vid målet. Det är inställningen som visas, inget uppmätt
    värde, därav TARGET. */
 function meterMarkup(value){
  const t=Number(value),ok=value!==null&&value!==undefined&&value!==''&&Number.isFinite(t);
  const pos=ok?Math.max(0,Math.min(1,(t+18)/12)):0;
  return `<div class="ready-meter" style="--pos:${Math.max(.001,pos).toFixed(4)}"><i class="rm-side" aria-hidden="true"></i><i class="rm-top" aria-hidden="true"></i><i class="rm-well" aria-hidden="true"></i><div class="rm-value"><strong>${ok?(t<0?'\u2212':'')+Math.abs(t):'\u2014'}</strong><span>LUFS TARGET</span></div><div class="rm-scale" aria-hidden="true"><i class="rm-ticks"></i><i class="rm-track"></i>${ok?'<i class="rm-glow"></i><i class="rm-fill"></i><i class="rm-pointer"></i>':''}</div></div>`;
 }
 function readyMarkup(s){
  const style=String(s.style||''),mark=characterMarks[style]||'BALANCED';
  const space=Number(s.width)>=60?'OPEN':'FOCUSED';
  const live=COPY?COPY.target(s.target):null;
  const profile=live?[live.profile,live.profileNote]:(loudnessProfiles[String(Number(s.target))]||loudnessProfiles['-14']);
  const title=String(result.name||'').replace(/\.[a-z0-9]+$/i,'').trim()||'Your track';
  const kicker=result.masterName||`${style} Smart Master`;
  const notes=Array.isArray(result.loudnessNotes)&&result.loudnessNotes.length?result.loudnessNotes:['Preserved punch and dynamics','Smart loudness shaping for your mix'];
  const marks=Array.isArray(result.tags)&&result.tags.length?result.tags.map(t=>String(t).toUpperCase()):[mark,space];
  const readyView=window.MastrifyReadyViews?.[new URLSearchParams(location.search).get('ready')||'halo'];
  if(readyView)return readyView({s,result,profile,title,kicker,notes,marks});
  return `<div class="master-ready flow-surface"><div class="ready-main"><span class="ready-kicker"><i aria-hidden="true"></i>${esc(kicker)}</span><h2>Your master is ready.</h2><p class="ready-line">Smart mastering tuned for punch, clarity and your loudness goal.</p></div>${meterMarkup(s.target)}<div class="ready-facts"><div class="ready-track"><span>Track</span><strong>${esc(title)}</strong></div><div class="ready-profile"><span>Loudness profile</span><strong>${esc(profile[0])}</strong></div><p class="ready-note">${esc(profile[1])}</p></div><div class="ready-protect"><ul class="ready-promises" aria-label="What we protected">${notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p class="ready-marks"><span>TRANSIENT-SAFE</span>${marks.slice(0,3).map(m=>`<span>${esc(m)}</span>`).join('')}</p></div></div>`;
 }
 function comparisonMarkup(){
  const rows=result.comparison||[];
  if(!rows.length)return '';
  const fam={Loudness:'level',Dynamics:'level','Stereo image':'space',Stereo:'space','Low end':'space',Presence:'drive',Highs:'tone',Tone:'tone'};
  const bar=r=>{if(!r.pos||!Number.isFinite(r.pos.before)||!Number.isFinite(r.pos.after))return '<div class="cmp-bar cmp-bar-empty" aria-hidden="true"></div>';const a=Math.max(0,Math.min(1,r.pos.before)),b=Math.max(0,Math.min(1,r.pos.after));return `<div class="cmp-bar" role="img" aria-label="Original at ${Math.round(a*100)} percent of the scale, master at ${Math.round(b*100)}" style="--a:${a.toFixed(3)};--b:${b.toFixed(3)};--lo:${Math.min(a,b).toFixed(3)};--hi:${Math.max(a,b).toFixed(3)}"><i class="cmp-track"></i><i class="cmp-span"></i><i class="cmp-dot-a"></i><i class="cmp-dot-b"></i></div>`;};
  return `<div class="sound-comparison flow-surface cmp"><div class="comparison-heading"><div><span class="eyebrow">THE SOUND, SIDE BY SIDE</span><h2>A closer listen.</h2></div><span class="demo-chip">${result.demo?'ILLUSTRATIVE':'SOUND PROFILE'}</span></div><div class="cmp-head" aria-hidden="true"><span></span><span>ORIGINAL</span><span></span><span class="master-column-title"><span class="guide-dot"></span>Master</span></div>${rows.map(r=>`<div class="cmp-row" data-family="${r.family||fam[r.label]||'drive'}"><div class="cmp-q">${soundMark(r.label,'cmp-icon')}<span>${esc(r.label)}</span></div><div class="cmp-before"><b>${esc(r.before)}</b>${r.beforeDetail?`<small>${esc(r.beforeDetail)}</small>`:''}</div>${bar(r)}<div class="cmp-after"><b>${esc(r.after)}</b>${r.afterDetail?`<small>${esc(r.afterDetail)}</small>`:''}</div></div>`).join('')}${result.demo?'<p class="comparison-note">Example sound profile. The demo plays your unchanged original in both versions.</p>':''}</div>`;
 }
 /* Analysens huvudbild: rubrik och sammanfattning till vänster, mätaren
    som en upphöjd ratt till höger och punkterna under. */
 function readinessPoints(){const h=result.analysis.highlights;return Array.isArray(h)&&h.length?`<ul class="readiness-points">${h.slice(0,4).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'';}
 /* Rattens kropp: sidokant, ovansida, violett ljus och en fas som är ljus
    uppe till vänster och mörk nere till höger. Ritas som SVG i rattens egna
    enheter (radien 100) så allt skalar med ratten. */
 const RB_FORM='<svg class="rb-form" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false"><defs><circle id="rb-shape" r="100"/><clipPath id="rb-clip"><use href="#rb-shape"/></clipPath><linearGradient id="rb-g-side" gradientUnits="userSpaceOnUse" x1="0" y1="-20" x2="0" y2="112"><stop offset="0" stop-color="#2a2038"/><stop offset=".45" stop-color="#140f1d"/><stop offset="1" stop-color="#07060b"/></linearGradient><radialGradient id="rb-g-top" gradientUnits="userSpaceOnUse" cx="-34" cy="-46" r="200"><stop offset="0" stop-color="#3a2d55"/><stop offset=".38" stop-color="#221b30"/><stop offset=".72" stop-color="#140f1c"/><stop offset="1" stop-color="#0d0a13"/></radialGradient><radialGradient id="rb-g-glow" gradientUnits="userSpaceOnUse" cx="-20" cy="-88" r="120"><stop offset="0" stop-color="#b690ff" stop-opacity=".3"/><stop offset="1" stop-color="#b690ff" stop-opacity="0"/></radialGradient><linearGradient id="rb-g-light" gradientUnits="userSpaceOnUse" x1="-72" y1="-72" x2="72" y2="72"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".2" stop-color="#e3d0ff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity=".07"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".82" stop-color="#8fc6ff" stop-opacity=".2"/><stop offset="1" stop-color="#8fc6ff" stop-opacity=".32"/></linearGradient><linearGradient id="rb-g-dark" gradientUnits="userSpaceOnUse" x1="-72" y1="-72" x2="72" y2="72"><stop offset=".42" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs><use href="#rb-shape" transform="translate(0 8.8)" fill="url(#rb-g-side)"/><use href="#rb-shape" fill="url(#rb-g-top)"/><use href="#rb-shape" fill="url(#rb-g-glow)"/><g clip-path="url(#rb-clip)" fill="none"><use href="#rb-shape" stroke="url(#rb-g-dark)" stroke-width="10"/><use href="#rb-shape" stroke="url(#rb-g-light)" stroke-width="4.4"/></g></svg>';
 function readinessStage(){const a=result.analysis;return `<div class="readiness-stage"><div class="readiness-copy"><h2>${esc(a.summary||'A clearer picture.')}</h2>${a.recommendation?`<p class="readiness-recommendation"><span class="guide-dot" aria-hidden="true"></span>${esc(a.recommendation)}</p>`:''}<p>${esc(a.focus||'')}</p></div><div class="readiness-dial">${RB_FORM}<i class="rb-well" aria-hidden="true"></i>${readinessMarkup(result.analysis.readiness)}</div>${readinessPoints()}</div>`;}

 function readinessMarkup(value){
  const numeric=Number(value),valid=value!==null&&value!==undefined&&value!==''&&Number.isFinite(numeric),score=valid?Math.max(0,Math.min(100,numeric)):0,energy=score/100;
  return `<div class="score-ring" style="--score-energy:${energy};--score-stroke:${3+energy*energy*5.5};--score-glow:${.12+energy*energy*.68}" data-radiant="${score>=85}"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="readiness-colour" x1="100%" y1="100%" x2="0%" y2="0%"><stop offset=".10" stop-color="#f9899f"/><stop offset=".26" stop-color="#e37fc2"/><stop offset=".42" stop-color="#c187ef"/><stop offset=".60" stop-color="#a794ff"/><stop offset=".78" stop-color="#8cc8ff"/><stop offset=".92" stop-color="#dceeff"/></linearGradient></defs><circle class="score-ticks" cx="60" cy="60" r="57" pathLength="100"/><circle class="score-track" cx="60" cy="60" r="49"/><g transform="rotate(-90 60 60)" ${score===0?'visibility="hidden"':''}><circle class="score-glow" cx="60" cy="60" r="49" pathLength="100" stroke-dasharray="${score} 100"/><circle class="score-arc" cx="60" cy="60" r="49" pathLength="100" stroke-dasharray="${score} 100"/></g></svg><strong>${valid?score:'—'}${valid?'<small>%</small>':''}</strong><span>READINESS</span></div>`;
 }
 function tipsMarkup(){const t=result?.analysis?.tips;if(!t||!Array.isArray(t.items)||!t.items.length)return '';return `<section class="action-tips flow-surface" aria-labelledby="tips-heading"><span class="eyebrow">ACTION TIPS</span><h3 id="tips-heading">${esc(t.title)}</h3><p>${esc(t.subtitle)}</p><ol class="tips-list">${t.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ol></section>`;}
 function renderResults(){
  if(!result)return;const demo=!!result.demo;
  if(!isAnalysis&&result.preview){const p=result.preview;audio.setPreviewWindow({start:p.sourceStart,end:p.sourceStart+p.duration,sourceDuration:p.sourceDuration});}
  $('ab-note').textContent=!isAnalysis&&result.preview?`${time(result.preview.duration)} preview · ${time(result.preview.sourceStart)}–${time(result.preview.sourceStart+result.preview.duration)} of your track${demo?' · original audio in both versions':''}`:demo?'Engine demo · both versions use your original audio.':'';
  if(isAnalysis)$('ab-note').textContent=demo?'Illustrative report · your original audio is unchanged.':'';
  const s=result.settings;
  const reportName=new URLSearchParams(location.search).get('report')||'orbit';
  const reportView=isAnalysis&&window.MastrifyReportViews&&reportName!=='classic'?(window.MastrifyReportViews[reportName]||window.MastrifyReportViews.orbit):null;
  $('result-stage').innerHTML=isAnalysis&&reportView?reportView({result,duration:audio.getState().sources.original.duration,notes:metricNotes,views:insightViews,issueStyle:new URLSearchParams(location.search).get('issue')||'stub'}):isAnalysis?`${readinessStage()}${demo?`<p class="report-disclosure">${result.analysis?.measured?'Quick in-browser measurement (approximate). The full engine refines these findings.':'Example findings to demonstrate the flow; these are not measurements of your track.'}</p>`:''}<div class="analysis-grid">${result.analysis.metrics.map(metricMarkup).join('')}</div><section class="insight-list" aria-labelledby="insight-heading"><div class="insight-heading"><span class="eyebrow">DETAILS TO EXPLORE</span><h2 id="insight-heading">Hear the possibility.</h2><p>Open a detail. See the idea. Know what to listen for.</p></div>${result.analysis.insights.map(insightMarkup).join('')}</section>${tipsMarkup()}<div class="report-actions"><button id="print-result" class="plain-action">↓ Download PDF</button><button id="share-result" class="plain-action">Share report ↗</button></div><div class="next-master flow-surface"><div><h3>Keep the momentum.</h3><p>Your track is already here.</p></div><button id="master-same-track" class="button primary">Master this track ↗</button></div><button id="new-result" class="plain-action start-again">← Analyze another track</button>`:
 `${readyMarkup(s)}${comparisonMarkup()}<div class="master-summary flow-surface"><div><span>CHARACTER</span><strong>${esc(s.style)}</strong></div><div><span>TARGET</span><strong>${esc(minus(s.target))} <small>LUFS</small></strong></div><button id="adjust-result" class="sum-wide"><span class="sum-text">Adjust<span class="sum-more"> settings</span></span><i aria-hidden="true">↗</i></button><p class="master-recipe">${[['Stereo','Width',s.width],['Low end','Low end',s.low],['Presence','Clarity',s.clarity]].map(([icon,label,value])=>`<span style="--fill:${Math.max(0,Math.min(100,Number(value)||0))}%">${metricIcon(icon)}<em>${label}</em><strong>${value}%</strong><i aria-hidden="true"></i></span>`).join('')}</p></div><div class="export-card flow-surface"><span class="export-mark" aria-hidden="true">↗</span><div><span class="eyebrow export-eyebrow"><i aria-hidden="true"></i>${demo?'TEST EXPORT':'YOUR RELEASE'}</span><h2>Take it with you.</h2><p>${demo?'Try checkout and download an unprocessed WAV.':'Your full-quality WAV, ready to release.'}</p></div><button id="checkout-open" class="button primary">${session.receipt?.resultId===result.id?'Download WAV ↓':demo?'Export · $9.00 test':'Export · $9.00'}</button><p id="export-status" role="status"></p></div><div class="result-links"><button id="new-result" class="plain-action">← ${STR.newMaster||'New track'}</button><button id="share-result" class="plain-action">Share summary ↗</button></div>`;
  on($('master-same-track'),'click',()=>host.navigate('/master?step=settings'));
  on($('adjust-result'),'click',()=>{audio.pause();host.setMode('idle');show('settings',{scroll:true});});
  on($('new-result'),'click',()=>{cancel();result=null;host.clearFile();show('upload',{scroll:true});host.setMode('idle');});
  on($('print-result'),'click',async()=>{
   const button=$('print-result');if(button.getAttribute('aria-busy')==='true')return;button.setAttribute('aria-busy','true');
   const base=String(result.name||'mix').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,80)||'mix';
   try{MastrifyFiles.save(await MastrifyFiles.report(result,{duration:audio.getState().sources.original?.duration||0}),`Mastrify report - ${base}.pdf`);}
   catch(error){host.report(error);}finally{button.removeAttribute('aria-busy');}
  });
  on($('share-result'),'click',share);
  on($('checkout-open'),'click',()=>session.receipt?.resultId===result.id?download():openCheckout());
  el.querySelectorAll('.metric-toggle,.insight-toggle').forEach(button=>on(button,'click',()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   if(button.classList.contains('metric-toggle'))closeReportCards(false,true);
   button.setAttribute('aria-expanded',String(open));$(button.getAttribute('aria-controls')).inert=!open;
  }));
  window.MastrifyControlLights?.refresh();
 }
 async function share(){
  const text=isAnalysis?`${result.demo?'Mastrify demo analysis':'Mastrify analysis'}: ${result.name}\nReadiness: ${result.analysis.readiness}%\n${result.analysis.summary}\n${result.analysis.metrics.map(m=>m.label+': '+m.value+' ('+m.detail+')').join('\n')}\n${result.demo?'Illustrative report; not measurements of this track.':''}`:`Mastrify ${result.demo?'demo ':''}master: ${result.name}\n${result.settings.style} · ${result.settings.target} LUFS target\nWidth ${result.settings.width}% · Low end ${result.settings.low}% · Clarity ${result.settings.clarity}%\n${result.demo?'Engine demo. Original audio is unchanged.':''}`;
  const shareTitle=isAnalysis?'Mastrify · '+result.name:(STR.shareTitle||'Listen to my master on Mastrify');
  try{if(navigator.share)await navigator.share({title:shareTitle,text});else if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);host.notify((STR.copied||'Copied')+' · summary only, audio is not included.');}else throw new Error('No sharing on this page');}catch(error){if(error.name!=='AbortError'){MastrifyFiles.save(new Blob([text],{type:'text/plain'}),'Mastrify-summary.txt');host.notify((STR.copyFailed||'Copy failed')+' · summary saved as a file instead.');}}
 }
 function openCheckout(){
  $('checkout-track').textContent=result.name;$('checkout-error').textContent='';$('checkout-dialog').showModal();
  syncCheckoutPrice().catch(error=>{if(!disposed)$('checkout-error').textContent=error.message||(STR.checkoutFailed||'Could not start checkout. Please try again.');});
 }
 async function download(){
  if(exportBusy||!result||session.receipt?.resultId!==result.id)return;
  const expected=result,revision=session.revision,controller=new AbortController();exportJob=controller;exportBusy=true;$('checkout-open').disabled=true;$('export-status').textContent='Preparing your WAV…';
  try{
   const blob=exportBlob&&exportResultId===expected.id?exportBlob:expected.demo?await MastrifyFiles.wav(expected.audio,{signal:controller.signal}):await service.download({resultId:expected.id,signal:controller.signal});
   if(!(blob instanceof Blob))throw new Error('The full master download is not available yet.');
   if(disposed||controller.signal.aborted||revision!==session.revision||expected!==result)return;
   exportBlob=blob;exportResultId=expected.id;
   const stem=result.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,80)||'Your-track';
   MastrifyFiles.save(exportBlob,stem+(result.demo?' - Mastrify demo (unprocessed).wav':' - Mastrify master.wav'));
   $('export-status').textContent=result.demo?'Demo WAV downloaded · original audio, unchanged.':'Your WAV is ready. Keep a backup.';
  }catch(error){if(error.name!=='AbortError'){$('export-status').textContent='Could not prepare the WAV. Please try again.';host.report(error);}}
  finally{if(exportJob===controller)exportJob=null;exportBusy=false;if(!disposed&&$('checkout-open'))$('checkout-open').disabled=false;}
 }
 const guides=COPY?{
  character:{title:'Find your character.',body:`<p>Start with the feeling you want to keep. These choices guide tone, dynamics and space together.</p><dl class="preset-guide preset-guide-rich">${COPY.STYLES.map(st=>`<div><dt><span class="guide-dot" data-character="${esc(st.id)}" aria-hidden="true"></span><span class="preset-name">${esc(st.id)}</span><small class="preset-tagline">${esc(st.tagline)} · ${esc(st.intensity)}</small></dt><dd><p>${esc(st.summary)}</p><ul class="preset-details">${st.details.map(d=>`<li>${esc(d)}</li>`).join('')}</ul><p class="preset-genres"><span>Works well for</span> ${st.worksWellFor.map(g=>`<b>${esc(g)}</b>`).join('')}</p></dd></div>`).join('')}</dl><h3>Choose a loudness goal</h3><p>${esc(COPY.TARGET_INTRO)}</p><dl class="preset-guide">${COPY.TARGETS.map(t=>`<div><dt><span class="guide-dot" aria-hidden="true"></span><span class="preset-name">${esc(t.label)} <small>${t.value} LUFS</small></span></dt><dd>${esc(t.description)}</dd></div>`).join('')}</dl><p>These are creative targets, not a guarantee of platform playback volume.</p>`},
  tune:{title:'Small moves. Your sound.',body:`<p>${esc(COPY.ADVANCED_INTRO)}</p><dl class="preset-guide">${['width','low','clarity'].map(key=>{const sl=COPY.SLIDERS[key];return `<div><dt><span class="guide-dot" aria-hidden="true"></span><span class="preset-name">${esc(sl.label)}</span></dt><dd><p>${esc(sl.description)}</p><ul class="preset-details"><li><b>Low</b> ${esc(sl.hints[0])}</li><li><b>Mid</b> ${esc(sl.hints[1])}</li><li><b>High</b> ${esc(sl.hints[2])}</li></ul></dd></div>`;}).join('')}</dl><p>You can return to these settings after listening, without uploading your track again.</p>`}
 }:{character:{title:'Find your character.',body:'<p>Start with the feeling you want to keep.</p>'},tune:{title:'Small moves. Your sound.',body:'<p>Keep the starting values for a balanced approach, or steer each part of the finish.</p>'}};
 el.querySelectorAll('[data-guide]').forEach(button=>on(button,'click',()=>{const guide=guides[button.dataset.guide];put('guide-eyebrow','A LITTLE GUIDANCE');put('guide-title',guide.title);$('guide-content').innerHTML=guide.body;$('guide-dialog').showModal();}));
 on($('close-guide'),'click',()=>$('guide-dialog').close());on($('guide-done'),'click',()=>$('guide-dialog').close());
 let appliedCode='',quoteTicket=0,quoteJob=null;
 const money=(amount,currency)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format(Number(amount)||0);}catch(_){return '$'+(Number(amount)||0).toFixed(2);}};
 const confirmLabel=free=>free?(STR.continueFree||'Continue, free'):service.mode==='demo'?'Complete test checkout ↗':'Complete checkout ↗';
 // The price and the code come from the backend (service.quote). The demo
 // adapter answers with its test codes. A failed quote keeps the last price.
 async function syncCheckoutPrice(){
  if(!result||typeof service.quote!=='function'){$('checkout-price').textContent=money(9,'USD');$('confirm-checkout').textContent=confirmLabel(false);return null;}
  const ticket=++quoteTicket;quoteJob?.abort();const controller=new AbortController();quoteJob=controller;
  try{const q=await service.quote({resultId:result.id,discountCode:appliedCode,signal:controller.signal});if(disposed||ticket!==quoteTicket)return null;
   $('checkout-price').textContent=q.free?money(0,q.currency):money(q.amount,q.currency);$('confirm-checkout').textContent=confirmLabel(!!q.free);return q;}
  catch(error){if(error.name==='AbortError'||ticket!==quoteTicket)return null;throw error;}
  finally{if(quoteJob===controller)quoteJob=null;}
 }
 on($('apply-code'),'click',async()=>{
  const value=$('discount-code').value.trim().toUpperCase();
  if(!value){appliedCode='';$('discount-status').textContent=STR.enterCode||'Enter a discount code.';await syncCheckoutPrice().catch(()=>{});return;}
  $('discount-status').textContent=STR.applyingCode||'Applying code…';appliedCode=value;
  try{const q=await syncCheckoutPrice();if(!q)return;$('discount-status').textContent=q.label||(q.free?'Free code applied · '+money(0,q.currency):'Code applied · '+money(q.amount,q.currency));}
  catch(error){appliedCode='';$('discount-status').textContent=error.message||(STR.invalidCode||'Invalid discount code.');await syncCheckoutPrice().catch(()=>{});}
 });
 const cancelCheckout=()=>{checkoutJob?.abort();checkoutJob=null;};
 on($('close-checkout'),'click',()=>{cancelCheckout();$('checkout-dialog').close();});
 on($('checkout-dialog'),'cancel',cancelCheckout);
 on($('confirm-checkout'),'click',async()=>{
  if(checkoutBusy||!result)return;checkoutBusy=true;$('confirm-checkout').disabled=true;const expected=result,controller=new AbortController();checkoutJob=controller;
  try{const outcome=await service.checkout({resultId:result.id,discountCode:appliedCode,signal:controller.signal});if(disposed||controller.signal.aborted||expected!==result||result.sourceRevision!==session.revision)return;
   if(outcome&&outcome.redirect){
    // Hosted payment page (for example Stripe Checkout). Keep the master and
    // the original around so the results page can come back after payment.
    $('checkout-error').textContent='';$('confirm-checkout').textContent=STR.redirecting||'Redirecting to checkout…';
    try{await MastrifyFiles.stash('checkout-return',{kind,resultId:result.id,result:{...result,audio:null},file:session.file,settings:readSettings(),code:appliedCode,at:Date.now()});}catch(error){host.report(error);}
    location.assign(outcome.redirect);return;
   }
   const receipt=outcome;session.receipt=receipt;$('checkout-dialog').close();$('checkout-open').textContent='Download WAV ↓';$('export-status').textContent=receipt.free?'Free export unlocked · your WAV is ready.':receipt.test?'Test checkout complete · $0 charged. Your WAV is ready.':'Your WAV is ready.';openEmail();}
  catch(error){if(error.name!=='AbortError')$('checkout-error').textContent=error.message;}
  finally{if(checkoutJob===controller)checkoutJob=null;checkoutBusy=false;if(!disposed)$('confirm-checkout').disabled=false;}
 });
 // After payment the email is required (Linus 22 sep): the download link is
 // the safety net if the direct download fails, so the dialog has no close
 // button and no "Not now", ignores Escape, and reopens if the browser closes
 // it anyway. It closes itself once the email is sent.
 let emailJob=null,emailRequired=false;
 function openEmail(){
  if(!$('email-dialog'))return;emailRequired=true;
  $('email-status').textContent='';$('email-send').disabled=false;$('email-address').disabled=false;
  const known=session.receipt&&typeof session.receipt.email==='string'?session.receipt.email:'';
  if(known&&!$('email-address').value)$('email-address').value=known;
  try{if(!$('email-dialog').open)$('email-dialog').showModal();}catch(_){}
 }
 on($('email-dialog'),'cancel',e=>{if(emailRequired)e.preventDefault();});
 on($('email-address'),'keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('email-send').click();}});
 on($('email-dialog'),'close',()=>{if(emailRequired&&!disposed)requestAnimationFrame(()=>{if(emailRequired&&!disposed)try{$('email-dialog').showModal();}catch(_){}});});
 on($('email-send'),'click',async()=>{if(!result||emailJob)return;const email=$('email-address').value.trim();
  if(!email||!$('email-address').checkValidity()){$('email-status').textContent=STR.emailInvalid||'Enter a valid email address.';$('email-address').focus();return;}const controller=new AbortController();emailJob=controller;$('email-send').disabled=true;$('email-status').textContent='Sending…';
  try{const sent=typeof service.email==='function'?await service.email({resultId:result.id,email,signal:controller.signal}):{sent:true,test:true,to:email};if(controller.signal.aborted||disposed)return;const note=(sent.test?STR.emailSentTest||'Test mode: nothing was sent. A real backend emails {to} a secure download link.':STR.emailSent||'Sent to {to}. The link stays valid for 12 hours.').replace('{to}',sent.to||email);
   $('email-status').textContent=note;$('email-address').disabled=true;emailRequired=false;
   // the confirmation stays on the export card after the dialog closes
   setTimeout(()=>{if(disposed)return;$('email-dialog')?.close();$('export-status').textContent=note;},1600);}
  catch(error){if(error.name!=='AbortError'){$('email-status').textContent=error.message||(STR.emailFailed||'Could not send email. Please try again.');$('email-send').disabled=false;}}
  finally{if(emailJob===controller)emailJob=null;}});
 on($('continue-flow'),'click',()=>isAnalysis?start():(host.setMode('idle'),show('settings',{scroll:true})));
 on($('step-upload'),'click',()=>{if(!host.isLoading())$('original-file').click();});
 on($('step-settings'),'click',()=>{if(audio.getState().sources.original.loaded&&!host.isLoading()){if(isAnalysis){start();return;}host.setMode('idle');show('settings',{scroll:true});}});
 on($('step-master'),'click',()=>{if(audio.getState().sources.original.loaded&&!host.isLoading())start();});
 on($('analyze-first'),'click',()=>host.navigate('/analyze'));
 on($('back-upload'),'click',()=>{show('upload',{scroll:true});host.setMode('idle');});
 on($('start-mastering'),'click',start);
 on($('cancel-flow'),'click',()=>{cancel();host.setMode('idle');show(isAnalysis?'upload':'settings');});
 on($('sample-flow'),'click',async()=>{if(host.isLoading())return;$('sample-flow').disabled=true;try{const response=await fetch('/assets/First-light.wav',{signal:events.signal});if(!response.ok)throw new Error('The sample could not load. Please try again.');await host.loadFile(new File([await response.blob()],'First light.wav',{type:'audio/wav'}),'original');}catch(error){host.report(error);}finally{if(!disposed)$('sample-flow').disabled=false;}});
 el.querySelectorAll('input[name=master-style]').forEach(n=>on(n,'change',()=>{settings.style=n.value;$('style-description').textContent=styles.find(s=>s[0]===n.value)[1];put('style-genres',styleGenres(n.value));}));
 el.querySelectorAll('input[name=loudness-target]').forEach(n=>on(n,'change',()=>{settings.target=Number(n.value);put('target-hint',goalHint(settings.target));}));
 // Reglagen ska ga att ta tag i var som helst i sin yta och dras med fingret.
 // I Safari pa iPhone maste man annars traffa sjalva pricken, och minsta lodratta
 // rorelse gor gesten till en sidscroll. Darfor styr vi vardet sjalva fran pekarens
 // x-lage: ett tryck var som helst pa raden satter vardet direkt, och draget foljer
 // fingret tack vare setPointerCapture aven om det glider utanfor rutan. CSS ger
 // ytan 56 px hojd och touch-action:pan-y, sa lodrata drag fortfarande scrollar.
 function grabbable(el){
  if(!el||el.dataset.grabbable)return;el.dataset.grabbable='1';
  const min=Number(el.min||0),max=Number(el.max||100);let dragging=false;
  const setFrom=x=>{const r=el.getBoundingClientRect();if(!r.width)return;
   const p=Math.min(1,Math.max(0,(x-r.left)/r.width));
   const v=String(Math.round(min+(max-min)*p));
   if(v!==el.value){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}};
  const slut=e=>{if(!dragging)return;dragging=false;
   try{el.releasePointerCapture(e.pointerId);}catch(_){}
   el.dispatchEvent(new Event('change',{bubbles:true}));};
  on(el,'pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragging=true;
   try{el.setPointerCapture(e.pointerId);}catch(_){}
   try{el.focus({preventScroll:true});}catch(_){}
   setFrom(e.clientX);e.preventDefault();});
  on(el,'pointermove',e=>{if(!dragging)return;setFrom(e.clientX);e.preventDefault();});
  on(el,'pointerup',slut);on(el,'pointercancel',slut);
 }
 for(const key of ['width','low','clarity']){on($(key+'-setting'),'input',e=>{settings[key]=Number(e.target.value);$(key+'-value').textContent=settings[key]+'%';put(key+'-hint',sliderHint(key,settings[key]));$('tune-summary').firstChild.textContent='Customized';$('tune-summary').dataset.touched='true';});grabbable($(key+'-setting'));}
 function refresh(){
  if(disposed)return;const state=audio.getState(),source=state.sources.original,busy=host.isLoading();
  const controls=JSON.stringify([source.loaded,source.name,source.duration,source.channels,busy,state.selected,state.sources.master.loaded]);
  if(controls!==lastControls){lastControls=controls;
  $('loaded-track').hidden=!source.loaded;$('continue-flow').hidden=!source.loaded;$('continue-flow').disabled=busy||!source.loaded;
  $('analyze-first').hidden=isAnalysis||!source.loaded;$('sample-flow').hidden=source.loaded;$('sample-flow').disabled=busy;
  $('start-mastering').disabled=busy||!source.loaded;
  $('step-upload').disabled=busy;$('step-settings').disabled=busy||!source.loaded;$('step-master').disabled=busy||!source.loaded;$('upload-promises').hidden=source.loaded;
  put('upload-title',busy?'Reading your track…':source.loaded?'Track received':isAnalysis?'Add your track':'Add your mix');$('upload-title').closest('.upload-button')?.classList.toggle('reading',!!busy);
  put('upload-hint',source.loaded?'Tap to choose a different file':'Choose a file or drop it here');
  put('source-meta',source.loaded?`${time(source.duration)} · ${source.channels===1?'Mono':'Stereo'} · Ready to ${isAnalysis?'analyze':'master'}`:'');
  put('settings-file-name',source.name);
  $('compare-original').setAttribute('aria-pressed',String(state.selected==='original'));
  $('compare-master').setAttribute('aria-pressed',String(state.selected==='master'));
  $('compare-original').disabled=!source.loaded;$('compare-master').disabled=!state.sources.master.loaded;
  }
  if(step==='processing')updateProgress(MastrifyProcessing.getState().progress);
  syncScene();
 }
 show('upload');
 return {
  start,refresh,
  async init(){
   if(!isAnalysis&&await resumeAfterCheckout().catch(error=>{host.report(error);return false;}))return;
   const wanted=new URLSearchParams(location.search).get('step');
   if(!isAnalysis&&wanted==='results'&&!(result&&result.sourceRevision===session.revision)){$('result-stage').innerHTML=`<div class="empty-result flow-surface"><span class="eyebrow">MASTER</span><h2>${esc(STR.noMaster||'No master in this session.')}</h2><p>Masters live in this browser session only. Upload a mix to make a new one.</p><button id="empty-start" class="button primary">${esc(STR.startNewMaster||'Start a new master')} <span>↗</span></button></div>`;on($('empty-start'),'click',()=>{show('upload',{scroll:true});});emptyState=true;show('results');await host.setMode('idle');syncScene();return;}
   if(!isAnalysis&&session.file&&wanted==='settings'){show('settings');await host.setMode('idle');}
   else if(result&&result.sourceRevision===session.revision){renderResults();show('results');await host.setMode(isAnalysis?'original':'master');}
   else await host.setMode('idle');syncScene();
  },
  fileLoaded(){cancel();result=null;exportBlob=null;show('upload');host.setMode('idle');},
  fileCleared(){cancel();result=null;exportBlob=null;for(const n of el.querySelectorAll('input[name=master-style]'))n.checked=n.value===settings.style;for(const n of el.querySelectorAll('input[name=loudness-target]'))n.checked=Number(n.value)===settings.target;for(const key of ['width','low','clarity']){$(key+'-setting').value=settings[key];$(key+'-value').textContent=settings[key]+'%';put(key+'-hint',sliderHint(key,settings[key]));}$('style-description').textContent=styles.find(s=>s[0]===settings.style)[1];put('style-genres',styleGenres(settings.style));put('target-hint',goalHint(settings.target));show('upload');},
  dispose(){disposed=true;cancel();emailJob?.abort();audio.clearPreviewWindow();events.abort();$('checkout-dialog')?.close();$('guide-dialog')?.close();$('email-dialog')?.close();heading.remove();compare.remove();$('brain').hidden=false;$('page-content').hidden=false;exportBlob=null;},
  getState(){return {step,engineDemo:service.mode==='demo',resultId:result?.id||null,style:settings.style,loudnessTarget:settings.target,settings:readSettings(),sourceRevision:session.revision,testPaid:!!result&&session.receipt?.resultId===result.id};}
 };
};
