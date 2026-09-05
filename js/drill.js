// The session runner: one generic loop over whichever techniques were selected.

import { getTechnique, TECHNIQUES } from './techniques/index.js';
import { createRng, randomSeed } from './lib/rng.js';
import { escapeHtml, formatClock, formatSeconds, median } from './lib/format.js';
import { loadLevels, loadStats, recordAttempt, recordLevelResult, recordSession } from './storage.js';
import { createWeakPicker, focusTechniques } from './weakness.js';
import { levelChangeText, levelOf } from './levels.js';

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
  // "adaptive" means each technique runs at its own level, which moves as you answer.
  difficulty: ['easy', 'medium', 'hard', 'adaptive'].includes(params.get('d')) ? params.get('d') : 'medium',
  limit: Number(params.get('limit')) || (params.get('mode') === 'set' ? 10 : 60),
  seed: Number(params.get('seed')) || randomSeed(),
};

const picker = weakFocus ? createWeakPicker(loadStats(), config.techniques) : null;
const adaptive = config.difficulty === 'adaptive';

const state = {
  rng: createRng(config.seed),
  problem: null,
  phase: 'answering',
  revealed: false,
  startedAt: 0,
  sessionStart: Date.now(),
  results: [],
  finished: false,
  // Held in memory so the level a problem is generated at is the one it is recorded
  // against, even though a move can land between two problems.
  levels: loadLevels(),
  levelMoves: [],
};

/** The level to set the next problem at, for this technique. */
function levelFor(techniqueId) {
  return adaptive ? levelOf(state.levels, techniqueId) : config.difficulty;
}

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
  const difficulty = levelFor(technique.id);
  const problem = picker
    ? picker.pickProblem(technique, difficulty, state.rng)
    : technique.generate(difficulty, state.rng);
  state.problem = { ...problem, technique, difficulty };
  state.phase = 'answering';
  state.revealed = false;
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
  if (text === '?') return reveal();

  const elapsedMs = Date.now() - state.startedAt;
  const result = state.problem.check(text);
  state.phase = 'feedback';
  state.results.push({
    correct: result.correct,
    elapsedMs,
    revealed: state.revealed,
    techniqueId: state.problem.technique.id,
    promptHtml: state.problem.promptHtml,
    canonicalText: state.problem.canonicalText,
    given: text,
  });
  recordAttempt({
    techniqueId: state.problem.technique.id,
    difficulty: state.problem.difficulty,
    correct: result.correct,
    elapsedMs,
    tags: state.problem.tags ?? [],
    revealed: state.revealed,
  });

  let move = null;
  // Answering after reading the walkthrough says nothing about whether you are ready to
  // move up, so a revealed problem is left out of the level window entirely.
  if (adaptive && !state.revealed) {
    const technique = state.problem.technique;
    const outcome = recordLevelResult(technique.id, state.problem.difficulty, result.correct);
    state.levels[technique.id] = { ...state.levels[technique.id], level: outcome.level };
    if (outcome.changed) {
      move = { name: technique.name, direction: outcome.changed, level: outcome.level };
      state.levelMoves.push(move);
    }
  }
  render({ feedback: { ...result, elapsedMs, given: text, move, revealed: state.revealed } });

  if (config.mode === 'set' && state.results.length >= config.limit) {
    // Let the last answer land on screen before the summary replaces it.
    setTimeout(finish, 900);
  }
}

function reveal() {
  state.revealed = true;
  render();
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
  const times = state.results.filter((r) => r.correct && !r.revealed).map((r) => r.elapsedMs);
  recordSession({
    at: Date.now(),
    focus: weakFocus ? 'weak' : null,
    mode: config.mode,
    difficulty: config.difficulty,
    techniques: config.techniques.map((t) => t.id),
    levelMoves: state.levelMoves.length,
    total: state.results.length,
    correct: state.results.filter((r) => r.correct).length,
    medianMs: median(times),
    durationMs: Date.now() - state.sessionStart,
  });
  renderSummary();
}

// --- rendering -------------------------------------------------------------

/**
 * The worked solution, shown once you have answered. Collapsed when you got it right —
 * you only need it when you did not — and opened automatically when you did not.
 */
function solutionHtml(problem, open) {
  return `
    <details class="solution"${open ? ' open' : ''}>
      <summary>Step-by-step solution</summary>
      <div class="solution-body">
        ${problem.steps.map((step) => `
          <div class="solution-step">
            <h4 class="expr">${step.title}</h4>
            ${step.lines.map((line) => `<div class="line expr">${line}</div>`).join('')}
          </div>`).join('')}
      </div>
    </details>`;
}

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
      ${adaptive ? `
        <div>
          <span class="meter-label">Level</span>
          <span class="meter-value">${escapeHtml(problem.difficulty)}</span>
        </div>` : ''}
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
    ${feedback?.move ? `<p class="level-move">${escapeHtml(levelChangeText(feedback.move.name, feedback.move.direction, feedback.move.level))}</p>` : ''}
    ${(feedback || state.revealed) && problem.steps?.length
      ? solutionHtml(problem, state.revealed || (feedback && !feedback.correct))
      : ''}

    <p class="shortcuts">
      <kbd>Enter</kbd> check / next &nbsp;·&nbsp;
      <kbd>?</kbd> then <kbd>Enter</kbd> shows the solution &nbsp;·&nbsp;
      <kbd>Esc</kbd> end
    </p>`;

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
        ${feedback.revealed ? '<span class="muted">— after a reveal, so it sets no record</span>' : ''}
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
  const timed = state.results.filter((r) => r.correct && !r.revealed).map((r) => r.elapsedMs);
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

    ${state.levelMoves.length ? `
      <div class="card level-moves">
        <h3 class="section-title" style="margin:0 0 8px">Levels moved</h3>
        <ul>${state.levelMoves.map((m) => `<li>${escapeHtml(levelChangeText(m.name, m.direction, m.level))}</li>`).join('')}</ul>
      </div>` : ''}

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
