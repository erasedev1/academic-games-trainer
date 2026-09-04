// Works out what you are worst at, and biases a drill towards it.
//
// Every problem carries tags naming the specific things it tests — "mod 11", "λ(77)",
// "the cycle of 3 mod 7". Timings and misses accumulate per tag, so a weakness can be
// pinned to a number rather than to a whole technique, and a session can be steered at it.

import { median } from './lib/format.js';
import { TECHNIQUES } from './techniques/index.js';

/** Below this a tag is shown as "still measuring" rather than reported as a weakness. */
export const MIN_SAMPLES = 4;

/** Attempts at which a score is trusted in full. */
const CONFIDENCE_AT = 6;

/** Where an untested tag sits: worth sampling, but behind anything known to be shaky. */
const NEUTRAL = 0.35;

/**
 * Below this a record is not a weak point and does not belong on the list. Without it the
 * ranking always has a top five, so a page that should read "nothing stands out" instead
 * accuses you of being weak at the thing you are best at.
 */
const WEAK_FLOOR = 0.15;

/** Timed solves needed before a median is worth comparing against anything. */
const MIN_TIMED = 3;

/** How much of the score is accuracy rather than speed. Misses have to outweigh slowness:
 *  a tag you get wrong most of the time is a worse problem than one you get right slowly. */
const ERROR_WEIGHT = 0.65;

/** The slowdown, as a multiple of your own pace, that counts as maximally slow. */
const SLOWEST = 3;

/**
 * How many problems to draw before keeping the shakiest.
 *
 * This is the whole concentration dial. Best-of-many turns a session into one number
 * repeated, which is monotonous and lets everything else rot; best-of-few barely steers.
 * Best-of-4 puts a little over half the session on the weak spot while every other value
 * still comes up around a tenth of the time, so you drill the gap without forgetting the
 * rest. Retune it if the generators' own spread changes — it is measured, not guessed.
 */
const CANDIDATES = 4;

