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

/**
 * Grades an answer that is a set of numbers — "8,9,11", "8 9 11", "9, 11".
 * Order does not matter and duplicates are ignored, since a set is what was asked for.
 */
export function numberSetCheck(answer) {
  const wanted = [...new Set(answer)].sort((a, b) => a - b).join(',');
  return (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return { correct: false, reason: 'List the bases that work.' };
    const parts = text.split(/[\s,]+/).filter(Boolean);
    if (!parts.every((part) => /^\d+$/.test(part))) {
      return { correct: false, reason: 'List the bases as numbers, e.g. "9,11".' };
    }
    const given = [...new Set(parts.map(Number))].sort((a, b) => a - b).join(',');
    return { correct: given === wanted };
  };
}

/** Positive remainder, for negative inputs too. */
export function mod(value, m) {
  return ((value % m) + m) % m;
}

/** A step in the worked solution shown after you answer. `lines` are HTML fragments. */
export function step(title, ...lines) {
  return { title, lines: lines.flat().filter(Boolean) };
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * A thing a problem tests, which the weak-point analysis accumulates timings against.
 * `key` is stable and stored; `label` is what you read on screen. Keep the cardinality
 * low — a tag only becomes useful once you have answered it a handful of times.
 */
export function tag(key, label) {
  return { key, label };
}

/** Size bands, so magnitude can be a tag without one tag per number. */
export function sizeTag(value) {
  if (value < 10) return tag('size:small', 'single digit');
  if (value < 100) return tag('size:medium', 'two digits');
  return tag('size:large', 'three digits or more');
}

/**
 * In Equations the modulus is built out of cubes, so these are the only ones that
 * actually turn up on the board. Everything that generates a `mod k` goal draws k
 * from here — change this list and every cycling drill follows.
 */
export const MODULI = [6, 7, 8, 9, 10, 11];

/** a, b and c come off digit cubes, so they are single digits. 0 and 1 are never a goal. */
export const DIGITS = [2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Two-digit numerals. Perfectly legal — they just cost two cubes instead of one — so they
 * are real but less common, and belong mostly in the harder bands.
 */
export const WIDE_DIGITS = [10, 11, 12, 13, 14, 15];

/** Draws a numeral, two-digit with the given probability. */
export function numeral(rng, wideChance = 0) {
  return rng() < wideChance ? rng.pick(WIDE_DIGITS) : rng.pick(DIGITS);
}

/** Picks a per-difficulty config, falling back to medium for unknown values. */
export function byDifficulty(config, difficulty) {
  return config[difficulty] ?? config.medium;
}
