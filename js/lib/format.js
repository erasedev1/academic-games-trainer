// Expression markup + answer parsing. All rendering is plain HTML (<sup>/<sub>),
// so the site needs no math typesetting library and works offline.

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/** "5^27" as markup. `exp` may itself be markup (for stacked exponents). */
export function pow(base, exp) {
  return `${escapeHtml(base)}<sup>${exp}</sup>`;
}

/** Nested exponent tower, e.g. tower(5, 7, 48) -> 5^(7^48). */
export function tower(...parts) {
  return parts.reduceRight((acc, part) => (acc === null ? escapeHtml(part) : `${escapeHtml(part)}<sup>${acc}</sup>`), null);
}

export function mod(expr, k) {
  return `${expr} <span class="op">mod</span> ${escapeHtml(k)}`;
}

export function frac(num, den) {
  return `<span class="frac"><span class="frac-num">${num}</span><span class="frac-den">${escapeHtml(den)}</span></span>`;
}

export function lambda(arg) {
  return `<span class="fn">&lambda;</span>(${escapeHtml(arg)})`;
}

export function xOf(arg, times = 1) {
  return `<span class="fn">${'x'.repeat(times)}</span>(${arg})`;
}

export function sqrtOf(arg) {
  return `<span class="radical">&radic;</span><span class="radicand">${arg}</span>`;
}

const FRACTION_RE = /^(-?\d+)\s*\/\s*(-?\d+)$/;
const INT_RE = /^-?\d+$/;

/**
 * Parses what the user typed. Accepts "48", "48/7", "48 / 7" and tolerates
 * surrounding whitespace. Returns { kind: 'int' | 'fraction' | 'invalid' }.
 */
export function parseAnswer(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { kind: 'invalid', text };
  if (INT_RE.test(text)) return { kind: 'int', value: Number(text), text };
  const m = FRACTION_RE.exec(text);
  if (m) {
    const den = Number(m[2]);
    if (den === 0) return { kind: 'invalid', text };
    return { kind: 'fraction', num: Number(m[1]), den, text };
  }
  return { kind: 'invalid', text };
}

/** Formats seconds with one decimal, e.g. "4.2s". */
export function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
