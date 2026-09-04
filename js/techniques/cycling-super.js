// 4. Super Cycling — a^(b^c) mod k: a cycle inside a cycle.

import { carmichael, gcd, isPrime, modPow } from '../lib/math.js';
import { lambda as lambdaHtml, mod as modHtml, pow, tower } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step } from './shared.js';

/**
 * Super cycling needs a second lambda step inside the first, so λ(λ(k)) has to be
 * worth computing. Of the real moduli that leaves 7, 9, 10 and 11 — for 6 and 8,
 * λ(k) = 2 and the inner power collapses to 1 every time, which is no drill at all.
 */
export const SUPER_MODULI = MODULI.filter((k) => carmichael(carmichael(k)) > 1);

const CONFIG = {
  easy: { b: DIGITS, c: [4, 20] },
  medium: { b: [...DIGITS, 11, 12], c: [8, 60] },
  hard: { b: [...DIGITS, 11, 12, 13], c: [20, 200] },
};

/** How often the inner power is allowed to collapse to 1, leaving the answer as just a. */
export const TRIVIAL_SHARE = 0.25;

/** Draws an exponent whose inner power either collapses to 1 or doesn't, as asked. */
export function pickExponent(rng, k, b, draw, wantTrivial) {
  const n = carmichael(k);
  const base = b % n;
  return rng.until(draw, (value) => (modPow(base, value, n) === 1) === wantTrivial);
}

/** Shared by super and super duper: reduce b, then the tower, then evaluate. */
export function superSteps({ a, b, k, exponent, exponentLabel }) {
  const n = carmichael(k);
  const bReduced = b % n;
  const innerLambda = carmichael(n);
  const expReduced = exponent % innerLambda;
  const m = modPow(bReduced, exponent, n);
  // gcd(a, k) = 1, so m = 0 and m = n give the same value — a^0 = a^n = 1 mod k.
  const answer = modPow(a, m, k);

  return {
    n,
    bReduced,
    m,
    answer,
    steps: [
      step(
        `Compute ${lambdaHtml('k')}, n, and reduce b`,
        isPrime(k) ? `${lambdaHtml(k)} = ${k} &minus; 1 = ${n}` : `${lambdaHtml(k)} = ${n}`,
        `${b} mod ${n} = ${bReduced}`,
      ),
      step(
        `Compute ${modHtml(pow('b', exponentLabel), 'n')}, m`,
        `${modHtml(pow(bReduced, exponent), n)}`,
        `${lambdaHtml(n)} = ${innerLambda}`,
        `${exponent} mod ${innerLambda} = ${expReduced}`,
        `${pow(bReduced, expReduced === 0 ? `0 &rarr; ${innerLambda}` : expReduced)} &rarr; m = ${m}`,
      ),
      step(
        `Compute ${modHtml(pow('a', 'm'), 'k')}`,
        `${modHtml(pow(a, m), k)} = ${answer}`,
        `<strong>${answer}</strong>`,
      ),
    ],
  };
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, b, k } = rng.until(
    () => ({ a: rng.pick(DIGITS), b: rng.pick(cfg.b), k: rng.pick(SUPER_MODULI) }),
    ({ a, b, k }) => {
      if (a % k <= 1) return false;
      const n = carmichael(k);
      // a and k coprime, and b coprime to λ(k), so both levels can be lambda cycled.
      // b ≡ 1 (mod λ(k)) is excluded: it collapses the tower before you start.
      return gcd(a, k) === 1 && gcd(b, n) === 1 && b % n !== 1;
    },
  );
  // When the tower reduces to 1 the answer is just a, which is a real case but a poor
  // drill if it is most of them — so it is rationed rather than left to chance.
  const c = pickExponent(rng, k, b, () => rng.int(cfg.c[0], cfg.c[1]), rng() < TRIVIAL_SHARE);
  const { answer, steps } = superSteps({ a, b, k, exponent: c, exponentLabel: 'c' });

  return {
    promptHtml: modHtml(tower(a, b, c), k),
    instruction: 'Evaluate',
    answerHint: `whole number, 0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, c, k },
    check: intCheck(answer),
    steps: steps.map((s, i) => ({ ...s, title: `${i + 1}. ${s.title}` })),
  };
}

export default {
  id: 'cycling-super',
  name: 'Super Cycling',
  family: 'cycling',
  form: 'a<sup>b<sup>c</sup></sup> mod k',
  blurb: 'A regular cycle inside a regular cycle — the best exercise for mental cycling speed.',
  generate,
  reference: {
    overview:
      'Super cycling is essentially a regular cycle in a regular cycle. Solving these mentally is a great exercise to improve overall mental cycling speed. Note: a and k, and b and λ(k), must be coprime in order to solve this using lambda cycling.',
    method: ['Compute λ(k), n, and reduce b.', 'Compute b^c mod n, m.', 'Compute a^m mod k.'],
    examples: [
      {
        goal: '5^(7^48) mod 11',
        lines: ['λ(11) = 10, and 7 mod 10 = 7', '7^48 mod 10: λ(10) = 4, 48 mod 4 = 0, 7^0 = 1', '5^1 mod 11 = 5'],
        answer: '5^(7^48) mod 11 = 5',
      },
      {
        goal: '3^(11^8) mod 7',
        lines: ['λ(7) = 6, and 11 mod 6 = 5', '5^8 mod 6: λ(6) = 2, 8 mod 2 = 0, 5^0 = 1', '3^1 mod 7 = 3'],
        answer: '3^(11^8) mod 7 = 3',
      },
    ],
  },
};
