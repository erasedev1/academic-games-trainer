// Per-technique history and personal bests, drawn as inline SVG — no chart library.

import { TECHNIQUES } from './techniques/index.js';
import { clearStats, exportStats, importStats, loadStats } from './storage.js';
import { escapeHtml, formatSeconds, median } from './lib/format.js';

const root = document.getElementById('stats');
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function render() {
  const data = loadStats();
  const rows = [];
  for (const technique of TECHNIQUES) {
    for (const difficulty of DIFFICULTIES) {
      const record = data.techniques[`${technique.id}:${difficulty}`];
      if (record?.attempts) rows.push({ technique, difficulty, record });
    }
  }

  if (!rows.length) {
    root.innerHTML = `
      <div class="empty">
        <p>No drills recorded yet.</p>
        <p><a href="index.html">Start one</a> and your accuracy and solve times will show up here.</p>
      </div>`;
    return;
  }

  const totals = rows.reduce(
    (acc, { record }) => ({
      attempts: acc.attempts + record.attempts,
      correct: acc.correct + record.correct,
      times: [...acc.times, ...record.times],
      longestStreak: Math.max(acc.longestStreak, record.longestStreak),
    }),
    { attempts: 0, correct: 0, times: [], longestStreak: 0 },
  );
  const slowest = Math.max(...rows.map(({ record }) => median(record.times) ?? 0), 1);
  const sessions = data.sessions.slice(-30);

  root.innerHTML = `
    <div class="summary-grid">
      <div class="stat-tile"><div class="label">Problems</div><div class="value">${totals.attempts}</div><div class="sub">all time</div></div>
      <div class="stat-tile"><div class="label">Accuracy</div><div class="value">${Math.round((totals.correct / totals.attempts) * 100)}%</div><div class="sub">${totals.correct} correct</div></div>
      <div class="stat-tile"><div class="label">Median</div><div class="value">${totals.times.length ? formatSeconds(median(totals.times)) : '—'}</div><div class="sub">per solve</div></div>
      <div class="stat-tile"><div class="label">Best streak</div><div class="value">${totals.longestStreak}</div><div class="sub">in a row</div></div>
    </div>

    <h2 class="section-title">By technique</h2>
    <div class="card table-scroll">
      <table>
        <thead>
          <tr>
            <th>Technique</th><th>Level</th><th class="num">Done</th><th class="num">Accuracy</th>
            <th>Speed</th><th class="num">Median</th><th class="num">Best</th><th class="num">Streak</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ technique, difficulty, record }) => {
            const mid = median(record.times);
            const accuracy = Math.round((record.correct / record.attempts) * 100);
            return `
              <tr>
                <td>${escapeHtml(technique.name)}</td>
                <td class="muted">${difficulty}</td>
                <td class="num">${record.attempts}</td>
                <td class="num">${accuracy}%</td>
                <td><div class="bar" title="${mid === null ? 'no timed solves' : formatSeconds(mid)}"><span style="width:${mid === null ? 0 : Math.round((mid / slowest) * 100)}%"></span></div></td>
                <td class="num">${mid === null ? '—' : formatSeconds(mid)}</td>
                <td class="num">${record.best === null ? '—' : formatSeconds(record.best)}</td>
                <td class="num">${record.longestStreak}</td>
                <td><a class="btn btn--small" href="drill.html?t=${technique.id}&amp;mode=sprint&amp;d=${difficulty}&amp;limit=60">Drill</a></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p class="answer-hint">The speed bar is relative to your slowest technique, so shorter is better.</p>

    <h2 class="section-title">Recent sessions</h2>
    ${sessions.length > 1 ? sessionChart(sessions) : '<p class="section-blurb">Finish a couple more sessions and a trend line will appear here.</p>'}
    <div class="card table-scroll" style="margin-top:14px">
      <table>
        <thead><tr><th>When</th><th>Drill</th><th class="num">Score</th><th class="num">Median</th></tr></thead>
        <tbody>
          ${data.sessions.slice(-12).reverse().map((session) => `
            <tr>
              <td>${new Date(session.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <td>${escapeHtml(sessionLabel(session))}</td>
              <td class="num">${session.correct}/${session.total}</td>
              <td class="num">${session.medianMs ? formatSeconds(session.medianMs) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h2 class="section-title">Your data</h2>
    <div class="card">
      <p class="section-blurb" style="margin-top:0">
        Stats live in this browser's local storage. Export them if you want to move to another
        browser or keep a backup.
      </p>
      <div class="control-row" style="margin-bottom:0">
        <button class="btn" type="button" data-action="export">Export JSON</button>
        <button class="btn" type="button" data-action="import">Import JSON</button>
        <button class="btn" type="button" data-action="clear">Clear everything</button>
        <span class="answer-hint" data-role="io-message"></span>
      </div>
    </div>`;

  wireDataButtons();
}

function sessionLabel(session) {
  const names = session.techniques
    .map((id) => TECHNIQUES.find((t) => t.id === id)?.name ?? id);
  const label = names.length > 2 ? `${names.length} techniques` : names.join(', ');
  return `${label} · ${session.difficulty}`;
}

/** Accuracy per session as a simple line chart — plain SVG, sized by viewBox. */
function sessionChart(sessions) {
  const width = 720;
  const height = 180;
  const pad = { top: 12, right: 14, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const points = sessions.map((session, i) => {
    const accuracy = session.total ? session.correct / session.total : 0;
    return {
      x: pad.left + (sessions.length === 1 ? plotW / 2 : (i / (sessions.length - 1)) * plotW),
      y: pad.top + (1 - accuracy) * plotH,
      accuracy,
    };
  });

  return `
    <div class="card">
      <svg class="chart" viewBox="0 0 ${width} ${height}" role="img"
           aria-label="Accuracy across your last ${sessions.length} sessions">
        ${[0, 0.5, 1].map((fraction) => {
          const y = pad.top + (1 - fraction) * plotH;
          return `<line class="axis" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
                  <text class="label" x="4" y="${y + 3}">${Math.round(fraction * 100)}%</text>`;
        }).join('')}
        <polyline class="line" points="${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"></polyline>
        ${points.map((p) => `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"></circle>`).join('')}
        <text class="label" x="${pad.left}" y="${height - 8}">oldest</text>
        <text class="label" x="${width - pad.right}" y="${height - 8}" text-anchor="end">latest</text>
      </svg>
    </div>`;
}

function wireDataButtons() {
  const message = root.querySelector('[data-role="io-message"]');

  root.querySelector('[data-action="export"]').addEventListener('click', async () => {
    const text = exportStats();
    try {
      await navigator.clipboard.writeText(text);
      message.textContent = 'Copied to your clipboard.';
    } catch {
      // Clipboard access needs a secure context and permission; show the JSON instead.
      window.prompt('Copy your stats:', text);
    }
  });

  root.querySelector('[data-action="import"]').addEventListener('click', () => {
    const text = window.prompt('Paste an exported stats JSON:');
    if (!text) return;
    try {
      importStats(text);
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  root.querySelector('[data-action="clear"]').addEventListener('click', () => {
    if (!window.confirm('Delete all recorded stats from this browser?')) return;
    clearStats();
    render();
  });
}

render();
