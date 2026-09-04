// 1. Regular Cycling — a^b mod k, solved by writing out the cycle of powers.

import { modPow, powerCycle, reduceExponent } from '../lib/math.js';
import { mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step } from './shared.js';

// k is always a real Equations modulus; difficulty comes from how long the cycle is
// and how far the exponent has to be reduced, not from an unrealistic modulus.
const CONFIG = {
  // minPeriod 1 lets easy include the manual's "repeating number" case (5^89 mod 10),
  // where every power ends the same. Above easy there has to be a cycle to reduce.
  easy: { b: [15, 40], minPeriod: 1, maxPeriod: 4 },
  medium: { b: [40, 150], minPeriod: 2, maxPeriod: 10 },
  hard: { b: [150, 999], minPeriod: 2, maxPeriod: 10 },
};

/** Writes out the powers of a the way the manual does: previous residue × a, then reduced. */
export function cycleLines(a, k, cycle) {
  return cycle.residues.map((residue, i) => {
    const exp = i + 1;
    if (exp === 1) return `${pow(a, 1)} = ${modHtml(a, k)} = ${residue}`;
    const product = cycle.residues[i - 1] * a;
    return `${pow(a, exp)} = ${modHtml(product, k)} = ${residue}`;
  });
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, k, cycle } = rng.until(
    () => {
      const k = rng.pick(MODULI);
      const a = rng.pick(DIGITS);
      return { a, k, cycle: powerCycle(a, k) };
    },
    ({ a, k, cycle }) =>
      a % k !== 0 && a % k !== 1 && cycle.period >= cfg.minPeriod && cycle.period <= cfg.maxPeriod,
  );
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const answer = modPow(a, b, k);
  const reduced = reduceExponent(b, cycle);

  return {
    promptHtml: modHtml(pow(a, b), k),
    instruction: 'Evaluate',
    answerHint: `whole number, 0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, k },
    check: intCheck(answer),
    steps: [
      step('1. Cycle the powers of a', cycleLines(a, k, cycle)),
      step(
        '2. Determine the cycle length',
        cycle.start === 1
          ? `The residues repeat with period <strong>n = ${cycle.period}</strong>.`
          : `The residues only settle from ${pow(a, cycle.start)} onwards, then repeat with period <strong>n = ${cycle.period}</strong>.`,
      ),
      step(
        '3. Compute with the reduced b',
        cycle.start === 1
          ? `${b} mod ${cycle.period} = ${b % cycle.period}${b % cycle.period === 0 ? ` &rarr; a remainder of 0 lands on the end of the cycle, ${pow(a, cycle.period)}` : ''}`
          : `${b} reduces to the exponent ${reduced}`,
        `${modHtml(pow(a, reduced), k)} = ${answer}`,
        `<strong>${modHtml(pow(a, b), k)} = ${answer}</strong>`,
      ),
    ],
  };
}

export default {
  id: 'cycling-regular',
  name: 'Regular Cycling',
  family: 'cycling',
  form: 'a<sup>b</sup> mod k',
  blurb: 'Write out the powers of a until they repeat, then reduce the exponent.',
  generate,
  reference: {
    overview:
      'Regular cycling is solved by finding a repeating cycle in the powers of a. Since the powers repeat cyclically, we can reduce b and solve for a much smaller exponent.',
    method: [
      'Cycle the powers of a until reaching a repeating number, 1, or 0.',
      'Determine the length of the cycle, n.',
      'Compute a^(b mod n) mod k.',
    ],
    note:
      'Once you reach a residue you have already written down, the cycle has closed — you never need to go further. When a and k share a factor the residues take a step or two to settle before repeating, so check where the repeat actually starts before reducing.',
    examples: [
      {
        goal: '5^27 mod 11',
        lines: [
          '5^1 = 5 mod 11 = 5',
          '5^2 = 25 mod 11 = 3',
          '5^3 = 15 mod 11 = 4',
          '5^4 = 20 mod 11 = 9',
          '5^5 = 45 mod 11 = 1',
          'Cycle length n = 5',
          '27 mod 5 = 2',
          '5^2 mod 11 = 3',
        ],
        answer: '5^27 mod 11 = 3',
        extra:
          'For the last step, instead of recomputing 5^2 mod 11, look back at step 1 where it was already found.',
      },
      {
        goal: '5^89 mod 10',
        lines: ['5^1 = 5 mod 10 = 5', '5^2 = 25 mod 10 = 5', 'The residue repeats immediately, so every power ends in 5.'],
        answer: '5^89 mod 10 = 5',
        extra: 'This is an example of a repeating number rather than a cycle back to 1.',
      },
    ],
  },
};
