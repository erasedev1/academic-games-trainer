# EQ Speed Trainer

Timed drills for the techniques in Dante's *EQ Manual* — the cycling methods and the
Number of Factors formulas used in Academic Games Equations. Generates unlimited problems,
grades instantly, tracks your accuracy and solve times.

Static site, no build step, no dependencies. Open `index.html` and it works.

## What it drills

**Cycling** — Regular `a^b mod k` · Lambda Function `λ(k)` · Special `(a^b)/c mod k` ·
Super `a^(b^c)` · Super Duper `a^(b^c^d^e)` · Alain `(a^b)/c mod k` via CRT

**Number of Factors** — Main Principle `x(n)` · First, Second and Third Ex-Girlfriend ·
Ex-Girlfriend Improved · Ex-Girlfriend Base 8, 9, 11

Three difficulty levels each, and any set of techniques can be interleaved so you have to
recognise which method applies before you can solve.

**Formats:** 30s/60s/2min sprint · sets of 10, 20 or 50 · endless.
<kbd>Enter</kbd> checks and advances, <kbd>Esc</kbd> ends. Stats are per technique and
difficulty, kept in your browser's local storage — nothing is uploaded.

## Staying inside what the cubes can build

Every generated goal is one you could actually be set:

- **The modulus is always 6 through 11**, and a, c and the colour exponents are single
  digits, because that is what the cubes can build. `MODULI` and `DIGITS` in
  `js/techniques/shared.js` are the single source; every cycling drill reads from them.
- **Super cycling uses mod 7, 9, 10 and 11.** For 6 and 8, λ(k) = 2, so the inner power
  collapses to 1 every time and there is no second cycle to do.
- **Alain cycling uses the twelve (c, k) pairs where λ(ck) ≥ 10** — anything smaller
  leaves no room for an exponent big enough to be unexpandable, which is the whole reason
  the case exists.
- **Collapses are rationed.** When the tower reduces to 1 the answer is just a. That is a
  real case, but cde is a product of three digits and so nearly always even, which would
  have made it ~80% of super duper. The generators aim for a quarter; a test fails above
  half.

## Two notes on the maths

**λ(4).** The manual's lambda shortcut gives λ(4) = 1, but the true Carmichael value is 2 —
reducing by 1 would make `3^3 mod 4` come out as 1 instead of 3. This grades against the
true λ. Every other value agrees with the shortcut, because `p − 1` and `p^(e−1)` are
coprime and so their LCM is their product.

**Fraction answers.** Special and Alain cycling ask for an exact value, not a residue, so
any numerator `N` with `N ≡ a^b (mod ck)` is correct. All are accepted — type `48/7` or just
`48` — and the smallest positive one is shown as the answer.

**Bases 8, 9 and 11** are left as an exercise in the manual. Since `x1` in base *B* means
`x(B^n)`: base 8 = 2³ gives `n = (a−1)/3` when `a ≡ 1 (mod 3)`; base 9 = 3² gives
`n = (a−1)/2` for odd `a`; base 11 is prime, so `n = a − 1` for **every** integer. Base 11
is the strongest of the three, and the same reasoning is why First Ex-Girlfriend only
reaches perfect squares.

## Running and testing

```sh
python3 -m http.server 8080     # then open http://localhost:8080
node tests/run.js               # no dependencies
```

Opening `index.html` from the filesystem does not work — it uses ES modules, which browsers
block over `file://`.

The tests check λ against a brute-force multiplicative-order computation for every n up to
2000, reproduce all 11 worked examples from the manual, and generate 200 problems per
technique per difficulty — verifying each answer against an independent oracle (BigInt
square-and-multiply, divisor counts by trial division, the Ex-Girlfriend identities
evaluated forwards), that every generator honours its own preconditions and stays inside
the real parameter pools, and that each grader accepts its canonical answer and rejects
near misses.

## Hosting on GitHub Pages

**Settings → Pages → Source: Deploy from a branch**, pick the branch and `/ (root)`.
Nothing to build. `.nojekyll` is included so files are served as they are.

Techniques from the EQ Manual by Dante.
