// 5. Super Duper Cycling — a^(b^c^d^e) mod k, read as a^(b^(c·d·e)).

import { carmichael, gcd } from '../lib/math.js';
import { escapeHtml, mod as modHtml, tower } from '../lib/format.js';
import { byDifficulty, intCheck, step } from './shared.js';
import { superSteps } from './cycling-super.js';

const CONFIG = {
  easy: { k: [5, 11], b: [3, 11], cde: [2, 6] },
  medium: { k: [5, 13], b: [3, 17], cde: [2, 9] },
  hard: { k: [7, 19], b: [3, 25], cde: [4, 9] },
};

export function generate(difficulty, rng) {
  const cfg = byDifficulty(CONFIG, difficulty);
  const { a, b, k } = rng.until(
    () => {
      const k = rng.int(cfg.k[0], cfg.k[1]);
      return { a: rng.int(2, Math.max(2, k - 1)), b: rng.int(cfg.b[0], cfg.b[1]), k };
    },
    ({ a, b, k }) => {
      if (k <= 3 || a % k <= 1) return false;
      const n = carmichael(k);
      return n > 1 && gcd(a, k) === 1 && gcd(b, n) === 1 && b % n !== 0 && carmichael(n) > 1;
    },
  );
  const c = rng.int(cfg.cde[0], cfg.cde[1]);
  const d = rng.int(cfg.cde[0], cfg.cde[1]);
  const e = rng.int(cfg.cde[0], cfg.cde[1]);
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
