// The lambda function itself — the step every fast method starts from.

import { carmichael, gcd } from '../lib/math.js';
import { lambda as lambdaHtml } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI } from './shared.js';

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
    check: intCheck(answer),
  };
}

export default {
  id: 'lambda-value',
  name: 'Lambda Function',
  family: 'cycling',
  form: '&lambda;(k)',
  generate,
};
