/**
 * camera/bezierEasing.ts — CSS cubic-bezier easing for camera transitions.
 *
 * Ported from https://github.com/gre/bezier-easing (MIT License)
 * Original by Gaëtan Renaudeau 2014–2015.
 *
 * Usage:
 *   const ease = bezierEasing(0.42, 0, 0.58, 1); // CSS ease-in-out
 *   const t = ease(progress); // progress and result both in [0, 1]
 *
 * Common presets (matching CSS timing functions):
 *   ease          bezierEasing(0.25, 0.1, 0.25, 1.0)
 *   ease-in       bezierEasing(0.42, 0,    1.0,  1.0)
 *   ease-out      bezierEasing(0,    0,    0.58, 1.0)
 *   ease-in-out   bezierEasing(0.42, 0,    0.58, 1.0)
 */

const NEWTON_ITERATIONS       = 4;
const NEWTON_MIN_SLOPE        = 0.001;
const SUBDIVISION_PRECISION   = 0.0000001;
const SUBDIVISION_MAX_ITER    = 10;
const SPLINE_TABLE_SIZE       = 11;
const SAMPLE_STEP_SIZE        = 1.0 / (SPLINE_TABLE_SIZE - 1.0);

function a(a1: number, a2: number) { return 1.0 - 3.0 * a2 + 3.0 * a1; }
function b(a1: number, a2: number) { return 3.0 * a2 - 6.0 * a1; }
function c(a1: number)             { return 3.0 * a1; }

function calcBezier(t: number, a1: number, a2: number): number {
  return ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
}
function getSlope(t: number, a1: number, a2: number): number {
  return 3.0 * a(a1, a2) * t * t + 2.0 * b(a1, a2) * t + c(a1);
}

function binarySubdivide(x: number, lo: number, hi: number, x1: number, x2: number): number {
  let t = 0;
  let i = 0;
  do {
    t = lo + (hi - lo) / 2;
    const cx = calcBezier(t, x1, x2) - x;
    if (cx > 0) hi = t; else lo = t;
  } while (Math.abs(calcBezier(t, x1, x2) - x) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITER);
  return t;
}

function newtonRaphson(x: number, guess: number, x1: number, x2: number): number {
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const slope = getSlope(guess, x1, x2);
    if (slope === 0) return guess;
    guess -= (calcBezier(guess, x1, x2) - x) / slope;
  }
  return guess;
}

/** Create a cubic-bezier easing function from two control points. */
export function bezierEasing(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  if (x1 === y1 && x2 === y2) return (x: number) => x; // linear

  // Precompute sample table for fast lookup
  const samples = new Float32Array(SPLINE_TABLE_SIZE);
  for (let i = 0; i < SPLINE_TABLE_SIZE; i++) {
    samples[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2);
  }

  function getTForX(x: number): number {
    let start = 0;
    let s = 1;
    const last = SPLINE_TABLE_SIZE - 1;
    for (; s !== last && samples[s] <= x; s++) start += SAMPLE_STEP_SIZE;
    s--;
    const dist  = (x - samples[s]) / (samples[s + 1] - samples[s]);
    const guess = start + dist * SAMPLE_STEP_SIZE;
    const slope = getSlope(guess, x1, x2);
    if (slope >= NEWTON_MIN_SLOPE) return newtonRaphson(x, guess, x1, x2);
    if (slope === 0)               return guess;
    return binarySubdivide(x, start, start + SAMPLE_STEP_SIZE, x1, x2);
  }

  return (x: number) => {
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(getTForX(x), y1, y2);
  };
}

// ── Named presets ─────────────────────────────────────────────────────────────

/** CSS `ease-in-out` — slow start, fast middle, slow end. Best for bone switches. */
export const easeInOut = bezierEasing(0.42, 0, 0.58, 1.0);

/** CSS `ease-out` — fast start, slow end. Good for camera arrival. */
export const easeOut   = bezierEasing(0, 0, 0.58, 1.0);

/** CSS `ease-in` — slow start, fast end. Good for camera departure. */
export const easeIn    = bezierEasing(0.42, 0, 1.0, 1.0);
