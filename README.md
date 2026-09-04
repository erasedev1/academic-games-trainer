# EQ Speed Trainer

Timed practice for every technique in Dante's *EQ Manual* — the cycling methods and the
Number of Factors / Ex-Girlfriend formulas used in Academic Games Equations.

The manual teaches the methods and gives two or three worked examples each. What it can't
give you is volume under time pressure, which is the thing that actually makes them fast.
This site generates unlimited problems for each technique, grades them instantly, and walks
through the solution using the manual's own numbered steps.

It is a static site with **no build step and no dependencies** — open `index.html` and it works.

## What it drills

**Cycling**

| Technique | Form |
|---|---|
| Regular Cycling | `a^b mod k`, by writing out the cycle |
| Lambda Function | `λ(k)` on its own — the step that gates every fast method |
| Lambda Cycling | `a^b mod k`, reducing the exponent mod λ(k) — reference only, see below |
| Special Cycling | `(a^b)/c mod k`, via λ(ck) |
| Super Cycling | `a^(b^c) mod k` |
| Super Duper Cycling | `a^(b^c^d^e) mod k`, read as `a^(b^cde)` |
| Alain Cycling | `(a^b)/c mod k` when the power is too big to expand, via CRT |

**Number of Factors + PotB**

| Technique | Identity |
|---|---|
| Main Principle | `x(n)` from the prime factorization |
| First Ex-Girlfriend | `x(10^(√a − 1)) = a`, perfect squares |
| Second Ex-Girlfriend | `xx(10^(p^((b−1)/2) − 1)) = b`, odd integers |
| Third Ex-Girlfriend | `xxx(10^(p^((p^(c−1) − 1)/2) − 1)) = c`, any integer |
| Ex-Girlfriend Improved | `√(x(10^(b−1))) = b`, any integer |
| Ex-Girlfriend Base 8, 9, 11 | derived below — the manual leaves these as an exercise |

Each has three difficulty levels, and every technique can be mixed with any other so you
have to recognise which method applies before you can start solving.

**Lambda cycling is documented but not drilled.** Its goals are `a^b mod k` — character for
character what regular cycling produces — so offering both as drill options meant choosing a
*method* for a problem you cannot tell apart on sight. The method itself is drilled directly
by the Lambda Function drill, and used in every step of special, super and super duper
cycling. Its reference entry and its generator both stay, so putting it back is a one-line
change: drop `drillable: false` from `js/techniques/cycling-lambda.js`.

## Staying inside what the cubes can build

Every generated goal is one you could actually be set in a match:

- **The modulus is always 6 through 11.** It is built from cubes, so nothing else appears.
  Difficulty therefore comes from the exponent and the cycle length, not from an
  unrealistic modulus. The list lives in one place — `MODULI` in
  `js/techniques/shared.js` — and every cycling drill reads from it.
- **a, c and the colour exponents are single digits**, for the same reason.
- **Super cycling uses mod 7, 9, 10 and 11.** For 6 and 8, λ(k) = 2, so the inner power
  collapses to 1 every time and there is no second cycle to do.
- **Alain cycling uses the twelve (c, k) pairs where λ(ck) ≥ 10** — anything smaller
  leaves no room for a reduced exponent big enough to be unexpandable, which is the
  entire reason the case exists.
- **Collapses are rationed.** When the tower reduces to 1 the answer is just a. That is a
  real case — one of the manual's two super duper examples is exactly that — but cde is a
  product of three digits and so is nearly always even, which would have made it ~80% of
  the drill. The generators now aim for about a quarter, and a test fails if it exceeds
  half.

## Session formats

- **Sprint** — 30s, 60s or 2 minutes; answer as many as you can.
- **Fixed set** — 10, 20 or 50 problems; measures total time and accuracy.
- **Endless** — no clock, per-problem timing still recorded.
- **Mixed** — select several techniques and they interleave.

Answers are graded instantly, `?` then <kbd>Enter</kbd> reveals the worked solution,
<kbd>Esc</kbd> ends the session. Accuracy, median solve time, personal bests and streaks are
kept per technique and difficulty in your browser's local storage — nothing is uploaded.

## Two notes on the maths

**λ(4).** The manual's lambda shortcut — subtract 1 from each base, and use `2^(e−2)` for
base 2 — gives `λ(4) = 1`, but the true Carmichael value is 2. Using 1 would produce wrong
answers (`3^3 mod 4` is 3, not 1), so this trainer grades against the true λ. Every other
value agrees with the shortcut, because `p − 1` and `p^(e−1)` are coprime and so their LCM
is their product.

**Fraction answers.** Special and Alain cycling ask for an exact value, not a residue, so
*any* numerator `N` with `N ≡ a^b (mod ck)` is a correct representation. The trainer accepts
all of them — type `48/7` or just `48` — and shows the smallest positive one as canonical.

**Bases 8, 9 and 11.** The manual leaves these as an exercise. Since `x1` in base *B* means
`x(B^n)`:

- Base 8 = 2³ → `x(8^n) = 3n + 1` → `n = (a−1)/3`, only when `a ≡ 1 (mod 3)`
- Base 9 = 3² → `x(9^n) = 2n + 1` → `n = (a−1)/2`, only when `a` is odd
- Base 11 is prime → `x(11^n) = n + 1` → `n = a − 1`, for **every** integer `a`

Base 11 is the strongest of the three. Base 10 splits into two primes, which is exactly why
First Ex-Girlfriend only reaches perfect squares.

## Running it locally

```sh
python3 -m http.server 8080     # then open http://localhost:8080
```

Any static server works. Opening `index.html` from the filesystem does not, because the site
uses ES modules and browsers block those over `file://`.

## Tests

```sh
node tests/run.js
```

No dependencies. It checks the Carmichael function against a brute-force multiplicative-order
computation for every n up to 2000, reproduces all 11 worked examples from the manual, and
generates 200 problems per technique per difficulty — verifying each answer against an
independent oracle (BigInt square-and-multiply, divisor counts by trial division, the
Ex-Girlfriend identities evaluated forwards), that every generator honours its own
preconditions, and that each grader accepts its canonical answer and rejects near misses.

## Hosting on GitHub Pages

**Settings → Pages → Source: Deploy from a branch**, pick the branch and `/ (root)`. There is
nothing to build. `.nojekyll` is included so the files are served exactly as they are.

## Credit

The techniques, methods and worked examples are from the EQ Manual by Dante. The drills, the
base 8/9/11 derivations, and any mistakes here belong to this site.
