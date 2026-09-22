/* Studio vocabulary (v2). Every string here matches mastrify.com's live
 * product copy (scanned 2026-09-21) so the interface speaks the same
 * language the real engine will. Data only: no behaviour, no network. */
(() => {
 'use strict';
 const STYLES=[
  {id:'Balanced',tagline:'Natural & versatile',intensity:'Subtle',worksWellFor:['Pop','Rock','EDM','All-round'],tags:['Streaming','Natural','Open'],
   summary:'The safe all-rounder: clean level, even tone, and translation you can trust on any platform.',
   details:['Neutral polish with even lows and controlled highs.','Transparent compression that preserves musical movement.','Natural width with a stable, mono-safe center.','Flexible starting point when you want polish without a strong color.']},
  {id:'Warm',tagline:'Soft & smooth',intensity:'Moderate',worksWellFor:['Acoustic','Indie','Soul','Vintage'],tags:['Gentle','Intimate','Smooth'],
   summary:'Adds body and rounds sharp edges for a fuller, less aggressive master.',
   details:['Softer top end with richer low-mid warmth.','Gentle compression that keeps the mix breathing.','Slightly narrower image with an intimate focus.','Great when you want comfort, nostalgia, or vocal-forward warmth.']},
  {id:'Punchy',tagline:'Loud & aggressive',intensity:'Bold',worksWellFor:['Rap','Pop','Rock','EDM'],tags:['Loud','Forward','Impact'],
   summary:'Pushes density, impact, and forwardness for competitive loudness.',
   details:['Tighter lows with more midrange punch and edge.','Firm limiting and compression for maximum impact.','Focused center image that hits hard on small speakers.','Ideal when you need energy, attitude, and chart-ready loudness.']},
  {id:'Club',tagline:'Heavy & impactful',intensity:'Bold',worksWellFor:['House','Techno','Festival','Dance'],tags:['Heavy','Focused','Driving'],
   summary:'Prioritizes sub weight, punch, and playback impact on larger systems.',
   details:['Thick low end with controlled mud and strong body.','Club-ready density with assertive transient control.','Controlled width that stays powerful on PA systems.','Built for dancefloors, not limited to one genre if you want weight.']},
  {id:'Open',tagline:'Wide & spacious',intensity:'Moderate',worksWellFor:['Cinematic','Ambient','Progressive','Live'],tags:['Lifted','Wide','Airy'],
   summary:'Brighter, wider, and more energetic with extra spatial lift.',
   details:['More air, openness, and forward presence in the highs.','Energetic movement with festival-scale impact.','Wider sides and immersive spatial depth.','Perfect when space, drama, and height matter more than raw loudness.']}
 ];
 const TARGETS=[
  {value:-14,id:'streaming',label:'Streaming',description:'Most transparent. Best for balanced streaming playback.',profile:'Streaming Optimized',profileNote:'Balanced loudness for playlists'},
  {value:-13,id:'youtube',label:'YouTube',description:'A small lift while preserving dynamics.',profile:'YouTube Optimized',profileNote:'Clear and consistent online playback'},
  {value:-11,id:'spotifyLoud',label:'Spotify Loud',description:'Noticeably louder and denser for casual listening.',profile:'Spotify Loud Optimized',profileNote:'Punchy streaming presence'},
  {value:-9,id:'cdClub',label:'CD / Club',description:'Maximum loudness target. More impact, less dynamic headroom.',profile:'Club Optimized',profileNote:'Adaptive club loudness'}
 ];
 const TARGET_INTRO='Lower LUFS keeps more openness and dynamics. Higher LUFS sounds louder and denser, but leaves less peak headroom.';
 const SLIDERS={
  width:{label:'Stereo enhancement',short:'Stereo width',description:'Controls stereo width and spatial depth.',
   hints:['Lower values keep the image focused and mono-safe with a firm center.','Mid values preserve a natural stereo image with controlled spatial depth.','Higher values open cinematic width and air while keeping vocals and kick/snare centered.']},
  low:{label:'Low end control',short:'Low end',description:'Tightens or enhances bass response.',
   hints:['Lower values tighten subs and reduce boom for cleaner kick/bass separation.','Mid values keep the low end balanced and controlled.','Higher values add bass body and heavier release-ready weight.']},
  clarity:{label:'Clarity & presence',short:'Clarity',description:'Adds brightness, vocal clarity, and detail.',
   hints:['Lower values smooth sharp highs and keep the master warmer.','Mid values add detail while keeping vocals and instruments natural.','Higher values add polished detail, presence, and release-ready shine, not just boosted highs.']}
 };
 const ADVANCED_INTRO='Tuned for interactive mastering: small moves stay polished, while the upper range creates clearly audible character changes.';
 function sliderHint(key,value){const s=SLIDERS[key];if(!s)return '';const v=Number(value)||0;return s.hints[v<34?0:v>66?2:1];}

 /* Analysis library. `when` reads the measured profile; `gain` is the
  * readiness lift the fix could bring. Order = priority when several apply. */
 const ISSUES=[
  {id:'lowLevel',metric:'Loudness',title:'Low output level',subtitle:'Your mix is too quiet compared to commercial tracks',advice:'Increase gain before the limiter, not after, and make sure kick and bass are hitting strong before pushing loudness.',tips:'level',gain:12,when:p=>p.loudness<-20},
  {id:'overcompressed',metric:'Dynamics',title:'Overcompressed mix',subtitle:'Dynamics feel a touch flattened',advice:'Backing off bus limiting can restore punch. Aim for musical movement, not maximum level.',tips:null,gain:9,when:p=>p.crest<7||(p.range<2&&p.crest<9)},
  {id:'tooDynamic',metric:'Dynamics',title:'Mix is too dynamic and may sound weak compared to commercial tracks',subtitle:'Dynamics may feel uncontrolled on smaller speakers',advice:'Big peaks can disappear on phones. Light bus glue keeps the body present without killing punch.',tips:'dynamics',gain:10,when:p=>p.range>14},
  {id:'tooMuchRange',metric:'Dynamics',title:'Too much dynamic range',subtitle:'Dynamics could feel more glued',advice:'Volume swings are wide. A touch of glue can help the mix translate on small speakers.',tips:'dynamics',gain:7,when:p=>p.range>10&&p.range<=14},
  {id:'stereoNarrow',metric:'Stereo',title:'Stereo too narrow',subtitle:'Stereo image feels tight',advice:'Your mix feels slightly narrow compared to modern releases. Try widening pads and FX, not the kick or bass.',tips:'stereo',gain:8,when:p=>p.channels>1&&p.width<.18},
  {id:'stereoTune',metric:'Stereo',title:'Fine-tune stereo image',subtitle:'Stereo field could feel more immersive',advice:'Widen reverbs and ear candy while keeping kick, bass, and vocal anchored in the center.',tips:'stereo',gain:5,when:p=>p.channels>1&&p.width>=.18&&p.width<.3},
  {id:'stereoInconsistent',metric:'Stereo',title:'Stereo image inconsistent',subtitle:'Stereo field loses focus in dense sections',advice:'Width can collapse when layers stack. Give reverbs and pads room at the sides without widening the kick.',tips:'stereo',gain:6,when:p=>p.channels>1&&p.widthSpread>.28},
  {id:'lowEndControl',metric:'Low end',title:'Low-end lacks control',subtitle:'Low end loses stability during heavier passages',advice:'The foundation may wobble when kicks and bass overlap. Gentle EQ and bus control can steady the feel.',tips:null,gain:7,when:p=>p.bassShare>.72&&p.bassSpread>.3},
  {id:'lowEndMuddy',metric:'Low end',title:'Low end muddy',subtitle:'Low end loses clarity in the low mids',advice:'Energy around 60–120 Hz may be masking the kick. Carve gently for a tighter low end.',tips:null,gain:7,when:p=>p.bassShare>.72},
  {id:'lowEndWeak',metric:'Low end',title:'Weak low-end',subtitle:'Low end could hit harder',advice:'The foundation could carry more weight for a fuller, controlled low end.',tips:null,gain:6,when:p=>p.bassShare<.25},
  {id:'kickPunch',metric:'Dynamics',title:'Kick lacks punch',subtitle:'Kick transient could hit harder',advice:'The attack may be masked by low-mid buildup. Check kick EQ and how it shares space with the bass.',tips:null,gain:5,when:p=>p.accent<.12&&p.bassShare>.4},
  {id:'transients',metric:'Energy',title:'Transient energy could be improved',subtitle:'Transients could feel sharper and more defined',advice:'Drums and perc can gain clarity with subtle transient shaping or parallel compression.',tips:null,gain:5,when:p=>p.accent<.12&&p.bassShare<=.4},
  {id:'brightness',metric:'Highs',title:'Lacking brightness',subtitle:'Top end could use more air and presence',advice:'A gentle high shelf or saturation can add sheen without making the mix harsh.',tips:'brightness',gain:6,when:p=>p.airShare<.025},
  {id:'brightnessSoft',metric:'Highs',title:'Lacks brightness',subtitle:'Top end could use more air',advice:'A little more presence in the highs can help vocals and leads shine.',tips:'brightness',gain:4,when:p=>p.airShare>=.025&&p.airShare<.05},
  {id:'highEndSmoother',metric:'Highs',title:'High-end could be smoother',subtitle:'Top end could feel silkier and less edgy',advice:'A little de-essing or gentle shelf work can tame harshness while keeping air.',tips:null,gain:5,when:p=>p.airShare>.2},
  {id:'vocalsBuried',metric:'Presence',title:'Vocals slightly buried',subtitle:'Vocals sit slightly behind the mix',advice:'The vocal may need a touch more level or presence in the upper mids to sit on top of the bed.',tips:null,gain:5,when:p=>p.midShare<.2&&p.bassShare>.5}
 ];
 const TIPS={
  level:{title:'Low output level',subtitle:'Your mix is too quiet compared to commercial tracks',items:['Increase gain BEFORE limiter, not after','Control peaks gently','Increase overall level without distortion','Make sure kick and bass are hitting strong before pushing loudness']},
  dynamics:{title:'Too much dynamic range',subtitle:'Your mix has too big volume differences between elements',items:['Use bus compression on drums (2–4 dB reduction)','Control peaks with a limiter or soft clipper','Glue instruments together with light compression','Aim for a tighter and more consistent loudness curve']},
  stereo:{title:'Stereo too narrow',subtitle:'Your mix feels centered and lacks width',items:['Widen pads, FX and synth layers (NOT bass)','Pan percussion slightly left/right','Use stereo imaging on high frequencies only','Keep kick and bass fully mono for power']},
  brightness:{title:'Lacking brightness',subtitle:'Your mix lacks clarity in the high-end',items:['Boost around 8–12kHz with a gentle shelf EQ','Add saturation to bring out harmonics','Enhance hats, vocals and top layers','Be careful not to make it harsh. Aim for clean shine']}
 };
 const ENERGY={
  description:'Overall movement and intensity across the arrangement.',
  levels:[
   {id:'Aggressive',text:'Relentless drive with little rest, built for maximum intensity.',level:'High energy',when:p=>p.accent>=.3&&p.movement<.2},
   {id:'Punchy',text:'The track pushes forward with conviction, great for impact-led genres.',level:'High energy',when:p=>p.accent>=.22},
   {id:'Driven',text:'Momentum keeps building, with sections that lift and land.',level:'High energy',when:p=>p.movement>=.32},
   {id:'Steady',text:'Energy feels even and controlled across the arrangement.',level:'Medium energy',when:p=>p.accent>=.1},
   {id:'Atmospheric',text:'Space and texture lead; the intensity stays soft and cinematic.',level:'Medium energy',when:()=>true}
  ]
 };
 const READINESS=[
  {min:85,headline:'Your mix is release-ready. Mastering can focus on level and polish',recommendation:'Ready for a final master',focus:'Keep the balance you have. Choose a loudness goal and let the engine hold back where it should.'},
  {min:60,headline:'Your mix is close. A few tweaks can unlock more impact',recommendation:'Further polish recommended before release',focus:'Small moves can raise release readiness.'},
  {min:0,headline:'Your mix needs attention before a final master shines',recommendation:'Fix the main issues, then analyze again',focus:'Focus on width, level, and clarity. Small moves can raise release readiness.'}
 ];
 const PHASES={
  analyze:[['Reading dynamics','Perceiving punch and movement'],['Mapping stereo field','Width and spatial placement'],['Detecting tonal balance','Brightness, warmth, and air'],['Evaluating loudness profile','Integrated level and headroom'],['Measuring transient energy','Attack, groove, and life'],['Building release-readiness profile','Synthesizing your mix portrait']],
  master:[['Analyzing mix','Listening to the whole picture'],['Balancing EQ','Even lows, controlled highs'],['Optimizing dynamics','Punch preserved, peaks guided'],['Enhancing stereo image','Width with a grounded center'],['Finalizing master','Processing with musical intelligence...']]
 };

 /* Master result vocabulary. */
 const MASTER_NAMES={Balanced:'Streaming Master',Warm:'Warm Master',Punchy:'Punchy Master',Club:'Club Master',Open:'Open Master'};
 function masterName(settings){
  const style=String(settings?.style||'Balanced'),target=Number(settings?.target);
  if(style==='Club'&&target<=-9)return 'Adaptive Club Master';
  if(Number(settings?.low)<=30)return 'Tight Low-End Master';
  if(style==='Balanced'&&target>-14)return 'Smart Master';
  return MASTER_NAMES[style]||'Smart Master';
 }
 function masterTags(settings,profile){
  const style=String(settings?.style||''),tags=[];
  const wide=Number(settings?.width)>=60,tight=Number(settings?.low)<=40;
  if(profile&&profile.crest<7.5)tags.push('Minimal touch','Mix trusted');
  else tags.push('Movement preserved');
  if(style==='Balanced')tags.push('Transparent','Earned processing');
  else if(style==='Warm')tags.push('Smooth','Open dynamics');
  else if(style==='Punchy')tags.push('Dynamic','Focused');
  else if(style==='Club')tags.push(tight?'Tight low-end':'Full lows','Focused');
  else if(style==='Open')tags.push('Spacious','Open dynamics');
  tags.push(wide?'Wide':'Tight');
  return [...new Set(tags)].slice(0,4);
 }
 function loudnessNotes(settings,profile){
  const target=Number(settings?.target),measured=profile?Number(profile.loudness):NaN;
  const notes=[];
  if(Number.isFinite(measured)&&measured>=target-1.5)notes.push('Minimal processing on an already-limited mix');
  else if(target<=-9)notes.push('Adaptive loudness protection applied');
  else notes.push('Transparent loudness, transients and dynamics preserved');
  notes.push('Preserved punch and dynamics','Smart loudness shaping for your mix');
  return notes.slice(0,3);
 }
 const STRINGS={
  rejectUpload:'Please choose an audio file (WAV, MP3, FLAC, AIFF, M4A, or similar) from Files or your export folder.',
  formats:'WAV, AIFF, FLAC, MP3, M4A · up to 100 MiB',
  acceptList:'audio/*,.wav,.wave,.aiff,.aif,.flac,.mp3,.m4a,.aac,.ogg,.opus,.caf',
  noMaster:'No master in this session.',startNewMaster:'Start a new master',
  uploadFailed:'Upload failed',analysisFailedNetwork:'Analysis failed. Check your connection.',analysisFailed:'Analysis failed. Please try again.',analysisNoData:'Analysis returned no data',
  masterFailed:'Mastering failed. Please try again.',masterFailedNetwork:'Mastering failed. Check your connection.',
  waveformFailed:'Could not load waveform',readingAudio:'Reading audio…',
  invalidCode:'Invalid discount code.',enterCode:'Enter a discount code.',applyingCode:'Applying code…',freeCodeFailed:'Could not apply free discount code.',
  continueFree:'Continue, free',redirecting:'Redirecting to checkout…',checkoutFailed:'Could not start checkout. Please try again.',verifyFailed:'Could not verify payment.',checkoutCancelled:'Checkout cancelled. Your master is still here.',getDownload:'Get download link',
  paymentComplete:'Payment complete. Enter your email to receive your mastered track and secure download link. You can reopen it later from any device, even if this page is closed.',
  emailMaster:'Email my master',notNow:'Not now',emailFailed:'Could not send email. Please try again.',emailInvalid:'Enter a valid email address.',
  emailSent:'Sent to {to}. The link stays valid for 12 hours.',emailSentTest:'Test mode: nothing was sent. A real backend emails {to} a secure download link.',
  shareTitle:'Listen to my master on Mastrify',copied:'Copied',copyFailed:'Copy failed',
  expandPreview:'Expand preview',newMaster:'New master',mappingMix:'The engine is mapping your mix. This usually takes a moment',
  processingHint:'Typically 30–60 seconds · Do not close this window'
 };
 window.MastrifyCopy={STYLES,TARGETS,TARGET_INTRO,SLIDERS,ADVANCED_INTRO,sliderHint,ISSUES,TIPS,ENERGY,READINESS,PHASES,MASTER_NAMES,masterName,masterTags,loudnessNotes,STRINGS,
  style:id=>STYLES.find(s=>s.id===id)||STYLES[0],target:value=>TARGETS.find(t=>t.value===Number(value))||TARGETS[0]};
})();
