/* Analysis report, two layouts (v2 proposals): "rack" and "orbit".
 * Pure markup builders. journey.js binds the same ids/classes as before
 * (#print-result, #share-result, #master-same-track, #new-result,
 * .metric-toggle/.metric-reveal, .insight-toggle/.insight-reveal), so the
 * expandable cards keep their behaviour. Content follows mastrify.com's
 * analysis page: header, release readiness, eight metrics, next step,
 * issues found, action tips. */
(() => {
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
 const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
 // Live labels for two of our eight metrics.
 const LABEL={Tone:'Brightness',Presence:'Clarity'};
 const FAMILY={Loudness:'level',Dynamics:'level',Stereo:'space','Low end':'space',Tone:'tone',Highs:'tone',Energy:'drive',Presence:'drive'};
 const ICON={
  Loudness:'<path d="M5 17v-4m7 4V7m7 10V4M3 20h18"/>',
  Dynamics:'<path d="M2 12h3l2-7 4 14 3-12 3 10 2-5h3"/>',
  Stereo:'<path d="M10 12H3M7 8l-4 4 4 4M14 12h7M17 8l4 4-4 4"/>',
  'Low end':'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  Tone:'<path d="M5 3v7m0 4v7M12 3v3m0 4v11M19 3v11m0 4v3"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>',
  Energy:'<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>',
  Presence:'<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8"/>',
  Highs:'<path d="M3 9c3-4 6-4 9 0s6 4 9 0M3 16c3-4 6-4 9 0s6 4 9 0"/>'
 };
 const icon=label=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[label]||ICON.Presence}</svg>`;
 // Where a measured value sits on its scale, plus the zone that reads as
 // release-ready. Used by the orbit layout's level bars.
 function gauge(label,p){
  if(!p)return null;
  const map={
   Loudness:{v:p.loudness,lo:-26,hi:-6,good:[-16,-9],ends:['−26 LUFS','−6 LUFS']},
   Dynamics:{v:p.range,lo:0,hi:20,good:[4,12],ends:['0 dB','20 dB']},
   Stereo:{v:p.channels<2?0:p.width,lo:0,hi:1,good:[.25,.6],ends:['mono','wide']},
   'Low end':{v:p.bassShare,lo:0,hi:1,good:[.3,.65],ends:['light','heavy']},
   Tone:{v:p.airShare,lo:0,hi:.3,good:[.03,.15],ends:['dark','bright']},
   Energy:{v:p.accent,lo:0,hi:.5,good:[.12,.4],ends:['calm','driven']},
   Presence:{v:p.midShare,lo:0,hi:.7,good:[.25,.5],ends:['soft','forward']},
   Highs:{v:p.airShare,lo:0,hi:.3,good:[.04,.18],ends:['soft','edgy']}
  }[label];
  if(!map||!Number.isFinite(map.v))return null;
  const pos=(x)=>clamp((x-map.lo)/(map.hi-map.lo));
  return {pos:pos(map.v),from:pos(map.good[0]),to:pos(map.good[1]),ends:map.ends};
 }
 function severityOf(i,n){return i.severity||(n===0?'main':n===1?'medium':'low');}
 function readinessAfter(score,gain){return Math.round(Math.min(100,score+(Number(gain)||0)));}

 function header(ctx){
  const {result}=ctx;
  return `<div class="rv-head"><div><span class="eyebrow">ANALYSIS COMPLETE</span><h2>Your mix, understood.</h2><p class="rv-track"><b>${esc(result.name||'Your track')}</b>${ctx.duration?` · ${time(ctx.duration)}`:''}${result.demo?' · in-browser measurement':''}</p></div><div class="rv-actions"><button id="share-result" class="rv-pill">Share <span>↗</span></button><button id="print-result" class="rv-pill">Download PDF <span>↓</span></button></div></div>`;
 }
 function metricDetail(m,i,ctx,extra=''){
  const label=LABEL[m.label]||m.label;
  return `<div class="metric-reveal rv-reveal" id="metric-detail-${i}" inert><div><p class="rv-reading"><span>${ctx.result.demo?'MEASURED · APPROX.':'SOUND PROFILE'}</span><b>${esc(m.detail||'')}</b></p><p>${esc(m.description||'')}</p>${extra}<p class="rv-meaning"><span>WHAT ${esc(label.toUpperCase())} DESCRIBES</span>${esc(m.explanation||ctx.notes?.[m.label]||'')}</p></div></div>`;
 }
 function issueBits(insight,n,ctx){
  const score=Number(ctx.result.analysis.readiness)||0,sev=severityOf(insight,n),gain=Number(insight.gain);
  const g=Number.isFinite(gain)?Math.round(gain):0,now=Math.round(score),after=readinessAfter(score,g);
  return {sev,gain,g,now,after,fam:FAMILY[insight.metric]||'drive',view:window.MastrifyIssueSketches?.find(insight)||ctx.views?.[insight.title]||Object.values(ctx.views||{}).find(v=>v.label===insight.metric)||null,tips:n===0&&ctx.result.analysis.tips?ctx.result.analysis.tips:null};
 }
 function issueBlock(insight,n,ctx,{numbered=false}={}){
  const {sev,gain,g,now,after,view,tips}=issueBits(insight,n,ctx);
  const reveal=`<div class="insight-reveal rv-reveal" id="insight-detail-${n}" inert><div>${view?`<figure class="sound-sketch" data-sketch="${esc(view.kind)}"><span>ILLUSTRATION · HOW IT WORKS</span><svg viewBox="0 0 300 150" role="img" aria-label="${esc(view.description)}"><defs><linearGradient id="rv-sketch-${n}"><stop stop-color="#c39dff"/><stop offset=".55" stop-color="#e9dcff"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="rv-wash-${n}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b58cff" stop-opacity=".24"/><stop offset="1" stop-color="#b58cff" stop-opacity="0"/></linearGradient></defs><g style="--sketch-colour:url(#rv-sketch-${n});--sketch-wash:url(#rv-wash-${n})">${view.drawing}</g></svg><figcaption>${esc(view.caption)}</figcaption></figure>`:''}<div class="rv-advice"><span>TRY THIS</span><p>${esc(insight.text)}</p></div>${tips?`<div class="rv-tips"><span>ACTION TIPS · ${esc(tips.title.toUpperCase())}</span><ol>${tips.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`:''}</div></div>`;
  if(!numbered){
   // Orbit ticket: neon edge in the metric's family colour, the gain up
   // front, and a readiness lift bar that shows where the fix takes you.
   const fam=issueBits(insight,n,ctx).fam;
   return `<article class="sound-insight rv-issue rv-tk" data-severity="${esc(sev)}" data-family="${fam}"><button class="insight-toggle" aria-expanded="false" aria-controls="insight-detail-${n}"><span class="rv-tk-head"><span class="rv-issue-meta rv-tk-meta"><i class="rv-tk-dot" aria-hidden="true"></i>${sev==='main'?'<b>MAIN ISSUE</b><em>·</em>':''}<span>${esc(insight.metric||'Mix detail')}</span></span><span class="rv-gain"><b>+${g}</b>%</span></span><strong class="rv-tk-title">${esc(insight.title)}</strong>${insight.subtitle?`<small class="rv-tk-sub">${esc(insight.subtitle)}</small>`:''}<span class="rv-tk-lift" style="--now:${(now/100).toFixed(2)};--after:${(after/100).toFixed(2)}"><span class="rv-tk-bar" role="img" aria-label="Readiness ${now} percent, ${after} percent after the fix"><i class="rv-tk-now"></i><i class="rv-tk-gain"></i></span><span class="rv-tk-legend"><span class="rv-tk-read"><em>READINESS</em><b>${now}%</b><em class="rv-tk-arrow">→</em><b class="rv-tk-after">${after}%</b></span><span class="rv-tk-open"><span class="rv-tk-open-closed">See the fix</span><span class="rv-tk-open-open">Hide</span><i aria-hidden="true">+</i></span></span></span></button>${reveal}</article>`;
  }
  return `<article class="sound-insight rv-issue" data-severity="${esc(sev)}"><button class="insight-toggle" aria-expanded="false" aria-controls="insight-detail-${n}"><span class="rv-num">${String(n+1).padStart(2,'0')}</span><span class="rv-issue-copy"><span class="rv-issue-meta">${sev==='main'?'<b>MAIN ISSUE</b>':''}${esc(insight.metric||'Mix detail')}</span><strong>${esc(insight.title)}</strong>${insight.subtitle?`<small>${esc(insight.subtitle)}</small>`:''}</span><span class="rv-issue-side">${Number.isFinite(gain)?`<b>+${g}%</b>`:''}<small>Readiness ${now}% → ${after}%</small><i aria-hidden="true">+</i></span></button>${reveal}</article>`;
 }
 /* Main issue, proposal SPLIT: already open, nothing to click. Two panes,
  * what we hear now on the left and the fix on the right, the readiness
  * before and after as the big numbers. */
 function mainSplit(insight,n,ctx){
  const {g,now,after,fam,view,tips}=issueBits(insight,n,ctx);
  const sketch=view?`<figure class="sound-sketch rv-split-sketch" data-sketch="${esc(view.kind)}"><span>ILLUSTRATION · HOW IT WORKS</span><svg viewBox="0 0 300 150" role="img" aria-label="${esc(view.description)}"><defs><linearGradient id="rv-sketch-${n}"><stop stop-color="#c39dff"/><stop offset=".55" stop-color="#e9dcff"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="rv-wash-${n}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b58cff" stop-opacity=".24"/><stop offset="1" stop-color="#b58cff" stop-opacity="0"/></linearGradient></defs><g style="--sketch-colour:url(#rv-sketch-${n});--sketch-wash:url(#rv-wash-${n})">${view.drawing}</g></svg><figcaption>${esc(view.caption)}</figcaption></figure>`:'';
  return `<article class="rv-issue rv-split" data-severity="main" data-family="${fam}"><div class="rv-split-pane rv-split-now"><span class="rv-issue-meta rv-tk-meta"><i class="rv-tk-dot" aria-hidden="true"></i><b>MAIN ISSUE</b><em>·</em><span>${esc(insight.metric||'Mix detail')}</span></span><strong class="rv-split-title">${esc(insight.title)}</strong>${insight.subtitle?`<small class="rv-split-sub">${esc(insight.subtitle)}</small>`:''}${sketch||`<span class="rv-tk-lift rv-split-bar" style="--now:${(now/100).toFixed(2)};--after:${(after/100).toFixed(2)}"><span class="rv-tk-bar" aria-hidden="true"><i class="rv-tk-now"></i><i class="rv-tk-gain"></i></span></span>`}<span class="rv-split-score"><em>READINESS NOW</em><b>${now}<i>%</i></b></span></div><span class="rv-split-arrow" aria-hidden="true"><i>→</i></span><div class="rv-split-pane rv-split-fix"><span class="rv-split-eyebrow">THE FIX</span><p class="rv-split-advice">${esc(insight.text)}</p>${tips?`<span class="rv-split-eyebrow">ACTION TIPS · ${esc(tips.title.toUpperCase())}</span><ol class="rv-split-tips">${tips.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}<span class="rv-split-score rv-split-after"><em>AFTER THE FIX</em><b>${after}<i>%</i></b><span class="rv-gain"><b>+${g}</b>%</span></span></div></article>`;
 }
 /* Main issue, proposal STUB: a ticket with a perforated stub. The stub
  * carries the gain, the body carries the finding and a segment ladder
  * that lights up the lift. Opens like the other tickets. */
 function mainStub(insight,n,ctx){
  const {g,now,after,fam,view,tips}=issueBits(insight,n,ctx);
  const segs=28,lit=Math.round(now/100*segs),litAfter=Math.round(after/100*segs);
  const ladder=Array.from({length:segs},(_,i)=>`<i${i<lit?' data-on':i<litAfter?' data-gain':''}></i>`).join('');
  const reveal=`<div class="insight-reveal rv-reveal" id="insight-detail-${n}" inert><div>${view?`<figure class="sound-sketch" data-sketch="${esc(view.kind)}"><span>ILLUSTRATION · HOW IT WORKS</span><svg viewBox="0 0 300 150" role="img" aria-label="${esc(view.description)}"><defs><linearGradient id="rv-sketch-${n}"><stop stop-color="#c39dff"/><stop offset=".55" stop-color="#e9dcff"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="rv-wash-${n}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b58cff" stop-opacity=".24"/><stop offset="1" stop-color="#b58cff" stop-opacity="0"/></linearGradient></defs><g style="--sketch-colour:url(#rv-sketch-${n});--sketch-wash:url(#rv-wash-${n})">${view.drawing}</g></svg><figcaption>${esc(view.caption)}</figcaption></figure>`:''}<div class="rv-advice"><span>TRY THIS</span><p>${esc(insight.text)}</p></div>${tips?`<div class="rv-tips"><span>ACTION TIPS · ${esc(tips.title.toUpperCase())}</span><ol>${tips.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`:''}</div></div>`;
  return `<article class="sound-insight rv-issue rv-stub" data-severity="main" data-family="${fam}"><button class="insight-toggle" aria-expanded="false" aria-controls="insight-detail-${n}"><span class="rv-stub-tab"><span class="rv-stub-gain"><b>+${g}</b><i>%</i></span><span class="rv-stub-label">READINESS LIFT</span><span class="rv-stub-range">${now}% → ${after}%</span></span><span class="rv-stub-body"><span class="rv-issue-meta rv-tk-meta"><i class="rv-tk-dot" aria-hidden="true"></i><b>MAIN ISSUE</b><em>·</em><span>${esc(insight.metric||'Mix detail')}</span></span><strong class="rv-stub-title">${esc(insight.title)}</strong>${insight.subtitle?`<small class="rv-stub-sub">${esc(insight.subtitle)}</small>`:''}<span class="rv-stub-foot"><span class="rv-ladder" role="img" aria-label="Readiness ${now} percent, ${after} percent after the fix">${ladder}</span><span class="rv-tk-open"><span class="rv-tk-open-closed">See the fix</span><span class="rv-tk-open-open">Hide</span><i aria-hidden="true">+</i></span></span></span></button>${reveal}</article>`;
 }
 /* The other signals: one box, rows like mastrify.com. Dot in the metric's
  * family colour, the title, the explanation visible, the gain as a quiet
  * figure on the right. Nothing to click. */
 function signalRow(insight,n,ctx){
  const {g,fam}=issueBits(insight,n,ctx);
  return `<article class="rv-signal" data-family="${fam}"><i class="rv-signal-dot" aria-hidden="true"></i><div class="rv-signal-copy"><strong>${esc(insight.title)}</strong><p>${esc(insight.text||insight.subtitle||'')}</p></div><span class="rv-signal-gain">+${g}%</span></article>`;
 }
 function nextStep(){
  return `<section class="rv-next"><div><span class="eyebrow">NEXT STEP</span><h3>Ready for a pro master?</h3><p>Studio-grade loudness and tone. The same mastering engine as the full release workflow.</p></div><div class="rv-next-actions"><button id="master-same-track" class="button primary">Master my track <span>↗</span></button><button id="new-result" class="plain-action">← Analyze another track</button></div></section>`;
 }

 /* RACK: one instrument panel. Modules divided by hairlines, a segmented
  * readiness rail built into the first module, eight channels in a meter
  * bridge, issues as numbered rows. */
 function rack(ctx){
  const a=ctx.result.analysis,score=Math.round(clamp(Number(a.readiness),0,100)),segments=20,lit=Math.round(score/100*segments);
  const rail=Array.from({length:segments},(_,i)=>`<i${i<lit?' data-lit':''} style="--i:${i}"></i>`).join('');
  const metrics=a.metrics.map((m,i)=>`<article class="metric-card rv-channel" data-family="${FAMILY[m.label]||'drive'}"><button class="metric-toggle" aria-expanded="false" aria-controls="metric-detail-${i}"><span class="rv-ch-head"><span class="rv-ch-icon">${icon(m.label)}</span><span class="rv-ch-label">${esc(LABEL[m.label]||m.label)}</span><i aria-hidden="true">+</i></span><strong>${esc(m.value)}</strong><small>${esc(m.detail||'')}</small></button>${metricDetail(m,i,ctx)}</article>`).join('');
  const issues=a.insights.map((ins,n)=>issueBlock(ins,n,ctx,{numbered:true})).join('');
  return `<div class="rv rv-rack">${header(ctx)}
<section class="rv-module rv-ready"><div class="rv-score"><div class="rv-score-num"><b>${score}</b><span>%</span></div><div class="rv-rail" role="img" aria-label="Release readiness ${score} percent">${rail}</div><span class="rv-score-label">RELEASE READINESS</span></div><div class="rv-verdict"><h3>${esc(a.summary||'')}</h3>${a.recommendation?`<p class="rv-pill-status"><i></i>${esc(a.recommendation)}</p>`:''}<ul class="rv-observations">${(a.highlights||[]).slice(0,3).map(h=>`<li>${esc(h)}</li>`).join('')}</ul>${a.focus?`<p class="rv-focus">${esc(a.focus)}</p>`:''}</div></section>
<section class="rv-module rv-bridge" aria-label="Eight measurements"><div class="rv-module-head"><span class="eyebrow">MEASUREMENTS</span><span class="rv-note">${ctx.result.demo?'Quick in-browser measurement (approximate). The full engine refines these findings.':'Sound profile'}</span></div><div class="rv-channels">${metrics}</div></section>
<section class="rv-module rv-issues" aria-labelledby="insight-heading"><div class="rv-module-head"><span class="eyebrow" id="insight-heading">ISSUES FOUND</span><span class="rv-note">${a.insights.length} signal${a.insights.length===1?'':'s'}</span></div>${issues||'<p class="rv-empty">No issues stood out. Keep the balance you have.</p>'}</section>
${nextStep()}</div>`;
 }

 /* ORBIT: a gauge built into the top of the readiness card, eight tiles
  * with level bars, issues as tickets with the gain up front. */
 function orbit(ctx){
  const a=ctx.result.analysis,score=Math.round(clamp(Number(a.readiness),0,100)),p=a.profile||null;
  const sweep=240,r=54,circ=2*Math.PI*r,arcLen=circ*sweep/360,litLen=arcLen*score/100,restLen=arcLen-litLen;
  // The road ahead: every 18 s the remaining arc draws itself up to 100 in
  // our green, starting from the colour the live arc ends in, holds, fades.
  const restArc=(()=>{
   if(restLen<1)return '';
   const rad=a=>a*Math.PI/180,pt=a=>[70+r*Math.cos(rad(a)),66+r*Math.sin(rad(a))];
   const [x1,y1]=pt(sweep*score/100),[x2,y2]=pt(sweep);
   const t=clamp(((x1-16)/108+(1-(y1-12)/108))/2);
   const stops=[[0,[248,135,159]],[.5,[183,132,255]],[1,[111,116,255]]];
   let from=stops[0][1];for(let i=1;i<stops.length;i++){const [t0,c0]=stops[i-1],[t1,c1]=stops[i];if(t<=t1){const k=(t-t0)/(t1-t0);from=c0.map((v,j)=>Math.round(v+(c1[j]-v)*k));break;}}
   const start=`rgb(${from.join(',')})`,units=(circ/restLen*100).toFixed(3),offset=(-litLen/restLen*100).toFixed(3);
   return `<linearGradient id="rv-gauge-rest" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"><stop offset="0" stop-color="${start}"/><stop offset=".45" stop-color="#7fddb9"/><stop offset="1" stop-color="#b9f3d8"/></linearGradient>|<circle class="rv-gauge-restglow" cx="70" cy="66" r="${r}" pathLength="${units}" stroke-dasharray="0 100000" stroke-dashoffset="${offset}" filter="url(#rv-gauge-glow)"/><circle class="rv-gauge-rest" cx="70" cy="66" r="${r}" pathLength="${units}" stroke-dasharray="0 100000" stroke-dashoffset="${offset}"/>`;
  })();
  const [restDefs,restCircles]=restArc?restArc.split('|'):['',''];
  const gaugeSvg=`<svg class="rv-gauge" viewBox="0 0 140 110" aria-hidden="true"><defs><linearGradient id="rv-gauge-fill" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f8879f"/><stop offset=".5" stop-color="#b784ff"/><stop offset="1" stop-color="#6f74ff"/></linearGradient>${restDefs}<filter id="rv-gauge-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter></defs><g transform="rotate(150 70 66)"><circle class="rv-gauge-ticks" cx="70" cy="66" r="62" pathLength="${sweep}" stroke-dasharray="1 ${sweep/24-1}" stroke-dashoffset="0"/><circle class="rv-gauge-track" cx="70" cy="66" r="${r}" stroke-dasharray="${arcLen} ${circ}"/>${restCircles}<circle class="rv-gauge-glowarc" cx="70" cy="66" r="${r}" stroke-dasharray="${litLen} ${circ}" filter="url(#rv-gauge-glow)"/><circle class="rv-gauge-arc" cx="70" cy="66" r="${r}" stroke-dasharray="${litLen} ${circ}"/></g></svg>`;
  const tiles=a.metrics.map((m,i)=>{const g=gauge(m.label,p);return `<article class="metric-card rv-tile" data-family="${FAMILY[m.label]||'drive'}"><button class="metric-toggle" aria-expanded="false" aria-controls="metric-detail-${i}"><span class="rv-tile-head"><span class="rv-ch-icon">${icon(m.label)}</span><span class="rv-ch-label">${esc(LABEL[m.label]||m.label)}</span><i aria-hidden="true">+</i></span><span class="rv-tile-row"><strong>${esc(m.value)}</strong><small class="rv-tile-readout">${esc(m.detail||'')}</small></span>${g?`<span class="rv-bar" style="--pos:${g.pos.toFixed(3)};--from:${g.from.toFixed(3)};--to:${g.to.toFixed(3)}"><i class="rv-bar-good"></i><i class="rv-bar-dot"></i></span><small class="rv-tile-ends"><em>${esc(g.ends[0])}</em><em>${esc(g.ends[1])}</em></small>`:''}</button>${metricDetail(m,i,ctx)}</article>`;}).join('');
  const style=ctx.issueStyle||'stub';
  const [first,...rest]=a.insights;
  const main=first?(style==='split'?mainSplit(first,0,ctx):style==='lift'?issueBlock(first,0,ctx):mainStub(first,0,ctx)):'';
  const issues=main+(rest.length?`<div class="rv-signals">${rest.map((ins,i)=>signalRow(ins,i+1,ctx)).join('')}</div>`:'');
  return `<div class="rv rv-orbit" data-issue="${esc(style)}">${header(ctx)}
<section class="rv-hero"><div class="rv-dial-wrap"><div class="rv-dial">${gaugeSvg}<div class="rv-dial-num"><b>${score}</b><span>%</span></div></div><span class="rv-dial-label">RELEASE READINESS</span></div><div class="rv-verdict"><h3>${esc(a.summary||'')}</h3>${a.recommendation?`<p class="rv-pill-status"><i></i>${esc(a.recommendation)}</p>`:''}<ul class="rv-observations">${(a.highlights||[]).slice(0,3).map(h=>`<li>${esc(h)}</li>`).join('')}</ul>${a.focus?`<p class="rv-focus">${esc(a.focus)}</p>`:''}</div></section>
<p class="rv-note rv-note-center">${ctx.result.demo?'Quick in-browser measurement (approximate). The full engine refines these findings.':'Sound profile'}</p>
<section class="rv-tiles" aria-label="Eight measurements">${tiles}</section>
${nextStep()}
<section class="rv-tickets" aria-labelledby="insight-heading"><div class="rv-module-head"><span class="eyebrow" id="insight-heading">ISSUES FOUND</span><span class="rv-note">${a.insights.length} signal${a.insights.length===1?'':'s'}</span></div><div class="rv-ticket-list">${issues||'<p class="rv-empty">No issues stood out. Keep the balance you have.</p>'}</div></section></div>`;
 }
 // The PDF report (report-pdf.js) draws the same families, icons and scales.
 window.MastrifyReportViews={rack,orbit,parts:{FAMILY,LABEL,ICON,gauge,readinessAfter}};
})();
