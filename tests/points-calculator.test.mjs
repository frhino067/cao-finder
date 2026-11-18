import assert from 'node:assert/strict';
import {build} from 'esbuild';
const {outputFiles} = await build({stdin: {contents: "export * from './src/lib/points-calculator'; export {matches, filtersFromParams, defaults, courses} from './src/lib/course-data';", resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false});
const {calculatePoints, pointsFor, coursePointsLink, readCalculatorDraft, emptyDraft, matches, filtersFromParams, courses} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const rows = (...grades) => grades.map((grade, i) => ({id: i + 1, kind: i === 0 ? 'maths' : ['Distinction', 'Merit', 'Pass'].includes(grade) ? 'lcvp' : 'subject', grade}));
assert.equal(calculatePoints([]).total, 0);
assert.equal(calculatePoints(rows('H1', 'H1', 'H1', 'H1', 'H1', 'H1', 'H1')).total, 625);
assert.deepEqual(pointsFor({kind: 'maths', grade: 'H6'}), {base: 46, bonus: 25, points: 71});
assert.equal(pointsFor({kind: 'maths', grade: 'H7'}).bonus, 0);
assert.equal(pointsFor({kind: 'subject', grade: 'H1'}).points, 100);
assert.equal(pointsFor({kind: 'maths', grade: 'O1'}).points, 56);
assert.equal(calculatePoints(rows('H6', 'H1', 'H1', 'H1', 'H1', 'H1', 'H1')).total, 600);
assert.equal(calculatePoints(rows('H6', 'H1', 'H1', 'H1', 'H1', 'H1', 'H1')).bonusIncluded, false);
// Official CAO worked example, including the bonus before selecting the six.
assert.equal(calculatePoints(rows('H5', 'H2', 'O2', 'H6', 'H3', 'O3', 'H5')).total, 394);
const mixed = rows('O1', 'H3', 'O4', 'H5', 'O6', 'O7', 'Distinction');
assert.equal(calculatePoints(mixed).total, 295);
assert.equal(calculatePoints(mixed).best.some(e => e.grade === 'O7'), false);
assert.equal(calculatePoints(rows('H8', 'O7', 'O8', 'H8', 'O7', 'O8')).total, 0);
const before = JSON.stringify(mixed); calculatePoints(mixed); assert.equal(JSON.stringify(mixed), before);
const edited = mixed.map(e => e.id === 1 ? {...e, grade: 'H1'} : e);
assert.equal(calculatePoints(edited).total, 364);
assert.equal(calculatePoints(edited.filter(e => e.kind !== 'lcvp')).total, 298);
for (const [grade, points] of [['Distinction', 66], ['Merit', 46], ['Pass', 28]]) assert.equal(pointsFor({kind: 'lcvp', grade}).points, points);
const stored = {version: 1, step: 'grades', mathsLevel: 'H', entries: mixed};
assert.deepEqual(readCalculatorDraft(JSON.stringify(stored)).entries, mixed);
assert.deepEqual(readCalculatorDraft('broken'), emptyDraft);
assert.deepEqual(readCalculatorDraft(JSON.stringify({...stored, entries: [mixed[0], mixed[0]]})), emptyDraft);
assert.deepEqual(readCalculatorDraft(JSON.stringify({...stored, entries: [{id: 1, kind: 'subject', grade: '__proto__'}]})), emptyDraft);
assert.equal(readCalculatorDraft(JSON.stringify({...stored, step: 'maths', entries: mixed.slice(1)})).entries.length, 6);
for (const total of [0, 295, 625]) {
 for (const nearby of [false, true]) {
  const link = coursePointsLink(total, nearby);
  const filters = filtersFromParams(new URLSearchParams(link.split('?')[1]));
  assert.deepEqual(filters.points, [nearby ? Math.max(0, total - 50) : 0, total]);
  assert.deepEqual(filters.levels, [], 'Calculator results include every course level');
  const found = courses.filter(c => matches(c, filters));
  assert.ok(found.every(c => c.points !== null && !c.special && c.points >= filters.points[0] && c.points <= total));
  assert.equal(matches({...courses[0], points: null, special: false}, filters), false, 'Unknown scores must never be advertised as within reach');
  assert.equal(matches({...courses[0], points: 500, special: true}, filters), false, 'Assessment totals are excluded even at 625');
 }
}
assert.deepEqual(filtersFromParams(new URLSearchParams('points=400')).points, [0, 400]);
assert.deepEqual(filtersFromParams(new URLSearchParams('points=400')).levels, ['8']);
assert.deepEqual(filtersFromParams(new URLSearchParams('points=bogus&min=Infinity')).points, [0, 625]);
assert.deepEqual(filtersFromParams(new URLSearchParams('points=900&min=700')).points, [625, 625]);
console.log('Points calculator tests passed.');
