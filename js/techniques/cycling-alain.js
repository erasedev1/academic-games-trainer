// Alain Cycling — (a^b)/c mod k when the power is too big to simplify.

import { carmichael, crt, gcd, modPow } from '../lib/math.js';
import { frac, lambda as lambdaHtml, mod as modHtml, pow } from '../lib/format.js';
import { byDifficulty, congruentNumeratorCheck, DIGITS, MODULI, step, tag } from './shared.js';

/**
 * Alain cycling is the special-cycling case that blows up, which needs room for the
 * reduced exponent to stay large — so λ(ck) has to be reasonably big. Enumerating the
 * (c, k) pairs that qualify beats rejection-sampling for them: with the modulus limited
 * to what Equations actually offers, only a dozen combinations work at all.
 */
export const VIABLE_PAIRS = DIGITS.flatMap((c) =>
  MODULI.filter((k) => gcd(c, k) === 1 && carmichael(c * k) >= 10).map((k) => ({ c, k })),
);

/** Past this the power is hopeless to expand by hand, which is what forces CRT. */
const TOO_BIG_TO_EXPAND = 1e5;

const CONFIG = {
  easy: { reps: [1, 2] },
  medium: { reps: [1, 4] },
  hard: { reps: [2, 8] },
};

/** The manual's additive ladder: 1 + 7 + 7 = 15. Collapses to a product when it gets long. */
function ladder(start, stepSize, total) {
  const times = (total - start) / stepSize;
  if (times === 0) return `${start} already works`;
  if (times <= 4) return `${start}${` + ${stepSize}`.repeat(times)} = ${total}`;
  return `${start} + ${stepSize} &middot; ${times} = ${total}`;
}

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, c, k, r } = rng.until(
    () => {
      const { c, k } = rng.pick(VIABLE_PAIRS);
      // Pick the reduced exponent first, then build b around it, so the "too big to
      // expand" property is guaranteed rather than hoped for.
      return { a: rng.pick(DIGITS), c, k, r: rng.int(6, carmichael(c * k) - 1) };
    },
    ({ a, c, k, r }) => gcd(a, c * k) === 1 && a % k > 1 && a ** r > TOO_BIG_TO_EXPAND,
  );
  const ck = c * k;
  const b = r + carmichael(ck) * rng.int(cfg.reps[0], cfg.reps[1]);
  const n = modPow(a, b, c);
  const m = modPow(a, b, k);
  const target = crt(n, c, m, k);

  return {
    promptHtml: modHtml(frac(pow(a, b), c), k),
    instruction: 'Evaluate',
    answerHint: `N/${c} or N`,
    canonicalText: `${target}/${c}`,
    answer: target,
    params: { a, b, c, k, ck },
    tags: [tag(`k:${k}`, `mod ${k}`), tag(`c:${c}`, `divisor ${c}`), tag(`ck:${ck}`, `CRT over ${ck}`)],
    check: congruentNumeratorCheck({ target, modulus: ck, den: c }),
    steps: [
      step(
        'Why not special cycling',
        `${lambdaHtml(ck)} = ${carmichael(ck)}, and ${b} mod ${carmichael(ck)} = ${r} &mdash; ${pow(a, r)} is far too big to expand by hand, so use CRT.`,
      ),
      step(`1. Compute ${modHtml(pow('a', 'b'), 'c')}, n`, `${modHtml(pow(a, b), c)} = ${n}`),
      step(`2. Compute ${modHtml(pow('a', 'b'), 'k')}, m`, `${modHtml(pow(a, b), k)} = ${m}`),
      step(
        '3. Find a number congruent to n mod c and m mod k',
        ladder(n, c, target),
        ladder(m, k, target),
        `<strong>${modHtml(frac(pow(a, b), c), k)} = ${frac(target, c)}</strong>`,
      ),
    ],
  };
}

export default {
  id: 'cycling-alain',
  name: 'Alain Cycling',
  family: 'cycling',
  form: '(a<sup>b</sup>)/c mod k',
  generate,
};
