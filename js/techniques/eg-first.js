// First Ex-Girlfriend — x(10^(√a − 1)) = a, for any perfect square a.

import { pow, xOf } from '../lib/format.js';
import { byDifficulty, intCheck, sizeTag, tag } from './shared.js';

const CONFIG = {
  easy: { root: [2, 10] },
  medium: { root: [2, 20] },
  hard: { root: [5, 50] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const root = rng.int(cfg.root[0], cfg.root[1]);
  const a = root * root;
  const n = root - 1;

  if (rng() < 0.35) {
    return {
      promptHtml: xOf(pow(10, n)),
      instruction: 'Evaluate',
      answerHint: 'whole number',
      canonicalText: String(a),
      answer: a,
      params: { n, a, direction: 'forward' },
      tags: [tag('dir:forward', 'reading the formula forwards'), sizeTag(a)],
      check: intCheck(a),
    };
  }

  return {
    promptHtml: `${xOf(pow(10, '<span class="unknown">n</span>'))} = ${a}`,
    instruction: 'Find n',
    answerHint: 'the exponent n',
    canonicalText: String(n),
    answer: n,
    params: { n, a, direction: 'inverse' },
    tags: [tag('dir:inverse', 'solving for the exponent'), sizeTag(a)],
    check: intCheck(n),
  };
}

export default {
  id: 'eg-first',
  name: 'First Ex-Girlfriend',
  family: 'factors',
  form: 'x(10<sup>&radic;a &minus; 1</sup>) = a',
  generate,
};
