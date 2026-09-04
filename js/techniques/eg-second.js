// Second Ex-Girlfriend — xx(10^(p^((b−1)/2) − 1)) = b, for any odd b.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, sizeTag, step, tag } from './shared.js';

const CONFIG = {
  easy: { b: [3, 25] },
  medium: { b: [3, 99] },
  hard: { b: [51, 501] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const b = rng.until(() => rng.int(cfg.b[0], cfg.b[1]), (v) => v % 2 === 1 && v >= 3);
  const m = (b - 1) / 2;

  if (rng() < 0.35) {
    return {
      promptHtml: xOf(pow(10, `${pow('p', m)} &minus; 1`), 2),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(b),
      answer: b,
      params: { b, m, direction: 'forward' },
      tags: [tag('dir:forward', 'reading the formula forwards'), sizeTag(b)],
      check: intCheck(b),
      steps: [
        step('1. Inner x', `${xOf(pow(10, `${pow('p', m)} &minus; 1`))} = (${pow('p', m)} &minus; 1 + 1)<sup>2</sup> = ${pow('p', `2 &middot; ${m}`)} = ${pow('p', b - 1)}`),
        step('2. Outer x', `${xOf(pow('p', b - 1))} = ${b - 1} + 1 = <strong>${b}</strong>`),
      ],
    };
  }

  return {
    promptHtml: `${xOf(pow(10, `${pow('p', '<span class="unknown">m</span>')} &minus; 1`), 2)} = ${b}`,
    instruction: 'Find m',
    answerHint: 'the exponent m on p',
    canonicalText: String(m),
    answer: m,
    params: { b, m, direction: 'inverse' },
    tags: [tag('dir:inverse', 'solving for the exponent'), sizeTag(b)],
    check: intCheck(m),
    steps: [
      step('1. The identity', `${xOf(pow(10, `${pow('p', '(b &minus; 1)/2')} &minus; 1`), 2)} = b, for odd b.`),
      step('2. Plug in', `m = (${b} &minus; 1) / 2 = <strong>${m}</strong>`),
      step('3. Check it', `${xOf(pow(10, `${pow('p', m)} &minus; 1`))} = ${pow('p', b - 1)}, and ${xOf(pow('p', b - 1))} = ${b}.`),
    ],
  };
}

export default {
  id: 'eg-second',
  name: 'Second Ex-Girlfriend',
  family: 'factors',
  form: 'xx(10<sup>p<sup>(b&minus;1)/2</sup> &minus; 1</sup>) = b',
  generate,
};
