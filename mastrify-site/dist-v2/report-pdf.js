/* The mix report as a PDF (v2). Drawn on canvas in the site's own design:
 * the dark surface, the readiness ring, the eight tiles in their family
 * colours, the main issue as the stub, the other signals and the next step.
 * Each A4 page is one image, and an invisible text layer on top keeps every
 * word searchable and copyable. No libraries, no network. Loaded on demand
 * by MastrifyFiles.report() the first time someone downloads a report. */
(() => {
 'use strict';
 const PW=595.28,PH=841.89,M=36,CW=PW-2*M,S=3,LIMIT=PH-42;
 const SANS='-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
 const MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace';
 // The darker palette (sharp.css): saturated families, near-black surfaces.
 const FAM={level:['#6366ff','#b06cff','#8f84ff'],space:['#b06cff','#ff6b8e','#d070d8'],tone:['#ff6b8e','#ffa27f','#ff8a8f'],drive:['#55e0ae','#a6f5d4','#55e0ae']};
 const ICON_INK={level:'#9fa0ff',space:'#d49bff',tone:'#ff9fae',drive:'#8fe7c4'};
 const C={bg:'#030305',text:'#f7f7fb',white:'#ffffff',muted:'#9191a5',dim:'#6d6d82',eyebrow:'#b4b4c6',soft:'#dedee8',line:'#ffffff14'};
 const RAD=Math.PI/180;
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
 const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
 const minus=v=>String(v??'').replace(/(^|[\s(≈~])-(?=\d)/g,'$1−');

 /* ---------- drawing helpers (user units are PDF points) ---------- */
 function font(g,o){g.font=`${o.weight||400} ${o.size||10}px ${o.mono?MONO:SANS}`;}
 const spaced=o=>(o.ls||0)>0;
 function useLs(g,o){if('letterSpacing' in g)g.letterSpacing=(!spaced(o)&&o.ls)?`${o.ls}px`:'0px';}
 function width(g,str,o){
  font(g,o);useLs(g,o);
  if(!spaced(o))return g.measureText(str).width;
  let w=0;for(const ch of str)w+=g.measureText(ch).width+o.ls;return w-o.ls;
 }
 function fit(g,str,maxW,o){
  str=String(str??'');if(width(g,str,o)<=maxW)return str;
  while(str.length>1&&width(g,str+'…',o)>maxW)str=str.slice(0,-1);
  return str.replace(/\s+$/,'')+'…';
 }
 function wrap(g,str,maxW,o,max=0){
  const words=String(str??'').split(/\s+/).filter(Boolean),out=[];let line='';
  for(const word of words){const t=line?`${line} ${word}`:word;if(!line||width(g,t,o)<=maxW)line=t;else{out.push(line);line=word;}}
  if(line)out.push(line);
  const lines=out.map(l=>fit(g,l,maxW,o));
  if(max&&lines.length>max){const cut=lines.slice(0,max);cut[max-1]=fit(g,cut[max-1]+'…',maxW,o).replace(/…+$/,'…');return cut;}
  return lines;
 }
 // Draws one run of text and records it for the invisible text layer.
 function text(pg,str,x,y,o={}){
  const g=pg.g;str=String(str??'');if(!str)return 0;
  const w=width(g,str,o),x0=o.align==='right'?x-w:o.align==='center'?x-w/2:x;
  g.save();g.textAlign='left';g.textBaseline='alphabetic';
  g.fillStyle=typeof o.paint==='function'?o.paint(g,x0,y,w):(o.color||C.text);
  if(o.glow){g.shadowColor=o.glow;g.shadowBlur=(o.blur||10)*S;}
  if(spaced(o)){let cx=x0;for(const ch of str){g.fillText(ch,cx,y);cx+=g.measureText(ch).width+o.ls;}}
  else g.fillText(str,x0,y);
  g.restore();
  if(!o.silent)pg.texts.push({str,x:x0,y,size:o.size||10,w});
  return w;
 }
 function rr(g,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
 }
 // CSS linear-gradient(<angle>) over a box.
 function cssLinear(g,x,y,w,h,deg,stops){
  const a=deg*RAD,dx=Math.sin(a),dy=-Math.cos(a),L=Math.abs(w*dx)+Math.abs(h*dy),cx=x+w/2,cy=y+h/2;
  const lg=g.createLinearGradient(cx-dx*L/2,cy-dy*L/2,cx+dx*L/2,cy+dy*L/2);
  for(const [o,c] of stops)lg.addColorStop(o,c);return lg;
 }
 // CSS radial-gradient(<rx%> <ry%> at <px%> <py%>, colour, transparent <end>) inside a clip.
 function aura(g,x,y,w,h,{rx,ry,px,py,color,end=.55}){
  g.save();g.translate(x+w*px,y+h*py);g.scale(w*rx,h*ry);
  const rg=g.createRadialGradient(0,0,0,0,0,1);rg.addColorStop(0,color);rg.addColorStop(end,color.slice(0,7)+'00');
  g.fillStyle=rg;g.fillRect(-4,-4,8,8);g.restore();
 }
 // A soft glow with no hard core: the shape is drawn off the page and only
 // its shadow lands in place (canvas shadows ignore the transform).
 function glow(g,draw,{color,blur}){
  g.save();const m=g.getTransform(),D=100000;g.setTransform(m.a,m.b,m.c,m.d,m.e-D,m.f);
  g.shadowColor=color;g.shadowBlur=blur*S;g.shadowOffsetX=D;draw();g.restore();
 }
 // The site's card surface (hero, tickets, next step).
 function surface(g,x,y,w,h,{r=16,border='#ffffff1c',tint='#8f6bff10',shadow=true}={}){
  g.save();
  if(shadow){g.save();g.shadowColor='#000000a6';g.shadowBlur=26*S;g.shadowOffsetY=10*S;rr(g,x,y,w,h,r);g.fillStyle='#060509';g.fill();g.restore();}
  rr(g,x,y,w,h,r);g.fillStyle=cssLinear(g,x,y,w,h,140,[[0,'#0e0c15'],[.6,'#060509'],[1,'#09080d']]);g.fill();
  g.save();rr(g,x,y,w,h,r);g.clip();aura(g,x,y,w,h,{rx:.9,ry:1.2,px:.18,py:0,color:tint});
  g.beginPath();g.moveTo(x,y+.6);g.lineTo(x+w,y+.6);g.lineWidth=.8;g.strokeStyle='#ffffff14';g.stroke();g.restore();
  rr(g,x+.4,y+.4,w-.8,h-.8,r);g.lineWidth=.8;g.strokeStyle=border;g.stroke();
  g.restore();
 }
 // Neon edge along the top of a card, in a family's colours.
 function neon(g,x,y,w,h,r,f,thick=2.4){
  g.save();rr(g,x,y,w,h,r);g.clip();
  const lg=g.createLinearGradient(x,0,x+w,0);lg.addColorStop(0,f[0]);lg.addColorStop(1,f[1]);
  g.shadowColor=f[2]+'99';g.shadowBlur=12*S;g.fillStyle=lg;g.fillRect(x-2,y,w+4,thick);g.restore();
 }
 function eyebrow(pg,str,x,y,o={}){return text(pg,String(str).toUpperCase(),x,y,{mono:true,weight:600,size:6.8,ls:1.9,color:C.eyebrow,...o});}
 function iconPaths(svg){
  const out=[];String(svg||'').replace(/<path d="([^"]+)"/g,(_,d)=>{out.push(new Path2D(d));return '';});
  String(svg||'').replace(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g,(_,cx,cy,r)=>{const p=new Path2D();p.arc(+cx,+cy,+r,0,Math.PI*2);out.push(p);return '';});
  return out;
 }
 function wordmark(pg,x,y,size,link){
  const o={size,weight:700,ls:-size*.044};
  const w=text(pg,'Mastrify',x,y,{...o,paint:(g,x0,_y,w)=>{const lg=g.createLinearGradient(x0,0,x0+w,0);lg.addColorStop(0,'#94b4ff');lg.addColorStop(.38,'#bb9dff');lg.addColorStop(.72,'#ffffff');lg.addColorStop(1,'#e9ddff');return lg;}});
  if(link)pg.links.push({x,y:y-size,w,h:size*1.3,url:link});
  return w;
 }

 /* ---------- page furniture ---------- */
 function makePage(){
  const c=document.createElement('canvas');c.width=Math.round(PW*S);c.height=Math.round(PH*S);
  const g=c.getContext('2d',{alpha:false});g.scale(S,S);
  g.fillStyle=C.bg;g.fillRect(0,0,PW,PH);
  // the page light: violet from the top right, a breath of blue on the left, rose at the foot
  aura(g,0,0,PW,PH,{rx:.95,ry:.5,px:.86,py:-.04,color:'#6f4bff1a',end:1});
  aura(g,0,0,PW,PH,{rx:.6,ry:.32,px:-.05,py:.3,color:'#5b7bff0c',end:1});
  aura(g,0,0,PW,PH,{rx:.9,ry:.3,px:.5,py:1.06,color:'#ff6b8e0a',end:1});
  return {c,g,texts:[],links:[]};
 }
 function headerFull(pg,ctx){
  wordmark(pg,M,47,20,ctx.site);
  eyebrow(pg,'Mix analysis report',PW-M,43,{align:'right',size:6.8});
  text(pg,ctx.date.toUpperCase(),PW-M,55,{align:'right',mono:true,weight:500,size:6.6,ls:1.4,color:C.dim});
  rule(pg,68);
 }
 function headerMini(pg,ctx){
  wordmark(pg,M,44,14,ctx.site);
  text(pg,fit(pg.g,ctx.name.toUpperCase(),CW-160,{mono:true,weight:500,size:6.6,ls:1.4}),PW-M,42,{align:'right',mono:true,weight:500,size:6.6,ls:1.4,color:C.dim});
  rule(pg,58);
 }
 function rule(pg,y){const g=pg.g;g.save();const lg=g.createLinearGradient(M,0,PW-M,0);lg.addColorStop(0,'#ffffff05');lg.addColorStop(.5,'#ffffff1c');lg.addColorStop(1,'#ffffff05');g.fillStyle=lg;g.fillRect(M,y,CW,.7);g.restore();}
 function footer(pg,n,total,ctx){
  rule(pg,PH-36);
  wordmark(pg,M,PH-20,9.5,ctx.site);
  const host=String(ctx.site||'https://mastrify.com').replace(/^https?:\/\//,'').replace(/\/$/,'');
  const w=text(pg,host.toUpperCase(),M+50,PH-20.6,{mono:true,weight:500,size:6.4,ls:1.3,color:C.dim});
  pg.links.push({x:M+50,y:PH-28,w,h:10,url:ctx.site});
  text(pg,`PAGE ${n} / ${total}`,PW-M,PH-20.6,{align:'right',mono:true,weight:500,size:6.4,ls:1.3,color:C.dim});
 }

 /* ---------- blocks: each measures itself, then draws at a y ---------- */
 function titleBlock(ctx){
  return {h:72,draw(pg,y){
   eyebrow(pg,'Analysis complete',M,y+16);
   text(pg,'Your mix, understood.',M,y+44,{size:25,weight:600,ls:-.8,color:'#ffffff'});
   const g=pg.g,name=fit(g,ctx.name,CW*.62,{size:10,weight:600});
   const w=text(pg,name,M,y+62,{size:10,weight:600,color:C.text});
   text(pg,[ctx.duration?time(ctx.duration):'',ctx.demo?'in-browser measurement':''].filter(Boolean).map(s=>` · ${s}`).join(''),M+w,y+62,{size:10,color:C.muted});
  }};
 }
 function heroBlock(ctx,mg){
  const a=ctx.a,score=Math.round(clamp(Number(a.readiness),0,100)),leftW=CW-24-176;
  const head=wrap(mg,a.summary||'',leftW,{size:14,weight:600,ls:-.3});
  const obs=(a.highlights||[]).slice(0,3).map(h=>wrap(mg,h,leftW-12,{size:9}));
  const focus=a.focus?wrap(mg,a.focus,leftW,{size:8.4}):[];
  let lh=head.length*18.5+(a.recommendation?30:4)+obs.reduce((s,l)=>s+l.length*13.4+4,0)+(focus.length?8+focus.length*12:0);
  const h=Math.max(146,Math.ceil(lh+32));
  return {h,draw(pg,y){
   const g=pg.g,x=M;surface(g,x,y,CW,h,{r:18});
   // left: the verdict
   let cy=y+(h-lh)/2+12;
   head.forEach(l=>{text(pg,l,x+24,cy,{size:14,weight:600,ls:-.3,color:'#ffffff'});cy+=18.5;});
   if(a.recommendation){
    const o={size:8.4},tw=width(g,a.recommendation,o),px=x+24,py=cy-4,pw=tw+30,ph=19;
    g.save();rr(g,px,py,pw,ph,ph/2);g.fillStyle='#8f6bff14';g.fill();g.lineWidth=.75;g.strokeStyle='#8f6bff40';g.stroke();
    g.shadowColor='#b58cff';g.shadowBlur=8*S;g.beginPath();g.arc(px+11,py+ph/2,2.6,0,Math.PI*2);g.fillStyle='#dcc9ff';g.fill();g.restore();
    text(pg,a.recommendation,px+19,py+12.8,{...o,color:'#ececf5'});cy+=30;
   }else cy+=4;
   obs.forEach(ls=>{g.save();g.beginPath();g.arc(x+27,cy-3.1,2.2,0,Math.PI*2);g.fillStyle='#b58cff';g.fill();g.restore();ls.forEach(l=>{text(pg,l,x+36,cy,{size:9,color:C.soft});cy+=13.4;});cy+=4;});
   if(focus.length){cy+=8;focus.forEach(l=>{text(pg,l,x+24,cy,{size:8.4,color:'#9a9aae'});cy+=12;});}
   // right: the readiness ring, the same geometry as the site's orbit gauge
   const k=.94,gx=x+CW-24-140*k+6,gy=y+(h-126*k)/2-3*k;
   dial(pg,gx,gy,k,score);
  }};
 }
 function dial(pg,gx,gy,k,score){
  const g=pg.g,cx=gx+70*k,cy=gy+66*k,r=54,sweep=240*RAD,lit=sweep*score/100;
  g.save();g.translate(cx,cy);g.scale(k,k);g.rotate(150*RAD);g.lineCap='round';
  g.strokeStyle='#ffffff2e';g.lineWidth=1.5;
  // the ticks run all the way round, except where the label sits
  const lo={mono:true,weight:600,size:6.2,ls:1.9},half=width(g,'RELEASE READINESS',lo)/k/2+4;
  for(let i=0;i<24;i++){const a0=i*15*RAD,ta=a0+150*RAD+.75*RAD,tx=62*Math.cos(ta),ty=62*Math.sin(ta);if(Math.abs(tx)<half&&ty>44&&ty<57)continue;g.beginPath();g.arc(0,0,62,a0,a0+1.5*RAD);g.stroke();}
  g.strokeStyle='#ffffff12';g.lineWidth=9;g.beginPath();g.arc(0,0,r,0,sweep);g.stroke();
  if(lit>0){
   glow(g,()=>{g.strokeStyle='#a855ff';g.lineWidth=12;g.beginPath();g.arc(0,0,r,0,lit);g.stroke();},{color:'#a855ff99',blur:6*k});
   const lg=g.createLinearGradient(-54,54,54,-54);lg.addColorStop(0,'#ff6b8e');lg.addColorStop(.5,'#b865ff');lg.addColorStop(1,'#6366ff');
   g.strokeStyle=lg;g.lineWidth=9;g.beginPath();g.arc(0,0,r,0,lit);g.stroke();
  }
  g.restore();
  const n=String(score),no={size:35*k,weight:600,ls:-1.8*k},po={size:12*k,weight:500},nw=width(g,n,no),pw=width(g,'%',po),x0=cx-(nw+2+pw)/2,base=cy+12.5*k;
  text(pg,n,x0,base,{...no,color:'#ffffff'});
  text(pg,'%',x0+nw+2,base,{...po,color:'#d6d6e6'});
  text(pg,'RELEASE READINESS',cx,cy+53*k,{align:'center',mono:true,weight:600,size:6.2,ls:1.9,color:'#9a9aae'});
 }
 function noteBlock(ctx){
  return {h:17,draw(pg,y){
   if(ctx.demo)text(pg,'Quick in-browser measurement (approximate). The full engine refines these findings.',PW/2,y+12,{align:'center',size:7.6,color:'#8a8a9e'});
   else eyebrow(pg,'Sound profile',PW/2,y+12,{align:'center'});
  }};
 }
 // Every word of a tile is shown: the row is as tall as its longest text.
 const TILE_W=(CW-10)/2,DESC={size:8.1};
 function tileHeight(ctx,mg,m){
  const lines=Math.max(1,wrap(mg,m.description||'',TILE_W-28,DESC).length),bar=ctx.parts.gauge(m.label,ctx.a.profile||null)?14:0;
  return 57+bar+lines*11+9;
 }
 function tileRow(ctx,mg,pair){
  const h=Math.max(...pair.map(m=>tileHeight(ctx,mg,m)));
  return {h,draw(pg,y){pair.forEach((m,i)=>tile(pg,ctx,M+i*(TILE_W+10),y,TILE_W,h,m));}};
 }
 function tile(pg,ctx,x,y,w,h,m){
  const g=pg.g,P=ctx.parts,famKey=P.FAMILY[m.label]||'drive',f=FAM[famKey],ink=ICON_INK[famKey];
  g.save();g.shadowColor='#00000080';g.shadowBlur=18*S;g.shadowOffsetY=7*S;rr(g,x,y,w,h,13);g.fillStyle='#070609';g.fill();g.restore();
  rr(g,x,y,w,h,13);const bg=g.createLinearGradient(0,y,0,y+h);bg.addColorStop(0,'#0e0c14');bg.addColorStop(1,'#070609');g.fillStyle=bg;g.fill();
  g.save();rr(g,x+.4,y+.4,w-.8,h-.8,13);g.lineWidth=.8;g.strokeStyle='#ffffff17';g.stroke();g.restore();
  neon(g,x,y,w,h,13,f);
  // icon in its squircle
  g.save();rr(g,x+13,y+12,19,19,5.5);g.fillStyle=ink+'14';g.fill();g.lineWidth=.75;g.strokeStyle=ink+'40';g.stroke();
  g.translate(x+13+2.9,y+12+2.9);g.scale(13.2/24,13.2/24);g.lineWidth=1.6;g.lineCap='round';g.lineJoin='round';g.strokeStyle=ink;
  for(const p of iconPaths(P.ICON[m.label]||P.ICON.Presence))g.stroke(p);g.restore();
  text(pg,String(P.LABEL[m.label]||m.label).toUpperCase(),x+40,y+24,{mono:true,weight:600,size:6.8,ls:1.7,color:'#e4e4ee'});
  // value and reading
  const readout=minus(m.detail||'').toUpperCase(),ro={mono:true,weight:500,size:7,ls:.7};
  const rw=Math.min(width(g,readout,ro),w*.46);
  text(pg,fit(g,m.value,w-28-rw-10,{size:16,weight:600,ls:-.4}),x+14,y+47,{size:16,weight:600,ls:-.4,color:'#ffffff'});
  text(pg,fit(g,readout,w*.46,ro),x+w-14,y+47,{...ro,align:'right',color:'#c2c2d2'});
  // level bar with the release-ready zone, the same scale as the site
  const gz=P.gauge(m.label,ctx.a.profile||null);let dy=y+55;
  if(gz){
   const bx=x+14,bw=w-28;
   g.save();rr(g,bx,dy,bw,4,2);g.fillStyle='#ffffff10';g.fill();
   rr(g,bx+bw*gz.from,dy,Math.max(4,bw*(gz.to-gz.from)),4,2);g.fillStyle='#b58cff38';g.fill();
   const dx=bx+bw*gz.pos;g.beginPath();g.arc(dx,dy+2,5.6,0,Math.PI*2);g.fillStyle='#08070b';g.fill();
   g.shadowColor='#c9a9ffcc';g.shadowBlur=8*S;const dg=g.createLinearGradient(0,dy-2,0,dy+6);dg.addColorStop(0,'#ffffff');dg.addColorStop(1,'#dcc9ff');
   g.beginPath();g.arc(dx,dy+2,3.9,0,Math.PI*2);g.fillStyle=dg;g.fill();g.restore();
   const eo={mono:true,weight:500,size:6.2,ls:.4,color:'#7c7c90'};
   text(pg,minus(gz.ends[0]),bx,dy+13.5,eo);text(pg,minus(gz.ends[1]),bx+bw,dy+13.5,{...eo,align:'right'});
   dy+=14;
  }
  wrap(g,m.description||'',w-28,DESC).forEach((l,i)=>text(pg,l,x+14,dy+13+i*11,{...DESC,color:'#b9b9c9'}));
 }
 function sectionHead(title,right){
  return {h:24,keep:true,draw(pg,y){eyebrow(pg,title,M,y+12);if(right)text(pg,right,PW-M,y+12,{align:'right',size:8,color:C.muted});}};
 }
 function fam(ctx,ins){return FAM[ctx.parts.FAMILY[ins.metric]||'drive'];}
 function stubBlock(ctx,mg,ins){
  const a=ctx.a,score=Math.round(Number(a.readiness)||0),g0=Math.round(Number(ins.gain)||0),after=ctx.parts.readinessAfter(score,g0),f=fam(ctx,ins);
  const tabW=124,bodyX=tabW+24,bodyW=CW-bodyX-22;
  const title=wrap(mg,ins.title||'',bodyW,{size:18,weight:600,ls:-.5});
  const sub=ins.subtitle?wrap(mg,ins.subtitle,bodyW,{size:9.4}):[];
  const topH=Math.max(112,24+12+title.length*22+sub.length*13.5+8+14+9+20);
  const pad=22,innerW=CW-pad*2,advice=wrap(mg,ins.text||'',innerW,{size:9.8});
  const tips=a.tips&&Array.isArray(a.tips.items)?a.tips:null,tipLines=tips?tips.items.map(t=>wrap(mg,t,innerW-26,{size:9.2})):[];
  const revealH=18+14+advice.length*14.6+(tips?18+14+tipLines.reduce((s,l)=>s+l.length*13.4+8,0):0)+18;
  const h=topH+revealH;
  return {h,draw(pg,y){
   const g=pg.g,x=M;
   surface(g,x,y,CW,h,{r:18,border:'#ffffff26'});neon(g,x,y,CW,h,18,f,2.6);
   // the stub: the gain up front
   const tcx=x+tabW/2,mid=y+topH/2;
   const go={size:36,weight:600,ls:-1.8},po={mono:true,weight:600,size:13},gs=`+${g0}`,gw=width(g,gs,go),pw=width(g,'%',po),gx0=tcx-(gw+2+pw)/2;
   text(pg,gs,gx0,mid+4,{...go,glow:f[2]+'aa',blur:12,paint:(gg,x0,yy,w)=>{const lg=gg.createLinearGradient(x0,yy-30,x0+w,yy+4);lg.addColorStop(0,f[0]);lg.addColorStop(1,f[1]);return lg;}});
   text(pg,'%',gx0+gw+2,mid+4,{...po,color:'#ececf5'});
   text(pg,'READINESS LIFT',tcx,mid+22,{align:'center',mono:true,weight:600,size:6.1,ls:1.6,color:C.muted});
   text(pg,`${score}% → ${after}%`,tcx,mid+35,{align:'center',mono:true,weight:600,size:8.2,ls:.3,color:C.soft});
   // perforation and the two notches
   g.save();g.setLineDash([3,3]);g.lineWidth=.8;g.strokeStyle='#ffffff2e';g.beginPath();g.moveTo(x+tabW,y+9);g.lineTo(x+tabW,y+topH-9);g.stroke();g.setLineDash([]);
   rr(g,x,y,CW,h,18);g.clip();
   for(const ny of [y,y+topH]){g.beginPath();g.arc(x+tabW,ny,7,0,Math.PI*2);g.fillStyle=C.bg;g.fill();g.lineWidth=.8;g.strokeStyle='#ffffff26';g.stroke();}
   g.restore();
   // the body: what we heard, and the lift as a segment ladder
   let cy=y+24+6;const bx=x+bodyX;
   g.save();g.shadowColor=f[2];g.shadowBlur=8*S;g.beginPath();g.arc(bx+2.6,cy-2.4,2.6,0,Math.PI*2);const dg=g.createLinearGradient(bx,cy-5,bx+5,cy);dg.addColorStop(0,f[0]);dg.addColorStop(1,f[1]);g.fillStyle=dg;g.fill();g.restore();
   let mx=bx+10;mx+=text(pg,'MAIN ISSUE',mx,cy,{mono:true,weight:700,size:6.6,ls:1.7,color:'#f0f0f7'});
   mx+=text(pg,'  ·  ',mx,cy,{mono:true,size:6.6,color:C.dim,silent:true});
   text(pg,String(ins.metric||'Mix detail').toUpperCase(),mx,cy,{mono:true,weight:600,size:6.6,ls:1.7,color:C.muted});
   cy+=12;
   title.forEach(l=>{cy+=22;text(pg,l,bx,cy-4,{size:18,weight:600,ls:-.5,color:'#ffffff'});});
   sub.forEach(l=>{cy+=13.5;text(pg,l,bx,cy-1,{size:9.4,color:C.muted});});
   cy+=12;
   const segs=28,gap=3,sw=(bodyW-gap*(segs-1))/segs,on=Math.round(score/100*segs),onAfter=Math.round(after/100*segs);
   for(let i=0;i<segs;i++){
    const sx=bx+i*(sw+gap);g.save();rr(g,sx,cy,sw,9,1.6);
    if(i<on){g.globalAlpha=.24;g.fillStyle='#d6d6e2';g.fill();}
    else if(i<onAfter){const lg=g.createLinearGradient(0,cy,0,cy+9);lg.addColorStop(0,f[1]);lg.addColorStop(1,f[0]);g.shadowColor=f[2];g.shadowBlur=8*S;g.fillStyle=lg;g.fill();}
    else{g.fillStyle='#ffffff10';g.fill();}
    g.restore();
   }
   // the fix, open: the site's revealed state
   g.save();g.fillStyle='#ffffff12';g.fillRect(x+pad,y+topH,CW-pad*2,.7);g.restore();
   cy=y+topH+18;
   eyebrow(pg,'Try this',x+pad,cy+6);cy+=14;
   advice.forEach(l=>{cy+=14.6;text(pg,l,x+pad,cy-3,{size:9.8,color:'#e6e6ee'});});
   if(tips){
    cy+=18;eyebrow(pg,`Action tips · ${tips.title||ins.title}`,x+pad,cy+6);cy+=14;
    tips.items.forEach((t,i)=>{
     cy+=8;const ls=tipLines[i];
     g.save();rr(g,x+pad,cy+1,17,13,4);g.fillStyle=f[0]+'1f';g.fill();g.lineWidth=.6;g.strokeStyle=f[0]+'55';g.stroke();g.restore();
     text(pg,String(i+1).padStart(2,'0'),x+pad+8.5,cy+10.2,{align:'center',mono:true,weight:600,size:6.6,color:f[1]});
     ls.forEach((l,j)=>text(pg,l,x+pad+26,cy+10.6+j*13.4,{size:9.2,color:'#dcdce6'}));
     cy+=ls.length*13.4;
    });
   }
  }};
 }
 // The other signals: one row per block so the box can continue on the next
 // page. build() draws one card behind each run of rows on a page.
 function signalRows(ctx,mg,list){
  const pad=22,textW=CW-pad*2-18-54,TIPS=window.MastrifyCopy?.TIPS||{};
  return list.map(ins=>{
   const title=wrap(mg,ins.title||'',textW,{size:11.2,weight:600,ls:-.2});
   const body=wrap(mg,ins.text||ins.subtitle||'',textW,{size:9});
   const tip=ins.tips&&TIPS[ins.tips]?TIPS[ins.tips]:null,items=tip?tip.items.map(t=>wrap(mg,t,textW-22,{size:8.4})):[];
   const r={ins,title,body,tip,items};
   return {group:'signals',h:19+title.length*15+body.length*13+(tip?12+10+items.reduce((s,l)=>s+l.length*12+4,0):0)+17,draw(pg,y,first){
    const g=pg.g,x=M,f=fam(ctx,r.ins);let cy=y+3;
    if(!first){g.save();g.fillStyle='#ffffff12';g.fillRect(x+pad,y,CW-pad*2,.7);g.restore();}
    let ty=cy+16;
    g.save();g.shadowColor=f[2];g.shadowBlur=9*S;g.beginPath();g.arc(x+pad+3.4,ty+7,3.4,0,Math.PI*2);const dg=g.createLinearGradient(x+pad,ty,x+pad+7,ty+7);dg.addColorStop(0,f[0]);dg.addColorStop(1,f[1]);g.fillStyle=dg;g.fill();g.restore();
    const tx=x+pad+18;
    r.title.forEach(l=>{ty+=15;text(pg,l,tx,ty-4,{size:11.2,weight:600,ls:-.2,color:'#ffffff'});});
    r.body.forEach(l=>{ty+=13;text(pg,l,tx,ty-2,{size:9,color:C.muted});});
    if(r.tip){
     ty+=12;eyebrow(pg,'Action tips',tx,ty+4,{size:6,ls:1.7,color:'#9a9aae'});ty+=10;
     r.items.forEach((ls,i)=>{ty+=4;text(pg,String(i+1).padStart(2,'0'),tx,ty+9,{mono:true,weight:600,size:6.4,color:f[1]});ls.forEach((l,j)=>text(pg,l,tx+18,ty+9+j*12,{size:8.4,color:'#cfcfdc'}));ty+=ls.length*12;});
    }
    // the gain as a quiet chip on the right
    const gs=`+${Math.round(Number(r.ins.gain)||0)}%`,co={mono:true,weight:600,size:7.8,ls:.3},cw=width(g,gs,co)+16,chx=x+CW-pad-cw,chy=cy+15;
    g.save();rr(g,chx,chy,cw,17,8.5);g.fillStyle='#ffffff08';g.fill();g.lineWidth=.7;g.strokeStyle='#ffffff1c';g.stroke();g.restore();
    text(pg,gs,chx+cw/2,chy+11.6,{...co,align:'center',color:C.soft});
   }};
  });
 }
 function emptyBlock(){
  return {h:56,draw(pg,y){surface(pg.g,M,y,CW,56,{r:18});text(pg,'No issues stood out. Keep the balance you have.',M+22,y+32,{size:10,color:C.soft});}};
 }
 function nextBlock(ctx){
  const h=104;
  return {h,draw(pg,y){
   const g=pg.g,x=M;
   g.save();g.shadowColor='#000000a6';g.shadowBlur=26*S;g.shadowOffsetY=10*S;rr(g,x,y,CW,h,18);g.fillStyle='#070609';g.fill();g.restore();
   rr(g,x,y,CW,h,18);g.fillStyle=cssLinear(g,x,y,CW,h,120,[[0,'#150c28'],[.55,'#070609'],[1,'#0e0917']]);g.fill();
   g.save();rr(g,x,y,CW,h,18);g.clip();aura(g,x,y,CW,h,{rx:.7,ry:1.5,px:.86,py:.5,color:'#6d3bd626',end:.7});g.restore();
   g.save();rr(g,x+.4,y+.4,CW-.8,h-.8,18);g.lineWidth=.8;g.strokeStyle='#8f6bff38';g.stroke();g.restore();
   eyebrow(pg,'Next step',x+24,y+27);
   text(pg,'Ready for a pro master?',x+24,y+51,{size:15.5,weight:600,ls:-.35,color:'#ffffff'});
   wrap(g,'Studio-grade loudness and tone. The same mastering engine as the full release workflow.',300,{size:9}).forEach((l,i)=>text(pg,l,x+24,y+70+i*13,{size:9,color:C.muted}));
   // the button, as on the page, and it links there
   const bw=156,bh=36,bx=x+CW-24-bw,by=y+(h-bh)/2-7;
   g.save();g.shadowColor='#7a3bea80';g.shadowBlur=16*S;rr(g,bx,by,bw,bh,10);g.fillStyle=cssLinear(g,bx,by,bw,bh,120,[[0,'#7a3bea'],[.58,'#5a2bc4'],[1,'#4337b5']]);g.fill();g.restore();
   g.save();rr(g,bx+.4,by+.4,bw-.8,bh-.8,10);g.lineWidth=.8;g.strokeStyle='#c8a9ff';g.stroke();
   g.beginPath();g.moveTo(bx+10,by+1.2);g.lineTo(bx+bw-10,by+1.2);g.strokeStyle='#ffffff66';g.lineWidth=.6;g.stroke();g.restore();
   text(pg,'Master my track',bx+18,by+22.6,{size:10.2,weight:600,color:'#fff7ff'});
   text(pg,'↗',bx+bw-18,by+22.8,{size:11,weight:600,align:'right',color:'#fff7ff',silent:true});
   const url=`${String(ctx.site||'https://mastrify.com').replace(/\/$/,'')}/master`;
   pg.links.push({x:bx,y:by,w:bw,h:bh,url});
   text(pg,url.replace(/^https?:\/\//,'').toUpperCase(),bx+bw/2,by+bh+13,{align:'center',mono:true,weight:500,size:6,ls:1.3,color:C.dim});
  }};
 }

 /* ---------- the PDF file ---------- */
 const HELV=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
 const WIN={0x20ac:0x80,0x201a:0x82,0x192:0x83,0x201e:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x2c6:0x88,0x2030:0x89,0x160:0x8a,0x2039:0x8b,0x152:0x8c,0x17d:0x8e,0x2018:0x91,0x2019:0x92,0x201c:0x93,0x201d:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2dc:0x98,0x2122:0x99,0x161:0x9a,0x203a:0x9b,0x153:0x9c,0x17e:0x9e,0x178:0x9f};
 const SUB={'−':'-','→':'->','←':'<-','↗':'','↓':'','≈':'~',' ':' ',' ':' '};
 // One text run as WinAnsi codes (what the standard Helvetica can carry).
 function win(str){
  const out=[];
  for(const ch of String(str)){
   const s=SUB[ch];if(s!==undefined){for(const c of s)out.push(c.charCodeAt(0));continue;}
   const cp=ch.codePointAt(0);
   if(cp>=32&&cp<127||cp>=0xa0&&cp<=0xff)out.push(cp);
   else if(WIN[cp])out.push(WIN[cp]);
   else{const base=ch.normalize('NFD').replace(/[̀-ͯ]/g,'');out.push(base&&base.charCodeAt(0)<127?base.charCodeAt(0):63);}
  }
  return out;
 }
 const helvWidth=codes=>codes.reduce((s,c)=>s+(c>=32&&c<127?HELV[c-32]:556),0)/1000;
 const pdfStr=codes=>'('+codes.map(c=>c===40||c===41||c===92?'\\'+String.fromCharCode(c):c<32||c>126?'\\'+c.toString(8).padStart(3,'0'):String.fromCharCode(c)).join('')+')';
 const hexUtf16=s=>'<FEFF'+Array.from(String(s)).map(ch=>{const cp=ch.codePointAt(0);if(cp<0x10000)return cp.toString(16).padStart(4,'0');const v=cp-0x10000;return ((v>>10)+0xd800).toString(16)+((v&0x3ff)+0xdc00).toString(16);}).join('').toUpperCase()+'>';
 const n2=v=>(Math.round(v*100)/100).toString();
 function textLayer(texts){
  let s='BT 3 Tr\n';
  for(const t of texts){
   const codes=win(t.str);if(!codes.length)continue;
   const hw=helvWidth(codes)*t.size,tz=hw>0?Math.max(10,Math.min(400,t.w/hw*100)):100;
   s+=`/F1 ${n2(t.size)} Tf ${n2(tz)} Tz 1 0 0 1 ${n2(t.x)} ${n2(PH-t.y)} Tm ${pdfStr(codes)} Tj\n`;
  }
  return s+'ET\n';
 }
 async function jpeg(canvas,q=.9){
  const blob=await new Promise(res=>{try{canvas.toBlob(res,'image/jpeg',q);}catch(_){res(null);}});
  if(blob)return new Uint8Array(await blob.arrayBuffer());
  const b64=canvas.toDataURL('image/jpeg',q).split(',')[1],bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;
 }
 function assemble(pages,info){
  const parts=[],offsets=[];let size=0;
  const put=x=>{const b=typeof x==='string'?Uint8Array.from(x,c=>c.charCodeAt(0)&255):x;parts.push(b);size+=b.length;};
  const obj=(n,...body)=>{offsets[n]=size;put(`${n} 0 obj\n`);body.forEach(put);put('\nendobj\n');};
  const count=pages.length,first=5,kids=pages.map((_,i)=>`${first+i*3} 0 R`).join(' ');
  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> >>');
  obj(2,`<< /Type /Pages /Kids [${kids}] /Count ${count} >>`);
  obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4,`<< /Title ${hexUtf16(info.title)} /Author (Mastrify) /Creator (mastrify.com) /Producer (Mastrify) /CreationDate (D:${info.stamp}) >>`);
  pages.forEach((p,i)=>{
   const pn=first+i*3,cn=pn+1,im=pn+2;
   const annots=p.links.length?` /Annots [${p.links.map(l=>`<< /Type /Annot /Subtype /Link /Rect [${n2(l.x)} ${n2(PH-l.y-l.h)} ${n2(l.x+l.w)} ${n2(PH-l.y)}] /Border [0 0 0] /A << /S /URI /URI ${pdfStr(win(l.url))} >> >>`).join(' ')}]`:'';
   obj(pn,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R${annots} >>`);
   const stream=`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q\n`+textLayer(p.texts);
   obj(cn,`<< /Length ${stream.length} >>\nstream\n`,stream,'\nendstream');
   obj(im,`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,p.jpeg,'\nendstream');
  });
  const total=first+count*3,xref=size;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`+Array.from({length:total-1},(_,i)=>String(offsets[i+1]).padStart(10,'0')+' 00000 n \n').join(''));
  put(`trailer\n<< /Size ${total} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
 }

 async function build(result,{duration=0}={}){
  const a=result&&result.analysis;if(!a)throw new Error('There is no analysis to put in a report yet.');
  const parts=window.MastrifyReportViews&&window.MastrifyReportViews.parts;if(!parts)throw new Error('The report layout is not loaded.');
  const when=new Date(result.createdAt||Date.now()),valid=!Number.isNaN(when.getTime())?when:new Date();
  const ctx={a,parts,demo:!!result.demo,name:String(result.name||'Your track'),duration:Number(duration)||0,
   date:`${valid.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][valid.getMonth()]} ${valid.getFullYear()}`,site:(window.MastrifyConfig&&window.MastrifyConfig.siteUrl)||'https://mastrify.com'};
  const mg=document.createElement('canvas').getContext('2d');
  const blocks=[],hero=heroBlock(ctx,mg);
  blocks.push([titleBlock(ctx),0],[hero,6],[noteBlock(ctx),0]);
  // the tiles give up a little height before they leave a row behind page one
  const metrics=a.metrics||[];
  for(let i=0;i<metrics.length;i+=2)blocks.push([tileRow(ctx,mg,metrics.slice(i,i+2)),6]);
  const [main,...rest]=a.insights||[];
  blocks.push(['break',0]);
  blocks.push([sectionHead('Issues found',`${(a.insights||[]).length} signal${(a.insights||[]).length===1?'':'s'}`),0]);
  if(main)blocks.push([stubBlock(ctx,mg,main),12]);else blocks.push([emptyBlock(),12]);
  signalRows(ctx,mg,rest).forEach((b,i,all)=>blocks.push([b,i===all.length-1?14:0]));
  blocks.push([nextBlock(ctx),0]);
  // layout: blocks go down the page and move to the next one when they do not fit
  const placed=[];let page=0,y=76,top=76;
  blocks.forEach(([b,gap],i)=>{
   if(b==='break'){if(y>top+(LIMIT-top)*.5){page++;y=top=78;}else y+=10;return;}
   const nb=blocks[i+1]&&blocks[i+1][0],follow=b.keep&&nb&&nb!=='break'?nb.h:0;
   if(y+b.h+follow>LIMIT&&y>top){page++;y=top=78;}
   placed.push({b,page,y});y+=b.h+gap;
  });
  const pages=Array.from({length:page+1},(_,i)=>{const p=makePage();if(i)headerMini(p,ctx);else headerFull(p,ctx);return p;});
  // rows of one group share a card per page
  for(let i=0;i<placed.length;){
   const it=placed[i];if(!it.b.group){i++;continue;}
   let j=i;while(j+1<placed.length&&placed[j+1].b.group===it.b.group&&placed[j+1].page===it.page)j++;
   const last=placed[j];surface(pages[it.page].g,M,it.y,CW,last.y+last.b.h-it.y,{r:18,tint:'#b58cff14'});
   for(let k=i;k<=j;k++)placed[k].first=k===i;i=j+1;
  }
  placed.forEach(it=>it.b.draw(pages[it.page],it.y,it.first));
  pages.forEach((p,i)=>footer(p,i+1,pages.length,ctx));
  const out=[];
  for(const p of pages){const jp=await jpeg(p.c,.9);out.push({jpeg:jp,w:p.c.width,h:p.c.height,texts:p.texts,links:p.links});p.c.width=p.c.height=1;}
  const pad=v=>String(v).padStart(2,'0'),now=new Date();
  return assemble(out,{title:`Mastrify mix report · ${ctx.name}`,stamp:`${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`});
 }
 window.MastrifyReportPdf={build};
})();
