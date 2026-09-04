// Third Ex-Girlfriend — xxx(10^(p^((p^(c−1) − 1)/2) − 1)) = c, for any integer c.
// p must be an odd prime, or p^(c−1) is even and halving it leaves a decimal.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step, tag } from './shared.js';

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
  const inner = p ** (c - 1);
  const answer = (inner - 1) / 2;

  return {
    promptHtml: `${xOf(pow(10, `${p}<sup><span class="unknown">m</span></sup> &minus; 1`), 3)} = ${c}`,
    instruction: `Find m, taking p = ${p}`,
    answerHint: 'the exponent m',
    canonicalText: String(answer),
    answer,
    params: { c, p },
    tags: [tag(`p:${p}`, `p = ${p}`), tag(`c:${c}`, `target ${c}`)],
    check: intCheck(answer),
    steps: [
      step('1. The identity', `${xOf(pow(10, `${pow('p', '(p<sup>c&minus;1</sup> &minus; 1)/2')} &minus; 1`), 3)} = c`),
      step('2. Work the inner power', `${pow(p, `${c} &minus; 1`)} = ${pow(p, c - 1)} = ${inner}`),
      step('3. Halve it', `m = (${inner} &minus; 1) / 2 = <strong>${answer}</strong>`),
      step('Why p must be an odd prime', `${pow(p, c - 1)} has to be odd, or subtracting 1 and halving leaves a decimal.`),
    ],
  };
}

export default {
  id: 'eg-third',
  name: 'Third Ex-Girlfriend',
  family: 'factors',
  form: 'xxx(10<sup>p<sup>(p<sup>c&minus;1</sup>&minus;1)/2</sup> &minus; 1</sup>) = c',
  generate,
};
