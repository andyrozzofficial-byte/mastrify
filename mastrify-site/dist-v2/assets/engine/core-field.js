/* Musical analysis film: a coherent scan reads across the whole vinyl face.
 * Transparent scan over the 116–219 vinyl annulus. Center label stays clear.
 * No clock, network, particle history or accumulating trails. Twelve-second loop.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const WORLD_SIZE = 448;
  // The engine's mutually exclusive reveal kicks, breath and bass projection
  // stay below 1.074 of its base scale. Reserve their full envelope at warmup.
  const ENGINE_SCALE_ENVELOPE = 1.08;
  const SILENT_MUSIC = Object.freeze({ level: 0, bass: 0, mid: 0, air: 0 });
  const SILENT_WAVEFORM = new Float32Array(64);
  const diagnostics = new URLSearchParams(root.location?.search || '').get('perf') === '1'
    ? { gpuRenderer: null, gpuVendor: null, canvasResizes: 0, textureUploads: 0 } : null;
  let renderer = null;
  let unavailable = false;
  let fallbackGrid = null;
  let waveformSource = 'demo', waveformPeak = 0;
  let status = { backend: 'uninitialized', resolution: 0, reason: null };

  const vertexSource = `
    attribute vec2 aPosition;
    varying vec2 vPoint;
    void main() {
      // Canvas angles increase clockwise, so local Y points down.
      vPoint = aPosition * vec2(224.0, -224.0);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Straight musical scan with a crisp, softly glowing grid in its wake.
  // Standby uses the quieter original musical front with a slow ghost wake.
  const fragmentSource = `
    precision highp float;
    varying vec2 vPoint;
    uniform vec3 uFrame; // phase, standby profile, world units per pixel
    uniform vec4 uMusic; // shared musical envelope: level, bass, mid, air
    uniform sampler2D uWaveform; // 64 actual local waveform magnitudes
    uniform float uRealAudio;
    const float TAU = 6.283185307179586;
    float line(float d,float w){return 1.0-smoothstep(w,w+uFrame.z,abs(d));}
    vec3 spectrum(float x,float p){
      float u=fract(.8*(x+219.0)/438.0+p/TAU);
      vec3 a=vec3(126.,48.,211.)/255., b=vec3(195.,149.,250.)/255.;
      vec3 c=vec3(252.,246.,255.)/255., d=vec3(236.,237.,255.)/255.;
      vec3 e=vec3(183.,214.,255.)/255., f=vec3(67.,140.,244.)/255.;
      if(u<.168)return mix(a,b,smoothstep(0.,.168,u));
      if(u<.344)return mix(b,c,smoothstep(.168,.344,u));
      if(u<.456)return mix(c,d,smoothstep(.344,.456,u));
      if(u<.592)return mix(d,e,smoothstep(.456,.592,u));
      if(u<.8)return mix(e,f,smoothstep(.592,.8,u));
      return mix(f,a,smoothstep(.8,1.,u));
    }
    void main(){
      float radius=length(vPoint), p=uFrame.x, idle=uFrame.y;
      float center=smoothstep(112.,116.,radius);
      float edge=center*(1.-smoothstep(215.,219.,radius));
      if(radius<112. || radius>219.){gl_FragColor=vec4(0.);return;}
      float activeQ=fract(p/TAU*3.+.13);
      float idleQ=(p/TAU*12.-1.1)/9.8;
      float q=mix(activeQ,clamp(idleQ,0.,1.),idle);
      float head=mix(-255.+560.*q,-265.+590.*q,idle);
      float envelope=smoothstep(0.,.075,q)*(1.-smoothstep(.88,1.,q));
      if(idle>.5){
        // One whole-layer fade, measured from the LP's physical top to bottom.
        float travel=clamp((head+219.)/438.,0.,1.);
        float fade=sin(.5*TAU*travel);
        envelope=(head<=-219. || head>=219.)?0.:fade*fade;
      }
      float behind=head-vPoint.y;
      float front=line(behind,.42)*envelope;
      float bloom=exp(-pow(behind/7.,2.))*envelope;
      float leading=exp(-pow(behind/2.1,2.))*envelope;
      float scanned=smoothstep(-5.,10.,behind);
      float wake=scanned*exp(-max(behind,0.)/mix(145.,330.,idle))*envelope;
      float row=floor((vPoint.y+224.)/4.8),column=floor((vPoint.x+224.)/4.2);
      float localX=mod(vPoint.x+224.,4.2)-2.1,localY=mod(vPoint.y+224.,4.8)-2.4;
      float signal=.5+.22*sin(column*.29+row*.31)+.15*sin(column*.73-row*.19)+.11*cos(column*.17+row*.53);
      float datum=line(localX,.26)*line(localY,.30+1.05*signal);
      float grooves=line(mod(radius-118.,4.2)-2.1,.20);
      float film=(.014+.035*grooves)*(1.-idle);
      float datumGlow=exp(-localX*localX/.9)*exp(-localY*localY/(1.5+1.2*signal));
      float afterimage=wake*(.045+.36*datum+.09*datumGlow+.06*grooves)*mix(1.,.58,idle);
      if(idle<.5){
        // Fine VU groups wake only where the straight front has just read.
        // Two-cell meters can rise to six units without thickening the mesh.
        float group=floor(column/6.),voice=mod(group,3.);
        float musicalBand=voice<.5?uMusic.y:(voice<1.5?uMusic.z:uMusic.w);
        float groupWave=sin(group*1.83+.9);
        float groupGain=.55+.45*groupWave*groupWave;
        float laneGain=smoothstep(.12,.85,.5+.5*cos((mod(column,6.)-2.5)*.82));
        float readZone=smoothstep(-2.,15.,behind)*(1.-smoothstep(42.,112.,behind));
        float response=clamp((.22*uMusic.x+.78*musicalBand)*groupGain*laneGain,0.,1.);
        float drive=response*readZone*(1.-idle);
        float pairRow=floor((vPoint.y+224.)/9.6);
        float fromFoot=8.15-mod(vPoint.y+224.,9.6);
        float settling=4.*uMusic.x*(1.-uMusic.x);
        float tremor=.18*sin(54.*p+column*1.37+pairRow*.61)*settling*drive;
        float meterHeight=1.4+4.45*sqrt(drive)+tremor;
        float meterBody=smoothstep(-.35,.25,fromFoot)
          *(1.-smoothstep(meterHeight-.25,meterHeight+.35,fromFoot));
        float meterCore=line(localX,.26)*meterBody;
        float meterHalo=exp(-localX*localX/.9)*meterBody;
        float meterCap=line(localX,.38)*line(fromFoot-meterHeight,.16);
        afterimage+=wake*(.44*meterCore+.075*meterHalo+.08*meterCap)*drive;
      }
      float band=floor((vPoint.x+224.)/5.6),bandX=mod(vPoint.x+224.,5.6)-2.8;
      float audio=.5+.24*sin(band*.39+4.*p)+.16*sin(band*.81-7.*p)+.09*cos(band*.21+3.*p);
      float height=(3.5+17.5*audio*audio)*mix(1.,.65,idle);
      float combVisible=1.;
      if(uRealAudio>.5 && idle<.5){
        audio=0.;
        // Only pixels close enough to belong to the front need a texture
        // lookup. Sample bin centers so interpolation matches Canvas exactly.
        if(behind>-1. && behind<23.){
          float position=clamp((band+.5)/80.,0.,1.)*63.;
          audio=texture2D(uWaveform,vec2((position+.5)/64.,.5)).r;
        }
        height=21.*sqrt(audio);
        combVisible=step(.00001,audio);
      }
      float comb=line(bandX,.36)*smoothstep(-1.,1.5,behind)
        *(1.-smoothstep(height-1.,height+2.,behind))*combVisible;
      float base=edge*(film+afterimage);
      float scan=edge*(.55*front+.065*bloom+.12*leading+.31*envelope*comb);
      vec3 color=spectrum(vPoint.x,p);
      vec3 beamColor=mix(color,vec3(1.),.10);
      float alpha=min(.92,(base+scan)*mix(1.,.42,idle));
      vec3 rgb=(color*base+beamColor*scan)*mix(1.,.42,idle);
      gl_FragColor=vec4(min(rgb,vec3(alpha)),alpha);
    }
  `;

  function resolutionFor(c) {
    const canvas = c.canvas;
    const base = canvas && canvas.width > 0 && canvas.height > 0
      ? Math.min(canvas.width, canvas.height) / 900 : 0;
    let transformed = 0;
    if (typeof c.getTransform === 'function') {
      const m = c.getTransform();
      const xx = m.a * m.a + m.b * m.b;
      const yy = m.c * m.c + m.d * m.d;
      const xy = m.a * m.c + m.b * m.d;
      const largest = Math.sqrt((xx + yy + Math.hypot(xx - yy, 2 * xy)) / 2);
      if (Number.isFinite(largest) && largest > 0) transformed = largest;
    }
    // A reveal must not resize GPU storage on its first enlarged frame, then
    // shrink it again. Keep the established oversampling and support larger
    // external transforms without ever choosing fewer pixels than before.
    const scale = Math.max(base * ENGINE_SCALE_ENVELOPE, transformed) || 1;
    return Math.max(512, Math.min(1536, Math.ceil(WORLD_SIZE * scale * 1.1 / 64) * 64));
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation failed.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader) || 'Shader compilation failed.';
      gl.deleteShader(shader);
      throw new Error(reason);
    }
    return shader;
  }

  function initialize() {
    const options = { alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let canvas, gl;
    if (typeof root.OffscreenCanvas === 'function') {
      canvas = new root.OffscreenCanvas(1, 1);
      gl = canvas.getContext('webgl', options);
    }
    if (!gl && root.document) {
      canvas = root.document.createElement('canvas');
      gl = canvas.getContext('webgl', options);
    }
    if (!gl) throw new Error('WebGL 1 is unavailable.');
    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!precision || precision.precision === 0) throw new Error('High-precision fragment shaders are unavailable.');
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const reason = gl.getProgramInfoLog(program) || 'Shader linking failed.';
      gl.deleteProgram(program);
      throw new Error(reason);
    }
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Vertex buffer allocation failed.');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // A single oversized triangle covers every pixel with no diagonal seam.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    const waveformTexture = gl.createTexture();
    if (!waveformTexture) throw new Error('Waveform texture allocation failed.');
    const waveformPixels = new Uint8Array(64);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waveformTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, waveformPixels);
    if (diagnostics) {
      diagnostics.textureUploads++;
      diagnostics.gpuRenderer = diagnostics.gpuVendor = null;
      // Diagnostic queries can synchronize with the GPU. Ask only once per
      // context, and only when the explicit local performance view is enabled.
      try {
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        if (debug) {
          diagnostics.gpuRenderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
          diagnostics.gpuVendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL);
        }
      } catch { /* Diagnostics must never disable the renderer. */ }
    }
    gl.uniform1i(gl.getUniformLocation(program, 'uWaveform'), 0);
    const result = { canvas, gl, program, buffer, waveformTexture, waveformPixels,
      frame: gl.getUniformLocation(program, 'uFrame'),
      realAudio: gl.getUniformLocation(program, 'uRealAudio'),
      music: gl.getUniformLocation(program, 'uMusic'), resolution: 0, lost: false, validated: false };
    if (typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        result.lost = true;
        status = { backend: 'fallback', resolution: result.resolution, reason: 'WebGL context lost.' };
      });
      canvas.addEventListener('webglcontextrestored', () => {
        if (renderer === result) { renderer = null; unavailable = false; }
      });
    }
    return result;
  }

  const bounded = value => Math.max(0, Math.min(1, Number(value) || 0));

  function sampleMusic(phase) {
    if (root.MastrifyScore) return root.MastrifyScore.sample(phase, 'scan');
    if (!root.MastrifyPulse || typeof root.MastrifyPulse.sample !== 'function') return SILENT_MUSIC;
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    return root.MastrifyPulse.sample(p) || SILENT_MUSIC;
  }

  function draw(c, phase, energy, idle = false, music = SILENT_MUSIC, waveform = null, present = true) {
    const e = Math.max(0, Math.min(1, Number(energy) || 0));
    if (e < .001) return true;
    if (unavailable) return false;
    try {
      if (!renderer) renderer = initialize();
      const { canvas, gl } = renderer;
      if (renderer.lost || gl.isContextLost()) {
        status = { backend: 'fallback', resolution: renderer.resolution, reason: 'WebGL context lost.' };
        return false;
      }
      const size = resolutionFor(c);
      if (size !== renderer.resolution) {
        canvas.width = canvas.height = size;
        gl.viewport(0, 0, size, size);
        renderer.resolution = size;
        if (diagnostics) diagnostics.canvasResizes++;
      }
      const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
      gl.uniform3f(renderer.frame, p, idle ? 1 : 0, WORLD_SIZE / size);
      gl.uniform4f(renderer.music, bounded(music.level), bounded(music.bass),
        bounded(music.mid), bounded(music.air));
      gl.uniform1f(renderer.realAudio, waveform ? 1 : 0);
      if (waveform) {
        // Compare actual texture bytes, including changes in the loaned audio
        // array. Identical quantized samples need no GPU upload.
        let changed = false;
        for (let i = 0; i < 64; i++) {
          const value = Math.round(bounded(waveform[i]) * 255);
          if (renderer.waveformPixels[i] !== value) {
            renderer.waveformPixels[i] = value;
            changed = true;
          }
        }
        if (changed) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, renderer.waveformTexture);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 1,
            gl.LUMINANCE, gl.UNSIGNED_BYTE, renderer.waveformPixels);
          if (diagnostics) diagnostics.textureUploads++;
        }
      }
      // Full coverage writes transparent pixels too, so no previous image can
      // survive. The freshly rendered canvas is consumed in this same call.
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!renderer.validated) {
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error(`WebGL draw failed (${error}).`);
        renderer.validated = true;
      }
      status = { backend: 'webgl1', resolution: size, reason: null };
      if (!present) return true;
      c.save();
      try {
        c.globalAlpha *= e;
        c.globalCompositeOperation = 'lighter';
        c.shadowBlur = 0;
        c.shadowOffsetX = c.shadowOffsetY = 0;
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.beginPath(); c.arc(0, 0, 219, 0, TAU);
        c.moveTo(111, 0); c.arc(0, 0, 111, 0, TAU, true);
        c.clip('evenodd');
        c.drawImage(canvas, -WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
      } finally { c.restore(); }
      return true;
    } catch (error) {
      unavailable = true;
      status = { backend: 'fallback', resolution: renderer ? renderer.resolution : 0,
        reason: String(error && error.message || error).slice(0, 240) };
      return false;
    }
  }

  function gridRows() {
    if (fallbackGrid) return fallbackGrid;
    fallbackGrid = [];
    // Match the shader's fixed 4.2 x 4.8 data cells. Cache one path per row;
    // each frame changes only the row's wake opacity and shared color spectrum.
    for (let row = 0; row < 94; row++) {
      const y = -224 + row * 4.8 + 2.4;
      if (y <= -219 || y >= 219) continue;
      const path = new Path2D();
      for (let column = 0; column < 107; column++) {
        const x = -224 + column * 4.2 + 2.1;
        if (x <= -219 || x >= 219) continue;
        const signal = .5 + .22 * Math.sin(column * .29 + row * .31)
          + .15 * Math.sin(column * .73 - row * .19)
          + .11 * Math.cos(column * .17 + row * .53);
        const halfHeight = .30 + 1.05 * signal;
        path.moveTo(x, y - halfHeight); path.lineTo(x, y + halfHeight);
      }
      fallbackGrid.push({ y, path });
    }
    return fallbackGrid;
  }

  // The Canvas fallback uses the same flat front, data wake and audio comb.
  function drawFallback(c, phase, energy, idle = false, music = SILENT_MUSIC, waveform = null, present = true) {
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    const e = Math.max(0, Math.min(1, Number(energy) || 0));
    if (e < .001) return;
    const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
    const q = idle ? Math.max(0, Math.min(1, (p / TAU * 12 - 1.1) / 9.8))
      : (p / TAU * 3 + .13) % 1;
    const head = idle ? -265 + 590 * q : -255 + 560 * q;
    const travel = Math.max(0, Math.min(1, (head + 219) / 438));
    const envelope = idle ? (travel > 0 && travel < 1 ? Math.sin(Math.PI * travel) ** 2 : 0)
      : smooth(q / .075) * (1 - smooth((q - .88) / .12));
    if (idle && envelope === 0) return;
    const halfWidth = Math.sqrt(Math.max(0, 217 * 217 - head * head));
    const wakeLength = idle ? 330 : 145;

    // Same closed spectrum and interpolation as the GPU and center logo.
    const stops = [0, .168, .344, .456, .592, .8, 1];
    const colors = [[126,48,211], [195,149,250], [252,246,255],
      [236,237,255], [183,214,255], [67,140,244], [126,48,211]];
    const spectrum = x => {
      const u = ((.8 * (x + 219) / 438 + p / TAU) % 1 + 1) % 1;
      let i = 0;
      while (i < 5 && u > stops[i + 1]) i++;
      const f = smooth((u - stops[i]) / (stops[i + 1] - stops[i]));
      return colors[i].map((v, k) => v + (colors[i + 1][k] - v) * f);
    };

    c.save();
    try {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha *= e * (idle ? .42 : 1);
      c.shadowBlur = 0; c.shadowOffsetX = c.shadowOffsetY = 0;
      c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 219, 0, TAU);
      c.moveTo(111, 0); c.arc(0, 0, 111, 0, TAU, true); c.clip('evenodd');
      const inherited = c.globalAlpha;
      const color = c.createLinearGradient(-238, 0, 238, 0);
      const beam = c.createLinearGradient(-238, 0, 238, 0);
      for (let i = 0; i <= 96; i++) {
        const rgb = spectrum(-238 + 476 * i / 96);
        color.addColorStop(i / 96, `rgb(${rgb.map(Math.round).join(',')})`);
        beam.addColorStop(i / 96, `rgb(${rgb.map(v => Math.round(v + (255 - v) * .1)).join(',')})`);
      }

      // The ghost wake reveals a softly glowing data grid on the vinyl surface.
      c.save();
      try {
        c.beginPath(); c.arc(0, 0, 219, 0, TAU); c.clip();
        c.fillStyle = color;
        if (!idle) {
          c.globalAlpha = inherited * .014; c.fillRect(-219, -219, 438, 438);
          c.strokeStyle = color; c.lineWidth = .5; c.beginPath();
          for (let r = 122; r < 218; r += 4.2) { c.moveTo(r,0); c.arc(0,0,r,0,TAU); }
          c.globalAlpha = inherited * .035; c.stroke();
        }
        // Fixed rows retain the horizontal spectrum while fading by distance.
        for (let y = -219; y < 219; y += 3) {
          const behind = head - (y + 1.5);
          const strength = smooth((behind + 5) / 15) * Math.exp(-Math.max(0, behind) / wakeLength);
          c.globalAlpha = inherited * envelope * .045 * (idle ? .58 : 1) * strength;
          c.fillRect(-219, y, 438, 3);
        }
        if (envelope > .000001) {
          c.strokeStyle = color;
          for (const row of gridRows()) {
            const behind = head - row.y;
            const wake = smooth((behind + 5) / 15) * Math.exp(-Math.max(0, behind) / wakeLength);
            const alpha = inherited * envelope * (idle ? .58 : 1) * wake;
            if (alpha <= .000001) continue;
            c.globalAlpha = alpha * .09; c.lineWidth = 1.8; c.stroke(row.path);
            c.globalAlpha = alpha * .36; c.lineWidth = .6; c.stroke(row.path);
          }
        }
        if (!idle && envelope > .000001) {
          const level = bounded(music.level);
          const bands = [bounded(music.bass), bounded(music.mid), bounded(music.air)];
          const musicalPeak = Math.max(level, ...bands);
          if (musicalPeak > .000001) {
            // Only the narrow recently read strip moves. Four opacity batches
            // contain alternate columns/row-pairs, never rebuild the full grid.
            const meters = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
            const used = [false, false, false, false];
            const firstPair = Math.max(0, Math.ceil((head - 112 + 224 - 8.15) / 9.6));
            const lastPair = Math.min(45, Math.floor((head + 2 + 224 - 8.15) / 9.6));
            for (let pair = firstPair + firstPair % 2; pair <= lastPair; pair += 2) {
              const foot = -224 + pair * 9.6 + 8.15;
              const behind = head - foot;
              const readZone = smooth((behind + 2) / 17) * (1 - smooth((behind - 42) / 70));
              const wake = smooth((behind + 5) / 15) * Math.exp(-Math.max(0, behind) / wakeLength);
              for (let column = 2; column < 106; column += 2) {
                const x = -224 + column * 4.2 + 2.1;
                const group = Math.floor(column / 6);
                const groupGain = .55 + .45 * Math.sin(group * 1.83 + .9) ** 2;
                const laneGain = smooth((.5 + .5 * Math.cos((column % 6 - 2.5) * .82) - .12) / .73);
                const response = bounded((.22 * level + .78 * bands[group % 3]) * groupGain * laneGain);
                const drive = response * readZone;
                const strength = drive * wake / musicalPeak;
                if (strength < .003) continue;
                const tremor = .18 * Math.sin(54 * p + column * 1.37 + pair * .61)
                  * (4 * level * (1 - level)) * drive;
                const height = 1.4 + 4.45 * Math.sqrt(drive) + tremor;
                const bucket = Math.min(3, Math.floor(strength * 4));
                meters[bucket].moveTo(x, foot); meters[bucket].lineTo(x, foot - height);
                used[bucket] = true;
              }
            }
            for (let bucket = 0; bucket < meters.length; bucket++) {
              if (!used[bucket]) continue;
              const alpha = inherited * envelope * musicalPeak * (bucket + .5) / 4;
              c.globalAlpha = alpha * .075; c.lineWidth = 1.8; c.stroke(meters[bucket]);
              c.globalAlpha = alpha * .44; c.lineWidth = .6; c.stroke(meters[bucket]);
            }
          }
        }
      } finally { c.restore(); }

      if (halfWidth <= 0 || envelope <= .000001) return;
      c.strokeStyle = color; c.lineWidth = .72; c.beginPath();
      const firstBand = Math.ceil((-halfWidth + 224) / 5.6 - .5);
      const lastBand = Math.floor((halfWidth + 224) / 5.6 - .5);
      for (let band = firstBand; band <= lastBand; band++) {
        const x = band * 5.6 + 2.8 - 224;
        let height;
        if (waveform) {
          const position = bounded((band + .5) / 80) * 63;
          const lower = Math.floor(position), upper = Math.min(63, lower + 1);
          // Match the GPU's normalized 8-bit texels and linear interpolation.
          const a = Math.round(bounded(waveform[lower]) * 255) / 255;
          const b = Math.round(bounded(waveform[upper]) * 255) / 255;
          const amplitude = a + (b - a) * (position - lower);
          if (amplitude <= .00001) continue;
          height = 21 * Math.sqrt(amplitude);
        } else {
          const audio = .5 + .24 * Math.sin(band*.39 + 4*p)
            + .16 * Math.sin(band*.81 - 7*p) + .09 * Math.cos(band*.21 + 3*p);
          height = (3.5 + 17.5 * audio * audio) * (idle ? .65 : 1);
        }
        c.moveTo(x, head - (waveform ? 0 : .5)); c.lineTo(x, head - height);
      }
      c.globalAlpha = inherited * envelope * .33; c.stroke();
      c.strokeStyle = beam; c.beginPath();
      c.moveTo(-halfWidth, head); c.lineTo(halfWidth, head);
      for (const [width, alpha] of [[14,.02], [4.2,.11], [.85,.62]]) {
        c.lineWidth = width; c.globalAlpha = inherited * envelope * alpha; c.stroke();
      }
    } finally { c.restore(); }
  }

  function render(c, phase, energy) {
    const music = Number(energy) >= .001 ? sampleMusic(phase) : SILENT_MUSIC;
    const rawWaveform = music.realAudio
      ? (music.processing ? root.MastrifyAudio?.sampleWaveformAt?.(music.sourceTime, 'original')
        : root.MastrifyAudio?.sampleWaveform?.(0)) || SILENT_WAVEFORM : null;
    const waveform = music.processing && rawWaveform && root.MastrifyProcessingMotion
      ? root.MastrifyProcessingMotion.waveform('scan', rawWaveform, root.MastrifyProcessing.getState()) : rawWaveform;
    waveformSource = rawWaveform ? 'audio' : 'demo';
    waveformPeak = 0;
    if (waveform) {
      for (let i = 0; i < 64; i++) waveformPeak = Math.max(waveformPeak, bounded(waveform[i]));
    }
    if (!draw(c, phase, energy, false, music, waveform)) drawFallback(c, phase, energy, false, music, waveform);
  }
  function drawIdle(c, phase, visibility) {
    waveformSource = 'demo'; waveformPeak = 0;
    // Outside the vinyl the standby scan's entire shader output is transparent.
    // Avoid a WebGL render + canvas transfer for these empty frames.
    const p = ((phase % TAU) + TAU) % TAU;
    const q = Math.max(0, Math.min(1, (p / TAU * 12 - 1.1) / 9.8));
    const head = -265 + 590 * q;
    if (head <= -219 || head >= 219) return;
    if (!draw(c, phase, visibility, true)) drawFallback(c, phase, visibility, true);
  }
  root.MastrifyCoreField = Object.freeze({ draw: render, drawIdle,
    prepare: c => draw(c, 0, 1, false, SILENT_MUSIC, null, false),
    getStatus: () => ({ ...status, ...diagnostics, waveformSource, waveformPeak }) });
})(window);
