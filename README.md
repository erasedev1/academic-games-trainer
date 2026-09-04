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

Three difficulty levels each — set by hand, or left to adapt per technique — and any set of
techniques can be interleaved so you have to recognise which method applies before you can
solve.

## Weak points

Every problem is tagged with the specific things it tests — `mod 11`, `λ(77)`, `divisor 8`,
`the cycle of 3 mod 7`, `solving for the exponent`. Misses and solve times accumulate per
tag, so a weakness gets pinned to a number rather than to a whole technique.

A tag is scored from how often you miss it and how far off **your own pace** at that
technique you are, so "slow" means slow for you rather than slow in absolute terms. Misses
outweigh slowness: getting something wrong most of the time is a worse problem than getting
it right slowly. Scores are smoothed toward neutral until there are enough attempts to mean
anything, so one bad answer never tops the list, and anything you are accurate and on pace
at is left off entirely — if nothing stands out, the page says so instead of inventing a
ranking.

**Train these** runs a session steered at what it found. It draws three candidate problems
and keeps the shakiest, which puts a little over half the session on your weak spot while
every other value still comes up — targeted without becoming the same problem twenty times.
A technique counts as weak if its *worst measured tag* is weak, so being generally good at
regular cycling does not hide the fact that mod 11 costs you every time. Techniques you
have never tried rank mid-pack, so a weak session also covers new ground.

Nothing appears until there is enough history to justify it: for the first few sessions the
panel names whole techniques, and it switches to specific numbers once you have met them
four times or more.

## Adaptive difficulty

Each technique carries **its own level**, and it moves as you answer. A session can be
running you at hard on the lambda drill and easy on Alain cycling at the same time, which
is the point — the levels are independent because your command of the techniques is.

The rule is deliberately plain: over a rolling window of the last ten problems at the
technique's current level, 85% or better moves you up, 55% or worse moves you down, and it
takes six results before the window is read at all. The window clears on a move, so the new
level is judged on its own evidence rather than inheriting the run that triggered the
change. Techniques start at medium, so it takes the same effort to move either way.

Only results at the technique's *current* level count. Playing a fixed-difficulty session
is real evidence about that level and is recorded as such, but it does not shove the
adaptive pointer around — so picking "Hard" for a session never has surprising
after-effects.

Speed is deliberately not part of the level rule. A time threshold would have to be
absolute, and there is no honest absolute target that works across techniques ranging from
λ(9) to a four-storey tower. Accuracy at a level is the signal; speed is what the weak-point
analysis reads.

**Formats:** 30s/60s/2min sprint · sets of 10, 20 or 50 · endless.
<kbd>Enter</kbd> checks and advances, <kbd>Esc</kbd> ends.

Every answer is followed by a worked solution that follows the manual's own numbered
method — the cycle written out, the λ computation, the CRT ladder. It opens automatically
when you got the problem wrong and stays collapsed when you got it right. Stats are per technique and
difficulty, kept in your browser's local storage — nothing is uploaded.

## Staying inside what the cubes can build

Every generated goal is one you could actually be set:

- **The modulus is always 6 through 11**, and a, c and the colour exponents are single
  digits, because that is what the cubes can build. `MODULI` and `DIGITS` in
  `js/techniques/shared.js` are the single source; every cycling drill reads from them.
- **Every cycling goal is solvable by lambda cycling.** a and k are coprime in regular
  cycling, a, c and k pairwise coprime in special and Alain, and in super and super duper
  b is coprime to λ(k) as well so the inner power reduces too. A test walks the lambda
  route on every generated problem and requires it to land on the same answer.
- **The modulus is drawn evenly.** Coprimality leaves very different numbers of usable
  bases per modulus — eight for 11, only one for 6 — so drawing a base and modulus together
  and rejecting the rest would quietly make mod 11 twice as common as mod 6. The modulus is
  picked first and the base second. Mod 11 does not appear on easy, because no single-digit
  base has a cycle shorter than five there.
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
