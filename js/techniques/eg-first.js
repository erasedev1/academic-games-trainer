// 8. First Ex-Girlfriend — x(10^(√a − 1)) = a, for any perfect square a.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { root: [2, 10] },
  medium: { root: [2, 20] },
  hard: { root: [5, 50] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const root = rng.int(cfg.root[0], cfg.root[1]);
  const a = root * root;
  const n = root - 1;
  const forward = rng() < 0.35;

  if (forward) {
    return {
      promptHtml: xOf(pow(10, n)),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(a),
      answer: a,
      params: { n, a, direction: 'forward' },
      check: intCheck(a),
      steps: [
        step('1. Split the power of ten', `${pow(10, n)} = ${pow(2, n)} &middot; ${pow(5, n)}`),
        step('2. Apply the main principle', `(${n} + 1)(${n} + 1) = ${root} &middot; ${root} = <strong>${a}</strong>`),
      ],
    };
  }

  return {
    promptHtml: `${xOf(pow(10, '<span class="unknown">n</span>'))} = ${a}`,
    instruction: 'Find n',
    answerHint: 'the exponent n',
    canonicalText: String(n),
    answer: n,
    params: { n, a, direction: 'inverse' },
    check: intCheck(n),
    steps: [
      step('1. Recall the identity', `${xOf(pow(10, '&radic;a &minus; 1'))} = a, for perfect-square a.`),
      step('2. Plug in', `&radic;${a} = ${root}`, `n = ${root} &minus; 1 = <strong>${n}</strong>`),
      step('3. Check it', `${xOf(pow(10, n))} = (${n}+1)<sup>2</sup> = ${a}`),
    ],
  };
}

export default {
  id: 'eg-first',
  name: 'First Ex-Girlfriend',
  family: 'factors',
  form: 'x(10<sup>&radic;a &minus; 1</sup>) = a',
  blurb: 'Any perfect square, from just an x cube and a 1 cube.',
  generate,
  reference: {
    overview:
      'First Ex-Girlfriend allows you to solve for any perfect square with only an X cube and a 1 cube.',
    method: [
      'x1 as cubes is x(10^n). Set that equal to a.',
      'Rewrite 10^n as 2^n · 5^n by the power of a product rule.',
      'By the main principle, x(10^n) = (n+1)(n+1) = (n+1)^2 = a.',
      'Solve for n: n = √a − 1, giving x(10^(√a − 1)) = a.',
    ],
    examples: [
      { goal: '25', lines: ['25 = x(10^(√25 − 1))'], answer: '25 = x(10^4)' },
      { goal: '100', lines: ['100 = x(10^(√100 − 1))'], answer: '100 = x(10^9)' },
    ],
  },
};
