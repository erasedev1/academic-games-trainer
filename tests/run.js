// Dependency-free verifier:  node tests/run.js
//
// Every generated problem is checked against an independent oracle (exact BigInt powers,
// divisor counts by trial division, the Ex-Girlfriend identities evaluated forwards), so a
// generator and its grader can never quietly agree on a wrong answer.

import {
  carmichael, crt, divisorCount, divisorCountBrute, factorize, gcd, lcmAll,
  modInverse, modPow, multiplicativeOrder, powerCycle, reduceExponent, totient,
} from '../js/lib/math.js';
import { parseAnswer } from '../js/lib/format.js';
import { createRng } from '../js/lib/rng.js';
import { TECHNIQUES } from '../js/techniques/index.js';
import { BASES, exponentFor } from '../js/techniques/eg-bases.js';
import { reachableBases, REACH_BASES } from '../js/techniques/eg-reach.js';
import { DIFFICULTIES, DIGITS, MODULI, WIDE_DIGITS } from '../js/techniques/shared.js';
import { applyResult, levelChangeText, levelOf, levelProgress, START_LEVEL } from '../js/levels.js';
import { SUPER_MODULI } from '../js/techniques/cycling-super.js';
import { VIABLE_PAIRS } from '../js/techniques/cycling-alain.js';
import {
  createWeakPicker, focusTechniques, hasEnoughData, MIN_SAMPLES,
  focusScores, scoreRecord, tagKey, techniqueScores, techniqueSpots, weakList, weakSpots,
} from '../js/weakness.js';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    return;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function equal(name, actual, expected) {
  check(name, actual === expected, `expected ${expected}, got ${actual}`);
}

// --- oracles ---------------------------------------------------------------

const bigModPow = (base, exp, mod) => Number(BigInt(base) ** BigInt(exp) % BigInt(mod));

/**
 * a^E mod k for a genuinely huge exact exponent, by square-and-multiply over BigInt.
 * Deliberately written without λ or any cycle reduction, so it cannot share a mistake
 * with the code under test.
 */
function towerModPow(base, exponent, mod) {
  let result = 1n;
  let b = BigInt(base) % BigInt(mod);
  let e = BigInt(exponent);
  const m = BigInt(mod);
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return Number(result);
}

/** x(10^n), exactly for small n and from the 2^n · 5^n factorization beyond it. */
function divisorCountOfPow10(n) {
  if (n <= 9) return divisorCount(10 ** n);
  return (n + 1) * (n + 1);
}

/** λ(n) from first principles: the smallest L with a^L ≡ 1 for every a coprime to n. */
function carmichaelBrute(n) {
  if (n === 1) return 1;
  const orders = [];
  for (let a = 1; a < n; a++) {
    if (gcd(a, n) !== 1) continue;
    orders.push(multiplicativeOrder(a, n));
  }
  return orders.length ? lcmAll(orders) : 1;
}

// --- math library ----------------------------------------------------------

console.log('math library');
for (let n = 1; n <= 2000; n++) {
  if (carmichael(n) !== carmichaelBrute(n)) {
    failures.push(`carmichael(${n}) = ${carmichael(n)}, brute force says ${carmichaelBrute(n)}`);
    break;
  }
}
passed++;
equal('λ(4) is 2, not the manual shortcut 1', carmichael(4), 2);
equal('λ(60)', carmichael(60), 4);
equal('λ(11)', carmichael(11), 10);
equal('λ(77)', carmichael(77), 30);
equal('λ(88)', carmichael(88), 10);
equal('λ(10)', carmichael(10), 4);
equal('λ(1)', carmichael(1), 1);

for (let n = 1; n <= 500; n++) {
  if (divisorCount(n) !== divisorCountBrute(n)) {
    failures.push(`divisorCount(${n}) disagrees with trial division`);
    break;
  }
  if (factorize(n).reduce((acc, { p, e }) => acc * p ** e, 1) !== n) {
    failures.push(`factorize(${n}) does not multiply back to ${n}`);
    break;
  }
}
passed += 2;

for (let n = 2; n <= 200; n++) {
  for (let a = 1; a < n; a++) {
    if (gcd(a, n) !== 1) continue;
    if ((a * modInverse(a, n)) % n !== 1) failures.push(`modInverse(${a}, ${n}) is wrong`);
    if (modPow(a, 7, n) !== bigModPow(a, 7, n)) failures.push(`modPow(${a}, 7, ${n}) is wrong`);
    // λ is a valid exponent-reduction modulus for every coprime a.
    if (modPow(a, carmichael(n), n) !== 1 % n) failures.push(`a^λ(n) ≠ 1 for a=${a}, n=${n}`);
  }
}
passed += 3;
equal('totient(36)', totient(36), 12);

