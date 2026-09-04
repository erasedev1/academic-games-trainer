// Ex-Girlfriend Improved — √(x(10^(b−1))) = b, for any integer b.

import { pow, sqrtOf, xOf } from '../lib/format.js';
import { byDifficulty, intCheck } from './shared.js';

const CONFIG = {
  easy: { b: [2, 15] },
  medium: { b: [2, 60] },
  hard: { b: [20, 400] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const n = b - 1;

  if (rng() < 0.4) {
    return {
      promptHtml: sqrtOf(xOf(pow(10, n))),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(b),
      answer: b,
      params: { b, n, direction: 'forward' },
      check: intCheck(b),
    };
  }

  return {
    promptHtml: `${sqrtOf(xOf(pow(10, '<span class="unknown">n</span>')))} = ${b}`,
    instruction: 'Find n',
    answerHint: 'the exponent n',
    canonicalText: String(n),
    answer: n,
    params: { b, n, direction: 'inverse' },
    check: intCheck(n),
  };
}

export default {
  id: 'eg-improved',
  name: 'Ex-Girlfriend Improved',
  family: 'factors',
  form: '&radic;(x(10<sup>b&minus;1</sup>)) = b',
  generate,
};
