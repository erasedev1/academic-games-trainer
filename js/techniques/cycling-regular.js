// Regular Cycling — a^b mod k.

import { modPow, powerCycle, reduceExponent } from '../lib/math.js';
import { mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step, tag } from './shared.js';

// k is always a real Equations modulus, so difficulty is the cycle length and how far
// the exponent has to be reduced. minPeriod 1 lets easy include the "repeating number"
// case, where every power ends the same; above easy there has to be a cycle to reduce.
const CONFIG = {
  easy: { b: [15, 40], minPeriod: 1, maxPeriod: 4 },
  medium: { b: [40, 150], minPeriod: 2, maxPeriod: 10 },
  hard: { b: [150, 999], minPeriod: 2, maxPeriod: 10 },
};

/** Writes out the powers of a the way the manual does: previous residue × a, then reduced. */
function cycleLines(a, k, cycle) {
  return cycle.residues.map((residue, i) => {
    const exp = i + 1;
    if (exp === 1) return `${pow(a, 1)} = ${modHtml(a, k)} = ${residue}`;
    return `${pow(a, exp)} = ${modHtml(cycle.residues[i - 1] * a, k)} = ${residue}`;
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
    answerHint: `0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, k },
    tags: [tag(`k:${k}`, `mod ${k}`), tag(`a:${a}`, `base ${a}`), tag(`cycle:${a}^${k}`, `the cycle of ${a} mod ${k}`)],
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
  generate,
};
