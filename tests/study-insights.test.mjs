import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles} = await build({
  stdin: {contents: "export {studyInsights} from './src/lib/study-insights'; export {routeView} from './src/lib/routes';",
    resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {studyInsights, routeView} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const entry = (subject, topic, difficulty, studied_on = '2026-11-09') => ({subject, topic, difficulty, studied_on});
const repeat = (subject, topic, difficulty) => [
  entry(subject, topic, difficulty), entry(subject, topic, difficulty, '2026-11-10'), entry(subject, topic, difficulty),
];

assert.deepEqual(studyInsights([]), {total: 0, subjects: [], topics: [], building: []});
assert.equal(studyInsights([entry('Maths', 'Algebra', 5)]).subjects.length, 0);
assert.equal(studyInsights(Array.from({length: 5}, () => entry('Maths', 'Algebra', 5))).subjects.length, 0);
const data = [
  ...repeat('Mathematics', 'Complex numbers', 4),
  ...repeat('English', 'Poetry', 2),
  entry('Physics', 'Mechanics', 5),
  entry('  MATHEMATICS ', ' complex   NUMBERS ', 5, '2026-10-01'),
  ...repeat('English', 'Complex numbers', 1),
  ...repeat('Geography', '', 3),
];
const copy = JSON.stringify(data);
const result = studyInsights(data);
assert.equal(JSON.stringify(data), copy, 'Analysis must not modify the study log');
assert.equal(result.subjects[0].label, 'Mathematics');
assert.equal(result.subjects[0].average, 4.25);
assert.equal(result.subjects[0].count, 4);
assert.equal(result.subjects[0].days, 3);
assert.equal(result.building[0].label, 'Physics', 'One difficult session must not top the ranking');
assert.equal(result.topics[0].label, 'Complex numbers');
assert.equal(result.topics[0].subject, 'Mathematics');
assert.equal(result.topics.filter(group => group.label === 'Complex numbers').length, 2, 'Topics stay within their subject');
assert.ok(result.topics.every(group => group.label.trim()), 'Optional blank topics must not be ranked');
assert.equal(studyInsights(data.filter(row => row.subject !== 'Mathematics')).topics.some(group => group.subject === 'Mathematics'), false,
  'Edits and deletions must remove ineligible groups from the ranking');
assert.equal(studyInsights([...repeat('Biology', 'Cells', 5), ...repeat('Latin', 'Grammar', 5)]).subjects[0].label, 'Biology');

for (const route of ['#/', '#/courses', '#/calculator', '#/study', '#/account', '#/colleges', '#/categories', '#/saved']) {
  assert.equal(routeView(route), route === '#/' ? 'home' : route.slice(2));
}
for (const route of ['#/?q=business', '#/?college=DN', '#/?points=450', '#/courses?category=Business']) {
  assert.equal(routeView(route), 'courses', 'Existing filtered course links must continue to open the finder');
}
assert.equal(routeView('#/unknown'), 'home');
console.log('Study difficulty insights and homepage route checks passed.');
