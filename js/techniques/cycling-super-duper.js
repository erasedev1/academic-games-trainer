// 5. Super Duper Cycling — a^(b^c^d^e) mod k, read as a^(b^(c·d·e)).

import { carmichael, gcd } from '../lib/math.js';
import { escapeHtml, mod as modHtml, tower } from '../lib/format.js';
import { byDifficulty, DIGITS, intCheck, step } from './shared.js';
import { pickExponent, superSteps, SUPER_MODULI, TRIVIAL_SHARE } from './cycling-super.js';

// c, d and e are colour exponents, so they are single digits like everything else.
const CONFIG = {
  easy: { b: DIGITS, cde: [2, 6] },
  medium: { b: [...DIGITS, 11, 12], cde: [2, 9] },
  hard: { b: [...DIGITS, 11, 12, 13], cde: [4, 9] },
};

function pickExponentTriple(rng, k, b, range, wantTrivial) {
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
  const { a, b, k } = rng.until(
    () => ({ a: rng.pick(DIGITS), b: rng.pick(cfg.b), k: rng.pick(SUPER_MODULI) }),
    ({ a, b, k }) => {
      if (a % k <= 1) return false;
      const n = carmichael(k);
      return gcd(a, k) === 1 && gcd(b, n) === 1 && b % n !== 1;
    },
  );
  // cde is a product of three digits, so it is even far more often than not — left alone,
  // almost every one of these would reduce to a. Draw c, d and e together against the
  // outcome instead, so the collapse stays a case you meet rather than the whole drill.
  const [c, d, e] = pickExponentTriple(rng, k, b, cfg.cde, rng() < TRIVIAL_SHARE);
  const f = c * d * e;
  const { answer, steps } = superSteps({ a, b, k, exponent: f, exponentLabel: 'f' });

  const allSteps = [
    step('1. Compute cde, f', `${c} &middot; ${d} &middot; ${e} = <strong>${f}</strong>`),
    ...steps.map((s, i) => ({ ...s, title: `${i + 2}. ${s.title}` })),
  ];

  return {
    promptHtml: modHtml(tower(a, b, c, d, e), k),
    instruction: 'Evaluate',
    answerHint: `whole number, 0–${k - 1}`,
    canonicalText: String(answer),
    answer,
    params: { a, b, c, d, e, f, k },
    check: intCheck(answer),
    steps: [
      ...allSteps,
      step(
        'Reading the goal',
        `This trainer uses the manual's interpretation, ${escapeHtml('a^(b^cde)')} &mdash; so the top three numbers multiply, and only b needs to be coprime to &lambda;(${k}).`,
      ),
    ],
  };
}

export default {
  id: 'cycling-super-duper',
  name: 'Super Duper Cycling',
  family: 'cycling',
  form: 'a<sup>b<sup>c<sup>d<sup>e</sup></sup></sup></sup> mod k',
  blurb: 'A ridiculous-looking goal that is no harder than super cycling once cde collapses.',
  generate,
  reference: {
    overview:
      'Super duper cycling is an extension of super cycling. It requires color exponent, and creates a ridiculous looking goal but does not increase past the difficulty of super cycling. You can represent this goal in cubes by placing a number next to an exponent symbol, followed by 3 color exponents.',
    method: ['Compute cde, f.', 'Compute λ(k), n, and reduce b.', 'Compute b^f mod n, m.', 'Compute a^m mod k.'],
    note:
      'Your interpretation of this goal matters. You may read it as a^(bc^de) or a^(b^cde). If you choose bc^de, bc must be coprime to λ(k); if you choose b^cde, b must be coprime to λ(k). The manual — and this trainer — use b^cde.',
    examples: [
      {
        goal: '5^(7^9^9^8) mod 11',
        lines: ['9 · 9 · 8 = 648', 'λ(11) = 10, and 7 mod 10 = 7', '7^648 mod 10: λ(10) = 4, 648 mod 4 = 0, 7^0 = 1', '5^1 mod 11 = 5'],
        answer: '5^(7^9^9^8) mod 11 = 5',
      },
      {
        goal: '6^(7^9^9^9) mod 11',
        lines: [
          '9 · 9 · 9 = 729',
          'λ(11) = 10, and 7 mod 10 = 7',
          '7^729 mod 10: λ(10) = 4, 729 mod 4 = 1, 7^1 = 7',
          '6^7 mod 11 = 6^3 · 6^3 · 6 mod 11 = 7 · 7 · 6 mod 11 = 5 · 6 mod 11 = 8',
        ],
        answer: '6^(7^9^9^9) mod 11 = 8',
      },
    ],
  },
};
