// Special Cycling — (a^b)/c mod k.

import { carmichael, gcd, modPow } from '../lib/math.js';
import { frac, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, congruentNumeratorCheck, DIGITS, MODULI } from './shared.js';

const CONFIG = {
  easy: { c: [2, 3, 5, 7], r: [2, 3], reps: [1, 3] },
  medium: { c: DIGITS, r: [2, 3], reps: [1, 5] },
  hard: { c: DIGITS, r: [2, 4], reps: [2, 8] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, c, k, r } = rng.until(
    () => ({
      a: rng.pick(DIGITS),
      c: rng.pick(cfg.c),
      k: rng.pick(MODULI),
      r: rng.int(cfg.r[0], cfg.r[1]),
    }),
    ({ a, c, k, r }) =>
      gcd(c, k) === 1 && c !== k && gcd(a, c * k) === 1 && a % k > 1 &&
      // Keep a^r small enough to work out by hand, the way the manual's examples do.
      a ** r <= 4000 && carmichael(c * k) > r,
  );
  const ck = c * k;
  const b = r + carmichael(ck) * rng.int(cfg.reps[0], cfg.reps[1]);
  const target = modPow(a, b, ck);

  return {
    promptHtml: modHtml(frac(pow(a, b), c), k),
    instruction: 'Evaluate',
    answerHint: `N/${c} or N`,
    canonicalText: `${target}/${c}`,
    answer: target,
    params: { a, b, c, k, ck },
    check: congruentNumeratorCheck({ target, modulus: ck, den: c }),
  };
}

export default {
  id: 'cycling-special',
  name: 'Special Cycling',
  family: 'cycling',
  form: '(a<sup>b</sup>)/c mod k',
  generate,
};
