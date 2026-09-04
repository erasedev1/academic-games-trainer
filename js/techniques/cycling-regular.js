// Regular Cycling — a^b mod k.

import { carmichael, gcd, modPow, powerCycle, reduceExponent } from '../lib/math.js';
import { lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step, tag } from './shared.js';

// k is always a real Equations modulus, so difficulty is the cycle length and how far the
// exponent has to be reduced.
const CONFIG = {
  easy: { b: [15, 40], maxPeriod: 4 },
  medium: { b: [40, 150], maxPeriod: 10 },
  hard: { b: [150, 999], maxPeriod: 10 },
};

/** Writes out the powers of a the way the manual does: previous residue × a, then reduced. */
function cycleLines(a, k, cycle) {
  return cycle.residues.map((residue, i) => {
    const exp = i + 1;
    if (exp === 1) return `${pow(a, 1)} = ${modHtml(a, k)} = ${residue}`;
    return `${pow(a, exp)} = ${modHtml(cycle.residues[i - 1] * a, k)} = ${residue}`;
  });
}

/**
 * The usable bases for each modulus, grouped so the modulus can be drawn evenly.
 *
 * a and k must be coprime, so lambda cycling always works on the result, and a must not be
 * congruent to 1, so there is a real cycle to write out. That leaves very different numbers
 * of bases per modulus — 8 for 11, only one for 6 — so drawing (a, k) at random and
 * rejecting the rest would quietly make mod 11 twice as common as mod 6. Picking the
 * modulus first and the base second keeps the coverage even.
 */
const OPTIONS = new Map();
function optionsFor(maxPeriod) {
  if (!OPTIONS.has(maxPeriod)) {
    const byModulus = MODULI.map((k) => [
      k,
      DIGITS.filter((a) => gcd(a, k) === 1 && a % k !== 1 && powerCycle(a, k).period <= maxPeriod),
    ]).filter(([, bases]) => bases.length);
    OPTIONS.set(maxPeriod, byModulus);
  }
  return OPTIONS.get(maxPeriod);
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const [k, bases] = rng.pick(optionsFor(cfg.maxPeriod));
  const a = rng.pick(bases);
  const cycle = powerCycle(a, k);
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const answer = modPow(a, b, k);
  const reduced = reduceExponent(b, cycle);
  const lambdaK = carmichael(k);
  const lambdaExp = b % lambdaK || lambdaK;

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
      step('2. Determine the cycle length', `The residues repeat with period <strong>n = ${cycle.period}</strong>.`),
      step(
        '3. Compute with the reduced b',
        `${b} mod ${cycle.period} = ${b % cycle.period}${b % cycle.period === 0 ? ` &rarr; a remainder of 0 lands on the end of the cycle, ${pow(a, cycle.period)}` : ''}`,
        `${modHtml(pow(a, reduced), k)} = ${answer}`,
        `<strong>${modHtml(pow(a, b), k)} = ${answer}</strong>`,
      ),
      step(
        'Or skip the cycle and use &lambda;',
        `gcd(${a}, ${k}) = 1, so lambda cycling applies &mdash; it always does here.`,
        `${lambdaHtml(k)} = ${lambdaK}, and ${b} mod ${lambdaK} = ${b % lambdaK}`,
        `${modHtml(pow(a, lambdaExp), k)} = ${answer}`,
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
