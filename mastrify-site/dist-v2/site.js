(() => {
'use strict';
const $=id=>document.getElementById(id),audio=MastrifyAudio,processing=MastrifyProcessing;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
const listen=(el,name,fn)=>el.addEventListener(name,fn,{signal:events.signal});
const loading={original:false,master:false},tokens={original:0,master:0},peaks={original:null,master:null};
let studioEvents=new AbortController(),journey=null,routeTicket=0;
let page='home',lastWave,lastUI=0,modeTicket=0,motion=true,disposed=false,noticeTimer,sceneVisible=true;
// Mätläget ?prov=spel kan frysa vågformen en stund. Annars är den alltid sann.
let provWave=true,provUI='normal',provSecond=-1;
// Measure and prepare the hidden waveform before the first animation frame.
// No temporary state is painted: this runs synchronously during page setup.
const waveStage=$('track-stage'),waveWasHidden=waveStage.hidden;
waveStage.hidden=false;
const track=new MastrifyTrack($('track'));
if(MastrifyCanvas.webKit){track.setPresentationMode('master');track.renderAt(0,1);}
track.setPresentationMode('idle');
waveStage.hidden=waveWasHidden;
const engine=new MastrifyEngine($('engine'),{mode:'idle',autoplay:false,transitionVariant:'portal',maxFPS:60,reducedMotion:motionQuery.matches||new URLSearchParams(location.search).get('motion')==='reduce'});
const labels={idle:['01 / STANDBY','Ready for your next track.'],active:['02 / ANALYZING','Every detail gets full attention.'],original:['03 / ORIGINAL','Your track’s original expression.'],master:['04 / MASTER','Depth. Presence. Your music, fully alive.']};
const studioPage=()=>page==='analyze'||page==='master';
const time=v=>`${Math.floor((v||0)/60)}:${String(Math.floor((v||0)%60)).padStart(2,'0')}`;
const db=v=>Number.isFinite(v)?`${v.toFixed(1)} dBFS`:'Silence';
function notify(message){$('toast').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('toast').textContent='',5000);}
function report(error){if(disposed||error?.name==='AbortError')return;const text=error?.message||String(error);if($('studio-error'))$('studio-error').textContent=text;$('toast').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('toast').textContent='',6500);}
let coarseTick=null,coarseMotion=false,coarseVisible=!document.hidden;
function advanceCoarseClock(now=performance.now()){
 const dt=coarseTick===null?0:Math.max(0,Math.min(.3,(now-coarseTick)/1000));coarseTick=now;
 if(disposed||engine.running||document.hidden||!coarseVisible)return;
 if(coarseMotion)engine.advance(dt);else if(processing.getState().active)processing.advance(dt);
}
let paintVisibility={lpPaint:true,wavePaint:true,documentVisible:true,workNeeded:true};
const visibility=MastrifyVisibility.create({lp:$('engine'),wave:$('track'),onChange(state){paintVisibility=state;engine.renderEnabled=state.lpPaint;syncMotion();if(state.documentVisible){refresh();if(!engine.running)redraw();}}});
function syncMotion(){
 const now=performance.now(),wasRunning=engine.running,animate=motion&&sceneVisible&&!engine.reducedMotion,run=animate&&paintVisibility.workNeeded&&!document.hidden;
 if(!wasRunning)advanceCoarseClock(now);
 else if(!run&&animate&&!document.hidden&&engine.lastTime!==null){
  // Hand the unpainted tail of the RAF interval to the offscreen clock once.
  engine.advance(Math.max(0,Math.min(.3,(now-engine.lastTime)/1000)));
 }
 if(run){engine.play();if(!wasRunning)engine.lastTime=now;}else engine.pause();
 // Both clocks now share this boundary. User pause/reduced motion only keep
 // processing live; a hidden document never contributes its elapsed gap.
 coarseTick=now;coarseMotion=animate;coarseVisible=!document.hidden;
 $('motion').textContent=engine.running?'Ⅱ':'▷';$('motion').setAttribute('aria-label',engine.running?'Pause animation':'Resume animation');$('motion').disabled=engine.reducedMotion;
}
// The running engine already owns the next frame. Avoid submitting two
// complete scenes inside one display interval when a control changes mode.
function redraw(){if(!engine.running)engine.renderAt(engine.time,engine.energy);}
function syncWave(){const wave=audio.getWaveform(engine.mode==='active'?'original':undefined);if(wave===lastWave)return;lastWave=wave;if(wave)track.setWaveform(wave,false);else track.clearWaveform(false);}
function text(el,value){value=String(value);if(el.textContent!==value)el.textContent=value;}
function attribute(el,name,value){value=String(value);if(el.getAttribute(name)!==value)el.setAttribute(name,value);}
function property(el,name,value){if(el[name]!==value)el[name]=value;}
function data(el,name,value){value=String(value);if(el.dataset[name]!==value)el.dataset[name]=value;}
function refresh(){if(disposed)return;const s=audio.getState(),active=engine.mode==='active',playback=['original','master'].includes(engine.mode);syncWave();const selected=active?'original':s.selected,source=s.sources[selected];
 text($('track-name'),source.loaded?source.name:'Example waveform · no audio file');attribute($('track'),'aria-label',source.loaded?`Real waveform of ${source.name}`:'Example waveform. No audio file loaded.');data($('track'),'waveSource',source.loaded?selected:'example');
 property($('audio-play'),'disabled',!playback||!s.loaded);attribute($('audio-play'),'aria-label',s.playing?'Pause playback':`Play ${s.selected}`);attribute($('audio-play'),'title',s.playing?'Pause':'Play');property($('seek'),'disabled',!playback||!s.loaded);if(provUI==='normal'||!s.playing||(provUI==='second'&&Math.floor(s.currentTime)!==provSecond)){provSecond=Math.floor(s.currentTime);property($('seek'),'value',String(s.duration?Math.round(s.currentTime/s.duration*1000):0));}if(provUI!=='quiet'||!s.playing){text($('time'),`${time(s.currentTime)} / ${time(s.duration)}`);attribute($('seek'),'aria-valuetext',`${time(s.currentTime)} of ${time(s.duration)}`);}property($('level-match'),'disabled',!s.matchingAvailable);property($('level-match'),'checked',s.levelMatched);
 const p=processing.getState();if(active&&!journey){text($('processing-percent'),Math.round(p.progress*100)+'%');$('processing-fill').style.width=p.progress*100+'%';text($('processing-label'),`Silent visual demo · ${time(p.sourceTime)} / ${time(p.sourceDuration)}${journey?.getState().step==='processing'?' · example results follow':' · loops every 36 seconds'}`);}
 for(const slot of ['original','master']){if(!$(slot+'-name'))continue;const src=s.sources[slot];text($(slot+'-name'),loading[slot]?'Reading your file…':src.name||'No file loaded');property($(slot+'-file'),'disabled',loading[slot]);property($(slot+'-clear'),'disabled',!loading[slot]&&!src.loaded);}

 data(document.body,'mode',engine.mode);data(document.body,'playing',s.playing);data(document.body,'source',s.selected);journey?.refresh();
}
async function setMode(m){if(disposed)return;const ticket=++modeTicket;let error;if(m==='idle'||m==='active')audio.pause();if(m!=='idle'){const slot=m==='master'?'master':'original';try{await audio.select(slot)}catch(e){if(ticket!==modeTicket)return;if(audio.getState().selected!==slot)throw e;error=e;}}if(ticket!==modeTicket||disposed)return;
 if(m==='active')processing.enter({demo:true,duration:36});else processing.leave();track.setPresentationMode(m);$('track-stage').hidden=m==='idle';$('transport').hidden=!studioPage()||!['original','master'].includes(m)||!audio.getState().loaded;$('processing-line').hidden=m!=='active';syncMotion();engine.setMode(m);$('brain-state').textContent=m==='active'&&page==='master'?'02 / MASTERING':labels[m][0];$('brain-caption').textContent=labels[m][1];$('wave-mode').textContent='/ '+(m==='active'?'MASTERING':m.toUpperCase());track.resize(!engine.running);refresh();redraw();if(error)report(error);
}
/* Vågformens material bakas för en bestämd bredd och sparas under den som
   nyckel. Medan #track-stage är dolt mäter duken sig till noll, så spåret
   behåller den bredd det råkade få vid sidladdningen. När steget visas i
   mastring eller analys är bredden en annan, materialcachen töms och hela
   materialet måste bakas om synkront mitt i lägesövergången. Uppmätt blev
   det en enda bildruta på 50 ms, alltså det hack man ser.
   Här tar vi bort hidden, mäter och sätter tillbaka det i samma synkrona
   block. Ingenting hinner målas, det kostar under en millisekund, och
   förberedelsen nedanför sker på den bredd som faktiskt kommer att
   användas, medan användaren ändå står och väljer inställningar. */
