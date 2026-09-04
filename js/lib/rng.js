// Seeded pseudo-random generator, so a session can be replayed from its seed.

/** mulberry32 — small, fast, good enough for problem selection. */
export function createRng(seed) {
  let state = seed >>> 0;
  const rng = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Integer in [min, max], inclusive. */
  rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  rng.pick = (items) => items[rng.int(0, items.length - 1)];
  /** Repeatedly draws from `fn` until `predicate` holds; throws rather than looping forever. */
  rng.until = (fn, predicate, attempts = 500) => {
    for (let i = 0; i < attempts; i++) {
      const value = fn();
      if (predicate(value)) return value;
    }
    throw new Error('rng.until exhausted its attempts — generator constraints are too tight');
  };
  rng.shuffle = (items) => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return rng;
}

export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}
