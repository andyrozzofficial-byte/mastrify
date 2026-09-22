/* Frequency light belongs to the outer collar. No light is painted on the vinyl face. */
(function(root){
 'use strict';
 const fields=[{name:'lowMid',color:'178,112,255',x:-248,y:38},{name:'presence',color:'85,157,255',x:135,y:-224},{name:'brilliance',color:'194,230,255',x:170,y:204}];
 const extent=320;
 const layers=fields.map(f=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;const c=canvas.getContext('2d');c.setTransform(1.2,0,0,1.2,384,384);
  const field=c.createRadialGradient(f.x,f.y,0,f.x,f.y,230);field.addColorStop(0,`rgba(${f.color},1)`);field.addColorStop(.5,`rgba(${f.color},.58)`);field.addColorStop(1,`rgba(${f.color},0)`);c.fillStyle=field;c.fillRect(-extent,-extent,extent*2,extent*2);
  c.globalCompositeOperation='destination-in';
  // The complete face + sidewall remain inside this clear aperture, even at
  // the existing maximum bass lift. A bright lip opens into soft exterior air.
  const edge=c.createRadialGradient(0,0,0,0,0,extent);
  [[0,0],[263.5/extent,0],[265/extent,.85],[266.5/extent,1],[269/extent,.46],[279/extent,.2],[299/extent,0],[1,0]].forEach(([stop,a])=>edge.addColorStop(stop,`rgba(255,255,255,${a})`));
  c.fillStyle=edge;c.fillRect(-extent,-extent,extent*2,extent*2);root.MastrifyCanvas?.cacheImage(canvas);return canvas;
 });
 // Varje fält lyser bara där kragens ring och fältets egen cirkel möts, en
 // bit av ringen. Resten av den 768 bildpunkter stora bilden är helt
 // genomskinlig, och med lighter ändrar genomskinligt ingenting. Därför ritas
 // bara rutan runt den biten, med marginal, i exakt samma skala som förut:
 // samma bildpunkter, men omkring en fjärdedel av blandningsarbetet.
 // Rutan räknas ut ur geometrin, så ingen bild behöver läsas tillbaka.
 const boxes=fields.map(f=>{
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const take=(x,y)=>{if(Math.hypot(x,y)>263.5&&Math.hypot(x,y)<299&&Math.hypot(x-f.x,y-f.y)<230){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}};
  for(let i=0;i<7200;i++){
   const a=i/7200*2*Math.PI,c=Math.cos(a),s=Math.sin(a);
   for(const r of [263.51,264,270,280,290,298.99])take(r*c,r*s);
   take(f.x+229.99*c,f.y+229.99*s);
  }
  if(!(x1>x0))return null;
  // Bildpunkter i bilden: 384 + 1,2 per enhet. Tolv bildpunkters marginal
  // täcker både samplingen i rutan och filtret när bilden ritas. Kanterna
  // läggs på jämna sextal: sex bildpunkter är exakt fem enheter, så målrutan
  // får heltal och webbläsaren räknar fram exakt samma avbildning som för
  // hela bilden. Uppmätt: ingen enda bildpunkt skiljer.
  const px=v=>384+1.2*v,down=v=>Math.floor(v/6)*6,up=v=>Math.ceil(v/6)*6;
  const sx=Math.max(0,down(px(x0)-12)),sy=Math.max(0,down(px(y0)-12));
  const ex=Math.min(768,up(px(x1)+12)),ey=Math.min(768,up(px(y1)+12));
  return {sx,sy,sw:ex-sx,sh:ey-sy,dx:(sx-384)/6*5,dy:(sy-384)/6*5,dw:(ex-sx)/6*5,dh:(ey-sy)/6*5};
 });
 root.MastrifyBandGlow={draw(engine){
  if(!['original','master'].includes(engine.mode)||engine.reducedMotion)return;
  const bands=root.MastrifyAudio?.samplePlaybackBands();if(!bands)return;
  const weight=(engine.originalAmount||0)+(engine.masterAmount||0);if(weight<.001)return;
  const c=engine.ctx;c.save();engine.applyDiscFloat(2*Math.PI*engine.time/12,weight);
  // The fixed outer collar is independent of the record's bass-driven scale.
  const scale=engine.forwardScale||1,depth=(2.7+15*(engine.energy||0))*scale;
  // Exclude both the lifted face and lower sidewall, including transition kicks.
  for(const y of [0,depth]){c.beginPath();c.rect(-extent,-extent,extent*2,extent*2);c.moveTo(225*scale,y);c.arc(0,y,225*scale,0,2*Math.PI,true);c.clip('evenodd');}
  c.globalCompositeOperation='lighter';
  fields.forEach((f,i)=>{const amount=bands[f.name]*weight*.95;if(amount<.001)return;c.globalAlpha=Math.min(.9,amount);const image=root.MastrifyCanvas?.imageSource(layers[i])||layers[i],b=boxes[i];
  if(b&&root.MastrifyTrim!==false)c.drawImage(image,b.sx,b.sy,b.sw,b.sh,b.dx,b.dy,b.dw,b.dh);
  else c.drawImage(image,-extent,-extent,extent*2,extent*2);});c.restore();
 }};
})(window);
