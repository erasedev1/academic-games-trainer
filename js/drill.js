// The session runner: one generic loop over whichever techniques were selected.

import { getTechnique, TECHNIQUES } from './techniques/index.js';
import { createRng, randomSeed } from './lib/rng.js';
import { escapeHtml, formatClock, formatSeconds, median } from './lib/format.js';
import { loadStats, recordAttempt, recordSession } from './storage.js';
import { createWeakPicker, focusTechniques } from './weakness.js';

const root = document.getElementById('drill');
const params = new URLSearchParams(window.location.search);

// focus=weak steers the whole session at your shakiest material instead of drawing evenly.
const weakFocus = params.get('focus') === 'weak';

const chosen = (params.get('t') ?? '')
  .split(',')
  .map((id) => getTechnique(id.trim()))
  .filter(Boolean);

const config = {
  // With focus=weak and no explicit list, the session picks the techniques itself. Given a
  // list, it targets the weak points inside those instead.
  techniques: weakFocus && !chosen.length ? focusTechniques(loadStats()) : chosen,
  mode: ['sprint', 'set', 'endless'].includes(params.get('mode')) ? params.get('mode') : 'sprint',
  difficulty: ['easy', 'medium', 'hard'].includes(params.get('d')) ? params.get('d') : 'medium',
  limit: Number(params.get('limit')) || (params.get('mode') === 'set' ? 10 : 60),
  seed: Number(params.get('seed')) || randomSeed(),
};

const picker = weakFocus ? createWeakPicker(loadStats(), config.techniques) : null;

const state = {
  rng: createRng(config.seed),
  problem: null,
  phase: 'answering',
  startedAt: 0,
  sessionStart: Date.now(),
  results: [],
  finished: false,
};

if (!config.techniques.length) {
  root.innerHTML = `
    <div class="empty">
      <p>No technique selected for this drill.</p>
      <p><a href="index.html">Pick one on the drills page</a>.</p>
    </div>`;
} else {
  start();
}

function start() {
  nextProblem();
  render();
  if (config.mode === 'sprint') {
    const tick = setInterval(() => {
      if (state.finished) return clearInterval(tick);
      if (remainingMs() <= 0) {
        clearInterval(tick);
        finish();
      } else {
        updateMeters();
      }
    }, 100);
  }
}

function remainingMs() {
  return config.limit * 1000 - (Date.now() - state.sessionStart);
}

function nextProblem() {
  const technique = picker ? picker.pickTechnique(state.rng) : state.rng.pick(config.techniques);
  const problem = picker
    ? picker.pickProblem(technique, config.difficulty, state.rng)
    : technique.generate(config.difficulty, state.rng);
  state.problem = { ...problem, technique };
  state.phase = 'answering';
  state.startedAt = Date.now();
}

/** The header meters — redrawn on their own so the timer never re-renders the prompt. */
function updateMeters() {
  const bar = root.querySelector('.drill-bar');
  if (!bar) return;
  const correct = state.results.filter((r) => r.correct).length;
  bar.querySelector('[data-meter="score"]').textContent = `${correct}/${state.results.length}`;
  const streakEl = bar.querySelector('[data-meter="streak"]');
  if (streakEl) streakEl.textContent = String(currentStreak());
  const clock = bar.querySelector('[data-meter="clock"]');
  if (!clock) return;
  if (config.mode === 'sprint') {
    const left = Math.max(0, remainingMs());
    clock.textContent = formatClock(left);
    clock.classList.toggle('meter-value--urgent', left <= 10000);
  } else {
    clock.textContent = formatClock(Date.now() - state.sessionStart);
  }
}

function currentStreak() {
  let streak = 0;
  for (let i = state.results.length - 1; i >= 0; i--) {
    if (!state.results[i].correct) break;
    streak++;
  }
  return streak;
}

function progressLabel() {
  if (config.mode === 'set') return `${Math.min(state.results.length + 1, config.limit)} / ${config.limit}`;
  return `#${state.results.length + 1}`;
}

