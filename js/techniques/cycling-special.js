// 3. Special Cycling — (a^b)/c mod k, by folding c into the argument of lambda.

import { carmichael, gcd, modPow } from '../lib/math.js';
import { frac, lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, congruentNumeratorCheck, step } from './shared.js';

const CONFIG = {
  easy: { k: [5, 11], c: [2, 3, 7], a: [2, 7], r: [2, 3], reps: [1, 3] },
  medium: { k: [5, 13], c: [2, 3, 7, 9], a: [2, 9], r: [2, 4], reps: [1, 5] },
  hard: { k: [7, 17], c: [3, 7, 8, 9, 11], a: [2, 12], r: [2, 4], reps: [2, 8] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, c, k, r } = rng.until(
    () => {
      const k = rng.int(cfg.k[0], cfg.k[1]);
      const c = rng.pick(cfg.c);
      const a = rng.int(cfg.a[0], cfg.a[1]);
      const r = rng.int(cfg.r[0], cfg.r[1]);
      return { a, c, k, r };
    },
    ({ a, c, k, r }) =>
      k > 3 && gcd(c, k) === 1 && c !== k && gcd(a, c * k) === 1 && a % k > 1 &&
      // Keep a^r small enough to work out by hand, the way the manual's examples do.
      a ** r <= 4000 && carmichael(c * k) > r,
  );
  const ck = c * k;
  const n = carmichael(ck);
  const b = r + n * rng.int(cfg.reps[0], cfg.reps[1]);
  const raised = a ** r;
  const target = modPow(a, b, ck);

  return {
    promptHtml: `${modHtml(frac(pow(a, b), c), k)}`,
    instruction: 'Evaluate',
    answerHint: `the numerator over ${c} — "N/${c}", or just N`,
    canonicalText: `${target}/${c}`,
    answer: target,
    params: { a, b, c, k, ck, n },
    check: congruentNumeratorCheck({ target, modulus: ck, den: c }),
    steps: [
      step(
        `1. Compute ${lambdaHtml('ck')}, n`,
        `c &middot; k = ${c} &middot; ${k} = ${ck}`,
        `${lambdaHtml(ck)} = ${n}`,
      ),
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
        'Why any congruent numerator works',
        `The goal is an exact value, not a residue: any N with N &equiv; ${pow(a, b)} (mod ${ck}) represents it, so ${target} + ${ck} = ${target + ck} over ${c} is just as correct.`,
      ),
    ],
  };
}

export default {
  id: 'cycling-special',
  name: 'Special Cycling',
  family: 'cycling',
  form: '(a<sup>b</sup>)/c mod k',
  blurb: 'Lambda cycling with c folded into the argument: λ(ck) instead of λ(k).',
  generate,
  reference: {
    overview:
      'Special cycling is solved by essentially lambda cycling except you include c inside of the argument of the lambda function. Note: not all examples of this format are possible only through special cycling — see Alain cycling.',
    method: ['Compute λ(ck), n.', 'Compute (a^(b mod n)) mod k.'],
    note:
      'The answer is a fraction, and any numerator congruent to a^b modulo ck is correct. This trainer accepts all of them, and shows the smallest positive one as the canonical answer.',
    examples: [
      {
        goal: '(5^32)/7 mod 11',
        lines: ['λ(77) = 30', '32 mod 30 = 2', '(5^2)/7 = 25/7', '25/7 mod 11 = 25/7'],
        answer: '(5^32)/7 mod 11 = 25/7',
      },
      {
        goal: '(5^63)/7 mod 11',
        lines: ['λ(77) = 30', '63 mod 30 = 3', '(5^3)/7 = 125/7', '125/7 mod 77/7 = 48/7'],
        answer: '(5^63)/7 mod 11 = 48/7',
      },
    ],
  },
};
