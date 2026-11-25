// Single-line font auto-fit for the welcome-screen templates.
//
// The templates' fonts (KaiTi / SimSun / Microsoft YaHei / Consolas) have a
// predictable advance width: ≈1em for CJK/full-width characters, a fraction of
// an em for Latin. A weighted per-character estimate is therefore accurate
// enough to compute the largest font size that keeps a greeting line intact —
// no DOM measurement needed. The result is expressed in container-query units,
// so the same computation scales the fullscreen kiosk and the control-page
// mini preview identically.
//
// Behavior contract (mirrors the server-side clamp in server.rs):
// - 1.0 = the template's design size; `scale` multiplies only the size caps,
//   so a larger preference enlarges short text but can never cause a wrap.
// - Text that fits stays on one line (white-space: nowrap by the caller).
// - Text that cannot fit above `floorW` wraps into balanced lines at `floorW`
//   (floor × min(1, scale): scaling down may unwrap; scaling up never wraps).

/** Manual text-size preference bounds, as fractions of the template design size */
export const MIN_TEXT_SCALE = 0.8;
export const MAX_TEXT_SCALE = 1.5;

export interface FitOptions {
  /** Line width available to the text, in cqw */
  maxWidth: number;
  /** letter-spacing in em (applied after every glyph, including the last) */
  letterEm: number;
  /** Size cap in cqw at scale 1.0 (the template's design size) */
  capW: number;
  /** Aspect-ratio guard cap in cqh at scale 1.0 (keeps short/tall screens in check) */
  capH?: number;
  /** Smallest size in cqw that still reads; below it the text wraps instead */
  floorW: number;
  /** Manual size preference (config textScale); defaults to 1 */
  scale?: number;
}

export interface FitResult {
  /** font-size value: a CSS min() expression in cqw/cqh (cqh part omitted when unused) */
  fontSize: string;
  /** Numeric cqw part of fontSize, for callers that reason about the size */
  sizeCqw: number;
  /** true = the text cannot fit above the floor; wrap into balanced lines */
  wrap: boolean;
}

/** Clamp a config textScale value; unknown/NaN values fall back to 1 */
export function clampTextScale(scale: unknown): number {
  const v = typeof scale === "number" ? scale : NaN;
  if (!Number.isFinite(v)) return 1;
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, v));
}

/** Estimated advance width of one character in em */
function charEm(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0xa4cf) || // CJK radicals · kana · CJK punctuation · Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK compatibility ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK compatibility forms
    (cp >= 0xff00 && cp <= 0xff60) || // full-width forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // full-width signs
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK extension ideographs
  ) {
    return 1;
  }
  if (ch === " ") return 0.35;
  if (cp >= 0x41 && cp <= 0x5a) return 0.72; // A–Z
  if ("iljtf.,;:'\"!|()[]-".includes(ch)) return 0.35; // narrow letters & punctuation
  return 0.58; // digits, lowercase and the remaining Latin punctuation
}

/** Estimated line width of `text` in em, including letter-spacing */
function textEmWidth(text: string, letterEm: number): number {
  let total = 0;
  let count = 0;
  for (const ch of text) {
    total += charEm(ch);
    count++;
  }
  return total + count * letterEm;
}

/** Largest font size (as a FitResult) that keeps `text` on a single line,
 * shrinking from the (scaled) cap down to the floor, wrapping below it */
export function fitFont(text: string, o: FitOptions): FitResult {
  const scale = clampTextScale(o.scale);
  const capW = o.capW * scale;
  const floorW = o.floorW * Math.min(1, scale);
  const maxFit = o.maxWidth / Math.max(textEmWidth(text, o.letterEm), 0.001);
  const wrap = maxFit < floorW;
  const sizeCqw = round2(wrap ? floorW : Math.min(capW, maxFit));
  const cqh = o.capH === undefined ? null : round2(o.capH * scale);
  return {
    fontSize: cqh === null ? `${sizeCqw}cqw` : `min(${sizeCqw}cqw, ${cqh}cqh)`,
    sizeCqw,
    wrap,
  };
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}
