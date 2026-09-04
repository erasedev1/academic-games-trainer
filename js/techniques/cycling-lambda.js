// 2. Lambda Cycling — a^b mod k in two steps, once a and k are coprime.

import { carmichael, gcd, isPrime, modPow, powerCycle } from '../lib/math.js';
import { lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step } from './shared.js';
import { cycleLines } from './cycling-regular.js';

const CONFIG = {
  easy: { b: [30, 99] },
  medium: { b: [100, 499] },
  hard: { b: [500, 9999] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, k } = rng.until(
    () => ({ a: rng.pick(DIGITS), k: rng.pick(MODULI) }),
    ({ a, k }) => a % k > 1 && gcd(a, k) === 1,
  );
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const n = carmichael(k);
  const reduced = b % n;
  const finalExp = reduced === 0 ? n : reduced;
  const answer = modPow(a, b, k);

  return {
    promptHtml: modHtml(pow(a, b), k),
    instruction: 'Evaluate',
    answerHint: `whole number, 0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, k },
    check: intCheck(answer),
    steps: [
      step(
        `1. Compute ${lambdaHtml('k')}, n`,
        isPrime(k)
          ? `${lambdaHtml(k)} = ${k} &minus; 1 = ${n} &nbsp;<span class="muted">(prime shortcut)</span>`
          : `${lambdaHtml(k)} = ${n}`,
        `gcd(${a}, ${k}) = 1, so lambda cycling applies.`,
      ),
      step(
        `2. Compute ${modHtml(pow('a', 'b mod n'), 'k')}`,
        `${b} mod ${n} = ${reduced}${reduced === 0 ? ` &rarr; use ${pow(a, n)}` : ''}`,
        `${modHtml(pow(a, finalExp), k)} = ${answer} &nbsp;<span class="muted">(via regular cycling)</span>`,
        `<strong>${modHtml(pow(a, b), k)} = ${answer}</strong>`,
      ),
      step('The short cycle, if you need it', cycleLines(a, k, powerCycle(a, k))),
    ],
  };
}

export default {
  id: 'cycling-lambda',
  name: 'Lambda Cycling',
  family: 'cycling',
  form: 'a<sup>b</sup> mod k',
  blurb: 'The recommended method: reduce the exponent mod λ(k) instead of writing out a cycle.',
  // Reference only, not offered as its own drill: the goal it produces is indistinguishable
  // from regular cycling — same a^b mod k — so picking between them is picking a method for
  // a problem you cannot tell apart. Drill the method through the Lambda Function drill and
  // through special, super and super duper cycling, which all reduce mod λ(k) to get started.
  drillable: false,
  generate,
  reference: {
    overview:
      'Lambda cycling is a more advanced method of solving regular cycling examples. This is the recommended method due to the extremely fast compute times. Note: a and k must be coprime in order to use this method.',
    method: ['Compute λ(k), n.', 'Compute a^(b mod n) mod k.'],
    note:
      'Every problem this trainer generates for this mode already has gcd(a, k) = 1. If a remainder of 0 comes out of b mod n, use a^n — the end of the cycle — rather than a^0.',
    examples: [
      {
        goal: '7^93 mod 11',
        lines: ['λ(11) = 10 via the prime shortcut', '93 mod 10 = 3', '7^3 mod 11 = 2 via regular cycling'],
        answer: '7^93 mod 11 = 2',
      },
      {
        goal: '3^85 mod 7',
        lines: ['λ(7) = 6 via the prime shortcut', '85 mod 6 = 1', '3^1 mod 7 = 3'],
        answer: '3^85 mod 7 = 3',
      },
    ],
  },
};
