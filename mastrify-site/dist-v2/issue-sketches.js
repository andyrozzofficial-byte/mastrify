/* Illustrations for every issue the analysis can raise (v2). One drawing
 * per idea, in the same hand as the first three: a receding floor, a faint
 * "before" line, an offset depth copy and the lit "after" line, drawn in a
 * 300 x 150 box. Each has its own quiet loop that only runs while the fix is
 * open (report.css). None of them is a measurement of the user's track.
 *
 * find(insight) picks the drawing by the issue's exact title (the live
 * site's vocabulary in studio-copy.js), then by its metric, so a backend
 * that phrases an issue its own way still gets the right family. */
(() => {
 'use strict';
 const n=v=>Math.round(v*10)/10;
 const FLOOR='<path class="sketch-floor" d="M14 138h272M26 120h248M38 102h224"/>';
 const GRID='<path class="sketch-axis" d="M16 112h268M82 34v78M150 34v78M218 34v78"/>';
 const text=(x,y,t,anchor)=>`<text x="${x}" y="${y}"${anchor?` text-anchor="${anchor}"`:''}>${t}</text>`;
 // A row of wave arches (alternating parabolas join smoothly at the axis).
 function wave(x0,x1,y,half,amp){
  let d=`M${x0} ${y}`;
  for(let x=x0,i=0;x<x1-.01;x+=half,i++){const a=(typeof amp==='function'?amp(i):amp)*(i%2?1:-1);d+=`Q${n(x+half/2)} ${n(y+2*a)} ${n(x+half)} ${y}`;}
  return d;
 }
 // A waveform drawn as vertical strokes around a centre line.
 const bars=(xs,hs,cy,dx=0,dy=0)=>xs.map((x,i)=>`M${n(x+dx)} ${n(cy-hs[i]+dy)}V${n(cy+hs[i]+dy)}`).join('');
 // A sharp hit: fast attack, then the decay back to the floor.
 const hit=(x,top,base,len,dx=0,dy=0)=>`M${n(x+dx)} ${base+dy}L${n(x+2.6+dx)} ${n(top+dy)}C${n(x+7+dx)} ${n(top+(base-top)*.56+dy)} ${n(x+len*.42+dx)} ${base-4+dy} ${n(x+len+dx)} ${base-1+dy}`;
 // The same hit, blunted: a rounded swell with no edge.
 const blunt=(x,top,base,len)=>`M${n(x)} ${base}C${n(x+len*.2)} ${n(top)} ${n(x+len*.42)} ${n(top)} ${n(x+len*.58)} ${n(top+(base-top)*.3)}S${n(x+len*.86)} ${base-2} ${n(x+len)} ${base-1}`;

 const V={};

 /* LEVEL: the whole waveform comes up toward a ceiling that stays put. */
 V.level=(()=>{
  const xs=Array.from({length:34},(_,i)=>26+i*248/33);
  const a=xs.map((_,i)=>.5+.46*Math.abs(Math.sin(i*1.7+.4))*(.78+.22*Math.sin(i*.5)));
  const loud=a.map(v=>v*38),quiet=a.map(v=>v*16),cy=74;
  return {label:'Loudness',kind:'level',caption:'More level before the limiter. Peaks stay under the ceiling.',
   listen:'Listen for a fuller, closer mix next to commercial tracks, with kick and bass still hitting.',
   description:'Illustration of the overall level rising toward a fixed ceiling while the peaks stay below it. This is not your track’s waveform.',
   drawing:`<path class="sketch-ceiling" d="M16 30h268M16 118h268"/>${text(284,22,'CEILING','end')}<path class="sketch-ghost" d="${bars(xs,quiet,cy)}"/><g class="sketch-level"><path class="sketch-depth sketch-bars" d="${bars(xs,loud,cy,2.4,2.4)}"/><path class="sketch-signal sketch-bars" d="${bars(xs,loud,cy)}"/></g>${text(16,140,'MORE LEVEL')}${text(284,140,'SAME CEILING','end')}`};
 })();

 /* RELEASE: a squeezed line gets its movement back. */
 V.release=(()=>{
  const ys=[82,58,100,40,112,66,96,44,116,62,98,38,114,70,94,46,82],xs=ys.map((_,i)=>24+i*254/16);
  const line=(k,dx=0,dy=0)=>'M'+xs.map((x,i)=>`${n(x+dx)} ${n(82+(ys[i]-82)*k+dy)}`).join(' ');
  return {label:'Dynamics',kind:'release',caption:'Less squeeze. Let the peaks breathe again.',
   listen:'Listen for drums that snap again and choruses that lift above the verses.',
   description:'Illustration of a flattened, over-limited line regaining its peaks and movement. This is not your track’s waveform.',
   drawing:`<path class="sketch-floor" d="M14 138h272M26 120h248M38 102h224M50 84h200"/><path class="sketch-axis" d="M16 46h268M16 118h268"/><path class="sketch-ghost" d="${line(.26)}"/><g class="sketch-release"><path class="sketch-depth" d="${line(1,3,3)}"/><path class="sketch-signal" d="${line(1)}"/></g>`};
 })();

 /* KICK: four kicks punch up out of the low-mid build-up, one after another. */
 V.kick=(()=>{
  const xs=[34,102,170,238],top=34,base=118;
  const kicks=xs.map((x,i)=>{const d=`animation-delay:${(i*.6).toFixed(1)}s`;return `<path class="sketch-depth sketch-strike" pathLength="100" style="${d}" d="${hit(x,top,base,44,2.6,2.6)}"/><path class="sketch-signal sketch-strike" pathLength="100" style="${d}" d="${hit(x,top,base,44)}"/><circle class="sketch-light sketch-flash" style="${d}" cx="${n(x+2.6)}" cy="${top}" r="3"/>`;}).join('');
  return {label:'Dynamics',kind:'kick',caption:'A clear attack, in front of the low-mid build-up.',
   listen:'Listen for the kick’s click and thump arriving before the bass fills in.',
   description:'Illustration of kick drum attacks rising clearly above a band of low-mid energy. This is not your track’s waveform.',
   drawing:`<path class="sketch-axis" d="M16 118h268"/><path class="sketch-wash" d="M16 118C70 90 112 86 150 88S236 94 284 118Z"/><path class="sketch-ghost" d="M16 118C70 90 112 86 150 88S236 94 284 118"/>${xs.map(x=>`<path class="sketch-ghost" d="${blunt(x,90,base,46)}"/>`).join('')}${kicks}${text(n(xs[0]+2.6),22,'KICK','middle')}${text(150,140,'LOW-MID BUILD-UP','middle')}`};
 })();

 /* STEADY: an uneven bass line next to one that holds its weight. */
 V.steady=(()=>{
  const uneven=i=>18+13*Math.sin(i*1.25+.6);
  return {label:'Low end',kind:'steady',caption:'An even foundation when kick and bass overlap.',
   listen:'Listen for kick and bass holding the same weight through the heaviest parts.',
   description:'Illustration of a low-frequency line that swells unevenly next to one that stays steady. This is not your track’s waveform.',
   drawing:`<path class="sketch-axis" d="M16 84h268M16 62h268M16 106h268"/><path class="sketch-ghost sketch-flicker" d="${wave(20,280,84,20,uneven)}"/><path class="sketch-depth" d="${wave(22.5,282.5,86.5,20,20)}"/><path class="sketch-signal" d="${wave(20,280,84,20,20)}"/><path class="sketch-glint" pathLength="300" d="${wave(20,280,84,20,20)}"/>${text(16,136,'KICK + BASS')}${text(284,136,'EVEN WEIGHT','end')}`};
 })();

 /* CARVE: the low-mid bump, and the gentle cut that makes room. */
 V.carve={label:'Low end',kind:'carve',caption:'Carve the build-up. Give the kick its own room.',
  listen:'Listen for a kick that cuts through without the low end thinning out.',
  description:'Example of a gentle EQ cut around 60 to 120 Hz where low-mid energy builds up. This is not a measured EQ response.',
  drawing:`${FLOOR}${GRID}<path class="sketch-ghost" d="M16 72h268"/><path class="sketch-ghost sketch-flicker" d="M16 72h44c22 0 30-26 50-26s28 26 50 26h124"/><g class="sketch-carve"><path class="sketch-wash" d="M60 72c22 0 30 26 50 26s28-26 50-26Z"/><path class="sketch-depth" d="M19 75h44c22 0 30 26 50 26s28-26 50-26h121"/><path class="sketch-signal" d="M16 72h44c22 0 30 26 50 26s28-26 50-26h124"/></g><path class="sketch-glint" pathLength="300" d="M16 72h44c22 0 30 26 50 26s28-26 50-26h124"/>${text(16,136,'SUB')}${text(110,136,'60–120 HZ','middle')}${text(284,136,'HIGH','end')}`};

 /* WEIGHT: the air shelf's mirror, a lift underneath. */
 V.weight={label:'Low end',kind:'weight',caption:'A little more weight underneath. Controlled, not boomy.',
  listen:'Listen for a fuller bottom on small speakers, without the mix turning boomy.',
  description:'Example of a gentle low-frequency shelf lifting the bottom end while the rest stays steady. This is not a measured EQ response.',
  drawing:`${FLOOR}${GRID}<path class="sketch-ghost" d="M16 92h268"/><path class="sketch-wash" d="M16 92V42h60c62 0 52 50 112 50Z"/><path class="sketch-depth" d="M19 45h60c62 0 52 50 112 50h93"/><path class="sketch-signal" d="M16 42h60c62 0 52 50 112 50h96"/><path class="sketch-glint" pathLength="300" d="M16 42h60c62 0 52 50 112 50h96"/>${text(16,136,'LOW · WEIGHT')}${text(284,136,'HIGH','end')}`};

 /* TRANSIENTS: a drum pattern whose attacks sharpen, hit by hit. */
 V.transients=(()=>{
  const tops=[40,84,58,86,42,82,60,88],xs=tops.map((_,i)=>24+i*32),base=112;
  const hits=xs.map((x,i)=>{const d=`animation-delay:${(i*.3).toFixed(1)}s`;return `<path class="sketch-depth sketch-strike" pathLength="100" style="${d}" d="${hit(x,tops[i],base,26,2.4,2.4)}"/><path class="sketch-signal sketch-strike" pathLength="100" style="${d}" d="${hit(x,tops[i],base,26)}"/><circle class="sketch-light sketch-flash" style="${d}" cx="${n(x+2.6)}" cy="${tops[i]}" r="${i%2?2.2:3}"/>`;}).join('');
  return {label:'Energy',kind:'transients',caption:'Sharper attacks. Drums that speak first.',
   listen:'Listen for snares and hats that feel defined, not louder.',
   description:'Illustration of rounded drum hits becoming sharper at the start while their length stays the same. This is not your track’s waveform.',
   drawing:`${FLOOR}<path class="sketch-axis" d="M16 112h268"/>${xs.map((x,i)=>`<path class="sketch-ghost" d="${blunt(x,base-(base-tops[i])*.5,base,28)}"/>`).join('')}${hits}${text(16,136,'DRUMS + PERC')}${text(284,136,'SHARPER ATTACK','end')}`};
 })();

 /* SMOOTH: a sizzling spike in the highs, eased, with the air kept. */
 V.smooth={label:'Highs',kind:'smooth',caption:'Tame the edge. Keep the air.',
  listen:'Listen for esses and cymbals that shine without stinging.',
  description:'Example of a narrow harsh peak in the upper highs being eased while the air above it stays. This is not a measured EQ response.',
  drawing:`${FLOOR}${GRID}<path class="sketch-ghost sketch-flicker" d="M16 92h176l5-8 4 12 5-44 5 48 4-16 5 8h64"/><path class="sketch-depth" d="M19 95h164c14 0 22 12 40 12s24-12 40-18h21"/><path class="sketch-signal" d="M16 92h164c14 0 22 12 40 12s24-12 40-18h24"/><path class="sketch-glint" pathLength="300" d="M16 92h164c14 0 22 12 40 12s24-12 40-18h24"/>${text(16,136,'LOW')}${text(206,136,'EDGE','middle')}${text(284,136,'AIR','end')}`};

 /* VOCAL: the lead rises out of the bed and sits on top of it. */
 V.vocal=(()=>{
  const line=(dy,dx=0)=>`M${40+dx} ${104+dy}C${60+dx} ${98+dy} ${76+dx} ${110+dy} ${96+dx} ${104+dy}S${136+dx} ${96+dy} ${156+dx} ${102+dy}S${196+dx} ${110+dy} ${216+dx} ${102+dy}S${250+dx} ${98+dy} ${262+dx} ${104+dy}`;
  return {label:'Presence',kind:'vocal',caption:'The vocal on top of the bed, not inside it.',
   listen:'Listen for every word of the vocal, with the bed still full behind it.',
   description:'Illustration of a vocal line sitting above the instruments instead of inside them. This is not your track’s waveform.',
   drawing:`<path class="sketch-axis" d="M16 118h268"/><path class="sketch-wash" d="M16 92C46 86 66 96 96 90S156 82 186 90S246 96 284 88V118H16Z"/><path class="sketch-ghost" d="M16 92C46 86 66 96 96 90S156 82 186 90S246 96 284 88"/><path class="sketch-ghost" d="${line(0)}"/><g class="sketch-rise"><path class="sketch-depth" d="${line(-45,2.5)}"/><path class="sketch-signal" d="${line(-48)}"/><circle class="sketch-light" cx="40" cy="56" r="3.4"/>${text(262,40,'VOCAL','end')}</g>${text(284,136,'THE BED','end')}`};
 })();

 /* DYNAMICS: unchanged from the first set. */
 V.dynamics={label:'Dynamics',kind:'dynamics',caption:'Keep the body. Ease the strongest peaks.',
  listen:'Listen for drums that still hit, with quieter detail staying present.',
  description:'Illustration of gentle compression reducing the strongest peaks while retaining smaller variations. This is not your track’s waveform.',
  drawing:'<path class="sketch-floor" d="M14 138h272M26 120h248M38 102h224M50 84h200"/><path class="sketch-axis" d="M16 46h268M16 118h268"/><path class="sketch-ghost" d="M24 82 40 56 56 100 72 16 88 124 104 68 120 96 136 22 152 128 168 64 184 100 200 14 216 126 232 72 248 98 264 26 278 82"/><g class="sketch-peaks"><path class="sketch-depth" d="M27 85 43 62 59 101 75 51 91 121 107 71 123 95 139 53 155 123 171 67 187 99 203 51 219 121 235 75 251 97 267 53 281 85"/><path class="sketch-signal" d="M24 82 40 59 56 98 72 48 88 118 104 68 120 92 136 50 152 120 168 64 184 96 200 48 216 118 232 72 248 94 264 50 278 82"/></g>'};

 /* STEREO: unchanged from the first set. */
 V.stereo={label:'Stereo',kind:'stereo',caption:'A solid centre. Space at the sides.',
  listen:'Listen for a centred kick and bass, with pads and reverbs around them.',
  description:'Illustrative placement: kick and bass remain centred while pads and reverbs extend to the sides. These positions are not measured.',
  drawing:'<g class="sketch-sides"><ellipse class="sketch-shell" cx="150" cy="80" rx="132" ry="43"/><ellipse class="sketch-shell" cx="150" cy="80" rx="112" ry="36"/><ellipse class="sketch-shell" cx="150" cy="80" rx="92" ry="29"/><ellipse class="sketch-depth" cx="151" cy="82" rx="70" ry="22"/><ellipse class="sketch-signal" cx="150" cy="80" rx="70" ry="22"/><circle class="sketch-light" cx="22" cy="80" r="3.2"/><circle class="sketch-light" cx="278" cy="80" r="3.2"/></g><path class="sketch-axis" d="M18 80h264"/><circle class="sketch-centre" cx="150" cy="80" r="19"/><circle class="sketch-light" cx="150" cy="80" r="5.4"/><text x="18" y="136">L</text><text x="150" y="136" text-anchor="middle">KICK + BASS</text><text x="282" y="136" text-anchor="end">R</text>'};

 /* AIR: unchanged from the first set. */
 V.air={label:'Highs',kind:'air',caption:'A little lift. A softer kind of sparkle.',
  listen:'Listen for air around vocals and cymbals, without a sharp or sizzling edge.',
  description:'Example of a gentle high-frequency shelf lifting the top end slightly while leaving lower frequencies steady. This is not a measured EQ response.',
  drawing:'<path class="sketch-floor" d="M14 138h272M26 120h248M38 102h224"/><path class="sketch-axis" d="M16 112h268M82 34v78M150 34v78M218 34v78"/><path class="sketch-ghost" d="M16 92h268"/><path class="sketch-wash" d="M16 92h96c62 0 52-50 112-50h60v70H16Z"/><path class="sketch-depth" d="M19 95h96c62 0 52-50 112-50h57"/><path class="sketch-signal sketch-air" d="M16 92h96c62 0 52-50 112-50h60"/><path class="sketch-glint" d="M16 92h96c62 0 52-50 112-50h60"/><text x="16" y="136">LOW</text><text x="284" y="136" text-anchor="end">HIGH · AIR</text>'};

 // Every issue in the live vocabulary, by its exact title.
 const TITLES={
  'Low output level':V.level,
  'Overcompressed mix':V.release,
  'Mix is too dynamic and may sound weak compared to commercial tracks':V.dynamics,
  'Too much dynamic range':V.dynamics,
  'Kick lacks punch':V.kick,
  'Stereo too narrow':V.stereo,
  'Fine-tune stereo image':V.stereo,
  'Stereo image inconsistent':V.stereo,
  'Low-end lacks control':V.steady,
  'Low end muddy':V.carve,
  'Weak low-end':V.weight,
  'Transient energy could be improved':V.transients,
  'Lacking brightness':V.air,
  'Lacks brightness':V.air,
  'High-end could be smoother':V.smooth,
  'Vocals slightly buried':V.vocal,
  // earlier demo titles, kept so older results still find theirs
  'Give the peaks a little more control':V.dynamics,
  'Keep the centre of the mix grounded':V.stereo,
  'Open the top end with restraint':V.air
 };
 // Unknown titles fall back to their metric's most general drawing.
 const METRICS={Loudness:V.level,Dynamics:V.dynamics,Stereo:V.stereo,'Low end':V.steady,Tone:V.air,Brightness:V.air,Energy:V.transients,Presence:V.vocal,Clarity:V.vocal,Highs:V.air};
 const find=insight=>insight?(TITLES[insight.title]||METRICS[insight.metric]||null):null;
 window.MastrifyIssueSketches=Object.freeze({views:TITLES,kinds:V,find});
})();