function matVagformenTrotsAttDenArDold(){
 const stage=$('track-stage');if(!stage)return;
 const doldFore=stage.hidden;stage.hidden=false;
 try{track.resize(false);}finally{stage.hidden=doldFore;}
}
const AUDIO_EXT=/\.(wav|wave|aiff?|flac|mp3|m4a|aac|ogg|oga|opus|caf|mp4|webm)$/i;
function looksLikeAudio(file){return /^audio\//i.test(file.type||'')||AUDIO_EXT.test(file.name||'');}
async function loadFile(file,slot){if(!file)return;if(!looksLikeAudio(file)){report(new Error(window.MastrifyCopy?.STRINGS.rejectUpload||'Please choose an audio file (WAV, MP3, FLAC, AIFF, M4A, or similar).'));return;}if(file.size>100*1024*1024){report(new Error('Choose an audio file up to 100 MiB.'));return;}const ticket=++tokens[slot];loading[slot]=true;if($('studio-error'))$('studio-error').textContent='';refresh();try{await audio.load(file,slot);if(disposed||ticket!==tokens[slot])return;const wave=audio.getWaveform(slot);const peak=wave?.reduce((v,p)=>Math.max(v,p.top,p.bottom),0)||0;peaks[slot]=peak>0?20*Math.log10(peak):null;if(slot==='original'){MastrifySession.replace(file);audio.clear('master');}if(wave){matVagformenTrotsAttDenArDold();await track.prepareWaveform(wave);}if(disposed||ticket!==tokens[slot])return false;if(studioPage()){journey?.fileLoaded(slot);}refresh();redraw();return true;}catch(e){if(ticket===tokens[slot])report(e);return false;}finally{if(ticket===tokens[slot]){loading[slot]=false;refresh();}}}
function clearFile(){tokens.original++;tokens.master++;loading.original=false;loading.master=false;peaks.original=null;peaks.master=null;MastrifySession.reset();audio.clear();journey?.fileCleared();setMode('idle');refresh();}
async function playSource(slot){const x=scrollX,y=scrollY;try{await setMode(slot);if(!audio.getState().playing)await audio.play();motion=true;syncMotion();engine.activatePlayback();refresh();}catch(error){report(error);}finally{window.scrollTo({left:x,top:y,behavior:'instant'});}}
function wireStudio(){
 const on=(node,name,fn)=>node?.addEventListener(name,fn,{signal:studioEvents.signal});
 on($('original-file'),'change',e=>{const f=e.target.files?.[0];e.target.value='';loadFile(f,'original');});
 on($('original-clear'),'click',clearFile);
 const card=document.querySelector('[data-drop="original"]');
 on(card,'dragover',e=>{e.preventDefault();card.classList.add('dragging');});on(card,'dragleave',()=>card.classList.remove('dragging'));
 on(card,'drop',e=>{e.preventDefault();card.classList.remove('dragging');loadFile(e.dataTransfer.files?.[0],'original');});
 document.querySelectorAll('[data-slot]').forEach(b=>{on(b,'pointerdown',e=>{if(e.isPrimary&&e.button===0){e.preventDefault();b.focus({preventScroll:true});}});on(b,'click',()=>playSource(b.dataset.slot));});
}

const titles={home:'Intelligent mastering engine',analyze:'Analyze your mix',master:'Master your track','how-it-works':'Why Mastrify',pricing:'Pricing',contact:'Contact',about:'About Mastrify',blog:'Blog',privacy:'Privacy Policy',terms:'Terms of Service'};
async function route(path,push=true){const url=new URL(path,location.origin),key=url.pathname.replace(/^\/+|\/+$/g,'')||'home';if(!Object.hasOwn(titles,key))return false;const ticket=++routeTicket;clearScrub();MastrifyWhy.unmount();journey?.dispose();journey=null;delete document.body.dataset.step;studioEvents.abort();studioEvents=new AbortController();page=key;engine.analysisRenderer=page==='analyze'&&typeof MastrifyRadialAnalysis!=='undefined'?MastrifyRadialAnalysis.render:null;track.analysisRenderer=null;if(push)history.pushState({},'',(key==='home'?'/':'/'+key)+url.search);document.body.dataset.page=page;document.title=`Mastrify | ${titles[page]}`;document.querySelector('.header').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');$('menu-toggle').setAttribute('aria-label','Open navigation');document.querySelectorAll('.header nav a').forEach(a=>{if(a.getAttribute('href')===(page==='home'?'/':'/'+page))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});$('page-content').innerHTML=MastrifyPages[page]||'';
 // Why Mastrify lånar hjärnan: den flyttas in i sidan och tillbaka efteråt,
 // så motorn, synlighetsvakten och alla id-referenser står kvar orörda.
 const brainPage=page==='how-it-works';if(brainPage)MastrifyWhy.mount();const hasScene=page==='home'||studioPage();$('experience').hidden=!hasScene;sceneVisible=hasScene||brainPage;$('hero-copy').hidden=page!=='home';$('studio-panel').hidden=!studioPage();if(studioPage()){journey=createMastrifyJourney({container:$('studio-panel'),page,refresh,setMode,report,notify,loadFile,clearFile,preparePreview:async preview=>{for(const id of ['original','master'])await track.prepareWaveform(audio.getWaveform(id,{start:preview.sourceStart,end:preview.sourceStart+preview.duration}));},navigate:route,isLoading:()=>loading.original||loading.master});wireStudio();}else $('studio-panel').innerHTML='';MastrifyControlLights.refresh();if(journey)await journey.init();else await setMode('idle');if(ticket!==routeTicket||disposed)return false;if(ticket!==routeTicket||disposed)return false;engine.resize();track.resize(!engine.running);refresh();window.scrollTo({top:0,behavior:'instant'});
 // For the backend adapter (page views): fired after every page change, the first load included.
 document.dispatchEvent(new CustomEvent('mastrify:route',{detail:{page,path:location.pathname+location.search}}));return true;}
listen(document,'click',e=>{const a=e.target.closest('a');if(!a||a.target||a.hasAttribute('download')||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||u.hash)return;if(Object.hasOwn(titles,u.pathname.replace(/^\/+|\/+$/g,'')||'home')){e.preventDefault();route(u.pathname+u.search).catch(report);}});listen(window,'popstate',()=>route(location.pathname+location.search,false).catch(report));
engine.onRender=(t,e)=>{track.reducedMotion=engine.reducedMotion;if(paintVisibility.lpPaint)MastrifyBandGlow?.draw(engine);track.activation=MastrifyEffects.enabled('awakening')?engine.ignitionStrength():0;track.playbackBlend=engine.modeBlend?{original:engine.modeBlend.original,master:engine.modeBlend.master}:null;track.playbackFlash=engine.playbackFlash||0;const waveStarted=MastrifyCanvas.measureFrames?performance.now():0;if(paintVisibility.wavePaint&&!$('track-stage').hidden&&provWave)track.renderAt(t,e);engine.lastWaveMs=MastrifyCanvas.measureFrames?performance.now()-waveStarted:0;if(performance.now()-lastUI>150){lastUI=performance.now();refresh();}};
// Mätläge för uppspelningen på riktiga telefoner. Laddas bara med ?prov=spel.
try{if(new URLSearchParams(location.search).get('halv')==='1'){window.MastrifyGrooveHalfRate=true;window.MastrifyFilamentHalfRate=true;}}catch{}
// Skivans ring på grafikkretsen (gpu-disc.js), för att titta: ?gpu=1.
try{if(new URLSearchParams(location.search).get('gpu')==='1')engine.setGpuDisc(true);}catch{}
try{if(new URLSearchParams(location.search).get('prov')==='spel'){const s=document.createElement('script');s.src='/spelprov.js?v=20260920-prov14';s.onload=()=>window.MastrifySpelprov?.start({engine,track,setWave:v=>{provWave=!!v;},setUI:v=>{provUI=v||'normal';},lpVisible:()=>paintVisibility.lpPaint,seekAt:(x,final)=>seekAtPointer(x,!!final),scrubbing:()=>waveInteraction.dataset.scrubbing==='true'});document.head.append(s);}}catch{}
listen($('motion'),'click',()=>{motion=!motion;if(!motion)audio.pause();syncMotion();refresh();});listen(motionQuery,'change',e=>{engine.reducedMotion=e.matches;syncMotion();if(e.matches)engine.setMode(engine.mode,true);refresh();redraw();});
listen($('audio-play'),'click',async()=>{try{if(audio.getState().playing)audio.pause();else{motion=true;syncMotion();await audio.play();engine.activatePlayback();}refresh();if(!engine.running)redraw();}catch(e){report(e)}});listen($('seek'),'input',()=>{MastrifyNotes.reset(engine.ctx);audio.seek(Number($('seek').value)/1000*audio.getState().duration);refresh();redraw();});listen($('seek'),'keydown',event=>{const s=audio.getState();if(!s.loaded)return;let at;if(event.key==='ArrowRight'||event.key==='ArrowUp')at=s.currentTime+5;else if(event.key==='ArrowLeft'||event.key==='ArrowDown')at=s.currentTime-5;else if(event.key==='Home')at=0;else if(event.key==='End')at=s.duration;else return;event.preventDefault();audio.seek(Math.max(0,Math.min(s.duration,at)));$('seek').value=String(Math.round(Math.max(0,Math.min(s.duration,at))/s.duration*1000));refresh();redraw();});listen($('level-match'),'change',()=>{audio.setLevelMatch($('level-match').checked);refresh()});listen($('menu-toggle'),'click',()=>{const open=document.querySelector('.header').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open));$('menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');});
// The waveform owns a direct drag; the surrounding page keeps normal scrolling.
const waveInteraction=document.querySelector('.wave-interaction');
waveInteraction.append($('transport'));
let scrub=null,scrubFrame=0;
function canScrub(){return studioPage()&&journey?.getState().step==='results'&&['original','master'].includes(engine.mode)&&audio.getState().loaded;}
function clearScrub(){
 const prior=scrub;scrub=null;
 cancelAnimationFrame(scrubFrame);scrubFrame=0;
 delete waveInteraction.dataset.scrubbing;
 if(prior&&waveInteraction.hasPointerCapture(prior.id))waveInteraction.releasePointerCapture(prior.id);
}
function seekAtPointer(x,final=false){
 const rect=$('track').getBoundingClientRect(),pad=Math.max(10,rect.width*.016),width=rect.width-2*pad;
 if(width<=0)return;
 const duration=audio.getState().duration,position=Math.max(0,Math.min(1,(x-rect.left-pad)/width))*duration;
 // Medan fingret drar följer bilden och tiden fingret varje bildruta, och
 // ljudet hoppar när fingret släpper (audio-reactivity.js seek).
 audio.seek(!final&&scrub?.wasPlaying?Math.min(position,Math.max(0,duration-.05)):position,{drag:!final});
 // Audio subscribers refresh the controls; the engine paints the next frame.
 redraw();
}
function currentScrub(event){return scrub&&event.pointerId===scrub.id&&scrub.route===routeTicket&&scrub.revision===MastrifySession.revision&&scrub.source===audio.getState().selected&&canScrub();}
listen(waveInteraction,'pointerdown',event=>{
 if(!event.isPrimary||event.button!==0||event.target.closest('#transport')||!canScrub())return;
 clearScrub();
 scrub={id:event.pointerId,x:event.clientX,route:routeTicket,revision:MastrifySession.revision,source:audio.getState().selected,wasPlaying:audio.getState().playing};
 waveInteraction.setPointerCapture(event.pointerId);waveInteraction.dataset.scrubbing='true';
 if(event.cancelable)event.preventDefault();
 MastrifyNotes.reset(engine.ctx);seekAtPointer(event.clientX);
});
listen(waveInteraction,'pointermove',event=>{
 if(!scrub||event.pointerId!==scrub.id)return;
 if(!currentScrub(event)||(event.pointerType==='mouse'&&!(event.buttons&1))){clearScrub();return;}
 if(event.cancelable)event.preventDefault();
 scrub.x=event.clientX;
 if(!scrubFrame)scrubFrame=requestAnimationFrame(()=>{
  scrubFrame=0;
  if(scrub&&currentScrub({pointerId:scrub.id}))seekAtPointer(scrub.x);else clearScrub();
 });
});
listen(waveInteraction,'pointerup',event=>{
 if(!scrub||event.pointerId!==scrub.id)return;
 if(currentScrub(event)){if(event.cancelable)event.preventDefault();seekAtPointer(event.clientX,true);}
 clearScrub();
});
listen(window,'pointerup',event=>{if(scrub?.id===event.pointerId)clearScrub();});
for(const eventName of ['pointercancel','lostpointercapture'])listen(waveInteraction,eventName,event=>{if(scrub?.id===event.pointerId)clearScrub();});
listen(window,'blur',clearScrub);
const unsubscribe=audio.subscribe(()=>{refresh();if(!engine.running&&!engine.reducedMotion)redraw();});
listen(window,'pagehide',()=>{clearScrub();MastrifyWhy.unmount();disposed=true;visibility.dispose();modeTicket++;tokens.original++;tokens.master++;clearInterval(reducedTimer);events.abort();studioEvents.abort();journey?.dispose();clearTimeout(noticeTimer);unsubscribe();engine.onRender=null;engine.destroy();track.destroy();processing.leave();MastrifyProcessingMotion.reset();audio.clear();});window.addEventListener('pageshow',e=>{if(e.persisted&&disposed)location.reload()});
listen($('expand-wave'),'click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('track-stage').requestFullscreen();track.resize(!engine.running);redraw();}catch{report('Use your browser’s full-screen view to expand the waveform.')}});
// Progress/audio stay live while both canvases are offscreen. A coarse clock
// advances the invisible transition without submitting any scene paint.
const reducedTimer=setInterval(()=>{advanceCoarseClock();if(!disposed&&!engine.running&&!document.hidden&&(processing.getState().active||audio.getState().playing))refresh();},150);
function studioState(){const s=audio.getState();return {page,mode:engine.mode,animationPlaying:engine.running,audioPlaying:s.playing,selected:s.selected,originalLoaded:s.sources.original.loaded,masterLoaded:s.sources.master.loaded,currentTime:s.currentTime,duration:s.duration,sourceTime:s.sourceTime,preview:s.preview,frequencyLight:audio.samplePlaybackBands(),journey:journey?.getState()||null,scope:'Design preview. No mastering or payment service connected.'};}
if(document.modelContext?.registerTool){const definitions=[{name:'get_mastrify_state',description:'Read the visible Mastrify preview state. Does not upload audio or change anything.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw new Error('No parameters expected.');return studioState();}},{name:'navigate_mastrify',description:'Open a public page in this Mastrify design preview. Preserves locally selected audio.',inputSchema:{type:'object',properties:{page:{type:'string',enum:Object.keys(titles)}},required:['page'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(!input||Object.keys(input).length!==1||typeof input.page!=='string'||!Object.hasOwn(titles,input.page))throw new Error('Choose a supported Mastrify page.');await route(input.page==='home'?'/':'/'+input.page);return studioState();}}];for(const def of definitions){try{Promise.resolve(document.modelContext.registerTool(def,{signal:events.signal})).catch(()=>{});}catch{}}}
route(location.pathname+location.search,false).then(ok=>{if(!ok){
 // v2: unknown address (or the static 404.html): keep the shell, show a note.
 document.title='Mastrify | Page not found';document.body.dataset.page='home';$('hero-copy').hidden=true;$('experience').hidden=false;
 $('page-content').innerHTML='<section class="page-head wrap"><p class="eyebrow">404</p><h1>Page not found.</h1><p>That address does not exist on Mastrify. The music, however, is still here.</p><div class="hero-actions"><a class="button primary" href="/master">Start mastering ↗</a><a class="text-link" href="/">Back to the start ↗</a></div></section>';$('page-content').hidden=false;}
 document.body.dataset.ready='true';}).catch(report);
})();
