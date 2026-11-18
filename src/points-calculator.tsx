import {useEffect, useRef, useState} from 'react';
import {Calculator, Check, GraduationCap, Pencil, RotateCcw, X} from 'lucide-react';
import {courses, defaults, matches} from './lib/course-data';
import {calculatePoints, coursePointsLink, emptyDraft, gradeRanges, MAX_SUBJECTS, pointsFor, readCalculatorDraft, type GradeLevel, type PointEntry} from './lib/points-calculator';

const STORAGE_KEY = 'cao-points-calculator-v1';
const levels: {value: GradeLevel; label: string}[] = [{value: 'H', label: 'Higher'}, {value: 'O', label: 'Ordinary'}, {value: 'LCVP', label: 'LCVP'}];
const labelFor = (entry: PointEntry, index: number) => entry.kind === 'maths' ? 'Maths' : entry.kind === 'lcvp' ? 'LCVP' : `Subject ${index + 1}`;

export default function PointsCalculator() {
  const [draft, setDraft] = useState(() => {
    try { return readCalculatorDraft(sessionStorage.getItem(STORAGE_KEY)); } catch { return emptyDraft; }
  });
  const {entries, mathsLevel, step} = draft;
  const [level, setLevel] = useState<GradeLevel>('H');
  const [editing, setEditing] = useState<number | null>(null);
  const [nearby, setNearby] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const nextId = useRef(Math.max(0, ...entries.map(e => e.id)) + 1);
  const reported = useRef(false);
  const current = entries.find(e => e.id === editing);
  const maths = step === 'maths' || current?.kind === 'maths';
  const activeLevel = maths ? mathsLevel : level;
  const {best, total, bonusIncluded} = calculatePoints(entries);
  const counted = new Set(best.map(e => e.id));
  const enough = entries.length >= 6;
  const full = entries.length >= MAX_SUBJECTS && !current;
  const min = nearby ? Math.max(0, total - 50) : 0;
  const matchingCourses = enough ? courses.filter(c => matches(c, {...defaults, points: [min, total], pointsOnly: true, levels: []})).length : 0;
  const hasLCVP = entries.some(e => e.kind === 'lcvp');
  const hasMaths = entries.some(e => e.kind === 'maths');
  const grades = activeLevel === 'LCVP' ? ['Distinction', 'Merit', 'Pass'] : Array.from({length: 8}, (_, i) => activeLevel + (i + 1));

  useEffect(() => {
    // Keep the estimate when visiting courses or returning with Back, within this tab.
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({...draft, version: 1})); } catch {}
  }, [draft]);
  useEffect(() => {
    if (enough && !reported.current) {
      (window as any).caoTrack?.('calculator_complete'); reported.current = true;
    }
  }, [enough]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  useEffect(() => { if (step !== 'intro') heading.current?.focus({preventScroll: true}); }, [step, editing]);

  function start(value: 'H' | 'O') { setDraft({...emptyDraft, step: 'maths', mathsLevel: value}); }
  function chooseGrade(grade: string) {
    if (full) return;
    const kind = maths ? 'maths' : activeLevel === 'LCVP' ? 'lcvp' : 'subject';
    if (kind === 'lcvp' && hasLCVP && current?.kind !== 'lcvp') return;
    const entry: PointEntry = {id: current?.id ?? nextId.current++, kind, grade};
    setDraft(old => ({...old, step: 'grades', entries: current ? old.entries.map(e => e.id === current.id ? entry : e) : [...old.entries, entry]}));
    setMessage(`${current ? 'Updated' : 'Added'} ${kind === 'maths' ? 'Maths ' : kind === 'lcvp' ? 'LCVP ' : ''}${grade}.`);
    setEditing(null); setConfirmReset(false);
    if (maths || activeLevel === 'LCVP') setLevel('H');
  }
  function edit(entry: PointEntry) {
    setEditing(entry.id); setLevel(entry.kind === 'lcvp' ? 'LCVP' : entry.grade.startsWith('H') ? 'H' : 'O');
    if (entry.kind === 'maths') setDraft(old => ({...old, mathsLevel: entry.grade.startsWith('H') ? 'H' : 'O'}));
    setMessage('');
    document.getElementById('points-entry')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  function remove(entry: PointEntry, index: number) {
    setDraft(old => ({...old, entries: old.entries.filter(e => e.id !== entry.id)}));
    if (editing === entry.id) { setEditing(null); setLevel('H'); }
    setMessage(`Removed ${labelFor(entry, index)} ${entry.grade}.`);
  }
  function reset() {
    setDraft(emptyDraft); setLevel('H'); setEditing(null); setNearby(false); setConfirmReset(false);
    setMessage('Grades cleared.'); reported.current = false; nextId.current = 1;
  }

  return <section className="points-page content-width">
    <div className="points-title"><span className="points-title-icon"><Calculator size={27}/></span><div><h1>Points calculator</h1><p>Tap your grades. We’ll count your best six.</p></div></div>
    {step === 'intro' ? <div className="points-start">
      <span className="points-start-label">Start with maths</span><h2>Do you take Higher Level Maths?</h2>
      <p>We’ll include the bonus if it counts towards your total.</p>
      <div className="points-start-options"><button onClick={() => start('H')}><strong>Yes</strong><span>Higher Level Maths</span><small>25 bonus points at H6 or above</small></button><button onClick={() => start('O')}><strong>No</strong><span>Ordinary Level or other</span><small>Continue without the Higher Maths bonus</small></button></div>
      <p className="points-start-note">Use your results or predicted grades from one sitting.</p>
    </div> : <div className="points-workspace">
      <aside className="points-summary" aria-label="Your points total">
        <div className="points-total-label">{enough ? 'Your estimated CAO points' : 'Your points so far'}</div>
        <div className="points-total" aria-live="polite" aria-atomic="true"><strong>{total}</strong><span>/ 625</span></div>
        <div className="points-progress" aria-hidden="true">{Array.from({length: 6}, (_, i) => <span className={i < entries.length ? 'filled' : ''} key={i}/>)}</div>
        <p className="points-count">{enough ? `Best 6 of ${entries.length} subjects` : `${entries.length} of 6 subjects added`}</p>
        {bonusIncluded && <p className="points-bonus"><Check size={15}/>25-point Maths bonus included</p>}
        {!bonusIncluded && entries.some(e => pointsFor(e).bonus > 0) && <p className="points-bonus muted-bonus">Maths is outside your best six</p>}
        {enough && <div className="points-course-action">
          <div className="points-range" aria-label="Course points range"><button aria-pressed={!nearby} onClick={() => setNearby(false)}>Up to {total}</button><button aria-pressed={nearby} onClick={() => setNearby(true)}>{Math.max(0, total - 50)}–{total}</button></div>
          <a className="points-find-courses" href={coursePointsLink(total, nearby)} onClick={() => (window as any).caoTrack?.('calculator_courses')}><GraduationCap size={19}/>See {matchingCourses.toLocaleString()} courses</a>
        </div>}
      </aside>
      <section className="points-entry" id="points-entry" aria-labelledby="points-entry-title">
        <div className="points-entry-heading"><div><span className="points-overline">{maths ? 'Maths grade' : current ? 'Edit grade' : 'Add your grades'}</span><h2 id="points-entry-title" tabIndex={-1} ref={heading}>{maths ? 'What’s your maths grade?' : current ? `Change ${labelFor(current, entries.indexOf(current))}` : full ? 'All 10 subjects added' : `Add subject ${entries.length + 1}`}</h2></div>{current && <button className="points-text-button" onClick={() => {setEditing(null); setLevel('H');}}>Cancel</button>}</div>
        {full ? <p className="points-helper">Your best six are counted. Tap a saved grade below to change it.</p> : <>
          <div className="points-levels" role="group" aria-label={maths ? 'Maths level' : 'Subject level'}>{levels.filter(l => !maths || l.value !== 'LCVP').map(l => <button key={l.value} aria-pressed={activeLevel === l.value} disabled={l.value === 'LCVP' && hasLCVP && current?.kind !== 'lcvp'} onClick={() => maths ? setDraft(old => ({...old, mathsLevel: l.value as 'H' | 'O'})) : setLevel(l.value)}>{l.label}</button>)}</div>
          <div className={'points-grade-grid' + (activeLevel === 'LCVP' ? ' points-lcvp-grid' : '')}>{grades.map((grade, index) => {
            const score = pointsFor({kind: maths ? 'maths' : activeLevel === 'LCVP' ? 'lcvp' : 'subject', grade});
            return <button key={grade} className={'points-grade-button' + (current?.grade === grade ? ' is-current' : '')} aria-label={`${current ? 'Set' : 'Add'} ${maths ? 'Maths ' : activeLevel === 'LCVP' ? 'LCVP ' : ''}${grade}, ${score.points} points${score.bonus ? ', including 25 bonus' : ''}`} onClick={() => chooseGrade(grade)}><strong>{grade}</strong>{activeLevel !== 'LCVP' && <span>{gradeRanges[index]}</span>}<small>{score.points} pts</small>{score.bonus > 0 && <em>+25 included</em>}</button>;
          })}</div>
          {(maths || activeLevel === 'LCVP') && <p className="points-helper">{maths ? (activeLevel === 'H' ? 'These scores include the 25-point bonus at H6 or better.' : 'Ordinary Maths uses the standard points scale.') : 'LCVP can count as one of your best six subjects.'}</p>}
          {step === 'maths' && !current && <button className="points-text-button" onClick={() => setDraft(old => ({...old, step: 'grades'}))}>Skip maths</button>}
        </>}
      </section>
      <section className="points-saved-grades" aria-label="Your grades">
        <div className="points-grades-heading"><h2>Your grades <span>{entries.length}/{MAX_SUBJECTS}</span></h2>{entries.length > 0 && <button className="points-text-button" onClick={() => setConfirmReset(true)}><RotateCcw size={14}/>Start over</button>}</div>
        {confirmReset && <div className="points-reset"><span>Clear all your grades?</span><button onClick={reset}>Clear grades</button><button onClick={() => setConfirmReset(false)}>Keep grades</button></div>}
        {entries.length ? <><div className="points-chips">{entries.map((entry, index) => {
          const score = pointsFor(entry); const included = counted.has(entry.id);
          return <div data-kind={entry.kind} className={'points-chip' + (included ? ' is-counted' : '') + (editing === entry.id ? ' is-editing' : '')} key={entry.id}><button className="points-chip-edit" aria-label={`Edit ${labelFor(entry, index)}, ${entry.grade}`} onClick={() => edit(entry)}><span className="points-chip-subject">{labelFor(entry, index)}<Pencil size={12}/></span><span className="points-chip-grade">{entry.grade}<small>{score.points} pts</small></span><span className="points-chip-counted">{included ? <><Check size={12}/>Counted{score.bonus > 0 ? ' · +25' : ''}</> : 'Outside best six'}</span></button><button className="points-chip-remove" aria-label={`Remove ${labelFor(entry, index)}, ${entry.grade}`} onClick={() => remove(entry, index)}><X size={15}/></button></div>;
        })}</div><p className="points-helper">Tap a grade to edit it. Enter each subject once.</p></> : <p className="points-empty">Your grades will appear here as you add them.</p>}
        {step === 'grades' && !hasMaths && entries.length < MAX_SUBJECTS && <button className="points-text-button" onClick={() => {setEditing(null); setDraft(old => ({...old, step: 'maths'}));}}>Add maths</button>}
      </section>
    </div>}
    <p className="points-announcement sr-only" role="status">{message}</p>
    <details className="points-explanation"><summary>How your points are calculated</summary><div><p>Your six highest scores from one Leaving Certificate sitting count. We add 25 points to Higher Maths at H6 or above before choosing your best six. LCVP can take one of those six places.</p><p>Course matches use published 2026 Leaving Cert points. Entry requirements still apply, and points can change. Foundation Level and medicine’s adjusted scores are not included.</p><a href="https://www.cao.ie/index.php?page=scoring&s=lcepointsgrid" target="_blank" rel="noreferrer">Official CAO scoring rules</a></div></details>
  </section>;
}
