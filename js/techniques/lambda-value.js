// 2a. The lambda function itself — the building block every fast method leans on.

import { carmichael, carmichaelPrimePower, factorize, isPrime, lcmAll } from '../lib/math.js';
import { lambda as lambdaHtml, pow } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { max: 20, wantPrime: 0.5 },
  medium: { max: 100, wantPrime: 0.2 },
  hard: { max: 300, wantPrime: 0.1 },
};

/** The manual's per-factor items: (p − 1) from the bases, p^(e−1) from the exponents. */
export function lambdaWorkings(k) {
  const factors = factorize(k);
  const baseItems = factors.map(({ p }) => ({ p, value: p - 1 }));
  // p^(e-1) for odd p, 2^(e-2) for base 2 — the manual's "2 if the base is 2".
  // The one exception is 2^2, where the shortcut gives 1 but λ(4) is really 2; using the
  // true value here keeps the LCM of the listed items equal to the graded answer.
  const expItems = factors.map(({ p, e }) => ({
    p,
    e,
    exception: p === 2 && e === 2,
    value: p === 2 ? (e === 1 ? 1 : e === 2 ? 2 : 2 ** (e - 2)) : p ** (e - 1),
  }));
  return { factors, baseItems, expItems };
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const wantPrime = rng() < cfg.wantPrime;
  const k = rng.until(
    () => rng.int(3, cfg.max),
    (n) => (wantPrime ? isPrime(n) : n > 3 && factorize(n).length >= 1),
  );
  const answer = carmichael(k);
  const { factors, baseItems, expItems } = lambdaWorkings(k);
  const prime = isPrime(k);
  const needsFourNote = factors.some(({ p, e }) => p === 2 && e === 2);

  const steps = prime
    ? [
        step('Shortcut for a prime argument', `${k} is prime, so ${lambdaHtml(k)} = ${k} &minus; 1 = <strong>${answer}</strong>.`),
      ]
    : [
        step('1. Prime factorize', factors.map(({ p, e }) => (e === 1 ? `${p}` : pow(p, e))).join(' &middot; ')),
        step('2. Subtract 1 from the bases', baseItems.map(({ p, value }) => `${p} &minus; 1 = ${value}`)),
        step(
          '3. Subtract 1 from the exponents',
          expItems.map(({ p, e, value, exception }) =>
            exception
              ? `${lambdaHtml(4)} = 2 &mdash; the one place the shortcut needs correcting`
              : p === 2
                ? `${pow(2, `${e} &minus; 2`)} = ${value}`
                : `${pow(p, `${e} &minus; 1`)} = ${value}`,
          ),
        ),
        step(
          '4. Find the LCM',
          `LCM [${[...baseItems, ...expItems].map((i) => i.value).join(', ')}] = ${lcmAll([...baseItems, ...expItems].map((i) => i.value))}`,
          needsFourNote
            ? `The shortcut would give 1 for 2<sup>2</sup> here; &lambda;(4) is really 2 &mdash; see the note on the reference page.`
            : null,
          `<strong>${lambdaHtml(k)} = ${answer}</strong>`,
        ),
      ];

  return {
    promptHtml: lambdaHtml(k),
    instruction: 'Compute',
    answerHint: 'whole number',
    canonicalText: String(answer),
    answer,
    params: { k },
    check: intCheck(answer),
    steps,
  };
}

export default {
  id: 'lambda-value',
  name: 'Lambda Function',
  family: 'cycling',
  form: '&lambda;(k)',
  blurb: 'Drill the λ values themselves — the step that gates every fast cycling method.',
  generate,
  reference: {
    overview:
      'The lambda function is the engine behind lambda, special, super and super duper cycling. Getting λ(k) instantly is what makes those methods fast, so it is worth drilling on its own.',
    method: [
      'Prime factorization.',
      'Subtract 1 from the bases (ignore exponents).',
      'Subtract 1 from the exponents (2 if the base is 2, include exponents).',
      'Find the least common multiple of the previous values.',
      'If your argument is prime, skip all previous steps and simply subtract 1 from the argument.',
    ],
    note:
      'One correction to the shortcut: for 2^2 = 4 it produces 1, but λ(4) is actually 2. Every other value agrees with the true Carmichael function, because p − 1 and p^(e−1) are coprime and so their LCM is their product. This trainer grades against the true λ, so λ(4) = 2, λ(12) = 2, λ(20) = 4.',
    examples: [
      {
        goal: 'λ(60)',
        lines: ['60 = 2^2 · 3 · 5', '2 − 1 = 1, 3 − 1 = 2, 5 − 1 = 4', 'exponent parts: 1, 1, 1', 'LCM [1, 2, 4, 1, 1, 1] = 4'],
        answer: 'λ(60) = 4',
      },
      {
        goal: 'λ(11)',
        lines: ['11 is prime', '11 − 1 = 10'],
        answer: 'λ(11) = 10',
        extra: 'This demonstrates the prime shortcut in step 5.',
      },
    ],
  },
};
