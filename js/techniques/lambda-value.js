// The lambda function itself — the step every fast method starts from.

import { carmichael, factorize, gcd, isPrime, lcmAll } from '../lib/math.js';
import { lambda as lambdaHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI, step, tag } from './shared.js';

/**
 * The arguments worth drilling are the ones real goals hand you: a bare modulus for
 * lambda cycling, and a ck product for special and Alain cycling.
 */
const PRODUCTS = DIGITS.flatMap((c) => MODULI.filter((k) => gcd(c, k) === 1).map((k) => c * k));
const ARGUMENTS = [...new Set([...MODULI, ...PRODUCTS])].sort((x, y) => x - y);

const CONFIG = {
  easy: { pool: MODULI },
  medium: { pool: ARGUMENTS.filter((n) => n <= 45) },
  hard: { pool: ARGUMENTS },
};

/**
 * The manual's per-factor items: (p − 1) from the bases, p^(e−1) from the exponents.
 * The one exception is 2^2, where the shortcut gives 1 but λ(4) is really 2 — using the
 * true value keeps the LCM of the listed items equal to the graded answer.
 */
function workings(k) {
  const factors = factorize(k);
  return {
    factors,
    baseItems: factors.map(({ p }) => ({ p, value: p - 1 })),
    expItems: factors.map(({ p, e }) => ({
      p,
      e,
      exception: p === 2 && e === 2,
      value: p === 2 ? (e === 1 ? 1 : e === 2 ? 2 : 2 ** (e - 2)) : p ** (e - 1),
    })),
  };
}

function lambdaSteps(k, answer) {
  if (isPrime(k)) {
    return [step('Prime shortcut', `${k} is prime, so ${lambdaHtml(k)} = ${k} &minus; 1 = <strong>${answer}</strong>.`)];
  }
  const { factors, baseItems, expItems } = workings(k);
  const items = [...baseItems, ...expItems].map((item) => item.value);
  return [
    step('1. Prime factorize', factors.map(({ p, e }) => (e === 1 ? `${p}` : pow(p, e))).join(' &middot; ')),
    step('2. Subtract 1 from the bases', baseItems.map(({ p, value }) => `${p} &minus; 1 = ${value}`)),
    step(
      '3. Subtract 1 from the exponents',
      expItems.map(({ p, e, value, exception }) =>
        exception
          ? `${lambdaHtml(4)} = 2 &mdash; the one place the manual's shortcut needs correcting`
          : p === 2
            ? `${pow(2, `${e} &minus; 2`)} = ${value}`
            : `${pow(p, `${e} &minus; 1`)} = ${value}`),
    ),
    step(
      '4. Find the LCM',
      `LCM [${items.join(', ')}] = ${lcmAll(items)}`,
      `<strong>${lambdaHtml(k)} = ${answer}</strong>`,
    ),
  ];
}

export function generate(difficulty, rng) {
  const k = rng.pick(byDifficulty(CONFIG, difficulty).pool);
  const answer = carmichael(k);

  return {
    promptHtml: lambdaHtml(k),
    instruction: 'Compute',
    answerHint: 'whole number',
    canonicalText: String(answer),
    answer,
    params: { k },
    tags: [tag(`arg:${k}`, `\u03bb(${k})`)],
    check: intCheck(answer),
    steps: lambdaSteps(k, answer),
  };
}

export default {
  id: 'lambda-value',
  name: 'Lambda Function',
  family: 'cycling',
  form: '&lambda;(k)',
  generate,
};
