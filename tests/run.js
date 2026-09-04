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
import { DRILLS, getDrill, TECHNIQUES } from '../js/techniques/index.js';
import { BASES, exponentFor } from '../js/techniques/eg-bases.js';
import { DIGITS, MODULI } from '../js/techniques/shared.js';
import { SUPER_MODULI } from '../js/techniques/cycling-super.js';
import { VIABLE_PAIRS } from '../js/techniques/cycling-alain.js';

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

console.log('the drill roster');
check('lambda cycling is documented but not drillable', TECHNIQUES.some((t) => t.id === 'cycling-lambda'));
check('lambda cycling cannot be started as a drill', getDrill('cycling-lambda') === null);
check('nothing else was removed from the picker',
  TECHNIQUES.length - DRILLS.length === 1, `${TECHNIQUES.length - DRILLS.length} removed`);
check('every drill is reachable by id', DRILLS.every((t) => getDrill(t.id) === t));
// A reference-only technique still needs its reference content, and its generator is still
// tested below — so re-enabling it is a one-line change, not a repair job.
for (const technique of TECHNIQUES) {
  check(`${technique.id} has reference content`,
    Boolean(technique.reference?.overview && technique.reference?.method?.length && technique.reference?.examples?.length));
}

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

// --- per-technique verification --------------------------------------------

const oracles = {
  'cycling-regular': ({ a, b, k }) => bigModPow(a, b, k),
  'lambda-value': ({ k }) => carmichaelBrute(k),
  'cycling-lambda': ({ a, b, k }) => bigModPow(a, b, k),
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
};

/**
 * Realism constraints, checked on every generated problem: in Equations the modulus is
 * built from cubes, so a cycling goal can only ever be mod 6 through 11, and a, c and the
 * colour exponents come off single digit cubes.
 */
const realism = {
  'cycling-regular': ({ a, k }) => MODULI.includes(k) && DIGITS.includes(a),
  'cycling-lambda': ({ a, k }) => MODULI.includes(k) && DIGITS.includes(a),
  'cycling-special': ({ a, c, k }) => MODULI.includes(k) && DIGITS.includes(a) && DIGITS.includes(c),
  'cycling-super': ({ a, k }) => MODULI.includes(k) && DIGITS.includes(a),
  'cycling-super-duper': ({ a, c, d, e, k }) =>
    MODULI.includes(k) && DIGITS.includes(a) && [c, d, e].every((v) => v >= 2 && v <= 9),
  'cycling-alain': ({ a, c, k }) => MODULI.includes(k) && DIGITS.includes(a) && DIGITS.includes(c),
};

/** Preconditions each generator promises to honour. */
const invariants = {
  'cycling-lambda': ({ a, k }) => gcd(a, k) === 1,
  'cycling-special': ({ a, c, k }) => gcd(a, c * k) === 1 && gcd(c, k) === 1,
  'cycling-super': ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
  'cycling-super-duper': ({ a, b, k }) => gcd(a, k) === 1 && gcd(b, carmichael(k)) === 1,
  // Alain's whole point: the reduced exponent leaves a power far too big to expand.
  'cycling-alain': ({ a, b, c, k }) =>
    gcd(a, c * k) === 1 && gcd(c, k) === 1 && a ** (b % carmichael(c * k)) > 1e5,
  'eg-first': ({ a }) => Number.isInteger(Math.sqrt(a)),
  'eg-second': ({ b }) => b % 2 === 1,
  'eg-third': ({ p, c }) => p % 2 === 1 && c >= 2,
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
      if (problem.answer !== expected) {
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
      const nearMiss = problem.answer === null ? '0' : String(problem.answer + 1);
      if (problem.check(nearMiss).correct && !(problem.params.ck && (problem.answer + 1) % problem.params.ck === problem.answer)) {
        failures.push(`${technique.id}/${difficulty}: accepted the near miss "${nearMiss}"`);
        break;
      }
      if (!problem.promptHtml || !problem.steps?.length) {
        failures.push(`${technique.id}/${difficulty}: missing prompt or steps`);
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

// --- report ----------------------------------------------------------------

console.log('');
if (failures.length) {
  console.error(`FAILED — ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 25)) console.error(`  • ${failure}`);
  if (failures.length > 25) console.error(`  … and ${failures.length - 25} more`);
  process.exit(1);
}
console.log(`All checks passed (${passed} assertions).`);
