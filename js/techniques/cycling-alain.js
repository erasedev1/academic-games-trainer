// 6. Alain Cycling — (a^b)/c mod k when the power is too big to simplify, solved with CRT.

import { carmichael, crt, gcd, modPow } from '../lib/math.js';
import { frac, lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, congruentNumeratorCheck, step } from './shared.js';

const CONFIG = {
  easy: { k: [7, 11], c: [7, 8], a: [2, 9], b: [20, 40] },
  medium: { k: [7, 13], c: [7, 8, 9], a: [2, 12], b: [25, 70] },
  hard: { k: [11, 19], c: [7, 8, 9, 13], a: [2, 15], b: [30, 120] },
};

/** The manual's additive ladder: 1 + 7 + 7 = 15. Collapses to a product when it gets long. */
function ladder(start, stepSize, total) {
  const times = (total - start) / stepSize;
  if (times === 0) return `${start} already works`;
  if (times <= 4) return `${start}${` + ${stepSize}`.repeat(times)} = ${total}`;
  return `${start} + ${stepSize} &middot; ${times} = ${total}`;
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, b, c, k } = rng.until(
    () => {
      const k = rng.int(cfg.k[0], cfg.k[1]);
      const c = rng.pick(cfg.c);
      return { a: rng.int(cfg.a[0], cfg.a[1]), b: rng.int(cfg.b[0], cfg.b[1]), c, k };
    },
    ({ a, b, c, k }) =>
      k > 5 && gcd(c, k) === 1 && gcd(a, c * k) === 1 && a % k > 1 &&
      // The point of Alain cycling: the reduced exponent is still far too big to expand,
      // so special cycling stalls and CRT is the way through.
      b % carmichael(c * k) >= 8,
  );
  const ck = c * k;
  const n = modPow(a, b, c);
  const m = modPow(a, b, k);
  const target = crt(n, c, m, k);

  return {
    promptHtml: modHtml(frac(pow(a, b), c), k),
    instruction: 'Evaluate',
    answerHint: `the numerator over ${c} — "N/${c}", or just N`,
    canonicalText: `${target}/${c}`,
    answer: target,
    params: { a, b, c, k, ck, n, m },
    check: congruentNumeratorCheck({ target, modulus: ck, den: c }),
    steps: [
      step(
        'Why not special cycling',
        `${lambdaHtml(ck)} = ${carmichael(ck)}, and ${b} mod ${carmichael(ck)} = ${b % carmichael(ck)} &mdash; ${pow(a, b % carmichael(ck))} is far too big to expand by hand, so use CRT.`,
      ),
      step(
        `1. Compute ${modHtml(pow('a', 'b'), 'c')}, n`,
        `${modHtml(pow(a, b), c)} = ${n}`,
      ),
      step(
        `2. Compute ${modHtml(pow('a', 'b'), 'k')}, m`,
        `${modHtml(pow(a, b), k)} = ${m}`,
      ),
      step(
        '3. Find a number congruent to n mod c and m mod k',
        ladder(n, c, target),
        ladder(m, k, target),
        `<strong>${modHtml(frac(pow(a, b), c), k)} = ${frac(target, c)}</strong>`,
      ),
    ],
  };
}

export default {
  id: 'cycling-alain',
  name: 'Alain Cycling',
  family: 'cycling',
  form: '(a<sup>b</sup>)/c mod k',
  blurb: 'The special cycling cases that blow up — climb the two ladders and meet in the middle.',
  generate,
  reference: {
    overview:
      'Alain cycling is a case of special cycling that results in a number too big to simplify manually (ex. 5^29/7 mod 11). The method used here is CRT (Chinese remainder theorem), though there are several other ways to solve these.',
    method: ['Compute a^b mod c, n.', 'Compute a^b mod k, m.', 'Find a number congruent to n mod c and m mod k.'],
    note:
      'In practice: count up from m in steps of k until you hit a number that leaves remainder n when divided by c. Both ladders reach the same number, which is the numerator you want over c. Any number congruent to it mod ck is equally correct.',
    examples: [
      {
        goal: '(6^28)/7 mod 11',
        lines: ['6^28 mod 7 = 1', '6^28 mod 11 = 4', '1 + 7 + 7 = 15', '4 + 11 = 15'],
        answer: '(6^28)/7 mod 11 = 15/7',
      },
      {
        goal: '(7^27)/8 mod 11',
        lines: ['7^27 mod 8 = 7', '7^27 mod 11 = 6', '7 + 8 + 8 + 8 + 8 = 39', '6 + 11 + 11 + 11 = 39'],
        answer: '(7^27)/8 mod 11 = 39/8',
      },
    ],
  },
};
