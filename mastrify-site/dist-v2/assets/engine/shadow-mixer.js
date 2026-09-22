/* Isolated GPU interpolation of the existing Safari logo-shadow alpha atlas.
 * create(size) takes the full square atlas dimension, not its individual cell.
 * The input pixels, blur levels, tint values and final painter order are owned
 * by the engine. This only replaces its mutable 2D mixing surface.
 */
(function (root) {
  'use strict';
  const VERTEX = `
    attribute vec2 aPosition;
    varying vec2 vUV;
    void main() {
      vUV = aPosition * .5 + .5;
      gl_Position = vec4(aPosition, 0., 1.);
    }
  `;
  const FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D uLow;
    uniform sampler2D uHigh;
    uniform float uBlend;
    uniform vec3 uTint;
    void main() {
      // Native masks carry the exact same alpha used by the previous Canvas
      // lighter blend. Their RGB is deliberately ignored.
      float coverage = mix(texture2D(uLow, vUV).a,
                           texture2D(uHigh, vUV).a, uBlend);
      // Texture upload flips Canvas' top-down rows. The CSS bottom-right cell
      // therefore occupies the lower-right quadrant of these WebGL UVs.
      float dotCell = step(.5, vUV.x) * (1. - step(.5, vUV.y));
      vec3 tint = mix(uTint, vec3(180., 167., 255.) / 255., dotCell);
      gl_FragColor = vec4(tint * coverage, coverage);
    }
  `;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function create(size) {
    if (!Number.isInteger(size) || size <= 0 || !root.document?.createElement) return null;
    const canvas = root.document.createElement('canvas');
    canvas.width = canvas.height = size;
    let gl, program, buffer, lowLocation, highLocation, blendLocation, tintLocation;
    let lost = false, destroyed = false;
    const textures = new Map();
    const shaders = [];
    const onLost = event => { event.preventDefault?.(); lost = true; };
    const onRestored = () => { lost = true; }; // Caller retains its proven 2D fallback.

    function cleanup() {
      if (destroyed) return;
      destroyed = true;
      canvas.removeEventListener?.('webglcontextlost', onLost);
      canvas.removeEventListener?.('webglcontextrestored', onRestored);
      if (gl && !gl.isContextLost()) {
        for (const texture of textures.values()) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        for (const shader of shaders) gl.deleteShader(shader);
        // Explicitly release the private context on density/viewport changes.
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      textures.clear();
    }
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shadow shader allocation failed.');
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shadow shader compilation failed.');
      return shader;
    }
    try {
      gl = canvas.getContext('webgl', {
        alpha: true, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: true, preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      if (!gl || gl.isContextLost() || size > gl.getParameter(gl.MAX_TEXTURE_SIZE)) { cleanup(); return null; }
      program = gl.createProgram();
      if (!program) throw new Error('Shadow program allocation failed.');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shadow program linking failed.');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Shadow vertex allocation failed.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      // One full-screen quad. Vertices and UVs never change between frames.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      if (position < 0) throw new Error('Shadow position input is missing.');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      lowLocation = gl.getUniformLocation(program, 'uLow');
      highLocation = gl.getUniformLocation(program, 'uHigh');
      blendLocation = gl.getUniformLocation(program, 'uBlend');
      tintLocation = gl.getUniformLocation(program, 'uTint');
      if (lowLocation === null || highLocation === null || blendLocation === null || tintLocation === null) throw new Error('Shadow shader uniforms are missing.');
      gl.uniform1i(lowLocation, 0); gl.uniform1i(highLocation, 1);
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SCISSOR_TEST);
      gl.colorMask(true, true, true, true);
      gl.viewport(0, 0, size, size);
      // Input alpha is untouched by the color-space or premultiplication flags.
      // Explicit row flipping aligns Canvas -> GL -> Canvas without mirrored cells.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Shadow renderer setup failed.');
      canvas.addEventListener?.('webglcontextlost', onLost);
      canvas.addEventListener?.('webglcontextrestored', onRestored);
    } catch (_) { cleanup(); return null; }

    function textureFor(source) {
      let texture = textures.get(source);
      if (texture) return texture;
      // The engine owns precisely six immutable native masks. Refuse an
      // unbounded stream of replacements instead of retaining mobile GPU memory.
      if (!source || source.width !== size || source.height !== size || textures.size >= 6) return null;
      texture = gl.createTexture();
      if (!texture) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        // Query only on an initial upload, never in an already-warm frame.
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Shadow mask upload failed.');
      } catch (_) { gl.deleteTexture(texture); return null; }
      textures.set(source, texture);
      return texture;
    }
    function render(lowCanvas, highCanvas, blend, tint) {
      if (destroyed || lost || gl.isContextLost()) return false;
      if (!Number.isFinite(blend) || !tint || tint.length !== 3
          || !Number.isFinite(tint[0]) || !Number.isFinite(tint[1]) || !Number.isFinite(tint[2])) return false;
      try {
        // textureFor uploads on whichever unit is bound. Rebind both units only
        // after resolving both sources, so a newly-uploaded high mask cannot
        // accidentally replace the low mask's sampler binding.
        const low = textureFor(lowCanvas), high = textureFor(highCanvas);
        if (!low || !high) return false;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, low);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, high);
        gl.uniform1f(blendLocation, clamp(blend, 0, 1));
        gl.uniform3f(tintLocation, clamp(tint[0], 0, 255) / 255,
          clamp(tint[1], 0, 255) / 255, clamp(tint[2], 0, 255) / 255);
        // Every pixel is overwritten; no clear, readback, CPU pixel processing,
        // texture allocation or buffer update is needed in a warm frame.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return !gl.isContextLost();
      } catch (_) { lost = true; return false; }
    }
    return Object.freeze({ canvas, render, destroy: cleanup });
  }
  root.MastrifyShadowMixer = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
