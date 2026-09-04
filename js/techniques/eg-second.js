// 9. Second Ex-Girlfriend — xx(10^(p^((b−1)/2) − 1)) = b, for any odd b.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { b: [3, 25] },
  medium: { b: [3, 99] },
  hard: { b: [51, 501] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const b = rng.until(() => rng.int(cfg.b[0], cfg.b[1]), (v) => v % 2 === 1 && v >= 3);
  const m = (b - 1) / 2;
  const forward = rng() < 0.35;
  const inner = `${pow('p', m)} &minus; 1`;

  if (forward) {
    return {
      promptHtml: xOf(pow(10, inner), 2),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(b),
      answer: b,
      params: { b, m, direction: 'forward' },
      check: intCheck(b),
      steps: [
        step(
          '1. Inner x',
          `${xOf(pow(10, `${pow('p', m)} &minus; 1`))} = (${pow('p', m)} &minus; 1 + 1)<sup>2</sup> = ${pow('p', `2 &middot; ${m}`)} = ${pow('p', b - 1)}`,
        ),
        step('2. Outer x', `${xOf(pow('p', b - 1))} = (${b - 1}) + 1 = <strong>${b}</strong>`),
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
    check: intCheck(m),
    steps: [
      step('1. Recall the identity', `${xOf(pow(10, `${pow('p', '(b &minus; 1)/2')} &minus; 1`), 2)} = b, for odd b.`),
      step('2. Plug in', `m = (${b} &minus; 1) / 2 = <strong>${m}</strong>`),
      step(
        '3. Check it',
        `x(10<sup>p<sup>${m}</sup> &minus; 1</sup>) = p<sup>${b - 1}</sup>, and x(p<sup>${b - 1}</sup>) = ${b}.`,
      ),
    ],
  };
}

export default {
  id: 'eg-second',
  name: 'Second Ex-Girlfriend',
  family: 'factors',
  form: 'xx(10<sup>p<sup>(b&minus;1)/2</sup> &minus; 1</sup>) = b',
  blurb: 'Any odd integer, from two x cubes and a 1 cube.',
  generate,
  reference: {
    overview:
      'Second Ex-Girlfriend extends First Ex-Girlfriend so you can solve for any odd integer with two x cubes and a 1 cube.',
    method: [
      'From First Ex-Girlfriend, xx(10^(√a − 1)) = xa = b.',
      'By the main principle x(p^(b−1)) = b, so a = p^(b−1) for any prime p.',
      'Substitute: xx(10^(√(p^(b−1)) − 1)) = b.',
      'Simplify the square root by halving the exponent: xx(10^(p^((b−1)/2) − 1)) = b.',
    ],
    note: 'b must be odd, otherwise (b − 1)/2 is not a whole number.',
    examples: [
      { goal: '3', lines: ['3 = xx(10^(p^((3 − 1)/2) − 1))'], answer: '3 = xx(10^(p − 1))' },
      { goal: '71', lines: ['71 = xx(10^(p^((71 − 1)/2) − 1))'], answer: '71 = xx(10^(p^35 − 1))' },
    ],
  },
};
