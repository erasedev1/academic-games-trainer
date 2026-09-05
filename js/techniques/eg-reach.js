// Reachable Bases — given a target, which bases can build it with a single x cube.
//
// This is the set-building side of the Ex-Girlfriend family: rather than working an
// exponent out for a base you were handed, you decide which bases are even available.
// Each base factors differently, so each reaches a different set of integers:
//
//   x(8^n)  = 3n + 1   -> only a ≡ 1 (mod 3)
//   x(9^n)  = 2n + 1   -> only odd a
//   x(10^n) = (n+1)^2  -> only perfect squares — this is First Ex-Girlfriend
//   x(11^n) = n + 1    -> every integer, which is why base 11 is the safe fallback

import { isPerfectSquare } from '../lib/math.js';
import { pow, xOf } from '../lib/format.js';
import { byDifficulty, numberSetCheck, sizeTag, step, tag } from './shared.js';

export const REACH_BASES = [
  { base: 8, rule: 'a &equiv; 1 (mod 3)', reaches: (a) => a % 3 === 1, form: '3n + 1' },
  { base: 9, rule: 'a is odd', reaches: (a) => a % 2 === 1, form: '2n + 1' },
  { base: 10, rule: 'a is a perfect square', reaches: (a) => isPerfectSquare(a), form: '(n + 1)²' },
  { base: 11, rule: 'always', reaches: () => true, form: 'n + 1' },
];

const CONFIG = {
  easy: { a: [2, 12] },
  medium: { a: [2, 40] },
  hard: { a: [10, 100] },
};

/** The bases that can represent a. Never empty — base 11 always can. */
export function reachableBases(a) {
  return REACH_BASES.filter(({ reaches }) => reaches(a)).map(({ base }) => base);
}

/**
 * Targets grouped by which bases reach them.
 *
 * Drawing a target at random makes "11 only" about a third of the drill — every even
 * number that is not one more than a multiple of three lands there — and makes perfect
 * squares vanishingly rare, so base 10 would almost never come up. Since this is a
 * recognition drill, the useful thing is even coverage of the distinct answers, so a
 * shape is drawn first and a target that has it second.
 */
const GROUPS = new Map();
function groupsFor(difficulty) {
  if (!GROUPS.has(difficulty)) {
    const cfg = byDifficulty(CONFIG, difficulty);
    const byShape = new Map();
    for (let a = cfg.a[0]; a <= cfg.a[1]; a++) {
      const shape = reachableBases(a).join(',');
      if (!byShape.has(shape)) byShape.set(shape, []);
      byShape.get(shape).push(a);
    }
    GROUPS.set(difficulty, [...byShape.values()]);
  }
  return GROUPS.get(difficulty);
}

export function generate(difficulty, rng) {
  const a = rng.pick(rng.pick(groupsFor(difficulty)));
  const answer = reachableBases(a);

  return {
    promptHtml: `${xOf(pow('B', '<span class="unknown">n</span>'))} = ${a}`,
    instruction: 'Which bases can reach it',
    answerHint: 'bases that work, e.g. "9,11"',
    canonicalText: answer.join(','),
    answer,
    params: { a },
    tags: [tag(`set:${answer.join('-')}`, `targets reachable by ${answer.join(', ')}`), sizeTag(a)],
    check: numberSetCheck(answer),
    steps: [
      step(
        '1. What each base reaches',
        REACH_BASES.map(({ base, form, rule }) =>
          `${xOf(pow(base, 'n'))} = ${form} &mdash; ${rule === 'always' ? 'every integer' : rule}`),
      ),
      step(
        `2. Test ${a} against each`,
        REACH_BASES.map(({ base, reaches, rule }) =>
          `base ${base}: ${reaches(a) ? '&check; yes' : '&times; no'}${rule === 'always' ? '' : ` (${rule})`}`),
      ),
      step('3. The answer', `<strong>${answer.join(', ')}</strong>`),
      step(
        'Worth remembering',
        'Base 11 is prime, so it reaches every integer — it is never wrong, just not always cheapest.',
      ),
    ],
  };
}

export default {
  id: 'eg-reach',
  name: 'Reachable Bases',
  family: 'factors',
  form: 'which B makes x(B<sup>n</sup>) = a',
  generate,
};
