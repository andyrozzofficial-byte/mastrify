/* Sonic Wave, nya 3D-kroppar (provläge, ?wave=relief|prism|tube|horizon|silk|glass).
 * Kroppen är det enda som byts. Strängarna, huvudljuset, markören, pulsen
 * och utläsningarna i track.js ligger kvar ovanpå. Varje kropp bakas en
 * gång per vågform/storlek som två stillbilder (osp elad + spelad) och
 * ritas sedan per bildruta med spelhuvudets ljus och musikens puls.
 * Topparna är de avkodade; ingenting skalas om. */
(function(root){
 'use strict';
 const TAU=Math.PI*2;
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 const SPECTRUM=[[0,'#8a3ae0'],[.2,'#c395fa'],[.43,'#fcf6ff'],[.57,'#ecedff'],[.74,'#b7d6ff'],[1,'#4a92f6']];
 const GRAY=[[0,'#5a6184'],[.5,'#9aa3c8'],[1,'#5a6184']];

 function layer(g){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(g.width*g.dpr));canvas.height=Math.max(1,Math.round(g.height*g.dpr));
  const ctx=canvas.getContext('2d');ctx.setTransform(g.dpr,0,0,g.dpr,0,0);ctx.lineJoin='round';ctx.lineCap='round';
  return {canvas,ctx};
 }
 function across(c,g,stops){
  const grad=c.createLinearGradient(g.pad,0,g.width-g.pad,0);
  for(const [at,color] of stops)grad.addColorStop(at,color);return grad;
 }
 function vertical(c,y0,y1,stops){
  const grad=c.createLinearGradient(0,y0,0,y1);
  for(const [at,color] of stops)grad.addColorStop(at,color);return grad;
 }
 // Kantljus med mjuk bloom i flera pass, utan filter (fungerar i Safari).
 function rim(c,path,style,lit){
  c.save();c.globalCompositeOperation='lighter';c.strokeStyle=style;
  const passes=lit?[[10,.05],[5,.1],[2.2,.3],[1.1,.9]]:[[3.2,.07],[1.6,.2],[.9,.55]];
  for(const [width,alpha] of passes){c.lineWidth=width;c.globalAlpha=alpha;c.stroke(path);}
  c.restore();
 }
 // Tunn skugga strax innanför överkanten: kanten får en fasad relief.
 function bevel(c,g,alpha){
  c.save();c.clip(g.bodyPath);c.translate(0,1.3);c.strokeStyle='#05060c';c.lineWidth=1.8;c.globalAlpha=alpha;c.stroke(g.topPath);
  c.translate(0,-2.6);c.strokeStyle='#ffffff';c.lineWidth=.6;c.globalAlpha=alpha*.35;c.stroke(g.bottomPath);c.restore();
 }
 // Blank högdager över kroppens övre del, som glansen på skivan.
 function sheen(c,g,alpha){
  c.save();c.clip(g.bodyPath);c.globalCompositeOperation='lighter';
  c.fillStyle=vertical(c,g.middle-g.scale*.8,g.middle-g.scale*.2,[[0,'rgba(255,255,255,0)'],[.45,`rgba(255,250,255,${alpha})`],[1,'rgba(255,255,255,0)']]);
  c.fillRect(g.pad,g.middle-g.scale,g.usable,g.scale);c.restore();
 }
 // Mjuk bloom av den tända kroppen. Filter där det finns, annars åtta
 // förskjutna kopior (Safari).
 function bloom(g,source){
  const L=layer(g),c=L.ctx;
  if(typeof c.filter==='string'){c.filter='blur(9px)';c.drawImage(source,0,0,g.width,g.height);c.filter='none';}
  else{c.globalAlpha=.14;for(let k=0;k<8;k++){const a=k/8*TAU;c.drawImage(source,Math.cos(a)*6,Math.sin(a)*6,g.width,g.height);}}
  return L;
 }
 // Skivans yta: fina vågräta spår, klippta till silhuetten.
 function grooves(c,g,alpha){
  c.save();c.clip(g.bodyPath);c.strokeStyle='#dcd6ff';c.lineWidth=.55;c.globalAlpha=alpha;c.beginPath();
  for(let y=Math.floor(g.middle-g.scale)-2;y<g.middle+g.scale+3;y+=2.5){c.moveTo(g.pad,y+.25);c.lineTo(g.width-g.pad,y+.25);}
  c.stroke();c.restore();
 }
 // Golvspegling under kroppen: fallande, ihoptryckt och utfasad.
 function reflect(c,g,source,strength,floor=g.middle+g.scale+2,squash=.32){
  const tmp=layer(g),t=tmp.ctx;
  t.save();t.translate(0,floor);t.scale(1,-squash);t.translate(0,-floor);t.drawImage(source,0,0,g.width,g.height);t.restore();
  t.globalCompositeOperation='destination-in';
  t.fillStyle=vertical(t,floor,floor+g.scale*.9*squash+8,[[0,`rgba(0,0,0,${strength})`],[.55,`rgba(0,0,0,${strength*.25})`],[1,'rgba(0,0,0,0)']]);
  t.fillRect(0,floor,g.width,g.height-floor);
  c.drawImage(tmp.canvas,0,0,g.width,g.height);
 }
 function edgeAt(g,x){
  const n=g.bars.length,u=clamp((x-g.pad)/g.usable),f=u*(n-1),i=Math.min(n-2,Math.floor(f)),t=f-i,a=g.bars[i],b=g.bars[i+1];
  return {top:mix(a.top,b.top,t),bottom:mix(a.bottom,b.bottom,t),silent:a.silent&&b.silent};
 }
 // Bandnivaer (bas, mellan, luft) langs hela forhandsvisningen, 0..1, fran
 // ljudmotorns analys. Utan analys: lugnade konturer av vagformen.
 function bandRidges(g){
  const n=g.bars.length,out=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];
  const audio=root.MastrifyAudio;let ok=false;
  try{
   if(audio&&typeof audio.sampleStringBands==='function'&&typeof audio.getState==='function'){
    const state=audio.getState();
    if(state&&state.loaded){
     const start=state.preview?state.preview.start:0,end=state.preview?state.preview.end:(state.sourceDuration||state.duration||0);
     const levels=new Float32Array(3),history=new Float32Array(99);
     let any=0;
     for(let i=0;i<n;i++){
      const u=(i+.5)/n,at=start+u*(end-start);
      if(audio.sampleStringBands(levels,history,at,state.selected)){for(let b=0;b<3;b++){out[b][i]=clamp(levels[b]);any+=levels[b];}}
     }
     ok=any>.01;
    }
   }
  }catch(_){ok=false;}
  if(!ok){
   const radii=[9,5,2],gains=[1,.72,.48];
   for(let b=0;b<3;b++){const env=envelope(g,radii[b]);for(let i=0;i<n;i++)out[b][i]=clamp((env.top[i]+env.bottom[i])/(2*g.scale)*gains[b]);}
  }
  // Varje band far sin egen hojdskala (10:e till 98:e percentilen), sa
  // mellan- och luftbanden, som lever pa sma tal, ocksa blir asar.
  for(let b=0;b<3;b++){
   const sorted=Array.from(out[b]).sort((x,y)=>x-y),lo=sorted[Math.floor(sorted.length*.1)],hi=sorted[Math.floor(sorted.length*.98)];
   const span=Math.max(1e-4,hi-lo);
   for(let i=0;i<n;i++)out[b][i]=hi-lo<1e-3?0:clamp((out[b][i]-lo)/span)**.8;
  }
  // Mjuka bandkurvor: musiken ska lasas som asar, inte som staplar.
  for(let b=0;b<3;b++){const src=out[b].slice();for(let i=0;i<n;i++){let sum=0,wt=0;for(let o=-3;o<=3;o++){const k=clamp(i+o,0,n-1),wgt=4-Math.abs(o);sum+=src[k]*wgt;wt+=wgt;}out[b][i]=sum/wt;}}
  return out;
 }
 function envelope(g,radius){
  const n=g.bars.length,top=new Float32Array(n),bottom=new Float32Array(n);
  for(let i=0;i<n;i++){
   let up=0,down=0,weight=0;
   for(let o=-radius;o<=radius;o++){const b=g.bars[clamp(i+o,0,n-1)],wgt=radius+1-Math.abs(o);up+=(g.middle-b.top)*wgt;down+=(b.bottom-g.middle)*wgt;weight+=wgt;}
   top[i]=up/weight;bottom[i]=down/weight;
  }
  return {top,bottom};
 }

 /* 1. RELIEF: hela vågformen som en tjock, extruderad platta sedd snett
  * uppifrån höger. Framsidan är den exakta vågformen i skivans material,
  * ovansidan fångar ljuset och högerflankerna ligger i skugga. */
 function bakeRelief(g,lit){
  const L=layer(g),c=L.ctx,{pad,usable,middle,scale,bars,width:w}=g;
  let highest=Infinity;for(const b of bars)if(!b.silent&&b.top<highest)highest=b.top;
  if(highest===Infinity)highest=middle-scale*.5;
  const amp=Math.max(6,middle-highest);
  const depth=clamp(Math.min(amp*.7,highest-6),6,18),ux=.3,uy=.95;
  // Ovansida och flanker: ljusare upptill, mörkare mot mitten.
  const flank=lit?vertical(c,middle-scale,middle+scale,[[0,'#4c37a4'],[.5,'#1c1744'],[1,'#2e55b2']])
   :vertical(c,middle-scale,middle+scale,[[0,'#2a2f4b'],[.5,'#0d0e18'],[1,'#1c2540']]);
  // Ovansidan skuggas längs djupet: mörk vid bortre kanten, ljus vid
  // framkanten, så plattans tjocklek läses som en belyst fasad.
  const far=lit?[74,58,156]:[59,63,102],near=lit?[239,228,255]:[183,191,228];
  for(let j=depth;j>=.5;j-=.5){
   const t=1-j/depth,ease=t*t*(3-2*t);
   const tone=`rgb(${Math.round(mix(far[0],near[0],ease))},${Math.round(mix(far[1],near[1],ease))},${Math.round(mix(far[2],near[2],ease))})`;
   c.save();c.translate(j*ux,-j*uy);
   c.globalAlpha=1;c.fillStyle=flank;c.fill(g.bodyPath);
   // Ovansidan: bara bandet ovanför mitten är belyst uppifrån.
   c.save();c.clip(g.bodyPath);c.fillStyle=tone;c.fillRect(pad-20,0,usable+40,middle);c.restore();
   c.restore();
  }
  // Bakre kanten av ovansidan, en tunn ljus linje som slutar plattan.
  c.save();c.translate(depth*ux,-depth*uy);
  c.strokeStyle=lit?across(c,g,SPECTRUM):'#c9d0ee';c.lineWidth=.8;c.globalAlpha=lit?.55:.32;c.stroke(g.topPath);
  c.restore();
  // Framsidan: skivans mörka, blanka material med ett sken under mitten.
  c.globalAlpha=1;
  c.fillStyle=lit?vertical(c,middle-scale,middle+scale,[[0,'#9a72ff'],[.32,'#4c36a8'],[.5,'#2b2266'],[.68,'#3450a6'],[1,'#66aaff']])
   :vertical(c,middle-scale,middle+scale,[[0,'#5a608a'],[.32,'#2e3352'],[.5,'#1c1f33'],[.68,'#283050'],[1,'#465680']]);
  c.fill(g.bodyPath);
  bevel(c,g,lit?.5:.4);sheen(c,g,lit?.14:.07);
  if(lit){c.save();c.clip(g.bodyPath);c.globalCompositeOperation='lighter';c.fillStyle=across(c,g,SPECTRUM);c.globalAlpha=.14;c.fillRect(pad,0,usable,g.height);c.restore();}
  grooves(c,g,lit?.1:.06);
  rim(c,g.topPath,lit?across(c,g,SPECTRUM):across(c,g,GRAY),lit);
  rim(c,g.bottomPath,lit?across(c,g,SPECTRUM):across(c,g,GRAY),lit);
  return L;
 }

 /* 2. PRISM: varje stav blir ett block med tre ytor i isometri: framsida i
  * skivans material, en upplyst ovansida som bär neonet och en skuggad sida.
  * Kroppen läses som en tät, blank stad av ljus. */
 function bakePrism(g,lit){
  const L=layer(g),c=L.ctx,{middle,scale,spacing,bars}=g;
  const group=Math.max(1,Math.ceil(7/spacing)),gap=Math.max(1,spacing*group*.16);
  const blocks=[];
  for(let i=0;i<bars.length;i+=group){
   let top=Infinity,bottom=-Infinity;
   for(let j=i;j<Math.min(bars.length,i+group);j++){if(bars[j].silent)continue;top=Math.min(top,bars[j].top);bottom=Math.max(bottom,bars[j].bottom);}
   if(top===Infinity)continue;
   blocks.push({x:bars[i].x,w:spacing*group-gap,top,bottom});
  }
  if(!blocks.length)return L;
  const d=clamp(blocks[0].w*1.15,4,11),dx=d*.8,dy=-d*.62;
  const spectrum=across(c,g,SPECTRUM),gray=across(c,g,GRAY);
  const front=lit?vertical(c,middle-scale,middle+scale,[[0,'#8a63f4'],[.3,'#45309a'],[.5,'#261e5a'],[.7,'#2e4a98'],[1,'#57a0ff']])
   :vertical(c,middle-scale,middle+scale,[[0,'#5a608a'],[.35,'#2b2f4a'],[.5,'#1a1c2e'],[.7,'#252c48'],[1,'#425275']]);
  const side=lit?vertical(c,middle-scale,middle+scale,[[0,'#5b3fc4'],[.5,'#1a1540'],[1,'#3a68cc']])
   :vertical(c,middle-scale,middle+scale,[[0,'#262a44'],[.5,'#0b0c15'],[1,'#1b2440']]);
  for(const b of blocks){
   // Sidan, sedan ovansidan, sedan framsidan (vänster till höger).
   c.globalAlpha=1;
   c.beginPath();c.moveTo(b.x+b.w,b.top);c.lineTo(b.x+b.w+dx,b.top+dy);c.lineTo(b.x+b.w+dx,b.bottom+dy);c.lineTo(b.x+b.w,b.bottom);c.closePath();
   c.fillStyle=side;c.fill();
   c.beginPath();c.moveTo(b.x,b.top);c.lineTo(b.x+b.w,b.top);c.lineTo(b.x+b.w+dx,b.top+dy);c.lineTo(b.x+dx,b.top+dy);c.closePath();
   c.fillStyle=lit?spectrum:gray;c.globalAlpha=lit?.95:.55;c.fill();
   if(lit){c.fillStyle='#ffffff';c.globalAlpha=.22;c.fill();}
   c.globalAlpha=1;
   c.beginPath();c.rect(b.x,b.top,b.w,b.bottom-b.top);c.fillStyle=front;c.fill();
  }
  // Ovansidornas ljus: en sammanhängande neonkant över alla blocktoppar.
  const edge=new Path2D();
  for(const b of blocks){edge.moveTo(b.x+dx*.5,b.top+dy*.5);edge.lineTo(b.x+b.w+dx*.5,b.top+dy*.5);}
  rim(c,edge,lit?spectrum:gray,lit);
  const foot=new Path2D();
  for(const b of blocks){foot.moveTo(b.x,b.bottom);foot.lineTo(b.x+b.w,b.bottom);}
  rim(c,foot,lit?spectrum:gray,false);
  sheen(c,g,lit?.12:.06);
  L.edgeTop=edge;L.edgeBottom=foot;
  return L;
 }

 /* 3. TUBE: vågen som ett glasrör vars radie följer topparna. Ljuset
  * ligger som en spegling i övre tredjedelen, kärnan är mörk, undersidan
  * får kallt återsken, och tvärsnittsringar ger rundningen. */
 function bakeTube(g,lit){
  const L=layer(g),c=L.ctx,{pad,usable,middle,bars,width:w}=g;
  const stops=lit?[[0,'#f3ebff'],[.05,'#c7a6ff'],[.18,'#7a5ad8'],[.45,'#3a2f80'],[.72,'#3f5fb8'],[.9,'#8ec0ff'],[1,'#e0f0ff']]
   :[[0,'#9aa3c8'],[.06,'#5a6288'],[.2,'#33395a'],[.48,'#171a2c'],[.76,'#262c48'],[.93,'#545d84'],[1,'#8a93b8']];
  const n=bars.length;
  for(let x=Math.floor(pad);x<=Math.ceil(pad+usable);x++){
   const u=clamp((x-pad)/usable),f=u*(n-1),i=Math.min(n-2,Math.floor(f)),t=f-i;
   const a=bars[i],b=bars[i+1];
   const top=mix(a.top,b.top,t),bottom=mix(a.bottom,b.bottom,t);
   if(bottom-top<1.2||(a.silent&&b.silent))continue;
   c.fillStyle=vertical(c,top,bottom,stops);c.globalAlpha=1;c.fillRect(x,top,1.02,bottom-top);
  }
  // Spegelblank högdager i rörets övre tredjedel.
  c.save();c.clip(g.bodyPath);
  const spec=envelope(g,2);
  c.beginPath();
  for(let i=0;i<n;i++){const y=middle-spec.top[i]*.82;i?c.lineTo(bars[i].x,y):c.moveTo(bars[i].x,y);}
  for(let i=n-1;i>=0;i--)c.lineTo(bars[i].x,middle-spec.top[i]*.5);
  c.closePath();c.fillStyle=lit?'#ffffff':'#c8d0f0';c.globalAlpha=lit?.3:.14;c.fill();
  // Tvärsnittsringar, tätare där rummet finns; skivans spår runt röret.
  const step=Math.max(9,g.spacing*3);
  c.strokeStyle=lit?'#e6ecff':'#aab3d6';c.lineWidth=.8;c.globalAlpha=lit?.42:.24;
  for(let x=pad+step*.5;x<pad+usable;x+=step){
   const u=(x-pad)/usable,f=u*(n-1),i=Math.min(n-2,Math.floor(f)),t=f-i;
   const top=mix(bars[i].top,bars[i+1].top,t),bottom=mix(bars[i].bottom,bars[i+1].bottom,t),ry=(bottom-top)/2;
   if(ry<2)continue;
   c.beginPath();c.ellipse(x,(top+bottom)/2,Math.max(1.4,ry*.16),ry,0,0,TAU);c.stroke();
  }
  c.restore();
  grooves(c,g,lit?.06:.035);
  c.save();c.globalCompositeOperation='lighter';c.strokeStyle=lit?across(c,g,SPECTRUM):across(c,g,GRAY);
  for(const [width,alpha] of (lit?[[7,.06],[3,.16],[1,.8]]:[[2.4,.1],[.8,.5]])){c.lineWidth=width;c.globalAlpha=alpha;c.stroke(g.topPath);c.stroke(g.bottomPath);}
  c.restore();
  return L;
 }

 /* 4. HORIZON: ett landskap. Den exakta vagformen ar den framsta asen,
  * ensidig fran en golvlinje. Bakom den stiger tre asar i perspektiv och
  * dis: luft narmast, mellan, bas langst bort, samma tre band som strangarna.
  * Under golvet speglas landskapet som i stilla vatten. */
 function bakeHorizon(g,lit){
  const L=layer(g),c=L.ctx,{pad,usable,middle,scale,bars,width:w,height:h}=g,cx=w/2,n=bars.length;
  const floor=middle+scale*.28,room=floor-6;
  const bands=bandRidges(g);
  // Perspektiv: varje as bakom flyttas upp mot horisonten och smalnar.
  const ridges=[
   {level:bands[2],t:.25,color:lit?'#8fd6ff':'#6d7a9c',height:.2},
   {level:bands[1],t:.5,color:lit?'#9cb8ff':'#5f6a8c',height:.24},
   {level:bands[0],t:.72,color:lit?'#c8a4ff':'#55607f',height:.3}];
  const horizonY=floor-room*.72;
  // Dis och morgonljus bakom den bortersta asen, utfasat mot gavlarna.
  {const haze=layer(g),z=haze.ctx;
   z.fillStyle=vertical(z,horizonY-scale*.5,floor,lit?[[0,'rgba(120,90,220,0)'],[.3,'rgba(140,110,240,.16)'],[.6,'rgba(90,120,220,.07)'],[1,'rgba(0,0,0,0)']]
    :[[0,'rgba(80,90,140,0)'],[.3,'rgba(80,90,140,.11)'],[.6,'rgba(60,70,110,.05)'],[1,'rgba(0,0,0,0)']]);
   z.fillRect(0,0,w,floor);
   z.globalCompositeOperation='destination-in';
   z.fillStyle=across(z,g,[[0,'rgba(0,0,0,0)'],[.18,'rgba(0,0,0,1)'],[.82,'rgba(0,0,0,1)'],[1,'rgba(0,0,0,0)']]);z.fillRect(0,0,w,h);
   c.drawImage(haze.canvas,0,0,w,h);}
  for(let r=ridges.length-1;r>=0;r--){
   const rg=ridges[r],base=floor-room*rg.t,sx=1-.1*rg.t,fog=1-.55*rg.t,height=Math.min(room*rg.height,base-6);
   const path=new Path2D();
   for(let i=0;i<n;i++){const x=cx+(bars[i].x-cx)*sx,y=base-rg.level[i]*height;i?path.lineTo(x,y):path.moveTo(x,y);}
   const line=new Path2D(path);
   path.lineTo(cx+(bars[n-1].x-cx)*sx,floor);path.lineTo(cx+(bars[0].x-cx)*sx,floor);path.closePath();
   c.globalAlpha=1;
   c.fillStyle=vertical(c,base-height,floor,lit?[[0,`rgba(96,70,190,${.95*fog})`],[.35,`rgba(40,30,96,${.96*fog})`],[1,`rgba(10,10,26,${fog})`]]
    :[[0,`rgba(74,82,128,${.95*fog})`],[.35,`rgba(30,34,62,${.96*fog})`],[1,`rgba(9,10,20,${fog})`]]);
   c.fill(path);
   c.save();c.globalCompositeOperation='lighter';c.strokeStyle=rg.color;
   for(const [wd,al] of (lit?[[6,.08*fog],[1.3,.9*fog]]:[[3.5,.05*fog],[1,.6*fog]])){c.lineWidth=wd;c.globalAlpha=al;c.stroke(line);}
   c.restore();
  }
  // Den framsta asen: den avkodade vagformen, toppen som hojd over golvet.
  const front=new Path2D(),frontLine=new Path2D();
  for(let i=0;i<n;i++){const y=floor-(middle-bars[i].top)*1.2;i?frontLine.lineTo(bars[i].x,y):frontLine.moveTo(bars[i].x,y);}
  front.addPath(frontLine);front.lineTo(bars[n-1].x,floor);front.lineTo(bars[0].x,floor);front.closePath();
  c.globalAlpha=1;
  c.fillStyle=lit?vertical(c,floor-scale*1.2,floor,[[0,'#8b62f2'],[.3,'#3d2c8c'],[.75,'#1c1848'],[1,'#3b62c0']])
   :vertical(c,floor-scale*1.2,floor,[[0,'#4d5478'],[.3,'#252a44'],[.75,'#14172a'],[1,'#2d3a5e']]);
  c.fill(front);
  c.save();c.clip(front);c.translate(0,1.4);c.strokeStyle='#04050a';c.lineWidth=1.8;c.globalAlpha=.45;c.stroke(frontLine);c.restore();
  if(lit){c.save();c.clip(front);c.globalCompositeOperation='lighter';c.fillStyle=across(c,g,SPECTRUM);c.globalAlpha=.12;c.fillRect(pad,0,usable,h);c.restore();}
  rim(c,frontLine,lit?across(c,g,SPECTRUM):across(c,g,GRAY),lit);
  // Golvlinjen: en tunn vattenyta.
  c.save();c.globalCompositeOperation='lighter';c.strokeStyle=lit?across(c,g,SPECTRUM):across(c,g,GRAY);c.lineWidth=.8;c.globalAlpha=lit?.5:.3;
  c.beginPath();c.moveTo(pad,floor+.5);c.lineTo(w-pad,floor+.5);c.stroke();c.restore();
  L.edgeTop=frontLine;L.edgeBottom=frontLine;L.clip=front;L.floor=floor;L.reflect=.34;
  return L;
 }

 /* 5. SILK: vagformen som ett sidenband som vrider sig i rummet. Kanterna
  * ar de exakta; vridningen syns i ljuset: framsidan lila-vit, baksidan
  * djupt bla, och en spegelblank veckning dar bandet star pa kant. */
 function bakeSilk(g,lit){
  const L=layer(g),c=L.ctx,{pad,usable,middle,scale,width:w}=g;
  const turns=2.5;
  for(let x=Math.floor(pad);x<=Math.ceil(pad+usable);x++){
   const e=edgeAt(g,x);if(e.silent||e.bottom-e.top<1)continue;
   const u=(x-pad)/usable,theta=u*TAU*turns+.9,f=Math.cos(theta);
   const front=f>0,k=Math.abs(f),crease=Math.exp(-((f/.09)**2));
   let r,gc,b;
   if(lit){
    if(front){r=mix(96,214,k);gc=mix(52,190,k);b=mix(190,255,k);}
    else{r=mix(40,120,k);gc=mix(40,170,k);b=mix(130,255,k);}
   }else{
    if(front){r=mix(48,150,k);gc=mix(52,156,k);b=mix(84,196,k);}
    else{r=mix(26,74,k);gc=mix(30,86,k);b=mix(52,128,k);}
   }
   r=Math.round(mix(r,255,crease*.85));gc=Math.round(mix(gc,250,crease*.85));b=Math.round(mix(b,255,crease*.85));
   // Rundning over bandets bredd: ljus overkant, morkare underkant.
   const grad=c.createLinearGradient(0,e.top,0,e.bottom);
   grad.addColorStop(0,`rgb(${Math.min(255,r+40)},${Math.min(255,gc+40)},${Math.min(255,b+30)})`);
   grad.addColorStop(.42,`rgb(${r},${gc},${b})`);
   grad.addColorStop(1,`rgb(${Math.round(r*.42)},${Math.round(gc*.42)},${Math.round(b*.55)})`);
   c.fillStyle=grad;c.globalAlpha=1;c.fillRect(x,e.top,1.02,e.bottom-e.top);
  }
  // Veckens skugga: en mjuk mork rand strax efter varje kant-pa-kant.
  c.save();c.clip(g.bodyPath);
  for(let x=Math.floor(pad);x<=Math.ceil(pad+usable);x+=2){
   const u=(x-pad)/usable,theta=u*TAU*turns+.9,f=Math.cos(theta),after=Math.exp(-(((f-.22)/.14)**2))*.55;
   if(after<.02)continue;c.fillStyle=`rgba(0,0,10,${after})`;c.fillRect(x,0,2.02,g.height);
  }
  c.restore();
  bevel(c,g,lit?.35:.3);
  rim(c,g.topPath,lit?across(c,g,SPECTRUM):across(c,g,GRAY),lit);
  rim(c,g.bottomPath,lit?across(c,g,SPECTRUM):across(c,g,GRAY),lit);
  return L;
 }

 /* 6. GLASS: en klar glasstav over hela tidslinjen. Vagformen ligger inuti
  * som lysande dimma med en skarp glodtrad langs den exakta konturen.
  * Glasets kanter fangar ljuset; inget annat tecknas. */
 function bakeGlass(g,lit){
  const L=layer(g),c=L.ctx,{pad,usable,middle,scale,width:w,height:h}=g;
  const top=middle-scale-9,bottom=middle+scale+9,radius=Math.min(14,(bottom-top)/2);
  const slab=new Path2D();
  if(typeof slab.roundRect==='function')slab.roundRect(pad,top,usable,bottom-top,radius);
  else{const r=radius,x0=pad,x1=pad+usable;slab.moveTo(x0+r,top);slab.lineTo(x1-r,top);slab.arcTo(x1,top,x1,top+r,r);slab.lineTo(x1,bottom-r);slab.arcTo(x1,bottom,x1-r,bottom,r);slab.lineTo(x0+r,bottom);slab.arcTo(x0,bottom,x0,bottom-r,r);slab.lineTo(x0,top+r);slab.arcTo(x0,top,x0+r,top,r);slab.closePath();}
  // Glaset: morkt, svagt genomskinligt, med kall bottenton.
  c.fillStyle=vertical(c,top,bottom,lit?[[0,'rgba(70,60,120,.34)'],[.5,'rgba(14,14,30,.5)'],[1,'rgba(30,50,100,.36)']]
   :[[0,'rgba(50,54,84,.34)'],[.5,'rgba(12,13,24,.5)'],[1,'rgba(24,32,60,.36)']]);
  c.globalAlpha=1;c.fill(slab);
  // Dimman: vagkroppen som diffust ljus i glaset.
  const mist=layer(g),m=mist.ctx;
  m.fillStyle=lit?vertical(m,middle-scale,middle+scale,[[0,'#9a6cff'],[.5,'#c9aeff'],[1,'#4f97ff']]):vertical(m,middle-scale,middle+scale,[[0,'#6f78a4'],[.5,'#aab1d2'],[1,'#52648c']]);
  m.fill(g.bodyPath);
  const soft=bloom(g,mist.canvas);
  c.save();c.clip(slab);
  c.globalAlpha=lit?.7:.45;c.drawImage(soft.canvas,0,0,w,h);
  c.globalAlpha=lit?.3:.15;c.drawImage(soft.canvas,0,0,w,h);
  c.globalAlpha=lit?.22:.16;c.drawImage(mist.canvas,0,0,w,h);
  // Glodtraden: den exakta konturen som en tunn, skarp linje.
  c.globalCompositeOperation='lighter';c.strokeStyle=lit?across(c,g,SPECTRUM):across(c,g,GRAY);
  for(const [wd,al] of (lit?[[3.5,.12],[1,.95]]:[[2.2,.08],[.8,.6]])){c.lineWidth=wd;c.globalAlpha=al;c.stroke(g.topPath);c.stroke(g.bottomPath);}
  // Brytning: ett snett ljusband genom glaset.
  const sheenBand=c.createLinearGradient(pad,top,pad+usable*.5,bottom);
  sheenBand.addColorStop(0,'rgba(255,255,255,0)');sheenBand.addColorStop(.48,'rgba(255,255,255,0)');sheenBand.addColorStop(.5,`rgba(255,255,255,${lit?.07:.045})`);sheenBand.addColorStop(.62,`rgba(255,255,255,${lit?.05:.03})`);sheenBand.addColorStop(.64,'rgba(255,255,255,0)');
  c.globalCompositeOperation='source-over';c.fillStyle=sheenBand;c.globalAlpha=1;c.fill(slab);
  c.restore();
  // Glasets kanter: ljus overkant, kall underkant, mjuka gavlar.
  c.save();c.globalCompositeOperation='lighter';
  c.strokeStyle=vertical(c,top,bottom,[[0,'rgba(255,255,255,.55)'],[.12,'rgba(255,255,255,.08)'],[.88,'rgba(120,180,255,.08)'],[1,'rgba(150,200,255,.45)']]);
  c.lineWidth=1;c.globalAlpha=lit?1:.7;c.stroke(slab);
  c.lineWidth=4;c.globalAlpha=lit?.16:.1;c.stroke(slab);
  c.restore();
  L.clip=slab;L.floor=bottom+1;L.reflect=.14;L.glowGain=.45;L.beamGain=.6;
  return L;
 }

 const BAKERS={relief:bakeRelief,prism:bakePrism,tube:bakeTube,horizon:bakeHorizon,silk:bakeSilk,glass:bakeGlass};
 function prepare(kind,g){
  const store=g.waveBodies||(g.waveBodies={});
  if(store[kind])return store[kind];
  const dark=BAKERS[kind](g,false),lit=BAKERS[kind](g,true);
  const floor=lit.floor,strength=lit.reflect||.26;
  reflect(dark.ctx,g,dark.canvas,strength*.75,floor);reflect(lit.ctx,g,lit.canvas,strength,floor);
  const glow=bloom(g,lit.canvas);
  for(const l of [dark,lit,glow])root.MastrifyCanvas?.cacheImage?.(l.canvas);
  return store[kind]={dark,lit,glow,scratch:layer(g),edgeTop:lit.edgeTop||g.topPath,edgeBottom:lit.edgeBottom||g.bottomPath,clip:lit.clip||g.bodyPath,glowGain:lit.glowGain||1,beamGain:lit.beamGain||1};
 }

 function draw(kind,c,g,f){
  if(!BAKERS[kind])return false;
  const pack=prepare(kind,g),w=g.width,h=g.height;
  const progress=clamp(f.progress),amount=clamp(f.amount),response=clamp(f.response);
  const scanX=g.pad+g.usable*progress;
  const bands=f.bands||{},accent=clamp(bands.accent||0),bass=clamp(bands.bass||0),air=clamp(bands.air||0);
  c.save();
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  c.drawImage(pack.dark.canvas,0,0,w,h);
  if(progress>0){
   // Den spelade delen tänds, med en mjuk front som följer spelhuvudet.
   // Masken läggs i ett eget skikt så inget under kroppen raderas.
   const s=pack.scratch.ctx;
   s.globalCompositeOperation='source-over';s.globalAlpha=1;s.clearRect(0,0,w,h);
   s.drawImage(pack.lit.canvas,0,0,w,h);
   s.globalCompositeOperation='destination-in';
   const fade=s.createLinearGradient(scanX-16,0,scanX+4,0);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');
   s.fillStyle=fade;s.fillRect(0,0,w,h);
   c.globalAlpha=clamp(.55+.45*amount);c.drawImage(pack.scratch.canvas,0,0,w,h);c.globalAlpha=1;
   // Bloomen andas med musiken över hela den spelade kroppen.
   s.globalCompositeOperation='source-over';s.clearRect(0,0,w,h);s.drawImage(pack.glow.canvas,0,0,w,h);
   s.globalCompositeOperation='destination-in';s.fillStyle=fade;s.fillRect(0,0,w,h);
   c.globalCompositeOperation='lighter';c.globalAlpha=clamp((.42+.4*response+.15*accent)*amount*pack.glowGain);c.drawImage(pack.scratch.canvas,0,0,w,h);
   c.globalCompositeOperation='source-over';c.globalAlpha=1;
  }
  // Ljus inne i kroppen vid spelhuvudet, klippt till silhuetten.
  c.save();c.clip(pack.clip);c.globalCompositeOperation='lighter';
  const beam=c.createLinearGradient(scanX-26,0,scanX+26,0);
  beam.addColorStop(0,'rgba(190,160,255,0)');beam.addColorStop(.5,`rgba(250,244,255,${(.55*amount+.3*response)*pack.beamGain})`);beam.addColorStop(1,'rgba(120,190,255,0)');
  c.fillStyle=beam;c.globalAlpha=1;c.fillRect(scanX-26,0,52,h);
  c.restore();
  // Huvudljuset: ett runt sken som andas med musiken.
  const R=g.scale*(1.35+.35*response+.2*accent)+12;
  const halo=c.createRadialGradient(scanX,g.middle,0,scanX,g.middle,R);
  halo.addColorStop(0,`rgba(255,250,255,${.34*amount+.22*response})`);halo.addColorStop(.28,`rgba(206,170,255,${.16*amount+.12*response})`);
  halo.addColorStop(.62,`rgba(120,150,255,${.05*amount+.05*bass})`);halo.addColorStop(1,'rgba(90,120,255,0)');
  c.globalCompositeOperation='lighter';c.fillStyle=halo;c.globalAlpha=1;c.fillRect(scanX-R,g.middle-R,R*2,R*2);
  // Kantpuls: konturen svarar på musiken över den spelade delen.
  if(response>.001&&progress>0){
   c.save();c.beginPath();c.rect(0,0,scanX+2,h);c.clip();
   c.strokeStyle=across(c,g,SPECTRUM);c.lineWidth=1.2+3.2*response;c.globalAlpha=(.12+.3*response)*amount;
   c.stroke(pack.edgeTop);c.stroke(pack.edgeBottom);
   c.lineWidth=.9;c.globalAlpha=(.2+.4*air)*amount;c.stroke(pack.edgeTop);
   c.globalAlpha=(.2+.4*bass)*amount;c.stroke(pack.edgeBottom);
   c.restore();
  }
  c.restore();
  return true;
 }

 // Kroppens egna kanter, för pulsen i track.js (blocken har andra kanter).
 function edges(kind,g){const pack=prepare(kind,g);return {top:pack.edgeTop,bottom:pack.edgeBottom};}
 root.MastrifyWaveBodies={draw,prepare,edges,kinds:Object.keys(BAKERS)};
})(typeof window!=='undefined'?window:globalThis);