// powerCycle + reduceExponent must reproduce modPow for every base, coprime or not.
for (let k = 2; k <= 60; k++) {
  for (let a = 0; a < k; a++) {
    const cycle = powerCycle(a, k);
    for (const b of [1, 2, 3, 7, 15, 40, 97, 250]) {
      const viaCycle = modPow(a, reduceExponent(b, cycle), k);
      if (viaCycle !== modPow(a, b, k)) {
        failures.push(`cycle reduction wrong for ${a}^${b} mod ${k}: ${viaCycle} vs ${modPow(a, b, k)}`);
      }
    }
  }
}
passed++;

equal('crt(1, 7, 4, 11)', crt(1, 7, 4, 11), 15);
equal('crt(7, 8, 6, 11)', crt(7, 8, 6, 11), 39);

// --- answer parsing --------------------------------------------------------

console.log('answer parsing');
equal('parse "48"', parseAnswer('48').kind, 'int');
equal('parse " 48 / 7 "', parseAnswer(' 48 / 7 ').num, 48);
equal('parse "48/7" denominator', parseAnswer('48/7').den, 7);
equal('parse "abc"', parseAnswer('abc').kind, 'invalid');
equal('parse "5/0"', parseAnswer('5/0').kind, 'invalid');
equal('parse ""', parseAnswer('').kind, 'invalid');

// --- the manual's own worked examples --------------------------------------

console.log("the manual's worked examples");
equal('5^27 mod 11', modPow(5, 27, 11), 3);
equal('5^89 mod 10', modPow(5, 89, 10), 5);
equal('7^93 mod 11', modPow(7, 93, 11), 2);
equal('3^85 mod 7', modPow(3, 85, 7), 3);
equal('(5^32)/7 mod 11 numerator', modPow(5, 32, 77), 25);
equal('(5^63)/7 mod 11 numerator', modPow(5, 63, 77), 48);
equal('(6^28)/7 mod 11 numerator', modPow(6, 28, 77), 15);
equal('(7^27)/8 mod 11 numerator', modPow(7, 27, 88), 39);
equal('5^(7^48) mod 11', modPow(5, modPow(7, 48, carmichael(11)), 11), 5);
equal('3^(11^8) mod 7', modPow(3, modPow(11, 8, carmichael(7)), 7), 3);
equal('5^(7^648) mod 11', modPow(5, modPow(7, 648, carmichael(11)), 11), 5);
equal('6^(7^729) mod 11', modPow(6, modPow(7, 729, carmichael(11)), 11), 8);
equal('x(24)', divisorCount(24), 8);
equal('x(120)', divisorCount(120), 16);
equal('First EG: 25 -> 10^4', divisorCount(10 ** 4), 25);
equal('First EG: 100 -> 10^9', divisorCount(10 ** 9), 100);
equal('Improved EG: √(x(10^12)) = 13', Math.sqrt(divisorCount(10 ** 12)), 13);
equal('Second EG: xx(10^(3^1 - 1)) = 3', divisorCount(divisorCount(10 ** (3 ** 1 - 1))), 3);

// The identity x(10^n) = (n+1)^2 underpins the whole Ex-Girlfriend family. Check it
// exactly — by actually factorizing — for every n small enough to be representable.
for (let n = 0; n <= 9; n++) {
  equal(`x(10^${n}) = (${n}+1)^2`, divisorCount(10 ** n), (n + 1) ** 2);
}

// Third EG reaches 10^(p^m − 1), far past any representable number, so walk the chain
// symbolically: 10^E factorizes as 2^E · 5^E, so x = (E+1)^2 = p^2m, then x(p^2m) = 2m+1,
// and x(2m+1) = c exactly when 2m+1 = p^(c−1).
for (const [p, c] of [[3, 2], [3, 3], [5, 3], [7, 4], [3, 5]]) {
  const m = (p ** (c - 1) - 1) / 2;
  equal(`Third EG p=${p}, c=${c}: 2m+1 = p^(c-1)`, 2 * m + 1, p ** (c - 1));
  equal(`Third EG p=${p}, c=${c}: x(p^(c-1)) = c`, divisorCount(p ** (c - 1)), c);
}

// --- derived base 8/9/11 formulas ------------------------------------------

console.log('derived base 8, 9, 11 formulas');
for (const base of [8, 9, 11]) {
  for (let n = 0; n <= 12; n++) {
    const a = divisorCount(base ** n);
    equal(`x(${base}^${n}) matches ${BASES[base].multiplier}n + 1`, a, BASES[base].multiplier * n + 1);
    equal(`exponentFor(${base}, ${a}) inverts it`, exponentFor(base, a), n);
  }
}
for (const [base, a] of [[8, 6], [8, 3], [9, 8], [9, 12]]) {
  check(`x(${base}^n) = ${a} is correctly impossible`, exponentFor(base, a) === null);
}
for (let a = 1; a <= 40; a++) {
  equal(`base 11 reaches ${a}`, exponentFor(11, a), a - 1);
}

// --- what Equations can actually put on the board --------------------------

