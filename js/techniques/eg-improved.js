// Ex-Girlfriend Improved — √(x(10^(b−1))) = b, for any integer b.

import { pow, sqrtOf, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, sizeTag, step, tag } from './shared.js';

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
      tags: [tag('dir:forward', 'reading the formula forwards'), sizeTag(b)],
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
    tags: [tag('dir:inverse', 'solving for the exponent'), sizeTag(b)],
    check: intCheck(n),
    steps: [
      step('1. The identity', `${sqrtOf(xOf(pow(10, 'b &minus; 1')))} = b, for any integer b.`),
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
  generate,
};
