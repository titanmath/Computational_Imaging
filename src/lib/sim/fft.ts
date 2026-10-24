// FFT radix-2 en place (Cooley-Tukey) 1D et 2D. Tailles = puissances de 2.

export function estPuissance2(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

/** FFT 1D en place. inverse = true calcule la transformée inverse normalisée (÷n). */
export function fft1d(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  if (!estPuissance2(n)) throw new Error('taille non puissance de 2');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
}

/** FFT 2D (l × h, ligne par ligne puis colonne par colonne), en place. */
export function fft2d(re: Float64Array, im: Float64Array, l: number, h: number, inverse = false) {
  const lr = new Float64Array(l);
  const li = new Float64Array(l);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      lr[x] = re[y * l + x];
      li[x] = im[y * l + x];
    }
    fft1d(lr, li, inverse);
    for (let x = 0; x < l; x++) {
      re[y * l + x] = lr[x];
      im[y * l + x] = li[x];
    }
  }
  const cr = new Float64Array(h);
  const ci = new Float64Array(h);
  for (let x = 0; x < l; x++) {
    for (let y = 0; y < h; y++) {
      cr[y] = re[y * l + x];
      ci[y] = im[y * l + x];
    }
    fft1d(cr, ci, inverse);
    for (let y = 0; y < h; y++) {
      re[y * l + x] = cr[y];
      im[y * l + x] = ci[y];
    }
  }
}
