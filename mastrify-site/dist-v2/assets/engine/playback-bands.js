/* Independent light analysis. No existing bass, kick, pulse or audio DSP is changed.
 * FFT work runs in a worker, one bounded PCM chunk at a time. */
(function(root){
 'use strict';
 const names=['lowMid','presence','brilliance'],ranges=[[500,1000],[1500,4000],[5000,Infinity]];
 let plan=null;
 function prepare(size){
  if(plan?.size===size)return plan;
  const bits=Math.log2(size),reverse=new Uint32Array(size),hann=new Float32Array(size),cos=new Float64Array(size/2),sin=new Float64Array(size/2);let windowPower=0;
  for(let i=0;i<size;i++){let v=i,r=0;for(let b=0;b<bits;b++){r=(r<<1)|(v&1);v>>=1;}reverse[i]=r;hann[i]=.5-.5*Math.cos(2*Math.PI*i/(size-1));windowPower+=hann[i]*hann[i];}
  for(let i=0;i<size/2;i++){cos[i]=Math.cos(-2*Math.PI*i/size);sin[i]=Math.sin(-2*Math.PI*i/size);}
  return plan={size,reverse,hann,cos,sin,windowPower,re:new Float64Array(size),im:new Float64Array(size)};
 }
 function block({channels,sampleRate,size,hop,start,count,offset}){
  const p=prepare(size),out=names.map(()=>new Float32Array(count)),limits=ranges.map(([lo,hi])=>[Math.max(1,Math.ceil(lo*size/sampleRate)),Math.min(size/2,Math.floor(hi*size/sampleRate))]);
  for(let frame=0;frame<count;frame++){
   const centre=Math.round((start+frame)*hop),begin=centre-size/2-offset,powers=[0,0,0];
   for(const channel of channels){
    for(let i=0;i<size;i++){const value=channel[begin+i];p.re[p.reverse[i]]=(Number.isFinite(value)?value:0)*p.hann[i];p.im[i]=0;}
    for(let width=2;width<=size;width*=2){const half=width/2,stride=size/width;for(let base=0;base<size;base+=width)for(let i=0;i<half;i++){
     const a=base+i,b=a+half,k=i*stride,tr=p.cos[k]*p.re[b]-p.sin[k]*p.im[b],ti=p.sin[k]*p.re[b]+p.cos[k]*p.im[b];
     p.re[b]=p.re[a]-tr;p.im[b]=p.im[a]-ti;p.re[a]+=tr;p.im[a]+=ti;
    }}
    for(let band=0;band<3;band++)for(let k=limits[band][0];k<=limits[band][1];k++)powers[band]+=p.re[k]*p.re[k]+p.im[k]*p.im[k];
   }
   for(let band=0;band<3;band++)out[band][frame]=Math.sqrt(2*powers[band]/(size*p.windowPower*channels.length));
  }
  return out;
 }
 function finish(values,frameRate){
  const attack=[.024,.018,.012],release=[.19,.15,.12];
  return values.map((samples,band)=>{
   let last=0;const rise=Math.exp(-1/(frameRate*attack[band])),fall=Math.exp(-1/(frameRate*release[band]));
   for(let i=0;i<samples.length;i++){
    // Absolute dB mapping: a quiet/empty band is never boosted to full light.
    const db=20*Math.log10(Math.max(1e-10,samples[i]));
    const normalized=Math.max(0,Math.min(1,(db+54)/40));
    const target=normalized*normalized*(3-2*normalized),coefficient=target>last?rise:fall;
    last=target+coefficient*(last-target);samples[i]=last<.0001?0:last;
   }
   return samples;
  });
 }
 if(typeof document==='undefined'&&typeof root.postMessage==='function'){
  root.onmessage=event=>{try{const values=block(event.data);root.postMessage({values},values.map(v=>v.buffer));}catch(error){root.postMessage({error:error.message});}};return;
 }
 const zero=Object.freeze({lowMid:0,presence:0,brilliance:0});
 async function analyze(channels,sampleRate,{signal,shouldCancel=()=>false}={}){
  const length=Math.min(...channels.map(c=>c.length)),size=2**Math.round(Math.log2(sampleRate*.046)),hop=Math.max(1,Math.round(sampleRate/40)),frameRate=sampleRate/hop,count=Math.ceil(length/hop);
  const output=names.map(()=>new Float32Array(count));let worker;
  const check=()=>{if(signal?.aborted||shouldCancel())throw new DOMException('Light analysis cancelled','AbortError');};
  try{worker=new Worker('/assets/engine/playback-bands.js?v=20260917-light1');}catch{/* Cooperative fallback for browsers without workers. */}
  try{
   for(let start=0;start<count;){
    check();const amount=Math.min(worker?40:6,count-start),offset=Math.max(0,Math.round(start*hop)-size/2),end=Math.min(length,Math.round((start+amount-1)*hop)+size/2);
    const pcm=channels.map(c=>c.slice(offset,end)),request={channels:pcm,sampleRate,size,hop,start,count:amount,offset};
    let values;try{values=worker?await new Promise((resolve,reject)=>{
     const cancel=()=>{cleanup();reject(new DOMException('Light analysis cancelled','AbortError'));};
     const cleanup=()=>{signal?.removeEventListener('abort',cancel);worker.onmessage=null;worker.onerror=null;};
     worker.onmessage=e=>{cleanup();e.data.error?reject(new Error(e.data.error)):resolve(e.data.values);};worker.onerror=()=>{cleanup();reject(new Error('Frequency light analysis failed. Please load the file again.'));};
     signal?.addEventListener('abort',cancel,{once:true});worker.postMessage(request,pcm.map(c=>c.buffer));
    }):block(request);}catch(error){
     check();if(error.name==='AbortError'||!worker)throw error;
     // A blocked worker must not prevent playback of a valid audio file.
     worker.terminate();worker=null;continue;
    }
    check();values.forEach((v,i)=>output[i].set(v,start));start+=amount;
    if(!worker)await new Promise(resolve=>setTimeout(resolve,0));
   }
   check();return {values:finish(output,frameRate),frameRate,duration:length/sampleRate};
  }finally{worker?.terminate();}
 }
 function sample(bands,seconds){
  if(!bands||!Number.isFinite(seconds)||seconds<0||seconds>=bands.duration)return zero;
  const at=seconds*bands.frameRate,index=Math.floor(at),fraction=at-index,last=bands.values[0].length-1;
  const output={};for(let i=0;i<3;i++){const v=bands.values[i];output[names[i]]=v[Math.min(index,last)]*(1-fraction)+v[Math.min(index+1,last)]*fraction;}return output;
 }
 root.MastrifyPlaybackBands=Object.freeze({analyze,sample,zero,block,finish});
})(typeof window!=='undefined'?window:typeof self!=='undefined'?self:globalThis);
