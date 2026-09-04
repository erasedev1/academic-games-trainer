// Number-theory helpers shared by every technique module.
// Pure ESM, no dependencies, importable from both the browser and Node.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a / gcd(a, b) * b);
}

export function lcmAll(values) {
  return values.reduce((acc, v) => lcm(acc, v), 1);
}

/** Prime factorization as an ordered array of { p, e }. */
export function factorize(n) {
  const out = [];
  let m = n;
  for (let d = 2; d * d <= m; d += d === 2 ? 1 : 2) {
    if (m % d) continue;
    let e = 0;
    while (m % d === 0) {
      m /= d;
      e++;
    }
    out.push({ p: d, e });
  }
  if (m > 1) out.push({ p: m, e: 1 });
  return out;
}

export function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

export function primesBelow(limit) {
  const sieve = new Uint8Array(limit + 1);
  const out = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) continue;
    out.push(i);
    for (let j = i * i; j <= limit; j += i) sieve[j] = 1;
  }
  return out;
}

/** λ(p^e) for a single prime power. */
export function carmichaelPrimePower(p, e) {
  if (p === 2) {
    // λ(2) = 1, λ(4) = 2, λ(2^e) = 2^(e-2) for e >= 3.
    // Note: the EQ manual's shortcut yields 1 here for e = 2; the true value is 2.
    if (e === 1) return 1;
    if (e === 2) return 2;
    return 2 ** (e - 2);
  }
  return (p - 1) * p ** (e - 1);
}

/** Carmichael function λ(n) — the exponent-reduction modulus used by lambda cycling. */
export function carmichael(n) {
  if (n <= 0) throw new RangeError(`carmichael expects a positive integer, got ${n}`);
  if (n === 1) return 1;
  return lcmAll(factorize(n).map(({ p, e }) => carmichaelPrimePower(p, e)));
}

/** Euler's totient, used to sanity-check generators. */
export function totient(n) {
  if (n === 1) return 1;
  return factorize(n).reduce((acc, { p, e }) => acc * (p - 1) * p ** (e - 1), 1);
}

/** (base ** exp) % mod, computed without ever forming the full power. */
export function modPow(base, exp, mod) {
  if (mod === 1) return 0;
  let result = 1;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

/** Same as modPow but exact for large operands, via BigInt. Used by the tests as an oracle. */
export function modPowBig(base, exp, mod) {
  return Number(BigInt(base) ** BigInt(exp) % BigInt(mod));
}

/** Modular inverse of a mod m, or null when gcd(a, m) !== 1. */
export function modInverse(a, m) {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1) return null;
  return ((old_s % m) + m) % m;
}

/**
 * Chinese remainder theorem for two coprime moduli.
 * Returns the unique x in [0, m1*m2) with x ≡ r1 (mod m1) and x ≡ r2 (mod m2).
 */
export function crt(r1, m1, r2, m2) {
  const inv = modInverse(m1 % m2, m2);
  if (inv === null) throw new RangeError(`crt requires coprime moduli, got ${m1} and ${m2}`);
  const diff = (((r2 - r1) % m2) + m2) % m2;
  const k = (diff * inv) % m2;
  return r1 + m1 * k;
}

/** Number of divisors, x(n) in EQ notation. */
export function divisorCount(n) {
  return factorize(n).reduce((acc, { e }) => acc * (e + 1), 1);
}

/** Divisor count by trial division — an independent oracle for the tests. */
export function divisorCountBrute(n) {
  let count = 0;
  for (let d = 1; d <= n; d++) if (n % d === 0) count++;
  return count;
}

/**
 * The cycle of a mod k: the successive powers a^1, a^2, ... that the manual writes out,
 * stopped as soon as a residue repeats. Returns { residues, start, period } where
 * residues[i] is a^(i+1) mod k, `start` is the exponent the cycle begins at, and
 * `period` is its length.
 *
 * When gcd(a, k) = 1 the cycle starts at a^1 and `period` is the multiplicative order,
 * which is exactly the manual's "cycle length". When a and k share a factor the residues
 * only become periodic from a^start onwards, so reduceExponent() below — not a bare
 * `b mod period` — is what keeps the answer right.
 */
export function powerCycle(a, k, limit = 400) {
  const residues = [];
  const seen = new Map();
  let value = ((a % k) + k) % k;
  for (let exp = 1; exp <= limit; exp++) {
    if (seen.has(value)) return { residues, start: seen.get(value), period: exp - seen.get(value) };
    seen.set(value, exp);
    residues.push(value);
    value = (value * a) % k;
  }
  return { residues, start: 1, period: residues.length };
}

/** The exponent to actually evaluate for a^b mod k, given a cycle from powerCycle(). */
export function reduceExponent(b, { start, period }) {
  if (b < start + period) return b;
  return start + ((b - start) % period);
}

/** Multiplicative order of a mod n — an independent oracle for λ in the tests. */
export function multiplicativeOrder(a, n) {
  if (gcd(a, n) !== 1) return null;
  let value = a % n;
  for (let k = 1; k <= n; k++) {
    if (value === 1) return k;
    value = (value * a) % n;
  }
  return null;
}

export function isPerfectSquare(n) {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** Renders a factorization as "2^3 · 3 · 5" using plain text. */
export function factorizationText(n) {
  return factorize(n)
    .map(({ p, e }) => (e === 1 ? `${p}` : `${p}^${e}`))
    .join(' · ');
}
