// Helpers shared by the technique modules: answer graders and step builders.

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
 * modulo c·k is a correct representation of it — the manual's own answers (25/7,
 * 48/7, 15/7, 39/8) are just the ones that fall out of each method. The user may
 * type "48/7" or, since the denominator is fixed by the problem, plain "48".
 */
export function congruentNumeratorCheck({ target, modulus, den }) {
  return (raw) => {
    const parsed = parseAnswer(raw);
    if (parsed.kind === 'int') {
      return { correct: mod(parsed.value, modulus) === target };
    }
    if (parsed.kind === 'fraction') {
      if (parsed.den !== den) return { correct: false, reason: `The denominator stays ${den}.` };
      return { correct: mod(parsed.num, modulus) === target };
    }
    return { correct: false, reason: `Enter a numerator, or a fraction over ${den}.` };
  };
}

/** Grades a numeric answer that may also legitimately be "none" / "impossible". */
export function intOrNoneCheck(answer) {
  return (raw) => {
    const text = String(raw ?? '').trim().toLowerCase();
    if (['none', 'no', 'n', 'impossible', '-'].includes(text)) {
      return { correct: answer === null };
    }
    const parsed = parseAnswer(text);
    if (parsed.kind !== 'int') return { correct: false, reason: 'Enter a whole number, or "none".' };
    return { correct: answer !== null && parsed.value === answer };
  };
}

/** Positive remainder, for negative inputs too. */
export function mod(value, m) {
  return ((value % m) + m) % m;
}

/** A step in the on-screen walkthrough. `lines` are HTML fragments. */
export function step(title, ...lines) {
  return { title, lines: lines.flat().filter(Boolean) };
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Picks a per-difficulty config, falling back to medium for unknown values. */
export function byDifficulty(config, difficulty) {
  return config[difficulty] ?? config.medium;
}