console.log('realistic parameter pools');
check('moduli are exactly 6 through 11', MODULI.join(',') === '6,7,8,9,10,11', MODULI.join(','));
check('digits are 2 through 9', DIGITS.join(',') === '2,3,4,5,6,7,8,9', DIGITS.join(','));
check('super cycling keeps the moduli with a real inner step', SUPER_MODULI.join(',') === '7,9,10,11', SUPER_MODULI.join(','));
check('every super modulus has λ(λ(k)) > 1', SUPER_MODULI.every((k) => carmichael(carmichael(k)) > 1));
check('the moduli super cycling drops are the degenerate ones',
  MODULI.filter((k) => !SUPER_MODULI.includes(k)).every((k) => carmichael(carmichael(k)) === 1));
check('Alain has viable (c, k) pairs', VIABLE_PAIRS.length >= 10, `${VIABLE_PAIRS.length} pairs`);
for (const { c, k } of VIABLE_PAIRS) {
  if (!MODULI.includes(k) || !DIGITS.includes(c) || gcd(c, k) !== 1 || carmichael(c * k) < 10) {
    failures.push(`Alain pair c=${c}, k=${k} should not be viable`);
  }
}
passed++;
// The λ drill should ask about the moduli and the ck products, and nothing else.
const lambdaTechnique = TECHNIQUES.find((t) => t.id === 'lambda-value');
const legalLambdaArgs = new Set([
  ...MODULI,
  ...DIGITS.flatMap((c) => MODULI.filter((k) => gcd(c, k) === 1).map((k) => c * k)),
]);
{
  const rng = createRng(5150);
  for (let i = 0; i < 300; i++) {
    const { k } = lambdaTechnique.generate('hard', rng).params;
    if (!legalLambdaArgs.has(k)) {
      failures.push(`λ drill asked for λ(${k}), which no real goal produces`);
      break;
    }
  }
}
passed++;

// A tower that reduces to 1 leaves the answer as plain a. It is a real case — one of the
// manual's own two super duper examples is exactly that — but if it were most of them the
// drill would just teach "answer is a". cde is a product of three digits and so is almost
// always even, which is what made this the default before the generators controlled for it.
for (const id of ['cycling-super', 'cycling-super-duper']) {
  const technique = TECHNIQUES.find((t) => t.id === id);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const rng = createRng(77);
    let collapsed = 0;
    for (let i = 0; i < 400; i++) {
      const problem = technique.generate(difficulty, rng);
      if (problem.answer === problem.params.a % problem.params.k) collapsed++;
    }
    check(`${id}/${difficulty} does not collapse to a most of the time`,
      collapsed / 400 < 0.5, `${Math.round((collapsed / 400) * 100)}% collapsed`);
  }
}

// --- which bases reach which targets ---------------------------------------
//
// The drill decides reachability from a rule per base (a ≡ 1 mod 3, a odd, a square,
// always). Check those rules the long way instead: actually count the divisors of B^n for
// every n that could produce the target, and see whether the target ever turns up.

console.log('reachable bases');
for (const { base } of REACH_BASES) {
  // Every x(B^n) that can be computed exactly. B^n is a prime power (or 2^n·5^n for 10),
  // so trial division finds its factors immediately however large it is — the only limit
  // is the safe integer range, past which B^n itself is no longer the number we mean.
  const counted = new Set();
  for (let n = 0; base ** n <= Number.MAX_SAFE_INTEGER; n++) counted.add(divisorCount(base ** n));
  // x(B^n) increases with n, so below the largest value found, membership is definitive.
  const certainTo = Math.max(...counted);
  let mismatch = null;
  for (let a = 2; a <= certainTo && !mismatch; a++) {
    if (counted.has(a) !== reachableBases(a).includes(base)) {
      mismatch = `base ${base}, target ${a}: rule says ${reachableBases(a).includes(base)}, counting says ${counted.has(a)}`;
    }
  }
  check(`base ${base}'s rule matches counted divisors up to ${certainTo}`, !mismatch, mismatch ?? '');
}
check('base 11 reaches everything', Array.from({ length: 60 }, (_, i) => i + 2).every((a) => reachableBases(a).includes(11)));
check('base 10 reaches only squares',
  Array.from({ length: 60 }, (_, i) => i + 2).every((a) => reachableBases(a).includes(10) === Number.isInteger(Math.sqrt(a))));

// --- per-technique verification --------------------------------------------

const oracles = {
  'cycling-regular': ({ a, b, k }) => bigModPow(a, b, k),
  'lambda-value': ({ k }) => carmichaelBrute(k),
  'cycling-special': ({ a, b, ck }) => bigModPow(a, b, ck),
  'cycling-super': ({ a, b, c, k }) => towerModPow(a, BigInt(b) ** BigInt(c), k),
  'cycling-super-duper': ({ a, b, f, k }) => towerModPow(a, BigInt(b) ** BigInt(f), k),
  'cycling-alain': ({ a, b, ck }) => bigModPow(a, b, ck),
  'factors-main': ({ n }) => divisorCountBrute(n),
  // 10^n leaves the safe integer range fast, so past that point the oracle uses the
  // factorization of 10^n = 2^n · 5^n directly. The identity itself is checked exactly above.
  'eg-first': ({ n, a, direction }) =>
    (direction === 'forward' ? divisorCountOfPow10(n) : Math.sqrt(a) - 1),
  'eg-second': ({ b, m, direction }) => (direction === 'forward' ? 2 * m + 1 : (b - 1) / 2),
  'eg-third': ({ p, c }) => (p ** (c - 1) - 1) / 2,
  'eg-improved': ({ b, n, direction }) =>
    (direction === 'forward' ? Math.sqrt(divisorCountOfPow10(n)) : b - 1),
  'eg-bases': ({ base, a }) => exponentFor(base, a),
  'eg-reach': ({ a }) => reachableBases(a),
};

