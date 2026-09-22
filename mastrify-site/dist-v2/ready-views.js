/* Master results, "Your master is ready" card: two proposals (v2).
 * Pure markup builders. journey.js keeps the class master-ready so the
 * result grid places the card, and adds nothing else. The meter is flat,
 * drawn like the readiness ring: no raised panel.
 *   halo: the loudness target as a ring, same geometry as release readiness.
 *   rail: the loudness target on a flat scale with the four named stops. */
(() => {
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
 const LO=-18,HI=-6;
 const lufs=v=>{const t=Number(v);return Number.isFinite(t)?(t<0?'−':'')+Math.abs(t):'—';};
 const posOf=v=>{const t=Number(v);return Number.isFinite(t)?clamp((t-LO)/(HI-LO)):0;};
 const STOPS=[{value:-14,label:'Streaming'},{value:-13,label:'YouTube'},{value:-11,label:'Spotify Loud'},{value:-9,label:'Club'}];

 // "SOURCE · WAV" from the file name, or the master's name if there is none.
 function srcLine(ctx){const ext=(String(ctx.result?.name||'').match(/\.([a-z0-9]{2,5})$/i)||[])[1];return ext?`SOURCE · ${ext.toUpperCase()}`:String(ctx.kicker||'');}
 function facts(ctx){
  const C=window.MastrifyCopy,style=C?C.style(ctx.s.style):null;
  // Three cells that fill the left half: the track on top, the loudness
  // profile under it, the character as a tall cell on the right.
  return `<div class="rd-facts"><div class="rd-fact rd-fact-track"><span>TRACK</span><strong>${esc(ctx.title)}</strong><small>${esc(srcLine(ctx))}</small></div><div class="rd-fact rd-fact-profile"><span>LOUDNESS PROFILE</span><strong class="rd-grad">${esc(ctx.profile[0])}</strong><small>${esc(ctx.profile[1])}</small></div><div class="rd-fact rd-fact-char"><span>CHARACTER</span><strong>${esc(ctx.s.style||'Balanced')}</strong>${style?.tagline?`<small class="rd-tagline">${esc(style.tagline)}</small>`:''}${style?.summary?`<p>${esc(style.summary)}</p>`:''}${Array.isArray(style?.tags)&&style.tags.length?`<em>${style.tags.map(t=>`<b>${esc(t)}</b>`).join('')}</em>`:''}</div></div>`;
 }
 function checks(ctx){
  return `<ul class="rd-checks" aria-label="What we protected">${ctx.notes.map(n=>`<li><i aria-hidden="true"></i>${esc(n)}</li>`).join('')}</ul>`;
 }
 function marks(ctx){
  return `<p class="rd-marks"><span class="rd-mark-safe">TRANSIENT-SAFE</span>${ctx.marks.slice(0,3).map(m=>`<span>${esc(m)}</span>`).join('')}</p>`;
 }
 function head(ctx){
  return `<div class="rd-copy"><span class="rd-kicker"><i aria-hidden="true"></i>${esc(ctx.kicker)}</span><h2>Your master is ready.</h2><p class="rd-line">Smart mastering tuned for punch, clarity and your loudness goal.</p></div>`;
 }

 /* HALO: the target on a ring. Same sweep, radius and colours as the
  * readiness ring, so the two result pages read as one family. */
 function halo(ctx){
  const pos=posOf(ctx.s.target),sweep=240,r=54,circ=2*Math.PI*r,arcLen=circ*sweep/360,litLen=arcLen*pos;
  const ring=`<svg class="rd-gauge" viewBox="0 0 140 110" aria-hidden="true"><defs><linearGradient id="rd-ring-fill" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6f74ff"/><stop offset=".5" stop-color="#b784ff"/><stop offset="1" stop-color="#f8879f"/></linearGradient><filter id="rd-ring-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter></defs><g transform="rotate(150 70 66)"><circle class="rd-gauge-ticks" cx="70" cy="66" r="62" pathLength="${sweep}" stroke-dasharray="1 ${sweep/12-1}"/><circle class="rd-gauge-track" cx="70" cy="66" r="${r}" stroke-dasharray="${arcLen} ${circ}"/><circle class="rd-gauge-glowarc" cx="70" cy="66" r="${r}" stroke-dasharray="${litLen} ${circ}" filter="url(#rd-ring-glow)"/><circle class="rd-gauge-arc" cx="70" cy="66" r="${r}" stroke-dasharray="${litLen} ${circ}"/></g></svg>`;
  return `<div class="master-ready flow-surface rd rd-halo">${head(ctx)}<div class="rd-ring" role="img" aria-label="Loudness target ${esc(lufs(ctx.s.target))} LUFS"><div class="rd-dial">${ring}<div class="rd-dial-num"><b>${esc(lufs(ctx.s.target))}</b></div><span class="rd-dial-ends"><em>${esc(lufs(LO))}</em><em>${esc(lufs(HI))}</em></span></div><span class="rd-dial-label">LUFS TARGET</span></div><div class="rd-foot">${facts(ctx)}<div class="rd-protect">${checks(ctx)}${marks(ctx)}</div></div></div>`;
 }

 /* RAIL: the target on a flat scale from -18 to -6 with the four named
  * stops. The chosen stop is lit, the others sit as quiet marks. */
 function rail(ctx){
  const t=Number(ctx.s.target),pos=posOf(t);
  const ticks=Array.from({length:13},(_,i)=>`<i style="--x:${(i/12).toFixed(4)}"${i%4===0?' data-major':''}></i>`).join('');
  const stops=STOPS.map((st,i)=>`<span class="rd-stop${st.value===t?' is-on':''}" style="--x:${posOf(st.value).toFixed(4)}" data-row="${i%2?'down':'up'}"><i></i><em>${esc(st.label)}</em><small>${esc(lufs(st.value))}</small></span>`).join('');
  return `<div class="master-ready flow-surface rd rd-rail">${head(ctx)}<div class="rd-stat"><b>${esc(lufs(t))}</b><span>LUFS TARGET</span></div><div class="rd-scale" style="--pos:${pos.toFixed(4)}" role="img" aria-label="Loudness target ${esc(lufs(t))} LUFS on a scale from ${esc(lufs(LO))} to ${esc(lufs(HI))}"><div class="rd-ticks">${ticks}</div><div class="rd-track"><i class="rd-fill"></i><i class="rd-fill-glow"></i><i class="rd-dot"></i></div><div class="rd-stops">${stops}</div><div class="rd-ends"><em>${esc(lufs(LO))} LUFS</em><em>${esc(lufs(HI))} LUFS</em></div></div><div class="rd-foot">${facts(ctx)}<div class="rd-protect">${checks(ctx)}${marks(ctx)}</div></div></div>`;
 }
 window.MastrifyReadyViews={halo,rail};
})();