function submit(raw) {
  if (state.phase !== 'answering') return;
  const text = String(raw ?? '').trim();
  if (text === '') return;

  const elapsedMs = Date.now() - state.startedAt;
  const result = state.problem.check(text);
  state.phase = 'feedback';
  state.results.push({
    correct: result.correct,
    elapsedMs,
    techniqueId: state.problem.technique.id,
    promptHtml: state.problem.promptHtml,
    canonicalText: state.problem.canonicalText,
    given: text,
  });
  recordAttempt({
    techniqueId: state.problem.technique.id,
    difficulty: config.difficulty,
    correct: result.correct,
    elapsedMs,
    tags: state.problem.tags ?? [],
  });
  render({ feedback: { ...result, elapsedMs, given: text } });

  if (config.mode === 'set' && state.results.length >= config.limit) {
    // Let the last answer land on screen before the summary replaces it.
    setTimeout(finish, 900);
  }
}

function advance() {
  if (state.finished) return;
  if (config.mode === 'sprint' && remainingMs() <= 0) return finish();
  if (config.mode === 'set' && state.results.length >= config.limit) return finish();
  nextProblem();
  render();
}

function finish() {
  if (state.finished) return;
  state.finished = true;
  const times = state.results.filter((r) => r.correct).map((r) => r.elapsedMs);
  recordSession({
    at: Date.now(),
    focus: weakFocus ? 'weak' : null,
    mode: config.mode,
    difficulty: config.difficulty,
    techniques: config.techniques.map((t) => t.id),
    total: state.results.length,
    correct: state.results.filter((r) => r.correct).length,
    medianMs: median(times),
    durationMs: Date.now() - state.sessionStart,
  });
  renderSummary();
}

// --- rendering -------------------------------------------------------------

function render({ feedback = null } = {}) {
  const problem = state.problem;
  // In a mixed session the name is withheld until you have answered — spotting which
  // method applies is part of the test.
  const showTechniqueName = config.techniques.length === 1 || state.phase === 'feedback';

  root.innerHTML = `
    <div class="drill-bar">
      <div>
        <span class="meter-label">${config.mode === 'sprint' ? 'Time left' : 'Elapsed'}</span>
        <span class="meter-value" data-meter="clock">${config.mode === 'sprint' ? formatClock(remainingMs()) : '0:00'}</span>
      </div>
      <div>
        <span class="meter-label">Problem</span>
        <span class="meter-value">${progressLabel()}</span>
      </div>
      <div>
        <span class="meter-label">Score</span>
        <span class="meter-value" data-meter="score">${state.results.filter((r) => r.correct).length}/${state.results.length}</span>
      </div>
      <div>
        <span class="meter-label">Streak</span>
        <span class="meter-value" data-meter="streak">${currentStreak()}</span>
      </div>
      <div class="spacer"></div>
      <button class="btn btn--small btn--ghost" type="button" data-action="end">End</button>
    </div>

    <div class="card prompt-card">
      <div class="prompt-instruction">${escapeHtml(problem.instruction)}</div>
      <div class="prompt expr">${problem.promptHtml}</div>
      ${showTechniqueName ? `<div class="prompt-technique">${escapeHtml(problem.technique.name)}</div>` : ''}
    </div>

    <form id="answer-form" autocomplete="off">
      <div class="answer-row">
        <input id="answer" name="answer" type="text" inputmode="text"
               aria-label="Your answer"
               spellcheck="false" autocapitalize="off"
               placeholder="${escapeHtml(problem.answerHint)}"
               ${state.phase === 'feedback' ? 'disabled' : ''}
               value="${state.phase === 'feedback' ? escapeHtml(feedback?.given ?? '') : ''}">
        <button class="btn btn--primary" type="submit">${state.phase === 'feedback' ? 'Next' : 'Check'}</button>
      </div>
    </form>

    ${feedback ? feedbackHtml(feedback, problem) : ''}

    <p class="shortcuts"><kbd>Enter</kbd> check / next &nbsp;·&nbsp; <kbd>Esc</kbd> end</p>`;

  const input = root.querySelector('#answer');
  if (state.phase === 'answering') input.focus();
  else root.querySelector('button[type="submit"]').focus();

  root.querySelector('#answer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.phase === 'feedback') advance();
    else submit(input.value);
  });
  root.querySelector('[data-action="end"]').addEventListener('click', finish);
}

function feedbackHtml(feedback, problem) {
  if (feedback.correct) {
    return `
      <div class="feedback feedback--correct">
        <strong>Correct</strong>
        <span class="timing">${formatSeconds(feedback.elapsedMs)}</span>
      </div>`;
  }
  return `
    <div class="feedback feedback--wrong">
      <strong>Not quite</strong>
      <span>${feedback.reason ? escapeHtml(feedback.reason) : 'The answer is'}</span>
      <span class="answer-value expr">${escapeHtml(problem.canonicalText)}</span>
      <span class="timing">${formatSeconds(feedback.elapsedMs)}</span>
    </div>`;
}

