// Third Ex-Girlfriend — xxx(10^(p^((p^(c−1) − 1)/2) − 1)) = c, for any integer c.
// p must be an odd prime, or p^(c−1) is even and halving it leaves a decimal.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck } from './shared.js';

const CONFIG = {
  easy: { c: [2, 4], primes: [3, 5] },
  medium: { c: [2, 5], primes: [3, 5, 7] },
  hard: { c: [3, 6], primes: [3, 5, 7, 11] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { c, p } = rng.until(
    () => ({ c: rng.int(cfg.c[0], cfg.c[1]), p: rng.pick(cfg.primes) }),
    ({ c, p }) => p ** (c - 1) <= 200000,
  );
  const answer = (p ** (c - 1) - 1) / 2;

  return {
    promptHtml: `${xOf(pow(10, `${p}<sup><span class="unknown">m</span></sup> &minus; 1`), 3)} = ${c}`,
    instruction: `Find m, taking p = ${p}`,
    answerHint: 'the exponent m',
    canonicalText: String(answer),
    answer,
    params: { c, p },
    check: intCheck(answer),
  };
}

export default {
  id: 'eg-third',
  name: 'Third Ex-Girlfriend',
  family: 'factors',
  form: 'xxx(10<sup>p<sup>(p<sup>c&minus;1</sup>&minus;1)/2</sup> &minus; 1</sup>) = c',
  generate,
};
