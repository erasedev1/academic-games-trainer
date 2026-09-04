// Main Principle — x(n), the number of factors.

import { divisorCount, factorize } from '../lib/math.js';
import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck } from './shared.js';

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
  const factored = factorize(n).map(({ p, e }) => (e === 1 ? String(p) : pow(p, e))).join(' &middot; ');

  return {
    promptHtml: xOf(showFactored ? factored : String(n)),
    instruction: 'Evaluate',
    answerHint: 'whole number',
    canonicalText: String(answer),
    answer,
    params: { n },
    check: intCheck(answer),
  };
}

export default {
  id: 'factors-main',
  name: 'Main Principle',
  family: 'factors',
  form: 'x(n)',
  generate,
};
