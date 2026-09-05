// The technique registry — the single list every page reads from.

import cyclingRegular from './cycling-regular.js';
import lambdaValue from './lambda-value.js';
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
import egReach from './eg-reach.js';

export const TECHNIQUES = [
  cyclingRegular,
  lambdaValue,
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
  egReach,
];

export const FAMILIES = [
  { id: 'cycling', name: 'Cycling' },
  { id: 'factors', name: 'Number of Factors' },
];

const BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]));

export function getTechnique(id) {
  return BY_ID.get(id) ?? null;
}

export function techniquesInFamily(familyId) {
  return TECHNIQUES.filter((t) => t.family === familyId);
}
