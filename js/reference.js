// The manual, rendered from the same modules the drills use.

import { FAMILIES, techniquesInFamily } from './techniques/index.js';
import { escapeHtml } from './lib/format.js';

const nav = document.getElementById('ref-nav');
const container = document.getElementById('reference');

nav.innerHTML = FAMILIES.flatMap((family) =>
  techniquesInFamily(family.id).map((t) => `<a href="#${t.id}">${escapeHtml(t.name)}</a>`),
).join('');

container.innerHTML = FAMILIES.map((family) => `
  <h2 class="section-title">${escapeHtml(family.name)}</h2>
  <p class="section-blurb">${escapeHtml(family.blurb)}</p>
  ${techniquesInFamily(family.id).map(renderTechnique).join('')}
`).join('');

function renderTechnique(technique) {
  const { reference: ref } = technique;
  return `
    <section class="ref-entry" id="${technique.id}">
      <h3>${escapeHtml(technique.name)}</h3>
      <div class="form expr">${technique.form}</div>
      <p>${escapeHtml(ref.overview)}</p>

      <h4>Solving method</h4>
      <ol>${ref.method.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>

      ${ref.note ? `<p class="ref-note">${escapeHtml(ref.note)}</p>` : ''}

      <h4>Example solves</h4>
      ${ref.examples.map((example) => `
        <div class="ref-example">
          <div class="goal">${escapeHtml(example.goal)}</div>
          ${example.lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          <div class="result">${escapeHtml(example.answer)}</div>
          ${example.extra ? `<div class="extra">${escapeHtml(example.extra)}</div>` : ''}
        </div>`).join('')}

      <div class="ref-actions">
        <a class="btn btn--small" href="drill.html?t=${technique.id}&amp;mode=endless&amp;d=easy">Drill it, no clock</a>
        <a class="btn btn--small" href="drill.html?t=${technique.id}&amp;mode=sprint&amp;d=medium&amp;limit=60">60-second sprint</a>
      </div>
    </section>`;
}

// Highlight the entry a #hash points at, including when arriving from a drill.
function focusHash() {
  const target = document.getElementById(window.location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'start' });
}
window.addEventListener('hashchange', focusHash);
focusHash();