/** Answers are usually numbers, but a set-valued one has to be compared as a set. */
const sameAnswer = (actual, expected) =>
  Array.isArray(actual) || Array.isArray(expected)
    ? JSON.stringify(actual) === JSON.stringify(expected)
    : actual === expected;

/**
 * Realism constraints, checked on every generated problem. In Equations the modulus is
 * built from cubes, so a cycling goal can only ever be mod 6 through 11. The other numerals
 * are built from cubes too: one digit each, or two for the wider values, which cost an
 * extra cube and so belong to the harder bands.
 */
const NUMERALS = [...DIGITS, ...WIDE_DIGITS];
const realism = {
  'cycling-regular': ({ a, k }) => MODULI.includes(k) && NUMERALS.includes(a),
  'cycling-special': ({ a, c, k }) => MODULI.includes(k) && NUMERALS.includes(a) && DIGITS.includes(c),
  'cycling-super': ({ a, k }) => MODULI.includes(k) && NUMERALS.includes(a),
  'cycling-super-duper': ({ a, c, d, e, k }) =>
    MODULI.includes(k) && NUMERALS.includes(a) && [c, d, e].every((v) => v >= 2 && v <= 9),
  'cycling-alain': ({ a, c, k }) => MODULI.includes(k) && NUMERALS.includes(a) && DIGITS.includes(c),
};

// Two-digit numerals are a harder-band thing, not the default: easy must stay single digit.
for (const id of ['cycling-regular', 'cycling-special', 'cycling-super', 'cycling-super-duper']) {
  const technique = TECHNIQUES.find((t) => t.id === id);
  const rng = createRng(606);
  let wideOnEasy = 0;
  for (let i = 0; i < 300; i++) if (technique.generate('easy', rng).params.a > 9) wideOnEasy++;
  equal(`${id} keeps easy to single-digit numerals`, wideOnEasy, 0);
}

/** Preconditions each generator promises to honour. */
const invariants = {
  'cycling-special': ({ a, c, k }) => gcd(a, c * k) === 1 && gcd(c, k) === 1,
  'cycling-super': ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
  'cycling-super-duper': ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
  // Alain's whole point: the reduced exponent leaves a power far too big to expand.
  'cycling-alain': ({ a, b, c, k }) =>
    gcd(a, c * k) === 1 && gcd(c, k) === 1 && a ** (b % carmichael(c * k)) > 1e5,
  'eg-first': ({ a }) => Number.isInteger(Math.sqrt(a)),
  'eg-second': ({ b }) => b % 2 === 1,
  'eg-third': ({ p, c }) => p % 2 === 1 && c >= 2,
  // Base 11 reaches every integer, so a reachable-bases answer is never empty.
  'eg-reach': ({ a }) => a >= 2 && reachableBases(a).includes(11),
};

