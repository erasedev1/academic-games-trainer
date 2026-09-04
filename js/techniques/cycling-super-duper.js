// Super Duper Cycling — a^(b^c^d^e) mod k, read as a^(b^(c·d·e)).

import { mod as modHtml, tower } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck } from './shared.js';
import { pickBase, pickExponent, towerAnswer, TRIVIAL_SHARE } from './cycling-super.js';

// c, d and e are colour exponents, so they are single digits like everything else.
const CONFIG = {
  easy: { b: DIGITS, cde: [2, 6] },
  medium: { b: [...DIGITS, 11, 12], cde: [2, 9] },
  hard: { b: [...DIGITS, 11, 12, 13], cde: [4, 9] },
};

/**
 * cde is a product of three digits, so it is even far more often than not — left alone,
 * almost every one of these would reduce to a. Draw c, d and e together against the
 * outcome instead, so the collapse stays a case you meet rather than the whole drill.
 */
function pickTriple(rng, k, b, range, wantTrivial) {
  let triple;
  pickExponent(
    rng,
    k,
    b,
    () => {
      triple = [0, 0, 0].map(() => rng.int(range[0], range[1]));
      return triple[0] * triple[1] * triple[2];
    },
    wantTrivial,
  );
  return triple;
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, b, k } = pickBase(rng, cfg.b);
  const [c, d, e] = pickTriple(rng, k, b, cfg.cde, rng() < TRIVIAL_SHARE);
  const f = c * d * e;
  const answer = towerAnswer({ a, b, k, exponent: f });

  return {
    promptHtml: modHtml(tower(a, b, c, d, e), k),
    instruction: 'Evaluate',
    answerHint: `0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, c, d, e, f, k },
    check: intCheck(answer),
  };
}

export default {
  id: 'cycling-super-duper',
  name: 'Super Duper Cycling',
  family: 'cycling',
  form: 'a<sup>b<sup>c<sup>d<sup>e</sup></sup></sup></sup> mod k',
  generate,
};
