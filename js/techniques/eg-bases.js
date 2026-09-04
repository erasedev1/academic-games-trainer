// 12. Ex-Girlfriend Base 8, 9 and 11 — the derivations the manual leaves to the reader.
//
//   base 8 = 2^3  ->  x(8^n)  = 3n + 1  ->  n = (a − 1)/3, only when a ≡ 1 (mod 3)
//   base 9 = 3^2  ->  x(9^n)  = 2n + 1  ->  n = (a − 1)/2, only when a is odd
//   base 11 prime ->  x(11^n) = n + 1   ->  n = a − 1, for every integer a

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intOrNoneCheck, step } from './shared.js';

export const BASES = {
  8: { factor: '2<sup>3</sup>', expanded: '2<sup>3n</sup>', multiplier: 3, valid: (a) => a % 3 === 1, rule: 'a &equiv; 1 (mod 3)' },
  9: { factor: '3<sup>2</sup>', expanded: '3<sup>2n</sup>', multiplier: 2, valid: (a) => a % 2 === 1, rule: 'a to be odd' },
  11: { factor: '11', expanded: '11<sup>n</sup>', multiplier: 1, valid: () => true, rule: 'nothing — it reaches every integer' },
};

const CONFIG = {
  easy: { bases: [11], a: [2, 20], impossible: 0 },
  medium: { bases: [9, 11], a: [2, 40], impossible: 0.2 },
  hard: { bases: [8, 9, 11], a: [2, 80], impossible: 0.3 },
};

/** n such that x(base^n) = a, or null when this base cannot represent a. */
export function exponentFor(base, a) {
  const { multiplier, valid } = BASES[base];
  if (!valid(a) || a < 1) return null;
  const n = (a - 1) / multiplier;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const base = rng.pick(cfg.bases);
  const info = BASES[base];
  // Base 11 reaches every integer, so there is no impossible target to ask for there.
  const allowImpossible = base !== 11 && rng() < cfg.impossible;
  const a = rng.until(
    () => rng.int(cfg.a[0], cfg.a[1]),
    (value) => (allowImpossible ? exponentFor(base, value) === null : exponentFor(base, value) !== null),
    200,
  );
  const answer = exponentFor(base, a);

  return {
    promptHtml: `${xOf(pow(base, '<span class="unknown">n</span>'))} = ${a}`,
    instruction: `Find n in base ${base}`,
    answerHint: 'the exponent n, or "none"',
    canonicalText: answer === null ? 'none' : String(answer),
    answer,
    params: { base, a },
    check: intOrNoneCheck(answer),
    steps: [
      step('1. Factor the base', `${base}<sup>n</sup> = (${info.factor})<sup>n</sup> = ${info.expanded}`),
      step(
        '2. Apply the main principle',
        `${xOf(pow(base, 'n'))} = ${info.multiplier === 1 ? 'n + 1' : `${info.multiplier}n + 1`}`,
      ),
      answer === null
        ? step(
            '3. Check the target',
            `${info.multiplier}n + 1 = ${a} has no whole-number solution &mdash; base ${base} needs ${info.rule}.`,
            `<strong>Not representable in base ${base}.</strong>`,
          )
        : step(
            '3. Solve for n',
            `${info.multiplier === 1 ? '' : `${info.multiplier}`}n = ${a} &minus; 1 = ${a - 1}`,
            `n = ${info.multiplier === 1 ? a - 1 : `${a - 1} / ${info.multiplier} = ${answer}`}`,
            `<strong>n = ${answer}</strong>`,
          ),
    ],
  };
}

export default {
  id: 'eg-bases',
  name: 'Ex-Girlfriend Base 8, 9, 11',
  family: 'factors',
  form: 'x(B<sup>n</sup>) = a',
  blurb: 'The same pattern in other bases — and knowing instantly when a base cannot reach a.',
  generate,
  reference: {
    overview:
      'The manual states that the remaining Ex-Girlfriend formulas follow the same pattern established above, and leaves bases 8, 9 and 11 as an exercise for the reader. These are those derivations.',
    method: [
      'Base 8: 8^n = (2^3)^n = 2^(3n), so x(8^n) = 3n + 1 and n = (a − 1)/3 — only when a ≡ 1 (mod 3).',
      'Base 9: 9^n = (3^2)^n = 3^(2n), so x(9^n) = 2n + 1 and n = (a − 1)/2 — only when a is odd.',
      'Base 11: 11 is prime, so x(11^n) = n + 1 and n = a − 1 — for every integer a.',
    ],
    note:
      'Base 11 is the strongest of the three: because 11 is prime its exponent maps one-to-one onto every integer, so a single x cube reaches any target. Base 10 splits into two primes and therefore only reaches perfect squares — that is exactly what First Ex-Girlfriend is.',
    examples: [
      { goal: 'x(11^n) = 7', lines: ['n + 1 = 7'], answer: 'n = 6' },
      { goal: 'x(9^n) = 7', lines: ['2n + 1 = 7', '2n = 6'], answer: 'n = 3' },
      { goal: 'x(8^n) = 7', lines: ['3n + 1 = 7', '3n = 6'], answer: 'n = 2' },
      { goal: 'x(8^n) = 6', lines: ['3n + 1 = 6 has no whole-number solution', '6 ≢ 1 (mod 3)'], answer: 'not representable' },
    ],
  },
};