console.log('technique generators (200 problems × 3 difficulties each)');
for (const technique of TECHNIQUES) {
  const oracle = oracles[technique.id];
  check(`${technique.id} has an oracle`, Boolean(oracle));
  if (!oracle) continue;

  for (const difficulty of ['easy', 'medium', 'hard']) {
    const rng = createRng(0xa17ec0de);
    let problems = 0;
    for (let i = 0; i < 200; i++) {
      let problem;
      try {
        problem = technique.generate(difficulty, rng);
      } catch (err) {
        failures.push(`${technique.id}/${difficulty} threw: ${err.message}`);
        break;
      }
      problems++;

      const expected = oracle(problem.params);
      if (!sameAnswer(problem.answer, expected)) {
        failures.push(`${technique.id}/${difficulty}: answer ${problem.answer} but oracle says ${expected} for ${JSON.stringify(problem.params)}`);
        break;
      }
      if (invariants[technique.id] && !invariants[technique.id](problem.params)) {
        failures.push(`${technique.id}/${difficulty}: broke its own preconditions with ${JSON.stringify(problem.params)}`);
        break;
      }
      if (realism[technique.id] && !realism[technique.id](problem.params)) {
        failures.push(`${technique.id}/${difficulty}: unrealistic parameters ${JSON.stringify(problem.params)}`);
        break;
      }
      // The canonical answer must be accepted, and an off-by-one must not be.
      if (!problem.check(problem.canonicalText).correct) {
        failures.push(`${technique.id}/${difficulty}: rejected its own canonical answer "${problem.canonicalText}"`);
        break;
      }
      // A near miss for a set is the same set with one member dropped, or an extra added
      // when there is only one; for a number it is one off.
      const nearMiss = Array.isArray(problem.answer)
        ? (problem.answer.length > 1 ? problem.answer.slice(1) : [...problem.answer, 8]).join(',')
        : problem.answer === null ? '0' : String(problem.answer + 1);
      if (problem.check(nearMiss).correct && !(problem.params.ck && (problem.answer + 1) % problem.params.ck === problem.answer)) {
        failures.push(`${technique.id}/${difficulty}: accepted the near miss "${nearMiss}"`);
        break;
      }
      if (!problem.promptHtml || !problem.instruction || !problem.canonicalText) {
        failures.push(`${technique.id}/${difficulty}: incomplete problem`);
        break;
      }
      // A worked solution has to exist, be readable, and end by stating the answer —
      // a walkthrough that trails off before the result is worse than none.
      const steps = problem.steps ?? [];
      if (!steps.length || steps.some((s) => !s.title || !s.lines.length)) {
        failures.push(`${technique.id}/${difficulty}: missing or empty solution steps`);
        break;
      }
      const walkthrough = steps.flatMap((s) => [s.title, ...s.lines]).join(' ');
      if (/undefined|NaN|\[object/.test(walkthrough)) {
        failures.push(`${technique.id}/${difficulty}: broken solution text — ${walkthrough.slice(0, 120)}`);
        break;
      }
      const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ');
      const finalAnswer = problem.answer === null
        ? 'Not representable'
        : Array.isArray(problem.answer) ? problem.answer.join(', ') : String(problem.answer);
      if (!steps.some((s) => s.lines.some((line) => plain(line).includes(finalAnswer)))) {
        failures.push(`${technique.id}/${difficulty}: the solution never states the answer ${finalAnswer}`);
        break;
      }
      // Fraction answers: every congruent numerator is a correct representation.
      if (problem.params.ck) {
        const alt = problem.answer + problem.params.ck;
        if (!problem.check(`${alt}/${problem.params.c}`).correct) {
          failures.push(`${technique.id}/${difficulty}: rejected the congruent numerator ${alt}`);
          break;
        }
        if (problem.check(`${problem.answer}/${problem.params.c + 1}`).correct) {
          failures.push(`${technique.id}/${difficulty}: accepted a wrong denominator`);
          break;
        }
      }
    }
    check(`${technique.id}/${difficulty} generated 200 problems`, problems === 200, `stopped at ${problems}`);
  }
}

// A seeded run must be reproducible, which is what makes a session shareable.
const seededA = TECHNIQUES[0].generate('medium', createRng(1234));
const seededB = TECHNIQUES[0].generate('medium', createRng(1234));
check('the same seed produces the same problem', seededA.promptHtml === seededB.promptHtml);

// --- lambda always works ---------------------------------------------------
//
// Every cycling goal has to be solvable by lambda cycling, which means the coprimality
// each method needs must hold on every problem generated. The gcd conditions are checked,
// and then the lambda route is actually walked and required to land on the same answer the
// independent oracle above already confirmed.

console.log('lambda solves every cycling goal');

const lambdaRoutes = {
  'cycling-regular': {
    coprime: ({ a, k }) => gcd(a, k) === 1,
    viaLambda: ({ a, b, k }) => modPow(a, b % carmichael(k), k),
    answerOf: (problem) => problem.answer,
  },
  'cycling-special': {
    coprime: ({ a, c, k }) => gcd(a, c * k) === 1 && gcd(c, k) === 1,
    viaLambda: ({ a, b, ck }) => modPow(a, b % carmichael(ck), ck),
    answerOf: (problem) => problem.answer,
  },
  'cycling-alain': {
    coprime: ({ a, c, k }) => gcd(a, c * k) === 1 && gcd(c, k) === 1,
    viaLambda: ({ a, b, ck }) => modPow(a, b % carmichael(ck), ck),
    answerOf: (problem) => problem.answer,
  },
  'cycling-super': {
    // The tower needs a second layer of reduction, so b must be coprime to λ(k) too.
    coprime: ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
    viaLambda: ({ a, b, c, k }) => modPow(a, modPow(b, c, carmichael(k)), k),
    answerOf: (problem) => problem.answer,
  },
  'cycling-super-duper': {
    coprime: ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
    viaLambda: ({ a, b, f, k }) => modPow(a, modPow(b, f, carmichael(k)), k),
    answerOf: (problem) => problem.answer,
  },
};

for (const [id, route] of Object.entries(lambdaRoutes)) {
  const technique = TECHNIQUES.find((t) => t.id === id);
  let checked = 0;
  let broke = null;
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const rng = createRng(31415);
    for (let i = 0; i < 300 && !broke; i++) {
      const problem = technique.generate(difficulty, rng);
      checked++;
      if (!route.coprime(problem.params)) {
        broke = `not coprime: ${JSON.stringify(problem.params)}`;
      } else if (route.viaLambda(problem.params) !== route.answerOf(problem)) {
        broke = `lambda gave ${route.viaLambda(problem.params)}, answer is ${route.answerOf(problem)} for ${JSON.stringify(problem.params)}`;
      }
    }
  }
  check(`${id}: lambda solves all ${checked}`, !broke, broke ?? '');
}