export function tagKey(techniqueId, key) {
  return `${techniqueId}|${key}`;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/**
 * A record's weakness, from 0 (solid) to 1 (weak), blending how often you miss it with
 * how slow you are on it relative to your own pace at that technique.
 *
 * Both halves are smoothed: the error rate by half a miss, so one bad answer out of one
 * does not read as a catastrophe, and the whole score toward NEUTRAL until you have
 * enough attempts for it to mean anything.
 */
export function scoreRecord(record, baselineMs) {
  const attempts = record?.attempts ?? 0;
  if (!attempts) return NEUTRAL;
  const errorRate = (attempts - record.correct + 0.5) / (attempts + 1);
  const mid = median(record.times ?? []);
  const slowness = mid && baselineMs ? clamp((mid / baselineMs - 1) / (SLOWEST - 1), 0, 1) : 0;
  const raw = ERROR_WEIGHT * errorRate + (1 - ERROR_WEIGHT) * slowness;
  const confidence = Math.min(attempts, CONFIDENCE_AT) / CONFIDENCE_AT;
  return raw * confidence + NEUTRAL * (1 - confidence);
}

/** Your overall pace and accuracy per technique, pooled across difficulties. */
export function techniqueTotals(data) {
  const totals = new Map();
  for (const technique of TECHNIQUES) {
    totals.set(technique.id, { attempts: 0, correct: 0, times: [] });
  }
  for (const [key, record] of Object.entries(data.techniques ?? {})) {
    const id = key.split(':')[0];
    const total = totals.get(id);
    if (!total) continue;
    total.attempts += record.attempts ?? 0;
    total.correct += record.correct ?? 0;
    total.times.push(...(record.times ?? []));
  }
  for (const total of totals.values()) total.medianMs = median(total.times);
  return totals;
}

/** Weakness per technique, so a session can spend more of its questions where it hurts. */
export function techniqueScores(data) {
  const totals = techniqueTotals(data);
  // Compare each technique against your own median across all of them, so "slow" means
  // slow for you rather than slow in absolute terms.
  const overall = median([...totals.values()].flatMap((t) => t.times));
  const scores = new Map();
  for (const [id, total] of totals) scores.set(id, scoreRecord(total, overall));
  return scores;
}

/** Weakness per tag, keyed "techniqueId|tagKey". */
export function tagScores(data) {
  const totals = techniqueTotals(data);
  const scores = new Map();
  for (const [key, record] of Object.entries(data.tags ?? {})) {
    const id = key.split('|')[0];
    scores.set(key, scoreRecord(record, totals.get(id)?.medianMs));
  }
  return scores;
}

/**
 * What a session should weight a technique by.
 *
 * The technique's own score is not enough on its own: you can be strong at regular
 * cycling overall and still lose every time mod 11 comes up. So a technique is as weak
 * as its weakest measured tag, or as its overall record — whichever is worse.
 */
export function focusScores(data) {
  const scores = techniqueScores(data);
  const totals = techniqueTotals(data);
  for (const [key, record] of Object.entries(data.tags ?? {})) {
    if ((record.attempts ?? 0) < MIN_SAMPLES) continue;
    const [id] = key.split('|');
    if (!scores.has(id)) continue;
    const tagScore = scoreRecord(record, totals.get(id)?.medianMs);
    scores.set(id, Math.max(scores.get(id), tagScore));
  }
  return scores;
}

/**
 * The weak spots worth showing you: tags you have answered enough times to judge,
 * ranked worst first. Anything below MIN_SAMPLES is still being measured.
 */
export function weakSpots(data, { limit = 8, minSamples = MIN_SAMPLES, minScore = WEAK_FLOOR } = {}) {
  const totals = techniqueTotals(data);
  const byId = new Map(TECHNIQUES.map((t) => [t.id, t]));
  const spots = [];

  for (const [key, record] of Object.entries(data.tags ?? {})) {
    if ((record.attempts ?? 0) < minSamples) continue;
    const [id] = key.split('|');
    const technique = byId.get(id);
    if (!technique) continue;
    const baselineMs = totals.get(id)?.medianMs;
    const timed = record.times ?? [];
    const mid = median(timed);
    const score = scoreRecord(record, baselineMs);
    if (score < minScore) continue;
    spots.push({
      kind: 'tag',
      key,
      techniqueId: id,
      techniqueName: technique.name,
      label: record.label ?? key.split('|')[1],
      attempts: record.attempts,
      accuracy: record.correct / record.attempts,
      medianMs: timed.length >= MIN_TIMED ? mid : null,
      // How much slower than your own pace at this technique. One or two timed solves is
      // not a pace, so it stays unreported until there are enough of them.
      slowdown: timed.length >= MIN_TIMED && mid && baselineMs ? mid / baselineMs : null,
      score,
    });
  }

  spots.sort((a, b) => b.score - a.score);
  return spots.slice(0, limit);
}

/**
 * Whole techniques, scored the same way. Tags need a couple of dozen problems before any
 * one of them has been seen enough times to judge, so until then this is what there is to
 * say — the panel falls back to it rather than showing nothing.
 */
export function techniqueSpots(data, { limit = 8, minSamples = MIN_SAMPLES, minScore = WEAK_FLOOR } = {}) {
  const totals = techniqueTotals(data);
  const overall = median([...totals.values()].flatMap((t) => t.times));
  const spots = [];

  for (const technique of TECHNIQUES) {
    const total = totals.get(technique.id);
    if (!total || total.attempts < minSamples) continue;
    const score = scoreRecord(total, overall);
    if (score < minScore) continue;
    spots.push({
      kind: 'technique',
      key: technique.id,
      techniqueId: technique.id,
      techniqueName: technique.name,
      label: technique.name,
      attempts: total.attempts,
      accuracy: total.correct / total.attempts,
      medianMs: total.times.length >= MIN_TIMED ? total.medianMs : null,
      slowdown: total.times.length >= MIN_TIMED && total.medianMs && overall ? total.medianMs / overall : null,
      score,
    });
  }

  spots.sort((a, b) => b.score - a.score);
  return spots.slice(0, limit);
}

/**
 * What to put in front of you: the specific numbers when they have been measured enough,
 * topped up with whole techniques when they have not.
 */
export function weakList(data, { limit = 5 } = {}) {
  const tags = weakSpots(data, { limit });
  if (tags.length >= limit) return tags;
  const covered = new Set(tags.map((spot) => spot.techniqueId));
  const topUp = techniqueSpots(data, { limit })
    .filter((spot) => !covered.has(spot.techniqueId))
    .slice(0, limit - tags.length);
  return [...tags, ...topUp];
}

/** A short human reason a spot is on the list — whichever half of the score dominates. */
export function weakReason(spot) {
  const missing = spot.accuracy < 0.85;
  const slow = spot.slowdown !== null && spot.slowdown > 1.2;
  if (missing && slow) return 'missed and slow';
  if (missing) return 'missed often';
  if (slow) return `${spot.slowdown.toFixed(1)}× your pace`;
  return 'not settled yet';
}

/**
 * A picker that steers a session at your weak spots.
 *
 * Rather than teaching every generator to take constraints, it draws a handful of
 * candidate problems and keeps the one testing the shakiest material. The generators stay
 * exactly as they are, and a weakness expressed in any tag is automatically targetable.
 */
export function createWeakPicker(data, techniques, { candidates = CANDIDATES } = {}) {
  const techScores = focusScores(data);
  const tags = tagScores(data);

  // A floor, so a technique you are good at still comes up rather than disappearing.
  const weights = techniques.map((t) => 0.15 + (techScores.get(t.id) ?? NEUTRAL));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const problemScore = (technique, problem) => {
    if (!problem.tags?.length) return NEUTRAL;
    const scores = problem.tags.map((t) => tags.get(tagKey(technique.id, t.key)) ?? NEUTRAL);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  return {
    pickTechnique(rng) {
      let roll = rng() * totalWeight;
      for (let i = 0; i < techniques.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return techniques[i];
      }
      return techniques[techniques.length - 1];
    },
    /** Draws `candidates` problems and keeps the one testing the shakiest material. */
    pickProblem(technique, difficulty, rng) {
      let best = null;
      let bestScore = -1;
      for (let i = 0; i < candidates; i++) {
        const problem = technique.generate(difficulty, rng);
        const score = problemScore(technique, problem);
        if (score > bestScore) {
          bestScore = score;
          best = problem;
        }
      }
      return best;
    },
    problemScore,
  };
}

/** The techniques a weak-point session should cover: the shakiest, plus anything untried. */
export function focusTechniques(data, { count = 5 } = {}) {
  const scores = focusScores(data);
  return TECHNIQUES.slice()
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, count);
}

/** Whether there is enough history for any of this to mean anything. */
export function hasEnoughData(data) {
  return weakList(data).length > 0;
}
