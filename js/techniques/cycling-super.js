// Super Cycling — a^(b^c) mod k: a cycle inside a cycle.

import { carmichael, gcd, isPrime, modPow } from '../lib/math.js';
import { lambda as lambdaHtml, mod as modHtml, pow, tower } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step, tag } from './shared.js';

/**
 * Super cycling needs a second lambda step inside the first, so λ(λ(k)) has to be worth
 * computing. Of the real moduli that leaves 7, 9, 10 and 11 — for 6 and 8, λ(k) = 2 and
 * the inner power collapses to 1 every time, which is no drill at all.
 */
export const SUPER_MODULI = MODULI.filter((k) => carmichael(carmichael(k)) > 1);

/** How often the inner power is allowed to collapse to 1, leaving the answer as just a. */
export const TRIVIAL_SHARE = 0.25;

const CONFIG = {
  easy: { b: DIGITS, c: [4, 20] },
  medium: { b: [...DIGITS, 11, 12], c: [8, 60] },
  hard: { b: [...DIGITS, 11, 12, 13], c: [20, 200] },
};

/** a, b and k for either super technique: everything coprime, nothing pre-collapsed. */
export function pickBase(rng, bPool) {
  return rng.until(
    () => ({ a: rng.pick(DIGITS), b: rng.pick(bPool), k: rng.pick(SUPER_MODULI) }),
    ({ a, b, k }) => {
      if (a % k <= 1) return false;
      const n = carmichael(k);
      // a and k coprime, and b coprime to λ(k), so both levels can be lambda cycled.
      // b ≡ 1 (mod λ(k)) is excluded: it collapses the tower before you start.
      return gcd(a, k) === 1 && gcd(b, n) === 1 && b % n !== 1;
    },
  );
}

/** Draws an exponent whose inner power either collapses to 1 or doesn't, as asked. */
export function pickExponent(rng, k, b, draw, wantTrivial) {
  const n = carmichael(k);
  const base = b % n;
  return rng.until(draw, (value) => (modPow(base, value, n) === 1) === wantTrivial);
}

/** a^(b^E) mod k, reduced through λ(k). */
export function towerAnswer({ a, b, k, exponent }) {
  const n = carmichael(k);
  // gcd(a, k) = 1, so a reduced exponent of 0 and one of n give the same value.
  return modPow(a, modPow(b % n, exponent, n), k);
}

/** The worked solution shared by super and super duper: reduce b, the tower, then evaluate. */
export function towerSteps({ a, b, k, exponent, exponentLabel }) {
  const n = carmichael(k);
  const bReduced = b % n;
  const innerLambda = carmichael(n);
  const expReduced = exponent % innerLambda;
  const m = modPow(bReduced, exponent, n);

  return [
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
      `${modHtml(pow(a, m), k)} = ${modPow(a, m, k)}`,
      `<strong>${modPow(a, m, k)}</strong>`,
    ),
  ];
}

/** Numbers a list of steps from 1, so super duper can prepend its own first step. */
export function numbered(steps, from = 1) {
  return steps.map((s, i) => ({ ...s, title: `${i + from}. ${s.title}` }));
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, b, k } = pickBase(rng, cfg.b);
  // When the tower reduces to 1 the answer is just a — a real case, but a poor drill if
  // it is most of them, so it is rationed rather than left to chance.
  const c = pickExponent(rng, k, b, () => rng.int(cfg.c[0], cfg.c[1]), rng() < TRIVIAL_SHARE);
  const answer = towerAnswer({ a, b, k, exponent: c });

  return {
    promptHtml: modHtml(tower(a, b, c), k),
    instruction: 'Evaluate',
    answerHint: `0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, c, k },
    tags: [tag(`k:${k}`, `mod ${k}`), tag(`b:${b}`, `tower base ${b}`)],
    check: intCheck(answer),
    steps: numbered(towerSteps({ a, b, k, exponent: c, exponentLabel: 'c' })),
  };
}

export default {
  id: 'cycling-super',
  name: 'Super Cycling',
  family: 'cycling',
  form: 'a<sup>b<sup>c</sup></sup> mod k',
  generate,
};