// The lambda drill's own arguments have to be the ones those routes actually need.
check('every modulus has a usable λ', MODULI.every((k) => carmichael(k) >= 1));

// --- weak-point analysis ---------------------------------------------------

console.log('weak-point analysis');

// Tag keys are concatenated with the technique id using "|", so a key containing one
// would silently merge two different weaknesses into a single record.
for (const technique of TECHNIQUES) {
  const rng = createRng(4242);
  const keys = new Set();
  for (let i = 0; i < 120; i++) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const problem = technique.generate(difficulty, rng);
      if (!problem.tags?.length) {
        failures.push(`${technique.id} generated a problem with no tags`);
        break;
      }
      for (const { key, label } of problem.tags) {
        if (typeof key !== 'string' || key.includes('|') || !key) failures.push(`${technique.id} has a bad tag key ${key}`);
        if (typeof label !== 'string' || !label) failures.push(`${technique.id} tag ${key} has no label`);
        keys.add(key);
      }
    }
  }
  // Tags only become useful once answered a few times, so the set has to stay small
  // enough that ordinary use actually fills it in.
  check(`${technique.id} keeps its tag count workable`, keys.size <= 60, `${keys.size} tags`);
}

const fastAndRight = { attempts: 20, correct: 20, times: Array(20).fill(2000) };
const missedOften = { attempts: 20, correct: 8, times: Array(8).fill(2000) };
const slowButRight = { attempts: 20, correct: 20, times: Array(20).fill(8000) };
const oneMissOfOne = { attempts: 1, correct: 0, times: [] };

check('a fast, accurate record scores low', scoreRecord(fastAndRight, 2000) < 0.15);
check('missing often outranks an untested tag', scoreRecord(missedOften, 2000) > scoreRecord(undefined, 2000));
// Slow-but-accurate is a real weakness, but missing most of them is a worse one.
check('slow but accurate scores in between',
  scoreRecord(slowButRight, 2000) > scoreRecord(fastAndRight, 2000) &&
  scoreRecord(slowButRight, 2000) < scoreRecord(missedOften, 2000));
check('one miss out of one is damped, not damning', scoreRecord(oneMissOfOne, 2000) < scoreRecord(missedOften, 2000));
check('an unseen record sits mid-pack', scoreRecord(undefined, 2000) > scoreRecord(fastAndRight, 2000));
check('speed is judged against your own pace, not the clock',
  Math.abs(scoreRecord(slowButRight, 8000) - scoreRecord(fastAndRight, 2000)) < 1e-9);

/** A synthetic history: solid at mod 7, shaky at mod 11. */
function historyWith(weakTag) {
  return {
    version: 1,
    techniques: {
      'cycling-regular:medium': { attempts: 40, correct: 36, times: Array(20).fill(3000), best: 2000, streak: 0, longestStreak: 5 },
    },
    tags: {
      [tagKey('cycling-regular', 'k:7')]: { label: 'mod 7', attempts: 20, correct: 20, times: Array(20).fill(2200), best: 2000 },
      [tagKey('cycling-regular', weakTag)]: { label: 'mod 11', attempts: 20, correct: 11, times: Array(11).fill(7000), best: 6000 },
      [tagKey('cycling-regular', 'k:9')]: { label: 'mod 9', attempts: 2, correct: 1, times: [3000], best: 3000 },
    },
    sessions: [],
  };
}

const history = historyWith('k:11');
const spots = weakSpots(history);
equal('the weakest tag ranks first', spots[0].label, 'mod 11');
check('an under-measured tag is left out', !spots.some((s) => s.label === 'mod 9'), `${spots.map((s) => s.label)}`);
// mod 7 is measured, accurate and on pace, so it is not a weak spot at all.
equal('a solid tag is not listed as a weakness', spots.length, 1);
check('and nothing solid sneaks in', spots.every((spot) => spot.score >= 0.15));
check('the weak spot carries its slowdown', spots[0].slowdown > 2);
check('hasEnoughData sees the history', hasEnoughData(history));
check('hasEnoughData rejects an empty history',
  !hasEnoughData({ version: 1, techniques: {}, tags: {}, sessions: [] }));

