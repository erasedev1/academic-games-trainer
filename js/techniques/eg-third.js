// 10. Third Ex-Girlfriend — xxx(10^(p^((p^(c−1) − 1)/2) − 1)) = c, for any integer c.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

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
  const m = (inner - 1) / 2;

  return {
    promptHtml: `${xOf(pow(10, `${p}<sup><span class="unknown">m</span></sup> &minus; 1`), 3)} = ${c}`,
    instruction: `Find m, taking p = ${p}`,
    answerHint: 'the exponent m',
    canonicalText: String(m),
    answer: m,
    params: { c, p, m, inner },
    check: intCheck(m),
    steps: [
      step(
        '1. Recall the identity',
        `${xOf(pow(10, `${pow('p', '(p<sup>c&minus;1</sup> &minus; 1)/2')} &minus; 1`), 3)} = c`,
      ),
      step('2. Work the inner power', `${pow(p, `${c} &minus; 1`)} = ${pow(p, c - 1)} = ${inner}`),
      step('3. Halve it', `m = (${inner} &minus; 1) / 2 = <strong>${m}</strong>`),
      step(
        'Why p must be an odd prime',
        `${pow(p, c - 1)} has to be odd, or subtracting 1 and halving leaves a decimal.`,
      ),
    ],
  };
}

export default {
  id: 'eg-third',
  name: 'Third Ex-Girlfriend',
  family: 'factors',
  form: 'xxx(10<sup>p<sup>(p<sup>c&minus;1</sup>&minus;1)/2</sup> &minus; 1</sup>) = c',
  blurb: 'Any integer at all, from three x cubes and a 1 cube.',
  generate,
  reference: {
    overview:
      'Third Ex-Girlfriend extends Second Ex-Girlfriend so you can solve for any integer with three x cubes and a 1 cube.',
    method: [
      'From Second Ex-Girlfriend, xxx(10^(p^((b−1)/2) − 1)) = xb = c.',
      'By the main principle x(p^(c−1)) = c, so b = p^(c−1).',
      'Substitute: xxx(10^(p^((p^(c−1) − 1)/2) − 1)) = c.',
    ],
    note:
      'Here p cannot be just any prime — it must be an odd prime, since p^(c−1) has to be odd for (p^(c−1) − 1)/2 to be a whole number.',
    examples: [
      {
        goal: 'c = 3, taking p = 3',
        lines: ['p^(c−1) = 3^2 = 9', 'm = (9 − 1)/2 = 4'],
        answer: '3 = xxx(10^(3^4 − 1))',
      },
      {
        goal: 'c = 4, taking p = 5',
        lines: ['p^(c−1) = 5^3 = 125', 'm = (125 − 1)/2 = 62'],
        answer: '4 = xxx(10^(5^62 − 1))',
      },
    ],
  },
};
