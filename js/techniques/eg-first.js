// First Ex-Girlfriend — x(10^(√a − 1)) = a, for any perfect square a.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, sizeTag, step, tag } from './shared.js';

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

  if (rng() < 0.35) {
    return {
      promptHtml: xOf(pow(10, n)),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(a),
      answer: a,
      params: { n, a, direction: 'forward' },
      tags: [tag('dir:forward', 'reading the formula forwards'), sizeTag(a)],
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
    tags: [tag('dir:inverse', 'solving for the exponent'), sizeTag(a)],
    check: intCheck(n),
    steps: [
      step('1. The identity', `${xOf(pow(10, '&radic;a &minus; 1'))} = a, for perfect-square a.`),
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
  generate,
};