// A first session spreads a handful of answers over many tags, so none of them is
// measurable yet. The panel has to fall back to whole techniques rather than go blank.
{
  const firstSession = {
    version: 1,
    techniques: {
      // Two timed solves out of eight attempts: not enough to call it a pace.
      'cycling-regular:medium': { attempts: 8, correct: 2, times: [4000, 5000], best: 4000, streak: 0, longestStreak: 1 },
    },
    tags: {
      [tagKey('cycling-regular', 'k:7')]: { label: 'mod 7', attempts: 2, correct: 1, times: [4000] },
      [tagKey('cycling-regular', 'k:11')]: { label: 'mod 11', attempts: 2, correct: 0, times: [] },
    },
    sessions: [],
  };
  equal('no tag is measurable after one short session', weakSpots(firstSession).length, 0);
  check('but the technique itself is', techniqueSpots(firstSession).length > 0);
  const list = weakList(firstSession);
  check('so the panel still has something to show', list.length > 0);
  equal('and it is technique-level', list[0].kind, 'technique');
  equal('naming the technique', list[0].label, 'Regular Cycling');
  check('a pace is not claimed off one or two solves', list[0].slowdown === null);
  check('hasEnoughData accepts a first session', hasEnoughData(firstSession));
}

// Being good at everything must produce an empty list rather than a bogus ranking.
{
  const strong = {
    version: 1,
    techniques: { 'cycling-regular:medium': { attempts: 40, correct: 40, times: Array(20).fill(2000), best: 1800, streak: 40, longestStreak: 40 } },
    tags: Object.fromEntries([6, 7, 8, 9, 10, 11].map((k) => [
      tagKey('cycling-regular', `k:${k}`),
      { label: `mod ${k}`, attempts: 10, correct: 10, times: Array(10).fill(2000), best: 1800 },
    ])),
    sessions: [],
  };
  equal('a strong record yields no weak spots', weakList(strong).length, 0);
  check('and the panel stays hidden', !hasEnoughData(strong));
}

// Once tags are measured they lead, and the technique they belong to is not repeated.
{
  const list = weakList(history, { limit: 5 });
  equal('measured tags lead the list', list[0].kind, 'tag');
  check('the tag technique is not also listed whole',
    !list.some((spot) => spot.kind === 'technique' && spot.techniqueId === 'cycling-regular'));
}

// The picker has to actually steer. With mod 11 planted as the weakness, it should show
// up far more than the 1-in-6 an even draw would give.
{
  const technique = TECHNIQUES.find((t) => t.id === 'cycling-regular');
  const picker = createWeakPicker(history, [technique]);
  const rng = createRng(2718);
  let weak = 0;
  const runs = 300;
  for (let i = 0; i < runs; i++) {
    if (picker.pickProblem(technique, 'medium', rng).params.k === 11) weak++;
  }
  // Both ends of this matter. Too low and the session is not really targeted; too high
  // and it is the same problem twenty times while everything else goes stale.
  const share = weak / runs;
  check('the picker steers at the weak modulus', share > 0.4, `only ${Math.round(share * 100)}% were mod 11`);
  check('but does not drill it to the exclusion of everything else',
    share < 0.8, `${Math.round(share * 100)}% were mod 11`);

  // And an even draw really is about 1 in 6, so the bias above is the picker's doing.
  const evenRng = createRng(2718);
  let even = 0;
  for (let i = 0; i < runs; i++) if (technique.generate('medium', evenRng).params.k === 11) even++;
  check('an unsteered draw is near even', even / runs < 0.3, `${Math.round((even / runs) * 100)}% were mod 11`);
}

// A technique you are broadly good at but have one terrible number in must still be
// picked — this is exactly the case plain technique-level scoring misses.
{
  const plain = techniqueScores(history);
  const focus = focusScores(history);
  check('plain technique scoring calls regular cycling strong', plain.get('cycling-regular') < 0.2);
  check('focus scoring inherits its worst measured tag', focus.get('cycling-regular') > 0.5);
  check('so it outranks a technique never tried', focus.get('cycling-regular') > focus.get('eg-first'));
  equal('and leads the focus list', focusTechniques(history, { count: 3 })[0].id, 'cycling-regular');
}

// A technique never attempted should still be offered, so a weak session covers new ground.
{
  const scores = techniqueScores(history);
  check('an untried technique outranks a strong one',
    scores.get('eg-first') > scores.get('cycling-regular'));
  equal('focus returns the requested number of techniques', focusTechniques(history, { count: 3 }).length, 3);
}

// --- adaptive difficulty ---------------------------------------------------

console.log('adaptive difficulty');

/** Feeds a run of results in at whatever level the technique currently sits at. */
function play(entry, results, atLevel = null) {
  const moves = [];
  let current = entry;
  for (const correct of results) {
    const outcome = applyResult(current, atLevel ?? current.level, correct);
    if (outcome.changed) moves.push({ to: outcome.entry.level, direction: outcome.changed });
    current = outcome.entry;
  }
  return { entry: current, moves };
}

const fresh = { level: START_LEVEL, recent: [] };
equal('a technique starts in the middle', START_LEVEL, 'medium');
equal('an unseen technique reads as the start level', levelOf({}, 'cycling-regular'), 'medium');

// Not enough evidence yet: five perfect answers must not move anything.
{
  const { entry, moves } = play(fresh, [1, 1, 1, 1, 1]);
  equal('five right is not yet enough to promote', moves.length, 0);
  equal('and the level holds', entry.level, 'medium');
  equal('but the window is filling', entry.attempts ?? entry.recent.length, 5);
}

