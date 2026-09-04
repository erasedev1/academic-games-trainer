// The technique registry — the single list every page reads from.

import cyclingRegular from './cycling-regular.js';
import lambdaValue from './lambda-value.js';
import cyclingLambda from './cycling-lambda.js';
import cyclingSpecial from './cycling-special.js';
import cyclingSuper from './cycling-super.js';
import cyclingSuperDuper from './cycling-super-duper.js';
import cyclingAlain from './cycling-alain.js';
import factorsMain from './factors-main.js';
import egFirst from './eg-first.js';
import egSecond from './eg-second.js';
import egThird from './eg-third.js';
import egImproved from './eg-improved.js';
import egBases from './eg-bases.js';

export const TECHNIQUES = [
  cyclingRegular,
  lambdaValue,
  cyclingLambda,
  cyclingSpecial,
  cyclingSuper,
  cyclingSuperDuper,
  cyclingAlain,
  factorsMain,
  egFirst,
  egSecond,
  egThird,
  egImproved,
  egBases,
];

export const FAMILIES = [
  { id: 'cycling', name: 'Cycling', blurb: 'Modular exponentiation, from writing out a cycle to collapsing a four-storey tower.' },
  { id: 'factors', name: 'Number of Factors + PotB', blurb: 'x(n) and the Ex-Girlfriend formulas that build any target out of a handful of cubes.' },
];

/**
 * What can actually be drilled. A technique marked `drillable: false` still appears in the
 * reference — the method is real and other techniques build on it — but is not offered as a
 * drill of its own.
 */
export const DRILLS = TECHNIQUES.filter((t) => t.drillable !== false);

export const BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]));

export function getTechnique(id) {
  return BY_ID.get(id) ?? null;
}

/** Resolves an id only if it is something you can start a session on. */
export function getDrill(id) {
  const technique = BY_ID.get(id);
  return technique && technique.drillable !== false ? technique : null;
}

export function techniquesInFamily(familyId) {
  return TECHNIQUES.filter((t) => t.family === familyId);
}

export function drillsInFamily(familyId) {
  return DRILLS.filter((t) => t.family === familyId);
}