function renderSummary() {
  const total = state.results.length;
  const correct = state.results.filter((r) => r.correct).length;
  const timed = state.results.filter((r) => r.correct).map((r) => r.elapsedMs);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const missed = state.results.filter((r) => !r.correct);
  const slowest = state.results.slice().sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 3);
  const durationMs = Date.now() - state.sessionStart;
  const perMinute = durationMs > 0 ? (total / (durationMs / 60000)) : 0;

  root.innerHTML = `
    <h2 class="section-title">Session complete</h2>
    <p class="section-blurb">
      ${weakFocus ? 'Weak points' : escapeHtml(config.techniques.map((t) => t.name).join(', '))} ·
      ${escapeHtml(config.difficulty)} ·
      ${config.mode === 'sprint' ? `${config.limit}s sprint` : config.mode === 'set' ? `set of ${config.limit}` : 'endless'}
    </p>

    <div class="summary-grid">
      <div class="stat-tile"><div class="label">Correct</div><div class="value">${correct}/${total}</div><div class="sub">${accuracy}% accuracy</div></div>
      <div class="stat-tile"><div class="label">Median</div><div class="value">${timed.length ? formatSeconds(median(timed)) : '—'}</div><div class="sub">per solve</div></div>
      <div class="stat-tile"><div class="label">Fastest</div><div class="value">${timed.length ? formatSeconds(Math.min(...timed)) : '—'}</div><div class="sub">this session</div></div>
      <div class="stat-tile"><div class="label">Rate</div><div class="value">${perMinute.toFixed(1)}</div><div class="sub">problems / min</div></div>
    </div>

    ${missed.length ? `
      <h3 class="section-title">Missed (${missed.length})</h3>
      <div class="card table-scroll">
        <table>
          <thead><tr><th>Problem</th><th>You said</th><th>Answer</th><th class="num">Time</th></tr></thead>
          <tbody>
            ${missed.map((r) => `
              <tr>
                <td class="expr">${r.promptHtml}</td>
                <td class="expr">${escapeHtml(r.given)}</td>
                <td class="expr">${escapeHtml(r.canonicalText)}</td>
                <td class="num">${formatSeconds(r.elapsedMs)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : total ? '<p class="section-blurb">Clean sheet — nothing missed.</p>' : ''}

    ${slowest.length > 1 ? `
      <h3 class="section-title">Slowest</h3>
      <div class="card table-scroll">
        <table>
          <thead><tr><th>Problem</th><th>Answer</th><th class="num">Time</th></tr></thead>
          <tbody>
            ${slowest.map((r) => `
              <tr>
                <td class="expr">${r.promptHtml}</td>
                <td class="expr">${escapeHtml(r.canonicalText)}</td>
                <td class="num">${formatSeconds(r.elapsedMs)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

    <div class="control-row" style="margin-top:24px">
      <button class="btn btn--primary" type="button" data-action="again">Run it again</button>
      ${missed.length ? '<button class="btn" type="button" data-action="retry-missed">Retry the missed techniques</button>' : ''}
      <a class="btn btn--ghost" href="index.html">Change drill</a>
      <a class="btn btn--ghost" href="stats.html">See stats</a>
    </div>`;

  root.querySelector('[data-action="again"]').addEventListener('click', () => {
    const again = new URLSearchParams({ mode: config.mode, d: config.difficulty, limit: String(config.limit) });
    // Re-running a weak-point session re-reads your stats, so it retargets rather than
    // repeating the same technique list.
    if (weakFocus) again.set('focus', 'weak');
    else again.set('t', config.techniques.map((t) => t.id).join(','));
    window.location.href = `drill.html?${again}`;
  });
  root.querySelector('[data-action="retry-missed"]')?.addEventListener('click', () => {
    const ids = [...new Set(missed.map((r) => r.techniqueId))];
    window.location.href = `drill.html?${new URLSearchParams({
      t: ids.join(','),
      mode: 'set',
      d: config.difficulty,
      limit: String(Math.max(5, missed.length)),
    })}`;
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !state.finished) {
    event.preventDefault();
    finish();
  }
});

// Sanity check for a hand-edited URL listing an unknown technique.
if (params.get('t') && config.techniques.length < params.get('t').split(',').length) {
  console.warn('Some technique ids in the URL were not recognised. Known ids:', TECHNIQUES.map((t) => t.id));
}
