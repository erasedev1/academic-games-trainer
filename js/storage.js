// Everything the trainer remembers, kept in localStorage under one versioned key.

const KEY = 'agt:v1';

const EMPTY = { version: 1, techniques: {}, tags: {}, sessions: [] };

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
  return { attempts: 0, correct: 0, times: [], best: null, streak: 0, longestStreak: 0 };
}

function recordKey(techniqueId, difficulty) {
  return `${techniqueId}:${difficulty}`;
}

export function getRecord(data, techniqueId, difficulty) {
  return data.techniques[recordKey(techniqueId, difficulty)] ?? blankRecord();
}

/** Keeps the last N solve times — enough for a stable median without unbounded growth. */
function fold(record, correct, elapsedMs, keep) {
  record.attempts++;
  if (correct) {
    record.correct++;
    record.times = [...record.times, elapsedMs].slice(-keep);
    record.best = record.best === null ? elapsedMs : Math.min(record.best, elapsedMs);
  }
  return record;
}

/**
 * Folds one answered problem into the stats, against both its technique and each of the
 * specific things it tested — the tags are what the weak-point analysis reads.
 */
export function recordAttempt({ techniqueId, difficulty, correct, elapsedMs, tags = [] }) {
  const data = readRaw();
  const key = recordKey(techniqueId, difficulty);
  const record = data.techniques[key] ?? blankRecord();

  for (const { key: tagName, label } of tags) {
    const tagRecord = data.tags[`${techniqueId}|${tagName}`] ?? blankRecord();
    // The label is stored alongside so the stats page can name a tag without having to
    // regenerate a problem that carries it.
    tagRecord.label = label;
    data.tags[`${techniqueId}|${tagName}`] = fold(tagRecord, correct, elapsedMs, 20);
  }

  fold(record, correct, elapsedMs, 200);
  if (correct) {
    record.streak++;
    record.longestStreak = Math.max(record.longestStreak, record.streak);
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
