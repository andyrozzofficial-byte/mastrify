/* Exact linear radial feather for the existing 1024px plasma material.
 * create(source) uploads one immutable Canvas once. render(radius) changes only
 * the original world-space inner radius; the eleven-unit feather is unchanged.
 * Context failure returns null/false so the caller keeps its existing 2D path.
 */
(function(root){
 'use strict';
 const VERTEX=`
  attribute vec2 aPosition;
  varying vec2 vUV;
  void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
 `;
 const FRAGMENT=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D uSource;
  uniform float uRadius;
  uniform float uSize;
  void main(){
   vec4 source=texture2D(uSource,vUV);
   // Existing Canvas material maps 512 world units onto its square texture.
   // Native createRadialGradient uses linear alpha, not smoothstep.
   float distanceFromCenter=length(gl_FragCoord.xy-vec2(uSize*.5))*512./uSize;
   float feather=clamp((distanceFromCenter-uRadius)/11.,0.,1.);
   float alpha=source.a*feather;
   gl_FragColor=vec4(source.rgb*alpha,alpha);
  }
 `;
 function create(source){
  if(!root.document?.createElement||!source||source.width!==1024||source.height!==1024)return null;
  const size=source.width,canvas=root.document.createElement('canvas');
  canvas.width=canvas.height=size;
  let gl,program,buffer,texture,radiusLocation,lost=false,destroyed=false;
  const shaders=[];
  const onLost=event=>{event.preventDefault?.();lost=true;};
  const onRestored=()=>{lost=true;};
  function destroy(){
   if(destroyed)return;destroyed=true;
   canvas.removeEventListener?.('webglcontextlost',onLost);
   canvas.removeEventListener?.('webglcontextrestored',onRestored);
   if(gl&&!gl.isContextLost()){
    if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);
    if(program)gl.deleteProgram(program);for(const shader of shaders)gl.deleteShader(shader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
   }
  }
  function compile(type,code){
   const shader=gl.createShader(type);if(!shader)throw new Error('Plasma shader allocation failed.');
   shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Plasma shader compilation failed.');
   return shader;
  }
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,
    premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
   if(!gl||gl.isContextLost()||size>gl.getParameter(gl.MAX_TEXTURE_SIZE)){destroy();return null;}
   program=gl.createProgram();if(!program)throw new Error('Plasma program allocation failed.');
   gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));
   gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Plasma program linking failed.');
   gl.useProgram(program);
   buffer=gl.createBuffer();if(!buffer)throw new Error('Plasma quad allocation failed.');
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'aPosition');
   if(position<0)throw new Error('Plasma position binding failed.');
   gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   const sourceLocation=gl.getUniformLocation(program,'uSource'),sizeLocation=gl.getUniformLocation(program,'uSize');
   radiusLocation=gl.getUniformLocation(program,'uRadius');
   if(sourceLocation===null||sizeLocation===null||radiusLocation===null)throw new Error('Plasma uniform binding failed.');
   texture=gl.createTexture();if(!texture)throw new Error('Plasma texture allocation failed.');
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   // Upload top-down Canvas pixels in the orientation expected when this
   // premultiplied WebGL drawing buffer is later copied into Canvas 2D.
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   gl.uniform1i(sourceLocation,0);gl.uniform1f(sizeLocation,size);
   gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.SCISSOR_TEST);
   gl.colorMask(true,true,true,true);gl.viewport(0,0,size,size);
   gl.uniform1f(radiusLocation,112);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   if(gl.getError()!==gl.NO_ERROR)throw new Error('Plasma warmup failed.');
   canvas.addEventListener?.('webglcontextlost',onLost);canvas.addEventListener?.('webglcontextrestored',onRestored);
  }catch(_){destroy();return null;}
  function render(radius){
   if(destroyed||lost||gl.isContextLost()||!Number.isFinite(radius)||radius<0)return false;
   try{
    gl.uniform1f(radiusLocation,radius);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    return !gl.isContextLost();
   }catch(_){lost=true;return false;}
  }
  return Object.freeze({canvas,render,destroy});
 }
 root.MastrifyPlasmaReveal=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
