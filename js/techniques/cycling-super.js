// 4. Super Cycling — a^(b^c) mod k: a cycle inside a cycle.

import { carmichael, gcd, isPrime, modPow } from '../lib/math.js';
import { lambda as lambdaHtml, mod as modHtml, pow, tower } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { k: [5, 11], b: [3, 13], c: [4, 20] },
  medium: { k: [5, 17], b: [3, 25], c: [8, 60] },
  hard: { k: [7, 23], b: [3, 40], c: [20, 200] },
};

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
    () => {
      const k = rng.int(cfg.k[0], cfg.k[1]);
      return { a: rng.int(2, Math.max(2, k - 1)), b: rng.int(cfg.b[0], cfg.b[1]), k };
    },
    ({ a, b, k }) => {
      if (k <= 3 || a % k <= 1) return false;
      const n = carmichael(k);
      // a and k coprime, and b coprime to λ(k), so both levels can be lambda cycled.
      return n > 1 && gcd(a, k) === 1 && gcd(b, n) === 1 && b % n !== 0 && carmichael(n) > 1;
    },
  );
  const c = rng.int(cfg.c[0], cfg.c[1]);
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