// Six clean answers is enough.
{
  const { entry, moves } = play(fresh, [1, 1, 1, 1, 1, 1]);
  equal('six right promotes', moves.length, 1);
  equal('to hard', entry.level, 'hard');
  equal('and the window is cleared for the new level', entry.recent.length, 0);
}

// Struggling drops you back.
{
  const { entry, moves } = play(fresh, [0, 0, 0, 1, 0, 0]);
  equal('mostly wrong demotes', moves.length, 1);
  equal('to easy', entry.level, 'easy');
  equal('moving down, not up', moves[0].direction, 'down');
}

// The middle band holds steady — this is most of the time, and it must not oscillate.
{
  const { moves } = play(fresh, [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0]);
  equal('a middling run leaves the level alone', moves.length, 0);
}

// Ceiling and floor.
{
  const atHard = play({ level: 'hard', recent: [] }, [1, 1, 1, 1, 1, 1, 1, 1]);
  equal('hard is the ceiling', atHard.entry.level, 'hard');
  equal('and no move is reported', atHard.moves.length, 0);
  const atEasy = play({ level: 'easy', recent: [] }, [0, 0, 0, 0, 0, 0, 0, 0]);
  equal('easy is the floor', atEasy.entry.level, 'easy');
  equal('and no move is reported there either', atEasy.moves.length, 0);
}

// Results at some other level are real evidence about that level, but say nothing about
// whether the pointer should move from where it is.
{
  const { entry, moves } = play(fresh, [1, 1, 1, 1, 1, 1, 1, 1], 'easy');
  equal('acing easy does not move a pointer sitting at medium', moves.length, 0);
  equal('and the window stays empty', entry.recent.length, 0);
}

// A full climb and a full fall, so the whole ladder is exercised.
{
  const climb = play({ level: 'easy', recent: [] }, Array(12).fill(1));
  equal('a clean run climbs easy to hard', climb.entry.level, 'hard');
  equal('in two moves', climb.moves.length, 2);
  const fall = play({ level: 'hard', recent: [] }, Array(12).fill(0));
  equal('a bad run falls hard to easy', fall.entry.level, 'easy');
  equal('in two moves', fall.moves.length, 2);
}

// The promote and demote bands must not overlap, or a window could argue for both and the
// level would depend on evaluation order. Walk every possible ten-result window.
{
  let overlap = 0;
  const outcomes = [];
  for (let correct = 0; correct <= 10; correct++) {
    const window = [...Array(correct).fill(1), ...Array(10 - correct).fill(0)];
    // Nine in the window, then the tenth arrives and the decision is made.
    const { entry, changed } = applyResult({ level: 'medium', recent: window.slice(0, 9) }, 'medium', window[9]);
    outcomes.push({ correct, changed, level: entry.level });
    if (changed === 'up' && correct / 10 < 0.85) overlap++;
    if (changed === 'down' && correct / 10 > 0.55) overlap++;
  }
  equal('no window both promotes and demotes', overlap, 0);
  const promoting = outcomes.filter((o) => o.changed === 'up').map((o) => o.correct);
  const demoting = outcomes.filter((o) => o.changed === 'down').map((o) => o.correct);
  const holding = outcomes.filter((o) => !o.changed).map((o) => o.correct);
  check('only near-perfect windows promote', promoting.every((c) => c >= 9), `promoted at ${promoting}`);
  check('only bad windows demote', demoting.every((c) => c <= 5), `demoted at ${demoting}`);
  check('there is a band in between where nothing moves', holding.length >= 3, `held at ${holding}`);
  check('promotion is stricter than demotion',
    Math.min(...promoting) / 10 - 0.5 > 0.5 - Math.max(...demoting) / 10 - 0.0001);
}

// levelProgress drives the stats page, so it has to describe a fresh technique sanely.
{
  const progress = levelProgress({}, 'cycling-regular');
  equal('a fresh technique reports the start level', progress.level, 'medium');
  equal('with nothing measured', progress.attempts, 0);
  equal('and says how many are needed', progress.needed, 6);
  check('it can move either way from the middle', progress.canPromote && progress.canDemote);
  const atHard = levelProgress({ x: { level: 'hard', recent: [1] } }, 'x');
  check('hard cannot promote further', !atHard.canPromote && atHard.canDemote);
}

check('a level move reads as a sentence',
  levelChangeText('Alain Cycling', 'up', 'hard') === 'Alain Cycling moved up to hard');

// Every level the ladder can produce must be a level the generators accept.
for (const level of DIFFICULTIES) {
  for (const technique of TECHNIQUES) {
    const problem = technique.generate(level, createRng(8));
    check(`${technique.id} generates at ${level}`, Boolean(problem?.promptHtml));
  }
}

// --- report ----------------------------------------------------------------

console.log('');
if (failures.length) {
  console.error(`FAILED — ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 25)) console.error(`  • ${failure}`);
  if (failures.length > 25) console.error(`  … and ${failures.length - 25} more`);
  process.exit(1);
}
console.log(`All checks passed (${passed} assertions).`);
