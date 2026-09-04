// Answer graders and the parameter pools every technique draws from.

import { parseAnswer } from '../lib/format.js';

/** Grades a plain integer answer. */
export function intCheck(answer) {
  return (raw) => {
    const parsed = parseAnswer(raw);
    if (parsed.kind !== 'int') return { correct: false, reason: 'Enter a whole number.' };
    return { correct: parsed.value === answer };
  };
}

/**
 * Grades the N/c answers used by special and Alain cycling.
 *
 * The goal is an exact value, not a residue, so any numerator congruent to a^b
 * modulo c·k represents it. The user may type "48/7" or, since the denominator is
 * fixed by the problem, plain "48".
 */
export function congruentNumeratorCheck({ target, modulus, den }) {
  return (raw) => {
    const parsed = parseAnswer(raw);
    if (parsed.kind === 'int') return { correct: mod(parsed.value, modulus) === target };
    if (parsed.kind === 'fraction') {
      if (parsed.den !== den) return { correct: false, reason: `The denominator stays ${den}.` };
      return { correct: mod(parsed.num, modulus) === target };
    }
    return { correct: false, reason: `Enter a numerator, or a fraction over ${den}.` };
  };
}

/** Grades a numeric answer that may also legitimately be "none". */
export function intOrNoneCheck(answer) {
  return (raw) => {
    const text = String(raw ?? '').trim().toLowerCase();
    if (['none', 'no', 'n', 'impossible', '-'].includes(text)) return { correct: answer === null };
    const parsed = parseAnswer(text);
    if (parsed.kind !== 'int') return { correct: false, reason: 'Enter a whole number, or "none".' };
    return { correct: answer !== null && parsed.value === answer };
  };
}

/** Positive remainder, for negative inputs too. */
export function mod(value, m) {
  return ((value % m) + m) % m;
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * In Equations the modulus is built out of cubes, so these are the only ones that
 * actually turn up on the board. Everything that generates a `mod k` goal draws k
 * from here — change this list and every cycling drill follows.
 */
export const MODULI = [6, 7, 8, 9, 10, 11];

/** a, b and c come off digit cubes, so they are single digits. 0 and 1 are never a goal. */
export const DIGITS = [2, 3, 4, 5, 6, 7, 8, 9];

/** Picks a per-difficulty config, falling back to medium for unknown values. */
export function byDifficulty(config, difficulty) {
  return config[difficulty] ?? config.medium;
}
