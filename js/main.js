// Home page: pick techniques, pick a format, launch.

import { FAMILIES, getTechnique, techniquesInFamily } from './techniques/index.js';
import { getRecord, loadPreferences, loadStats, savePreferences } from './storage.js';
import { formatSeconds, median } from './lib/format.js';

const LIMITS = {
  sprint: [
    { value: 30, label: '30s' },
    { value: 60, label: '60s' },
    { value: 120, label: '2 min' },
  ],
  set: [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
  ],
  endless: [],
};

const prefs = loadPreferences();
// A saved preference can name a technique that no longer exists.
const savedSelection = (prefs.selected ?? []).filter((id) => getTechnique(id));
const state = {
  selected: new Set(savedSelection.length ? savedSelection : ['cycling-regular']),
  mode: prefs.mode ?? 'sprint',
  limit: prefs.limit ?? 60,
  difficulty: prefs.difficulty ?? 'medium',
};

const stats = loadStats();
const families = document.getElementById('families');
const modeGroup = document.getElementById('mode');
const limitGroup = document.getElementById('limit');
const difficultyGroup = document.getElementById('difficulty');
const summary = document.getElementById('selection-summary');
const startButton = document.getElementById('start');

/** A one-line "you've done this N times, median 4.2s" for a technique card. */
function recordSummary(techniqueId) {
  const record = getRecord(stats, techniqueId, state.difficulty);
  if (!record.attempts) return '—';
  const accuracy = Math.round((record.correct / record.attempts) * 100);
  const mid = median(record.times);
  return `${record.attempts} attempted · ${accuracy}% · ${mid === null ? '—' : `median ${formatSeconds(mid)}`}`;
}

function renderFamilies() {
  families.innerHTML = FAMILIES.map((family) => `
    <h2 class="section-title">${family.name}</h2>
    <div class="technique-grid">
      ${techniquesInFamily(family.id).map((technique) => `
        <button type="button" class="technique" data-id="${technique.id}"
                aria-pressed="${state.selected.has(technique.id)}">
          <span class="technique-name">${technique.name}</span>
          <span class="technique-form expr">${technique.form}</span>
          <span class="technique-stat" data-stat="${technique.id}">${recordSummary(technique.id)}</span>
        </button>
      `).join('')}
    </div>
  `).join('');
}

function renderLimits() {
  const options = LIMITS[state.mode];
  limitGroup.hidden = options.length === 0;
  limitGroup.innerHTML = options
    .map((option) => `<button type="button" value="${option.value}" aria-pressed="${state.limit === option.value}">${option.label}</button>`)
    .join('');
  // Keep the limit valid when switching between seconds and problem counts.
  if (options.length && !options.some((option) => option.value === state.limit)) {
    state.limit = options[Math.min(1, options.length - 1)].value;
    renderLimits();
  }
}

function syncSegmented(group, value) {
  for (const button of group.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.value === String(value)));
  }
}

function renderSummary() {
  const count = state.selected.size;
  startButton.disabled = count === 0;
  summary.textContent = count === 0
    ? 'Pick at least one.'
    : count === 1 ? '' : `${count} techniques, interleaved.`;
}

function refreshStatLines() {
  for (const element of families.querySelectorAll('[data-stat]')) {
    element.textContent = recordSummary(element.dataset.stat);
  }
}

function persist() {
  savePreferences({
    selected: [...state.selected],
    mode: state.mode,
    limit: state.limit,
    difficulty: state.difficulty,
  });
}

families.addEventListener('click', (event) => {
  const button = event.target.closest('.technique');
  if (!button) return;
  const { id } = button.dataset;
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  button.setAttribute('aria-pressed', String(state.selected.has(id)));
  renderSummary();
  persist();
});

modeGroup.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  state.mode = button.value;
  syncSegmented(modeGroup, state.mode);
  renderLimits();
  persist();
});

limitGroup.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  state.limit = Number(button.value);
  syncSegmented(limitGroup, state.limit);
  persist();
});

difficultyGroup.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  state.difficulty = button.value;
  syncSegmented(difficultyGroup, state.difficulty);
  refreshStatLines();
  persist();
});

document.getElementById('launcher').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.selected.size) return;
  const params = new URLSearchParams({
    t: [...state.selected].join(','),
    mode: state.mode,
    d: state.difficulty,
  });
  if (LIMITS[state.mode].length) params.set('limit', String(state.limit));
  window.location.href = `drill.html?${params}`;
});

renderFamilies();
syncSegmented(modeGroup, state.mode);
syncSegmented(difficultyGroup, state.difficulty);
renderLimits();
renderSummary();
