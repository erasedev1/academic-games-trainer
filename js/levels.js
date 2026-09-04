// Per-technique difficulty that moves with you.
//
// Each technique carries its own level and a rolling window of how the last few problems
// at that level went. Answer well and it promotes you; struggle and it drops you back. The
// levels are independent, so a session can be running you at hard on the lambda drill and
// easy on Alain cycling at the same time.

import { DIFFICULTIES } from './techniques/shared.js';

/** Where a technique starts. Middle, so it takes the same effort to move either way. */
export const START_LEVEL = 'medium';

/** How many recent results at the current level are kept. */
const WINDOW = 10;

/** Below this many results the window is not worth reading. */
const MIN_TO_JUDGE = 6;

const PROMOTE_AT = 0.85;
const DEMOTE_AT = 0.55;

export function levelOf(levels, techniqueId) {
  return levels?.[techniqueId]?.level ?? START_LEVEL;
}

function accuracyOf(recent) {
  if (!recent.length) return null;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

/**
 * Folds one answered problem into a technique's level. Pure — it takes the stored entry
 * and returns the next one, so the caller decides when to persist.
 *
 * Only results at the technique's *current* level count. Answering a fixed-difficulty
 * session at some other level is real evidence about that level, but it says nothing about
 * whether you are ready to move up or down from where the adaptive pointer is sitting.
 */
export function applyResult(entry, difficulty, correct) {
  const level = entry?.level ?? START_LEVEL;
  const recent = entry?.recent ?? [];
  if (difficulty !== level) return { entry: { level, recent }, changed: null };

  const next = [...recent, correct ? 1 : 0].slice(-WINDOW);
  const index = DIFFICULTIES.indexOf(level);
  const accuracy = accuracyOf(next);

  if (next.length >= MIN_TO_JUDGE) {
    // The window is cleared on a move, so the new level gets judged on its own evidence
    // rather than inheriting the results that triggered the change.
    if (accuracy >= PROMOTE_AT && index < DIFFICULTIES.length - 1) {
      return { entry: { level: DIFFICULTIES[index + 1], recent: [] }, changed: 'up' };
    }
    if (accuracy <= DEMOTE_AT && index > 0) {
      return { entry: { level: DIFFICULTIES[index - 1], recent: [] }, changed: 'down' };
    }
  }
  return { entry: { level, recent: next }, changed: null };
}

/** What to show about a technique's standing: its level and how the window is going. */
export function levelProgress(levels, techniqueId) {
  const entry = levels?.[techniqueId];
  const level = entry?.level ?? START_LEVEL;
  const recent = entry?.recent ?? [];
  const index = DIFFICULTIES.indexOf(level);
  return {
    level,
    attempts: recent.length,
    needed: Math.max(0, MIN_TO_JUDGE - recent.length),
    accuracy: accuracyOf(recent),
    canPromote: index < DIFFICULTIES.length - 1,
    canDemote: index > 0,
  };
}

/** "moved up to hard" / "eased back to easy", for the end-of-session summary. */
export function levelChangeText(techniqueName, direction, level) {
  return direction === 'up'
    ? `${techniqueName} moved up to ${level}`
    : `${techniqueName} eased back to ${level}`;
}
