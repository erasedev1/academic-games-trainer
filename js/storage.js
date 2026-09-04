// Everything the trainer remembers, kept in localStorage under one versioned key.

const KEY = 'agt:v1';

const EMPTY = { version: 1, techniques: {}, sessions: [] };

/** localStorage throws in private mode and some embedded views — never let that break a drill. */
function readRaw() {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return structuredClone(EMPTY);
    const parsed = JSON.parse(text);
    if (parsed?.version !== 1) return structuredClone(EMPTY);
    return { ...structuredClone(EMPTY), ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

function writeRaw(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadStats() {
  return readRaw();
}

function blankRecord() {
  return { attempts: 0, correct: 0, revealed: 0, times: [], best: null, streak: 0, longestStreak: 0 };
}

function recordKey(techniqueId, difficulty) {
  return `${techniqueId}:${difficulty}`;
}

export function getRecord(data, techniqueId, difficulty) {
  return data.techniques[recordKey(techniqueId, difficulty)] ?? blankRecord();
}

/**
 * Folds one answered problem into the stats. Revealed problems still count for
 * accuracy — you did get it wrong or right — but never set a speed record.
 */
export function recordAttempt({ techniqueId, difficulty, correct, elapsedMs, revealed }) {
  const data = readRaw();
  const key = recordKey(techniqueId, difficulty);
  const record = data.techniques[key] ?? blankRecord();

  record.attempts++;
  if (revealed) record.revealed++;
  if (correct) {
    record.correct++;
    record.streak++;
    record.longestStreak = Math.max(record.longestStreak, record.streak);
    if (!revealed) {
      // Keep the last 200 times — enough for a stable median without unbounded growth.
      record.times = [...record.times, elapsedMs].slice(-200);
      record.best = record.best === null ? elapsedMs : Math.min(record.best, elapsedMs);
    }
  } else {
    record.streak = 0;
  }

  data.techniques[key] = record;
  writeRaw(data);
  return record;
}

export function recordSession(session) {
  const data = readRaw();
  data.sessions = [...data.sessions, session].slice(-100);
  writeRaw(data);
  return data.sessions;
}

export function clearStats() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

export function exportStats() {
  return JSON.stringify(readRaw(), null, 2);
}

export function importStats(text) {
  const parsed = JSON.parse(text);
  if (parsed?.version !== 1 || typeof parsed.techniques !== 'object') {
    throw new Error('That does not look like an EQ Trainer export.');
  }
  writeRaw({ ...structuredClone(EMPTY), ...parsed });
}

/** Remembers the last drill setup so the launcher comes back the way you left it. */
export function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem(`${KEY}:prefs`)) ?? {};
  } catch {
    return {};
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(`${KEY}:prefs`, JSON.stringify(prefs));
  } catch {
    /* preferences are a convenience, not a requirement */
  }
}
