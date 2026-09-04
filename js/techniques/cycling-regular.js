// Regular Cycling — a^b mod k.

import { modPow, powerCycle } from '../lib/math.js';
import { mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, MODULI } from './shared.js';

// k is always a real Equations modulus, so difficulty is the cycle length and how far
// the exponent has to be reduced. minPeriod 1 lets easy include the "repeating number"
// case, where every power ends the same; above easy there has to be a cycle to reduce.
const CONFIG = {
  easy: { b: [15, 40], minPeriod: 1, maxPeriod: 4 },
  medium: { b: [40, 150], minPeriod: 2, maxPeriod: 10 },
  hard: { b: [150, 999], minPeriod: 2, maxPeriod: 10 },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, k } = rng.until(
    () => {
      const k = rng.pick(MODULI);
      const a = rng.pick(DIGITS);
      return { a, k, cycle: powerCycle(a, k) };
    },
    ({ a, k, cycle }) =>
      a % k !== 0 && a % k !== 1 && cycle.period >= cfg.minPeriod && cycle.period <= cfg.maxPeriod,
  );
  const b = rng.int(cfg.b[0], cfg.b[1]);
  const answer = modPow(a, b, k);

  return {
    promptHtml: modHtml(pow(a, b), k),
    instruction: 'Evaluate',
    answerHint: `0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, k },
    check: intCheck(answer),
  };
}

export default {
  id: 'cycling-regular',
  name: 'Regular Cycling',
  family: 'cycling',
  form: 'a<sup>b</sup> mod k',
  generate,
};
