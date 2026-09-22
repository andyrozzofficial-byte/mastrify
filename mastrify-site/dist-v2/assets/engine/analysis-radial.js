/* Analyze-only perimeter reader. Reuses the existing LP geometry and glow.
 * Twelve-second phase is seamless across the engine clock wrap. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const wrap=a=>(a%TAU+TAU)%TAU;
  function ink(c,r,alpha=1){
    const g=c.createLinearGradient(-r,-r,r,r);
    g.addColorStop(0,`rgba(174,111,255,${alpha})`);g.addColorStop(.4,`rgba(184,147,255,${alpha})`);
    g.addColorStop(.61,`rgba(240,245,255,${alpha})`);g.addColorStop(1,`rgba(89,177,255,${alpha})`);return g;
  }
  function half(c,r,front){c.save();c.globalCompositeOperation='lighter';c.lineCap='round';if(front!==undefined){c.beginPath();c.rect(-r*1.2,front?0:-r*1.2,r*2.4,r*1.2);c.clip();}}
  function arc(c,r,a,b,color,width=1){c.beginPath();c.arc(0,0,r,a,b);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  const example=Array.from({length:256},(_,i)=>{
    const wave=.12+.55*Math.pow(.5+.5*Math.sin(i*.31),2)+.27*Math.pow(.5+.5*Math.sin(i*1.73),4);
    return {top:wave,bottom:wave*(.68+.25*Math.sin(i*.7)**2)};
  });
  function traceFor(t){
    const flow=root.MastrifyProcessing?.getState(),wave=root.MastrifyAudio?.getWaveform('original');
    return wave?.length?{wave,position:flow?.progress||0,lap:12/(flow?.duration||36),cyclic:false}
      :{wave:example,position:wrap(t*TAU/12)/TAU,lap:1,cyclic:true};
  }
  function amplitude(trace,position,key){
    if(trace.cyclic)position=(position%1+1)%1;
    else if(position<0||position>1)return 0;
    const x=position*(trace.wave.length-1),i=Math.floor(x),a=trace.wave[i]?.[key]||0,b=trace.wave[Math.min(i+1,trace.wave.length-1)]?.[key]||0;
    return Math.sqrt(Math.max(0,Math.min(1,a+(b-a)*(x-i))));
  }
  const radial={draw(c,{r,t,reducedMotion,front,trace,variant='wave'}){
    t=reducedMotion?4.4:t;const head=t*TAU/12;trace=trace||traceFor(t);
    half(c,r,front);const opacity=c.globalAlpha;
    // The reading head illuminates successive collar segments with a fading memory.
    for(let j=0;j<3;j++)arc(c,r*(1.035+j*.044),0,TAU,ink(c,r,.15-j*.025),.7);
    for(let i=0;i<(variant==='hybrid'?0:96);i++){
      const a=i/96*TAU,age=wrap(head-a),read=Math.exp(-age*2.4),rr=r*1.035;
      c.beginPath();c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);c.lineTo(Math.cos(a)*(rr+3+read*8),Math.sin(a)*(rr+3+read*8));
      c.strokeStyle=ink(c,r,.12+.86*read);c.lineWidth=1+read;c.stroke();
      if(i%8===0){
        const x=Math.cos(a)*r*1.134,y=Math.sin(a)*r*1.134;
        c.beginPath();c.arc(x,y,2+read,0,TAU);c.fillStyle=ink(c,r,.2+read*.8);c.fill();
        c.beginPath();c.arc(x,y,4+read*3,0,TAU);c.strokeStyle=ink(c,r,read*.5);c.lineWidth=1;c.stroke();
      }
    }
    if(variant==='classic'){
      for(let i=0;i<30;i++){
        const age=i/30*.85,a=head-age,alpha=Math.pow(1-i/30,2);
        arc(c,r*1.068,a-.035,a+.008,`rgba(141,168,255,${alpha*.15})`,11);
        arc(c,r*1.068,a-.035,a+.008,`rgba(${i<5?'233,239,255':'169,138,255'},${alpha})`,2);
      }
    }else{
    // The reader leaves the source waveform behind, bent around the LP.
    // A real track uses its decoded peaks at the analysis position; only the
    // unconnected study uses an explicitly illustrative periodic waveform.
    const trail=1.7,steps=128,top=[],bottom=[];
    for(let i=0;i<=steps;i++){
      const age=trail*(1-i/steps),a=head-age,position=trace.position-age/TAU*trace.lap;
      const envelope=Math.min(1,i/8),upper=r*(1.07+.039*amplitude(trace,position,'top')*envelope),lower=r*(1.07-.039*amplitude(trace,position,'bottom')*envelope);
      top.push([Math.cos(a)*upper,Math.sin(a)*upper]);bottom.push([Math.cos(a)*lower,Math.sin(a)*lower]);
    }
    const field=c.createConicGradient(head-trail,0,0),end=trail/TAU;
    field.addColorStop(0,'rgba(155,107,255,0)');field.addColorStop(end*.4,'rgba(174,125,255,.36)');
    field.addColorStop(end*.78,'rgba(136,193,255,.8)');field.addColorStop(end,'rgba(240,248,255,1)');field.addColorStop(Math.min(1,end+.002),'rgba(240,248,255,0)');field.addColorStop(1,'rgba(155,107,255,0)');
    const outline=new Path2D();top.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));bottom.slice().reverse().forEach(([x,y])=>outline.lineTo(x,y));outline.closePath();
    c.fillStyle=field;c.globalAlpha=opacity*.22;c.fill(outline);c.globalAlpha=opacity;
    for(const [width,alpha] of [[9,.045],[4,.16],[1.2,.95]]){c.strokeStyle=field;c.lineWidth=width;c.globalAlpha=opacity*alpha;c.stroke(outline);}
    // Fine radial peak strokes make the trail read as an audio waveform.
    c.beginPath();for(let i=0;i<=steps;i+=2){c.moveTo(...top[i]);c.lineTo(...bottom[i]);}
    c.strokeStyle=field;c.lineWidth=.65;c.globalAlpha=opacity*.42;c.stroke();c.globalAlpha=opacity;
    }
    if(variant==='hybrid'){
      // Spectrum Read supplies the segmented outer frequency ring. The same
      // reader wakes its bars, then leaves the Wave Trail on the inner lane.
      const bars=new Path2D(),lit=new Path2D(),tips=new Path2D();
      for(let i=0;i<144;i++){
        const slot=i%48;if(slot<2||slot>45)continue;
        const a=i/144*TAU,age=wrap(head-a),read=Math.exp(-age*2.6);
        const strength=amplitude(trace,i/143,'top');
        const inner=r*1.113,outer=r*(1.125+.029*strength+.013*read),x=Math.cos(a),y=Math.sin(a);
        const path=read>.12?lit:bars;path.moveTo(x*inner,y*inner);path.lineTo(x*outer,y*outer);
        tips.moveTo(x*(outer-1),y*(outer-1));tips.lineTo(x*outer,y*outer);
      }
      for(const [path,alpha] of [[bars,.29],[lit,.9]]){
        c.strokeStyle=ink(c,r,alpha*.11);c.lineWidth=6;c.stroke(path);
        c.strokeStyle=ink(c,r,alpha);c.lineWidth=1.15;c.stroke(path);
      }
      c.strokeStyle='rgba(226,240,255,.6)';c.lineWidth=.8;c.stroke(tips);
      for(let j=0;j<3;j++)arc(c,r*1.177,j*TAU/3+.1,(j+1)*TAU/3-.1,ink(c,r,.27),.7);
    }
    const x=Math.cos(head)*r*1.07,y=Math.sin(head)*r*1.07;
    const glow=c.createRadialGradient(x,y,0,x,y,23);glow.addColorStop(0,'#edf5ffb0');glow.addColorStop(.16,'#b8c9ff80');glow.addColorStop(1,'#9870ff00');c.fillStyle=glow;c.fillRect(x-23,y-23,46,46);
    c.beginPath();c.moveTo(Math.cos(head)*r*1.005,Math.sin(head)*r*1.005);c.lineTo(Math.cos(head)*r*1.165,Math.sin(head)*r*1.165);c.strokeStyle='#ecf2ff';c.lineWidth=1.5;c.stroke();
    c.restore();
  }};
  function paint(c,frame){
    const deployment=frame.reducedMotion?1:Math.max(0,Math.min(1,frame.deploy??1));
    const opening=Math.max(0,Math.min(1,(deployment-.46)/.38));
    if(opening>0){c.save();c.globalAlpha*=opening*opening*(3-2*opening);radial.draw(c,frame);c.restore();}
    if(deployment<1)root.MastrifyRadialDeploy?.paint(c,{...frame,progress:deployment});
  }
  let layer=null,brush=null;
  function prepare(){if(!layer){layer=document.createElement('canvas');layer.width=layer.height=1024;brush=layer.getContext('2d');}}
  function render(c,{seconds,amount,reducedMotion}){
    if(!(amount>0))return;
    prepare();
    brush.setTransform(1,0,0,1,0,0);brush.clearRect(0,0,1024,1024);
    brush.setTransform(1024/700,0,0,1024/700,512,512);
    const flow=root.MastrifyProcessing?.getState();
    const scene={r:266,t:seconds,trace:traceFor(seconds),variant:'wave',reducedMotion,deploy:flow?.active?Math.min(1,flow.elapsed/.95):1};
    // The shared flat layer needs the reader only once. The lab's half-paints
    // remain available for its own front/back composition.
    const deployment=reducedMotion?1:scene.deploy,opening=Math.max(0,Math.min(1,(deployment-.46)/.38));
    if(opening>0){brush.save();brush.globalAlpha*=opening*opening*(3-2*opening);radial.draw(brush,scene);brush.restore();}
    if(deployment<1){root.MastrifyRadialDeploy?.paint(brush,{...scene,progress:deployment,front:false});root.MastrifyRadialDeploy?.paint(brush,{...scene,progress:deployment,front:true});}
    c.save();c.globalAlpha*=amount;c.drawImage(layer,-350,-350,700,700);c.restore();
  }
  root.MastrifyRadialAnalysis=Object.freeze({paint,render,prepare});
})(window);
