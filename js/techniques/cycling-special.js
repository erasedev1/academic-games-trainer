// Special Cycling — (a^b)/c mod k.

import { carmichael, gcd, modPow } from '../lib/math.js';
import { frac, lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, congruentNumeratorCheck, DIGITS, MODULI, step, tag, WIDE_DIGITS } from './shared.js';

/**
 * What actually makes one of these harder is the size of ck — the lambda you have to work
 * out — and whether the power lands above ck and so needs reducing. The exponent b does
 * not, since it is reduced away immediately; tuning on b alone left all three levels
 * effectively identical.
 */
const CONFIG = {
  easy: { ck: [0, 30], r: [2, 3], reps: [1, 3], reduces: false, wide: 0 },
  medium: { ck: [0, 63], r: [2, 3], reps: [1, 5], reduces: null, wide: 0 },
  hard: { ck: [55, 99], r: [2, 4], reps: [2, 8], reduces: true, wide: 0.3 },
};

/** Every (a, c, k, r) this band allows, so a draw is even and always in band. */
const COMBOS = new Map();
function combosFor(difficulty) {
  if (!COMBOS.has(difficulty)) {
    const cfg = byDifficulty(CONFIG, difficulty);
    const numerals = cfg.wide ? [...DIGITS, ...WIDE_DIGITS] : DIGITS;
    const out = [];
    for (const c of DIGITS) {
      for (const k of MODULI) {
        const ck = c * k;
        if (gcd(c, k) !== 1 || c === k) continue;
        if (ck < cfg.ck[0] || ck > cfg.ck[1]) continue;
        const n = carmichael(ck);
        for (const a of numerals) {
          if (gcd(a, ck) !== 1 || a % k <= 1) continue;
          for (let r = cfg.r[0]; r <= cfg.r[1]; r++) {
            if (n <= r || a ** r > 4000) continue;
            // Whether the numerator has to be brought back under ck is the second axis.
            if (cfg.reduces !== null && (a ** r > ck) !== cfg.reduces) continue;
            out.push({ a, c, k, r });
          }
        }
      }
    }
    COMBOS.set(difficulty, out);
  }
  return COMBOS.get(difficulty);
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, c, k, r } = rng.pick(combosFor(difficulty));
  const ck = c * k;
  const n = carmichael(ck);
  const b = r + n * rng.int(cfg.reps[0], cfg.reps[1]);
  const raised = a ** r;
  const target = modPow(a, b, ck);

  return {
    promptHtml: modHtml(frac(pow(a, b), c), k),
    instruction: 'Evaluate',
    answerHint: `N/${c} or N`,
    canonicalText: `${target}/${c}`,
    answer: target,
    params: { a, b, c, k, ck },
    tags: [tag(`k:${k}`, `mod ${k}`), tag(`c:${c}`, `divisor ${c}`), tag(`ck:${ck}`, `\u03bb(${ck})`)],
    check: congruentNumeratorCheck({ target, modulus: ck, den: c }),
    steps: [
      step(`1. Compute ${lambdaHtml('ck')}, n`, `c &middot; k = ${c} &middot; ${k} = ${ck}`, `${lambdaHtml(ck)} = ${n}`),
      step(
        `2. Compute ${modHtml(`(${pow('a', 'b mod n')})`, 'k')}`,
        `${b} mod ${n} = ${r}`,
        `${pow(a, r)} = ${raised}`,
        raised === target
          ? `${raised} is already below ${ck}, so it stands as the numerator.`
          : `${modHtml(frac(raised, c), frac(ck, c))} = ${frac(target, c)} &nbsp;<span class="muted">(reduce the numerator mod ${ck}, keeping the denominator)</span>`,
        `<strong>${modHtml(frac(pow(a, b), c), k)} = ${frac(target, c)}</strong>`,
      ),
      step(
        'Any congruent numerator works',
        `The goal is an exact value, not a residue: any N with N &equiv; ${pow(a, b)} (mod ${ck}) represents it, so ${target + ck} over ${c} is just as correct.`,
      ),
    ],
  };
}

export default {
  id: 'cycling-special',
  name: 'Special Cycling',
  family: 'cycling',
  form: '(a<sup>b</sup>)/c mod k',
  generate,
};
