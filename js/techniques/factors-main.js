// 7. Main Principle — x(n), the number of factors, from the prime factorization.

import { divisorCount, factorize } from '../lib/math.js';
import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';

const CONFIG = {
  easy: { max: 100, primes: [2, 3, 5], exps: [1, 3], factoredForm: 0 },
  medium: { max: 1000, primes: [2, 3, 5, 7], exps: [1, 4], factoredForm: 0.25 },
  hard: { max: 10000, primes: [2, 3, 5, 7, 11, 13], exps: [1, 5], factoredForm: 0.3 },
};

function buildNumber(cfg, rng) {
  const primes = rng.shuffle(cfg.primes).slice(0, rng.int(2, Math.min(3, cfg.primes.length)));
  return primes.reduce((acc, p) => acc * p ** rng.int(cfg.exps[0], cfg.exps[1]), 1);
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const n = rng.until(() => buildNumber(cfg, rng), (value) => value > 6 && value <= cfg.max);
  const factors = factorize(n);
  const answer = divisorCount(n);
  const showFactored = rng() < cfg.factoredForm;
  const factoredHtml = factors.map(({ p, e }) => (e === 1 ? String(p) : pow(p, e))).join(' &middot; ');

  return {
    promptHtml: xOf(showFactored ? factoredHtml : String(n)),
    instruction: 'Evaluate',
    answerHint: 'whole number',
    canonicalText: String(answer),
    answer,
    params: { n },
    check: intCheck(answer),
    steps: [
      step('1. Prime factorize', `${n} = ${factoredHtml}`),
      step(
        '2. Add 1 to each exponent, multiply the results',
        `${factors.map(({ e }) => `(${e} + 1)`).join('')} = ${factors.map(({ e }) => e + 1).join(' &middot; ')} = ${answer}`,
        `<strong>${xOf(String(n))} = ${answer}</strong>`,
      ),
    ],
  };
}

export default {
  id: 'factors-main',
  name: 'Main Principle',
  family: 'factors',
  form: 'x(n)',
  blurb: 'Factorize, add one to every exponent, multiply. Everything else is built on this.',
  generate,
  reference: {
    overview:
      'Number of factors is an extremely versatile variation, as there are many methods of solving for a variety of goals. All of these methods exist from this main principle.',
    method: ['Prime factorize.', 'Add 1 to each exponent, and multiply the results.'],
    examples: [
      { goal: 'x(24)', lines: ['24 = 2^3 · 3', '(3+1)(1+1) = 4 · 2 = 8'], answer: 'x(24) = 8' },
      { goal: 'x(120)', lines: ['120 = 2^3 · 3 · 5', '(3+1)(1+1)(1+1) = 4 · 2 · 2 = 16'], answer: 'x(120) = 16' },
    ],
  },
};
