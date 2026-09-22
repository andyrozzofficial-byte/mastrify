/* Processing stage, three variants of the checklist (v2). Same bones as
 * the card Linus has today: THE MASTRIFY TOUCH, the percent, six rows,
 * the hint and Cancel. What differs is how a row shows it is listening,
 * done or waiting, and how the progress travels through the list.
 * Chosen with ?process=neon|timeline|meters. journey.js keeps the ids it
 * binds (#processing-stage, #job-phase, #cancel-flow) and hands progress
 * to update(ctx,p). Six earlier proposals (ring, chain, console, field,
 * grid, deck) were tried and taken out again. */
(() => {
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
 const $=id=>document.getElementById(id);
 const ICONS=['<path d="M2 12h3l2-7 4 14 3-12 3 10 2-5h3"/>','<path d="M10 12H3M7 8l-4 4 4 4M14 12h7M17 8l4 4-4 4"/>','<path d="M5 3v7m0 4v7M12 3v3m0 4v11M19 3v11m0 4v3"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>','<path d="M5 17v-4m7 4V7m7 10V4M3 20h18"/>','<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>','<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8"/>'];
 // Per phase: which icon and which colour family (the tiles' families).
 const PLAN={
  Analysis:{icons:[0,1,2,3,4,5],fam:['level','space','tone','level','drive','space']},
  Mastering:{icons:[5,2,0,1,3],fam:['level','tone','level','space','drive']}
 };
 const plan=(ctx,i)=>{const p=PLAN[ctx.kind]||PLAN.Analysis;return {icon:ICONS[p.icons[i%p.icons.length]],fam:p.fam[i%p.fam.length]};};
 const icon=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const check=`<svg class="pl-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.4 4 4 8-8"/></svg>`;
 const head=(ctx,pct=true)=>`<div class="pv-head"><span class="pv-kicker"><i aria-hidden="true"></i>THE MASTRIFY TOUCH</span>${pct?`<span class="pv-percent-sm"><b id="pv-percent">0</b>%</span>`:`<span class="pv-count"><b id="pv-step">1</b> / ${ctx.steps.length} <i class="pv-sep">·</i> <b id="pv-percent">0</b>%</span>`}</div>`;
 const rail=ctx=>`<div class="pv-rail" role="progressbar" aria-label="${esc(ctx.kind)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>`;
 const foot=ctx=>`<div class="pv-foot"><span>${esc(ctx.hint)}</span><button id="cancel-flow" class="plain-action">Cancel</button></div>`;
 const status=`<p id="job-phase" class="sr-only" role="status">Listening to your mix</p>`;
 const STATUS={waiting:'Waiting',active:'Listening',done:'Complete'};
 function state(ctx,p){
  const n=ctx.steps.length,count=Math.min(n,Math.floor(p*n)),charge=clamp(p*n-count);
  return {n,count,charge,done:count>=n,label:count>=n?'Every detail, connected.':ctx.steps[count],detail:count>=n?'':(ctx.details[count]||'')};
 }
 function setRows(stage,count){
  stage.querySelectorAll('[data-check]').forEach(row=>{const i=Number(row.dataset.check),s=i<count?'done':i===count?'active':'waiting';if(row.dataset.state!==s){row.dataset.state=s;const st=row.querySelector('.pl-status');if(st)st.textContent=STATUS[s];}});
 }
 function common(stage,ctx,p,st){
  stage.style.setProperty('--p',p.toFixed(4));stage.style.setProperty('--charge',st.charge.toFixed(4));
  const pc=$('pv-percent');if(pc)pc.textContent=Math.round(p*100);const sp=$('pv-step');if(sp)sp.textContent=Math.min(st.n,st.count+1);
  const bar=stage.querySelector('[role=progressbar]');if(bar)bar.setAttribute('aria-valuenow',Math.round(p*100));
  if(stage.dataset.count!==String(st.count)){stage.dataset.count=st.count;stage.dataset.done=st.done;setRows(stage,st.count);}
 }

 /* NEON: the rows carry the tiles' family colours. A thin neon edge on the
  * left of each row, the active row lifts on a tinted surface and its edge
  * fills top to bottom with the phase; the marker is a small ring that
  * fills too. Done rows settle with the mint check, a status word sits in
  * mono on the right. */
 const neon={
  markup(ctx){
   const rows=ctx.steps.map((s,i)=>{const {icon:d,fam}=plan(ctx,i);return `<li class="pl-row" data-check="${i}" data-state="waiting" data-family="${fam}"><i class="pl-edge" aria-hidden="true"></i><span class="pl-orb" aria-hidden="true"><svg class="pl-ring" viewBox="0 0 40 40"><circle class="pl-ring-track" cx="20" cy="20" r="17"/><circle class="pl-ring-arc" cx="20" cy="20" r="17" pathLength="100"/></svg><span class="pl-icon">${icon(d)}</span>${check}</span><span class="pl-copy"><b>${esc(s)}</b><small>${esc(ctx.details[i]||'')}</small></span><em class="pl-status">Waiting</em></li>`;}).join('');
   return `<section id="processing-stage" class="flow-surface processing-surface pv pv-neon" style="--p:0;--charge:0">${head(ctx)}${rail(ctx)}<ol class="pl-list">${rows}</ol>${status}${foot(ctx)}</section>`;
  },
  update(ctx,p){const stage=$('processing-stage'),st=state(ctx,p);common(stage,ctx,p,st);return st;}
 };

 /* TIMELINE: one vertical line runs through all six markers, and the light
  * travels down it. The line fills in the live gradient and reaches the
  * next marker exactly when that phase begins; the active marker glows and
  * breathes, done markers turn mint, the row's detail stands to the right.
  * The line is the progress bar, so there is no rail under the head. */
 const timeline={
  markup(ctx){
   const rows=ctx.steps.map((s,i)=>`<li class="pt-row" data-check="${i}" data-state="waiting"><span class="pt-node" aria-hidden="true"><i></i>${check}</span><span class="pt-copy"><b>${esc(s)}</b><small>${esc(ctx.details[i]||'')}</small></span><em class="pt-idx">${String(i+1).padStart(2,'0')}</em></li>`).join('');
   return `<section id="processing-stage" class="flow-surface processing-surface pv pv-timeline" style="--p:0;--charge:0;--line:0">${head(ctx,false)}<div class="pt-wrap" role="progressbar" aria-label="${esc(ctx.kind)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="pt-line" aria-hidden="true"></i><i class="pt-line-fill" aria-hidden="true"></i><i class="pt-head" aria-hidden="true"></i><ol class="pt-list">${rows}</ol></div>${status}${foot(ctx)}</section>`;
  },
  update(ctx,p){
   const stage=$('processing-stage'),st=state(ctx,p);
   // the light reaches marker i+1 when phase i completes (markers sit at i/(n-1))
   stage.style.setProperty('--line',Math.min(1,st.n>1?p*st.n/(st.n-1):p).toFixed(4));
   common(stage,ctx,p,st);return st;
  }
 };

 /* METERS: every row is its own meter. Under each title a slim bar in the
  * row's family gradient; the active row's bar fills live with a glowing
  * head and its own percent counts on the right, done rows stand full in
  * mint, waiting rows wait empty. The icon sits in the tiles' squircle. */
 const meters={
  markup(ctx){
   const rows=ctx.steps.map((s,i)=>{const {icon:d,fam}=plan(ctx,i);return `<li class="pm-row" data-check="${i}" data-state="waiting" data-family="${fam}" style="--fill:0"><span class="pm-icon" aria-hidden="true">${icon(d)}${check}</span><span class="pm-copy"><span class="pm-top"><b>${esc(s)}</b><em class="pm-pct">00%</em></span><span class="pm-bar" aria-hidden="true"><i class="pm-fill"></i><i class="pm-glow"></i><i class="pm-tip"></i></span><small>${esc(ctx.details[i]||'')}</small></span></li>`;}).join('');
   return `<section id="processing-stage" class="flow-surface processing-surface pv pv-meters" style="--p:0;--charge:0">${head(ctx)}${rail(ctx)}<ol class="pm-list">${rows}</ol>${status}${foot(ctx)}</section>`;
  },
  update(ctx,p){
   const stage=$('processing-stage'),st=state(ctx,p);common(stage,ctx,p,st);
   stage.querySelectorAll('.pm-row').forEach(r=>{const i=Number(r.dataset.check),fill=i<st.count?1:i===st.count?st.charge:0;r.style.setProperty('--fill',fill.toFixed(3));r.querySelector('.pm-pct').textContent=String(Math.round(fill*100)).padStart(2,'0')+'%';});
   return st;
  }
 };
 window.MastrifyProcessViews={neon,timeline,meters};
})();
