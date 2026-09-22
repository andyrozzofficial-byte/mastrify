/* One-off full-density contour material bake. Geometry and native shadow
 * recipes are imported from the production renderer, so there is one design. */
'use strict';
self.onmessage=async function({data}){
 const bitmaps=[];
 try{
  if(typeof OffscreenCanvas!=='function'||typeof Path2D!=='function')throw new Error('Offscreen contour unavailable.');
  const input=data?.geometry;
  if(!input||![input.width,input.height,input.dpr,input.pad,input.usable,input.middle,input.scale].every(Number.isFinite)
    ||input.width<=0||input.height<=0||input.dpr<=0||!Array.isArray(input.bars)||input.bars.length!==256
    ||input.bars.some(bar=>!bar||![bar.x,bar.top,bar.bottom].every(Number.isFinite)))throw new Error('Invalid contour geometry.');
  self.window=self;self.document={createElement(type){if(type!=='canvas')throw new Error('Unexpected contour element.');return new OffscreenCanvas(1,1);}};
  importScripts('/assets/engine/contour-field.js?v=20260917-depth1');
  const g={...input,topPath:new Path2D(),bottomPath:new Path2D()};
  g.bars.forEach((bar,i)=>{
   if(i){g.topPath.lineTo(bar.x,bar.top);g.bottomPath.lineTo(bar.x,bar.bottom);}
   else{g.topPath.moveTo(bar.x,bar.top);g.bottomPath.moveTo(bar.x,bar.bottom);}
  });
  const layers=self.MastrifyContourField.prepare(g);
  const bitmap=async source=>{const value=typeof source.transferToImageBitmap==='function'
    ?source.transferToImageBitmap():await createImageBitmap(source);bitmaps.push(value);return value;};
  const pack={width:layers[0].width,height:layers[0].height,silent:layers.silent,layers:[]};
  for(const layer of layers)pack.layers.push(await bitmap(layer));
  for(const name of ['emissionInk','headInk','headShade','bloom','headMask'])pack[name]=await bitmap(layers[name]);
  // Dynamic playback head is intentionally not transferred; main owns it.
  self.postMessage({ok:true,pack},bitmaps);
 }catch(error){
  for(const image of bitmaps)image.close?.();
  self.postMessage({ok:false,error:error?.message||'Contour worker failed.'});
 }
};
