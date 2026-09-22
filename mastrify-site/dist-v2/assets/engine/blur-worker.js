/* Exact off-thread counterpart of MastrifyCanvas.blurredCanvas's pixel pass.
 * Keeps Float32 rounding, transparent padding and premultiplied RGBA intact. */
'use strict';
self.onmessage = function ({ data }) {
  const { id, width, height, sigma, buffer } = data;
  try {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
        || buffer?.byteLength !== width * height * 4) throw new Error('Invalid blur pixel dimensions.');
    const pixels = new Uint8ClampedArray(buffer);
    if (sigma > 0) {
      let input = new Float32Array(pixels.length);
      let output = new Float32Array(input.length);
      for (let i = 0; i < input.length; i += 4) {
        const alpha = pixels[i + 3] / 255;
        input[i] = pixels[i] * alpha;
        input[i + 1] = pixels[i + 1] * alpha;
        input[i + 2] = pixels[i + 2] * alpha;
        input[i + 3] = pixels[i + 3];
      }
      let lower = Math.floor(Math.sqrt(4 * sigma * sigma + 1));
      if (lower % 2 === 0) lower--;
      lower = Math.max(1, lower);
      const upper = lower + 2;
      const lowerPasses = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4));
      for (let pass = 0; pass < 3; pass++) {
        const radius = ((pass < lowerPasses ? lower : upper) - 1) / 2;
        for (let axis = 0; axis < 2; axis++) {
          const lines = axis ? width : height, length = axis ? height : width;
          const stride = axis ? width * 4 : 4;
          const divisor = radius * 2 + 1;
          for (let line = 0; line < lines; line++) {
            const base = axis ? line * 4 : line * width * 4;
            let r = 0, g = 0, b = 0, a = 0;
            for (let pos = 0; pos <= radius && pos < length; pos++) {
              const i = base + pos * stride;
              r += input[i]; g += input[i + 1]; b += input[i + 2]; a += input[i + 3];
            }
            for (let pos = 0; pos < length; pos++) {
              const i = base + pos * stride;
              output[i] = r / divisor; output[i + 1] = g / divisor;
              output[i + 2] = b / divisor; output[i + 3] = a / divisor;
              const remove = pos - radius, add = pos + radius + 1;
              if (remove >= 0) {
                const j = base + remove * stride;
                r -= input[j]; g -= input[j + 1]; b -= input[j + 2]; a -= input[j + 3];
              }
              if (add < length) {
                const j = base + add * stride;
                r += input[j]; g += input[j + 1]; b += input[j + 2]; a += input[j + 3];
              }
            }
          }
          [input, output] = [output, input];
        }
      }
      for (let i = 0; i < input.length; i += 4) {
        const alpha = Math.max(0, input[i + 3]);
        const factor = alpha > .00001 ? 255 / alpha : 0;
        pixels[i] = input[i] * factor;
        pixels[i + 1] = input[i + 1] * factor;
        pixels[i + 2] = input[i + 2] * factor;
        pixels[i + 3] = alpha;
      }
    }
    self.postMessage({ id, buffer: pixels.buffer }, [pixels.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error?.message || 'Blur worker failed.' });
  }
};
