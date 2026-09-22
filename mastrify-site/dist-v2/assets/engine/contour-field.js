/* Selected Sonic Wave 03. Full-density shells are baked per source/size.
 * Front edges retain the decoded waveform; rear shells express material depth.
 * Transport, scanning and controls continue to be owned by the studio. */
(function(root){
 'use strict';
 const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
 const image=canvas=>root.MastrifyCanvas?.imageSource(canvas)||canvas;
 const trace=points=>{const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));return p;};
 const line=(c,p,color,width,alpha)=>{c.strokeStyle=color;c.lineWidth=width;c.globalAlpha=alpha;c.stroke(p);};
 function prepare(g){
  if(g.contourField)return g.contourField;
  const layers=[];
  for(const lit of [false,true]){
   const canvas=document.createElement('canvas');canvas.width=Math.round(g.width*g.dpr);canvas.height=Math.round(g.height*g.dpr);
   const c=canvas.getContext('2d');c.setTransform(g.dpr,0,0,g.dpr,0,0);c.lineJoin='round';
   const ink=c.createLinearGradient(g.pad,0,g.width-g.pad,0);
   for(const [p,color]of [[0,lit?'#ca92ff':'#a378d1'],[.32,lit?'#ead1ff':'#c8b4e1'],[.55,'#f3f4ff'],[.8,lit?'#c2e1ff':'#9ebedf'],[1,lit?'#78bcff':'#638ebd']])ink.addColorStop(p,color);
   const silent=g.bars.every(p=>p.silent);
   if(silent){line(c,trace([[g.pad,g.middle],[g.width-g.pad,g.middle]]),'#8d82ae',.7,.25);}
   else{
    // Same nine-shell arrangement as the chosen lab concept, attached to
    // every source sample rather than resampling or inventing peak heights.
    const outer=new Path2D(g.topPath);outer.addPath(g.bottomPath);
    c.save();c.shadowColor=lit?'#9e91ff':'#7c72dd';c.shadowBlur=(lit?13:7)*g.dpr;
    line(c,outer,ink,lit?4.5:3.6,lit?.075:.025);c.restore();
    for(let k=8;k>=0;k--){
     const depth=k/8,s=1-depth*.2,ox=depth*11,oy=-depth*17;
     const top=g.bars.map(p=>[p.x+ox,g.middle+(p.top-g.middle)*s+oy]);
     const bottom=g.bars.map(p=>[p.x+ox,g.middle+(p.bottom-g.middle)*s+oy]);
     if(k===8){const body=trace([...top,...bottom.reverse()]);body.closePath();c.globalAlpha=.035;c.fillStyle=ink;c.fill(body);bottom.reverse();}
     const alpha=k===0?.92:.16+(1-depth)*.25;
     line(c,trace(top),ink,k===0?1.5:.7,alpha);line(c,trace(bottom),ink,k===0?1.4:.7,alpha*.72);
    }
    for(let i=0;i<g.bars.length;i+=10){const a=g.bars[i];if(a.silent)continue;
     line(c,trace([[a.x,a.top],[a.x+11,g.middle+(a.top-g.middle)*.8-17]]),ink,.65,.32);
     line(c,trace([[a.x,a.bottom],[a.x+11,g.middle+(a.bottom-g.middle)*.8-17]]),ink,.65,.24);
     c.globalAlpha=.55;c.fillStyle='#ecddff';c.beginPath();c.arc(a.x,a.top,.8,0,Math.PI*2);c.fill();
    }
    line(c,trace([[g.pad,g.middle],[g.width-g.pad,g.middle]]),ink,.6,.2);
   }
   root.MastrifyCanvas?.cacheImage(canvas);layers.push(canvas);
  }
  prepareLight(g,layers);
  return g.contourField=layers;
 }

 // All additional ink follows the existing measured paths. The light has
 // depth because it catches each shell; it never changes the audio geometry.
 function surface(g,width=g.width){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*g.dpr));canvas.height=Math.max(1,Math.round(g.height*g.dpr));
  return canvas;
 }
 function prepareLight(g,layers){
  const silent=g.bars.every(p=>p.silent);
  layers.silent=silent;
  const emission=surface(g),ink=emission.getContext('2d');
  const hot=surface(g),hotInk=hot.getContext('2d');
  const shadow=surface(g),shade=shadow.getContext('2d');
  for(const ctx of [ink,hotInk,shade]){ctx.setTransform(g.dpr,0,0,g.dpr,0,0);ctx.lineJoin='round';ctx.lineCap='round';}
  const spectrum=ink.createLinearGradient(g.pad,0,g.width-g.pad,0);
  for(const [at,color] of [[0,'#c886ff'],[.28,'#cdb0ff'],[.52,'#ecedff'],[.76,'#a5d8ff'],[1,'#66b5ff']])spectrum.addColorStop(at,color);
  const silver=hotInk.createLinearGradient(g.pad,0,g.width-g.pad,0);
  for(const [at,color] of [[0,'#e8caff'],[.34,'#faf2ff'],[.58,'#ffffff'],[.82,'#e0f2ff'],[1,'#a2d9ff']])silver.addColorStop(at,color);
  if(!silent){
   // Connections share the actual shell geometry: the furthest shell is
   // 11px right, 17px up and 80% tall. Split each diagonal into depth steps
   // so the near bevel catches more light than its recessed rear end.
   const at=(bar,edge,depth)=>[bar.x+depth*11,g.middle+(bar[edge]-g.middle)*(1-depth*.2)-depth*17];
   for(let i=0;i<g.bars.length;i+=10){
    const bar=g.bars[i];if(bar.silent)continue;
    for(const edge of ['top','bottom']){
     const face=edge==='top'?1:.72;
     for(let k=8;k>0;k--){
      const rear=at(bar,edge,k/8),front=at(bar,edge,(k-1)/8),near=1-(k-.5)/8;
      // A narrow cool occlusion line falls immediately below each bevel.
      // It is painted source-over before the luminous pass in draw().
      line(shade,trace([[rear[0]+.35,rear[1]+.85],[front[0]+.35,front[1]+.85]]),'#03040b',1.65,(.22+.18*near)*face);
      const path=trace([rear,front]);
      line(ink,path,spectrum,1.3,(.22+.46*near)*face);
      line(hotInk,path,silver,.72,(.2+.65*near)*face);
     }
    }
   }
   // Stack the lips back-to-front with separate light/shade. The dark fine
   // underside makes these read as raised edges rather than parallel wires.
   for(let k=8;k>=0;k--){
    const depth=k/8,near=1-depth,scale=1-depth*.2,ox=depth*11,oy=-depth*17;
    const topPoints=g.bars.map(p=>[p.x+ox,g.middle+(p.top-g.middle)*scale+oy]);
    const bottomPoints=g.bars.map(p=>[p.x+ox,g.middle+(p.bottom-g.middle)*scale+oy]);
    const top=trace(topPoints),bottom=trace(bottomPoints);
    line(shade,trace(topPoints.map(([x,y])=>[x+.2,y+.9])),'#03040b',k===0?2.3:1.3,k===0?.48:.16+near*.17);
    line(shade,trace(bottomPoints.map(([x,y])=>[x+.2,y+1])),'#03040b',k===0?2.1:1.25,k===0?.4:.13+near*.14);
    line(ink,top,spectrum,k===0?3.2:1.3,k===0?1:.2+near*.2);
    line(ink,bottom,spectrum,k===0?3:1.3,k===0?.94:.14+near*.18);
    line(hotInk,top,silver,k===0?1.65:.8,k===0?1:.2+near*.42);
    line(hotInk,bottom,silver,k===0?1.5:.75,k===0?.94:.14+near*.34);
   }
  }
  layers.emissionInk=emission;layers.headInk=hot;layers.headShade=shadow;
  // Immediate baked fallback. No blur or shadows are evaluated in draw().
  // Async prewarming replaces this once with the exact worker-built bloom.
  const bloom=surface(g),bloomInk=bloom.getContext('2d');
  bloomInk.shadowColor='#aa8dff';bloomInk.shadowBlur=9*g.dpr;
  bloomInk.globalAlpha=.6;bloomInk.drawImage(emission,0,0);
  bloomInk.shadowColor='#8bc8ff';bloomInk.shadowBlur=3*g.dpr;
  bloomInk.globalAlpha=.48;bloomInk.drawImage(emission,0,0);
  layers.bloom=bloom;
  const head=surface(g,Math.min(190,g.width*.27)),mask=surface(g,head.width/g.dpr);
  const maskInk=mask.getContext('2d'),falloff=maskInk.createLinearGradient(0,0,mask.width,0);
  // Symmetric Gaussian-style fade: both ends are fully transparent, so the
  // moving slice never exposes a rectangular clip edge on the waveform.
  for(const [at,alpha] of [[0,0],[.08,.015],[.18,.075],[.3,.28],[.4,.68],[.5,1],[.6,.68],[.7,.28],[.82,.075],[.92,.015],[1,0]])falloff.addColorStop(at,`rgba(255,255,255,${alpha})`);
  maskInk.fillStyle=falloff;maskInk.fillRect(0,0,mask.width,mask.height);
  layers.headCanvas=head;layers.headContext=head.getContext('2d');layers.headMask=mask;
  g.headCanvas=head;
  for(const canvas of [emission,hot,shadow,bloom,mask])root.MastrifyCanvas?.cacheImage(canvas);
 }
 const preparedNames=['emissionInk','headInk','headShade','bloom','headMask'];
 function closePack(pack){
  if(!pack)return;
  for(const bitmap of [...(Array.isArray(pack.layers)?pack.layers:[]),...preparedNames.map(name=>pack[name])])bitmap?.close?.();
 }
 function adopt(g,pack){
  const width=Math.round(g.width*g.dpr),height=Math.round(g.height*g.dpr);
  const headWidth=Math.max(1,Math.round(Math.min(190,g.width*.27)*g.dpr));
  if(!pack||pack.width!==width||pack.height!==height||!Array.isArray(pack.layers)||pack.layers.length!==2
    ||typeof pack.silent!=='boolean')throw new Error('Invalid contour material.');
  const sources=[...pack.layers,...preparedNames.map(name=>pack[name])];
  if(sources.some((source,i)=>!source||source.width!==(i===sources.length-1?headWidth:width)||source.height!==height))
   throw new Error('Invalid contour material dimensions.');
  // Safari can defer the Canvas copy. Flush that copy before releasing the
  // transferred bitmap or its worker, otherwise the first visible frame can
  // contain blank material despite a successful postMessage.
  const copies=sources.map(source=>{
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   const c=canvas.getContext('2d');if(!c)throw new Error('Contour Canvas is unavailable.');
   c.drawImage(source,0,0);c.getImageData(0,0,1,1);
   root.MastrifyCanvas?.cacheImage(canvas);return canvas;
  });
  const layers=copies.slice(0,2);layers.silent=pack.silent;
  preparedNames.forEach((name,i)=>{layers[name]=copies[i+2];});
  const head=surface(g,headWidth/g.dpr);layers.headCanvas=head;layers.headContext=head.getContext('2d');
  if(!layers.headContext)throw new Error('Contour head Canvas is unavailable.');
  g.headCanvas=head;g.contourField=layers;return layers;
 }
 function prepareInWorker(g){
  if(typeof root.Worker!=='function'||typeof root.OffscreenCanvas!=='function')return Promise.resolve(null);
  return new Promise(resolve=>{
   let worker,timer,done=false;
   const finish=layers=>{
    if(done)return;done=true;clearTimeout(timer);
    if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();}
    resolve(layers);
   };
   try{
    worker=new root.Worker('/assets/engine/contour-worker.js?v=20260917-depth1');
    worker.onmessage=({data})=>{
     const pack=data?.pack;let layers=null;
     try{if(data?.ok&&pack)layers=g.contourField||adopt(g,pack);}catch(_){/* Preserve the native fallback. */}
     finally{closePack(pack);finish(layers);}
    };
    worker.onerror=worker.onmessageerror=()=>finish(null);
    timer=setTimeout(()=>finish(null),20000);
    // Paths/gradients/contexts never cross the worker boundary. These decoded
    // positions reconstruct the exact front paths at the existing full DPR.
    worker.postMessage({geometry:{width:g.width,height:g.height,dpr:g.dpr,pad:g.pad,usable:g.usable,
     middle:g.middle,scale:g.scale,bars:g.bars.map(({x,top,bottom,silent})=>({x,top,bottom,silent}))}});
   }catch(_){finish(null);}
  });
 }
 function prepareAsync(g){
  if(g.contourPreparation)return g.contourPreparation;
  const job=async()=>{
   const layers=g.contourField||await prepareInWorker(g)||prepare(g);
   if(layers.bloomReady||layers.silent)return layers;
   if(layers.bloomJob)return layers.bloomJob;
   const runtime=root.MastrifyCanvas;
   if(typeof runtime?.blurredCanvasAsync!=='function')return layers;
   const blur=async()=>{
    // The worker moves native paths and shadows off the main thread. These
    // two existing exact full-DPR blur passes still produce the final bloom.
    const tight=await runtime.blurredCanvasAsync(layers.emissionInk,2.8*g.dpr);
    const soft=await runtime.blurredCanvasAsync(layers.emissionInk,8.5*g.dpr);
    const bloom=surface(g),c=bloom.getContext('2d');
    c.globalCompositeOperation='lighter';c.globalAlpha=.82;c.drawImage(tight,0,0);
    c.globalAlpha=.54;c.drawImage(soft,0,0);
    runtime.cacheImage(bloom);layers.bloom=bloom;layers.bloomReady=true;return layers;
   };
   layers.bloomJob=blur().finally(()=>{layers.bloomJob=null;});
   return layers.bloomJob;
  };
  g.contourPreparation=job().finally(()=>{g.contourPreparation=null;});
  return g.contourPreparation;
 }
 // One cross-section at the actual time cursor. Its recessed samples use
 // precisely the same projection as the nine cached contour shells.
 function drawDepth(c,g,position,energy,time,bands,scanning){
  const sample=position*255,index=Math.min(254,Math.floor(sample)),blend=sample-index;
  const a=g.bars[index],b=g.bars[index+1];
  const top=a.top+(b.top-a.top)*blend,bottom=a.bottom+(b.bottom-a.bottom)*blend;
  if(bottom-top<1)return;
  const x=g.pad+g.usable*position,backTop=g.middle+(top-g.middle)*.8-17;
  const backBottom=g.middle+(bottom-g.middle)*.8-17;
  const bass=clamp(bands?.bass),mid=clamp(bands?.mid),air=clamp(bands?.air);
  const travel=.5+.5*Math.sin(time*(scanning?3.6:2.2));
  c.save();c.globalCompositeOperation='source-over';
  c.fillStyle='#030613';c.globalAlpha=.19;
  c.beginPath();c.moveTo(x,top);c.lineTo(x+11,backTop);c.lineTo(x+11,backBottom);c.lineTo(x,bottom);c.closePath();c.fill();
  c.fillStyle='#9caeff';c.globalAlpha=(.025+.035*mid)*energy;c.fill();
  c.globalCompositeOperation='lighter';c.lineCap='round';
  // Cool rear edges, lilac near edges, and a moving luminous slice between
  // them describe a volume instead of a white stripe on its front face.
  for(let k=8;k>=0;k--){
   const depth=k/8,px=x+depth*11;
   const y1=g.middle+(top-g.middle)*(1-depth*.2)-depth*17;
   const y2=g.middle+(bottom-g.middle)*(1-depth*.2)-depth*17;
   const focus=Math.exp(-Math.pow((depth-travel)*5,2));
   const light=energy*(.045+(k===0||k===8?.12:0)+focus*(.44+.18*mid));
   c.strokeStyle=k>4?'#83c9ff':k>1?'#c5b7ff':'#e6c9ff';
   c.beginPath();c.moveTo(px,y1);c.lineTo(px,y2);
   c.lineWidth=3.8;c.globalAlpha=light*.16;c.stroke();
   c.lineWidth=.68;c.globalAlpha=light;c.stroke();
   // Bright intersections sit on all shell lips, with independent low/high
   // response. These short glints leave the quiet body between them legible.
   c.strokeStyle='#eef1ff';c.lineWidth=1.15;
   c.globalAlpha=energy*(.3+.42*focus)*(.7+.3*air);
   c.beginPath();c.moveTo(px-1.7,y1);c.lineTo(px+1.7,y1);c.stroke();
   c.globalAlpha=energy*(.26+.42*focus)*(.7+.3*bass);
   c.beginPath();c.moveTo(px-1.7,y2);c.lineTo(px+1.7,y2);c.stroke();
  }
  c.strokeStyle='#b9ccff';c.lineWidth=3.5;c.globalAlpha=energy*.11;
  c.beginPath();c.moveTo(x,top);c.lineTo(x+11,backTop);c.moveTo(x,bottom);c.lineTo(x+11,backBottom);c.stroke();
  c.lineWidth=.9;c.globalAlpha=energy*(.72+.2*clamp(bands?.accent));c.stroke();
  c.restore();
 }
 // Huvudljuset kan ritas på tre sätt. "sync" är det ursprungliga: den lilla
 // ytan skrivs och ritas in i vågformen i samma bildruta. "lag" bygger exakt
 // samma bild men visar den först i nästa bildruta, så webbläsaren aldrig
 // behöver vänta på en yta den just skrivit till. "cached" bygger bilden bara
 // när huvudet flyttat en hel bildpunkt. Mätläget växlar mellan dem.
 let headMode='sync',drawCount=0;
 function setHeadMode(mode){headMode=mode==='lag'||mode==='cached'?mode:'sync';}
 // Mätläget (?prov=spel) kan stänga av huvudljusets två delar var för sig:
 // ljuset i vågformen och djupsnittet. Normalt är båda alltid på.
 let probe={wave:true,depth:true};
 function setProbe(value){probe={wave:value?.wave!==false,depth:value?.depth!==false};}
 function headSurface(layers,g){
  const canvas=surface(g,layers.headCanvas.width/g.dpr);
  return {canvas,ctx:canvas.getContext('2d'),q:null,built:-1,bloom:null,left:0};
 }
 // Huvudets två bilder för en position i hela bildpunkter: skuggan och
 // glöden, var och en genom samma mjuka fönster som förut.
 function buildHead(layers,slot,offset){
  const shade=slot.shade,glow=slot.glow,w=shade.canvas.width,h=shade.canvas.height;
  let x=shade.ctx;
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.globalAlpha=1;
  x.clearRect(0,0,w,h);x.drawImage(image(layers.headShade),-offset,0);
  x.globalCompositeOperation='destination-in';x.drawImage(image(layers.headMask),0,0);
  x.globalCompositeOperation='source-over';
  x=glow.ctx;
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.globalAlpha=1;
  x.clearRect(0,0,w,h);x.globalAlpha=.86;x.drawImage(image(layers.bloom),-offset,0);
  x.globalCompositeOperation='lighter';x.globalAlpha=.94;x.drawImage(image(layers.headInk),-offset,0);
  x.globalCompositeOperation='destination-in';x.globalAlpha=1;x.drawImage(image(layers.headMask),0,0);
  x.globalCompositeOperation='source-over';
  slot.bloom=layers.bloom;
 }
 // Reuse the small head surface for ribbon light too. No extra surfaces,
 // gradients or live blur are created as the transport moves.
 function beginHeadLight(g,position){
  if(headMode!=='sync'){
   const layers=prepare(g),buffers=layers.ribbonBuffers||=[headSurface(layers,g),headSurface(layers,g)];
   const back=buffers[layers.ribbonIndex||0],hc=back.ctx,head=back.canvas;
   back.left=g.pad+g.usable*clamp(position)-head.width/g.dpr*.5;
   hc.setTransform(1,0,0,1,0,0);hc.globalCompositeOperation='source-over';hc.globalAlpha=1;
   hc.clearRect(0,0,head.width,head.height);
   hc.setTransform(g.dpr,0,0,g.dpr,-back.left*g.dpr,0);
   hc.lineCap='round';hc.lineJoin='round';return hc;
  }
  const layers=prepare(g),head=layers.headCanvas,hc=layers.headContext;
  layers.lightLeft=g.pad+g.usable*clamp(position)-head.width/g.dpr*.5;
  hc.setTransform(1,0,0,1,0,0);hc.globalCompositeOperation='source-over';hc.globalAlpha=1;
  hc.clearRect(0,0,head.width,head.height);
  hc.setTransform(g.dpr,0,0,g.dpr,-layers.lightLeft*g.dpr,0);
  hc.lineCap='round';hc.lineJoin='round';return hc;
 }
 function endHeadLight(c,g){
  if(headMode!=='sync'&&g.contourField?.ribbonBuffers){
   // Strängarnas ljus från förra bildrutan visas, det nya sparas till nästa.
   const layers=g.contourField,i=layers.ribbonIndex||0,back=layers.ribbonBuffers[i],front=layers.ribbonBuffers[1-i];
   const hc=back.ctx;hc.setTransform(1,0,0,1,0,0);hc.globalCompositeOperation='destination-in';hc.globalAlpha=1;
   hc.drawImage(image(layers.headMask),0,0);hc.globalCompositeOperation='source-over';back.built=drawCount;
   if(front.built===drawCount-1){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=1;
    c.drawImage(front.canvas,front.left,0,front.canvas.width/g.dpr,g.height);c.restore();}
   layers.ribbonIndex=1-i;return;
  }
  const layers=g.contourField,hc=layers.headContext,head=layers.headCanvas;
  hc.setTransform(1,0,0,1,0,0);hc.globalCompositeOperation='destination-in';hc.globalAlpha=1;
  hc.drawImage(image(layers.headMask),0,0);hc.globalCompositeOperation='source-over';
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=1;
  c.drawImage(head,layers.lightLeft,0,head.width/g.dpr,g.height);c.restore();
 }
 // Huvudets tre bilder är lika breda som hela vågformen, men bara biten under
 // huvudet hamnar på den lilla ytan. Förut ritades hela bilden förskjuten och
 // allt utanför klipptes bort; nu ritas bara biten under huvudet, med två
 // bildpunkters marginal för filtret. Förskjutningen blir exakt densamma:
 // kanten ligger på en hel bildpunkt nära huvudet, så subtraktionen är exakt
 // och samma avbildning räknas fram. Uppmätt: ingen bildpunkt skiljer.
 function headSlice(hc,source,offset,width){
  const full=source.width;
  if(root.MastrifyTrim===false||!(full>0)){hc.drawImage(source,-offset,0);return;}
  const from=Math.max(0,Math.floor(offset)-2),to=Math.min(full,Math.ceil(offset+width)+2);
  if(to<=from)return;
  hc.drawImage(source,from,0,to-from,source.height,from-offset,0,to-from,source.height);
 }
 function draw(c,g,amount,progress,response=0,time=0,bands=null,scanning=false){
  const layers=prepare(g),played=clamp(amount),energy=clamp(response),position=clamp(progress);
  const tick=++drawCount;
  // Restrained continuous material: the moving head owns the bright light.
  c.save();c.globalCompositeOperation='source-over';c.globalAlpha=.68;
  c.drawImage(image(layers[0]),0,0,g.width,g.height);
  if(amount>0){
   c.save();c.beginPath();c.rect(0,0,g.pad+g.usable*position,g.height);c.clip();
   c.globalAlpha=.12+.10*played;c.drawImage(image(layers[1]),0,0,g.width,g.height);c.restore();
  }
  if(energy>0&&!layers.silent){
   const head=layers.headCanvas,hc=layers.headContext;
   const left=g.pad+g.usable*position-head.width/g.dpr*.5;
   const phase=Number.isFinite(time)?time:0,accent=clamp(bands?.accent);
   const onset=Math.min(1,energy*4);
   const pulse=.92+.06*Math.sin(phase*3.2);
   if(headMode!=='sync'){
    const slots=layers.headSlots||=[0,1].map(()=>({shade:headSurface(layers,g),glow:headSurface(layers,g),q:null,left:0,built:-1,bloom:null}));
    let use=null;
    if(headMode==='lag'){
     // Exakt samma bild som förut, byggd nu och visad i nästa bildruta på
     // den position den byggdes för.
     const back=slots[layers.headIndex||0],front=slots[1-(layers.headIndex||0)];
     buildHead(layers,back,left*g.dpr);back.left=left;back.built=tick;
     if(front.built===tick-1&&front.bloom===layers.bloom)use=front;
     layers.headIndex=1-(layers.headIndex||0);
    }else{
     // Bilden för den här hela bildpunkten byggs nu och visas från nästa
     // bildruta. Så länge visas den närmaste färdiga, högst två bildpunkter
     // bort, på sin egen position, så ljuset ligger exakt på vågformen.
     const q=Math.round(left*g.dpr);
     for(const slot of slots)if(slot.q!==null&&slot.built<tick&&slot.bloom===layers.bloom&&Math.abs(slot.q-q)<=2
       &&(!use||Math.abs(slot.q-q)<Math.abs(use.q-q)))use=slot;
     if(!use||use.q!==q){const target=slots.find(slot=>slot!==use);buildHead(layers,target,q);target.q=q;target.left=q/g.dpr;target.built=tick;}
    }
    if(use){
     const w=use.shade.canvas.width/g.dpr;
     c.globalCompositeOperation='source-over';c.globalAlpha=(.72+.18*energy)*onset;
     c.drawImage(use.shade.canvas,use.left,0,w,g.height);
     c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,pulse*(.84+.12*energy+.08*accent))*onset;
     c.drawImage(use.glow.canvas,use.left,0,w,g.height);
    }
    drawDepth(c,g,position,Math.min(1,.62+.38*energy)*onset,phase,bands,scanning);
    c.restore();return;
   }
   // Reuse one fixed GPU slice for the two passes. Source-over allows the
   // fine underside to cast a real shadow; additive black would do nothing.
   // Both passes have the same soft mask and contain only measured edges.
   if(probe.wave){
   hc.setTransform(1,0,0,1,0,0);hc.globalCompositeOperation='source-over';hc.globalAlpha=1;
   hc.clearRect(0,0,head.width,head.height);
   headSlice(hc,image(layers.headShade),left*g.dpr,head.width);
   hc.globalCompositeOperation='destination-in';hc.drawImage(image(layers.headMask),0,0);
   c.globalCompositeOperation='source-over';c.globalAlpha=(.72+.18*energy)*onset;
   c.drawImage(head,left,0,head.width/g.dpr,g.height);
   hc.globalCompositeOperation='source-over';hc.globalAlpha=1;
   hc.clearRect(0,0,head.width,head.height);
   hc.globalAlpha=.86;headSlice(hc,image(layers.bloom),left*g.dpr,head.width);
   hc.globalCompositeOperation='lighter';hc.globalAlpha=.94;
   headSlice(hc,image(layers.headInk),left*g.dpr,head.width);
   hc.globalCompositeOperation='destination-in';hc.globalAlpha=1;
   hc.drawImage(image(layers.headMask),0,0);
   hc.globalCompositeOperation='source-over';
   c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,pulse*(.84+.12*energy+.08*accent))*onset;
   c.drawImage(head,left,0,head.width/g.dpr,g.height);
   }
   if(probe.depth)drawDepth(c,g,position,Math.min(1,.62+.38*energy)*onset,phase,bands,scanning);
  }
  c.restore();
 }
 root.MastrifyContourField={prepare,prepareAsync,draw,beginHeadLight,endHeadLight,setHeadMode,setProbe};
})(window);
