// 11. Ex-Girlfriend Improved — √(x(10^(b−1))) = b, for any integer b.

import { pow, sqrtOf, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { b: [2, 15] },
  medium: { b: [2, 60] },
  hard: { b: [20, 400] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const n = b - 1;
  const forward = rng() < 0.4;

  if (forward) {
    return {
      promptHtml: sqrtOf(xOf(pow(10, n))),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(b),
      answer: b,
      params: { b, n, direction: 'forward' },
      check: intCheck(b),
      steps: [
        step('1. Inner x', `${xOf(pow(10, n))} = (${n} + 1)<sup>2</sup> = ${b * b}`),
        step('2. Take the root', `&radic;${b * b} = <strong>${b}</strong>`),
      ],
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
    steps: [
      step('1. Recall the identity', `${sqrtOf(xOf(pow(10, 'b &minus; 1')))} = b, for any integer b.`),
      step('2. Plug in', `n = ${b} &minus; 1 = <strong>${n}</strong>`),
      step('3. Check it', `${xOf(pow(10, n))} = ${b * b}, and &radic;${b * b} = ${b}.`),
    ],
  };
}

export default {
  id: 'eg-improved',
  name: 'Ex-Girlfriend Improved',
  family: 'factors',
  form: '&radic;(x(10<sup>b&minus;1</sup>)) = b',
  blurb: 'Any integer from one root cube, one x cube and a 1 cube — the cheapest of the family.',
  generate,
  reference: {
    overview:
      'Ex-Girlfriend Improved allows you to solve for any integer with only one square root cube, an x cube, and a 1 cube. Undiscovered by other schools.',
    method: [
      'x(10^(√a − 1)) = a holds where a is a perfect square, since √a must be an integer.',
      'Square root both sides: √(x(10^(√a − 1))) = √a.',
      'Let a = b^2, giving b = √(x(10^(b − 1))).',
    ],
    examples: [
      { goal: '5', lines: ['5 = √(x(10^(5 − 1)))'], answer: '5 = √(x(10^4))' },
      { goal: '13', lines: ['13 = √(x(10^(13 − 1)))'], answer: '13 = √(x(10^12))' },
    ],
  },
};
