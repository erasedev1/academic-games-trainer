// Main Principle — x(n), the number of factors.

import { divisorCount, factorize } from '../lib/math.js';
import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, sizeTag, step, tag } from './shared.js';

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
  const answer = divisorCount(n);
  // Sometimes hand it over already factored, which drills the principle rather than the
  // factoring — both halves of the skill are worth practising separately.
  const showFactored = rng() < cfg.factoredForm;
  const factors = factorize(n);
  const primes = factors.map(({ p }) => p);
  const factored = factors.map(({ p, e }) => (e === 1 ? String(p) : pow(p, e))).join(' &middot; ');

  return {
    promptHtml: xOf(showFactored ? factored : String(n)),
    instruction: 'Evaluate',
    answerHint: 'whole number',
    canonicalText: String(answer),
    answer,
    params: { n },
    tags: [tag(`primes:${primes.join(',')}`, `primes ${primes.join(' \u00b7 ')}`), sizeTag(n), tag(showFactored ? 'form:factored' : 'form:plain', showFactored ? 'already factored' : 'factoring it yourself')],
    check: intCheck(answer),
    steps: [
      step('1. Prime factorize', `${n} = ${factored}`),
      step(
        '2. Add 1 to each exponent, multiply the results',
        `${factors.map(({ e }) => `(${e} + 1)`).join('')} = ${factors.map(({ e }) => e + 1).join(' &middot; ')} = <strong>${answer}</strong>`,
      ),
    ],
  };
}

export default {
  id: 'factors-main',
  name: 'Main Principle',
  family: 'factors',
  form: 'x(n)',
  generate,
};
