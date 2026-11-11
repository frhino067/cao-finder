import {useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft,
  ChevronRight, LockKeyhole, Pencil, Plus, Target, Trash2,
} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {
  addDays, dateLabel, difficultyLabels, localDate, mondayOf, studySubjects,
  studySummary, studyTime, weekLabel, type StudyEntry,
} from './lib/study';
import type {useShortlist} from './lib/use-shortlist';
import StudyInsights from './study-insights';

type AccountState = ReturnType<typeof useShortlist>;
type Draft = {date: string; minutes: string; subject: string; difficulty: number; topic: string};
const table = 'cao_study_sessions';
const entryFields = 'id,studied_on,duration_minutes,subject,difficulty,topic';
const blankDraft = (date: string): Draft => ({date, minutes: '', subject: '', difficulty: 0, topic: ''});
const quickTimes = [25, 45, 60, 90];
const subjectColours = ['#6853dc', '#1d9e89', '#d97935', '#5985e0', '#cc5d88', '#78629e'];

export default function StudyTracker({account}: {account: AccountState}) {
  const {client, user, authReady, authError} = account;
  return <div className="study-page">
    <div className="content-width study-title"><h1>Study Tracker</h1></div>
    {!authReady ? <div className="content-width study-panel study-access" role="status">Checking your account…</div>
      : user && client ? <StudyWorkspace key={user.id} client={client} userId={user.id}/>
      : <section className="content-width study-panel study-access">
        <span className="study-feature-icon"><LockKeyhole size={23} aria-hidden="true"/></span>
        <h2>Sign in to track your study</h2>
        <p>Your study log is private and syncs across devices.</p>
        {authError && <p className="study-error" role="alert">{authError}</p>}
        <a className="primary-button" href="#/account">Sign in to CAO Finder<ArrowRight size={17}/></a>
      </section>}
  </div>;
}

function StudyWorkspace({client, userId}: {client: SupabaseClient; userId: string}) {
  const today = localDate();
  const currentWeek = mondayOf(today);
  const [week, setWeek] = useState(currentWeek);
  const [draft, setDraft] = useState<Draft>(() => blankDraft(today));
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StudyEntry | null>(null);
  const [data, setData] = useState<StudyEntry[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');
  const saving = useRef(false);
  const draftId = useRef<string | null>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => (data ?? []).filter(entry => entry.studied_on >= week
    && entry.studied_on <= addDays(week, 6)), [data, week]);
  const summary = useMemo(() => studySummary(entries, week), [entries, week]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    async function loadHistory() {
      try {
        const all: StudyEntry[] = [];
        let cursor: string | undefined;
        const batchSize = 500;
        while (!controller.signal.aborted) {
          let query = client.from(table).select(entryFields)
            .eq('user_id', userId)
            .order('id').limit(batchSize).abortSignal(controller.signal);
          if (cursor) query = query.gt('id', cursor);
          const {data, error} = await query;
          if (error) throw error;
          all.push(...data);
          if (data.length < batchSize) break;
          cursor = data[data.length - 1].id;
        }
        if (controller.signal.aborted) return;
        all.sort((a, b) => b.studied_on.localeCompare(a.studied_on) || a.subject.localeCompare(b.subject, 'en-IE'));
        setData(all);
      } catch {
        if (!controller.signal.aborted) setLoadError('Could not load study sessions. Reload to see your latest totals and insights.');
      }
    }
    void loadHistory();
    return () => controller.abort();
  }, [client, userId, refresh]);

  function selectWeek(next: string) {
    setWeek(next);
    setSubjectFilter('');
  }

  function resetForm(date: string) {
    draftId.current = null;
    setDraft(blankDraft(date));
    setEditing(null);
    setFormError('');
  }

  function editEntry(entry: StudyEntry) {
    draftId.current = null;
    setEditing(entry.id);
    setDraft({
      date: entry.studied_on, minutes: String(entry.duration_minutes), subject: entry.subject,
      difficulty: entry.difficulty, topic: entry.topic,
    });
    setMessage('');
    setFormError('');
    subjectInput.current?.focus();
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const duration = Number(draft.minutes);
    const subject = draft.subject.trim();
    const date = draft.date;
    if (!subject || !Number.isInteger(duration) || duration < 1 || duration > 1440
      || !date || date < '2000-01-01' || date > today || !difficultyLabels[draft.difficulty - 1]) {
      setFormError('Enter a subject, a valid date and duration, and choose how hard the session felt.');
      return;
    }
    saving.current = true;
    setPending(true);
    setFormError('');
    setMessage('');
    try {
      const patch = {
        studied_on: date, duration_minutes: duration, subject,
        difficulty: draft.difficulty, topic: draft.topic.trim(),
      };
      // Keep the same id if a save is retried after a connection drops.
      const result = editing
        ? await client.from(table).update(patch).eq('id', editing).eq('user_id', userId).select('id').maybeSingle()
        : await client.from(table).upsert({id: (draftId.current ??= crypto.randomUUID()), ...patch}, {onConflict: 'id'})
            .select('id').single();
      if (result.error) throw result.error;
      if (!result.data) {
        resetForm(today);
        setFormError('This session was removed on another device. Your log has been refreshed.');
        setRefresh(value => value + 1);
        return;
      }
      selectWeek(mondayOf(date));
      resetForm(date);
      setRefresh(value => value + 1);
      setMessage(editing ? 'Study session updated.' : 'Study session logged.');
    } catch {
      setFormError('Could not save this session. Try again when your connection is back.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function removeEntry() {
    if (!deleting || saving.current) return;
    saving.current = true;
    setPending(true);
    setMessage('');
    setFormError('');
    try {
      const {error} = await client.from(table).delete().eq('id', deleting.id).eq('user_id', userId);
      if (error) throw error;
      if (editing === deleting.id) resetForm(today);
      setDeleting(null);
      setRefresh(value => value + 1);
      setMessage('Study session deleted.');
    } catch {
      setDeleting(null);
      setFormError('Could not delete the session. Please try again.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  const loading = data === null && !loadError;
  const activeFilter = summary.bySubject.some(subject => subject.key === subjectFilter) ? subjectFilter : '';
  const visibleEntries = activeFilter
    ? entries.filter(entry => entry.subject.toLocaleLowerCase('en-IE') === activeFilter)
    : entries;
  const maxMinutes = Math.max(1, ...summary.days.map(day => day.minutes));
  const noData = loading || (loadError && data === null);
  const metrics = [
    {label: 'Study time', value: studyTime(summary.total)},
    {label: 'Sessions', value: entries.length},
    {label: 'Active days', value: summary.activeDays + ' / 7'},
    {label: 'Average difficulty', value: summary.averageDifficulty === null ? '—' : summary.averageDifficulty.toFixed(1) + ' / 5'},
  ];

  return <section className="content-width study-workspace" aria-label="Your study workspace">
    <div className="study-week">
      <div>
        <h2>{weekLabel(week)}</h2>
      </div>
      <div className="study-week-actions" aria-label="Choose a week">
        <button type="button" className="study-icon-button" aria-label="Previous week"
          disabled={pending || week <= mondayOf('2000-01-01')} onClick={() => selectWeek(addDays(week, -7))}><ChevronLeft size={20}/></button>
        <button type="button" className="study-week-today" disabled={pending || week === currentWeek}
          onClick={() => selectWeek(currentWeek)}>This week</button>
        <button type="button" className="study-icon-button" aria-label="Next week"
          disabled={pending || week >= currentWeek} onClick={() => selectWeek(addDays(week, 7))}><ChevronRight size={20}/></button>
      </div>
    </div>

    <div className="study-metrics" aria-label="Study totals">
      {metrics.map(({label, value}) => <div className="study-panel study-metric" key={label}>
        <p>{label}</p><strong>{noData ? '—' : value}</strong>
      </div>)}
    </div>
    {loadError && <div className="study-load-error" role="alert">{loadError} <button type="button" className="text-button"
      onClick={() => setRefresh(value => value + 1)}>Try again</button></div>}

    <div className="study-columns">
      <form className="study-panel study-form" onSubmit={saveEntry}>
        <div className="study-section-title">
          <span className="study-feature-icon"><Pencil size={19} aria-hidden="true"/></span>
          <div><h2>{editing ? 'Edit session' : 'Log a session'}</h2></div>
        </div>
        <fieldset className="study-form-fields" disabled={pending}>
          <label>Subject
            <input ref={subjectInput} list="study-subjects" value={draft.subject} maxLength={60} required
              placeholder="Choose or type a subject" onChange={e => setDraft({...draft, subject: e.target.value})}/>
            <datalist id="study-subjects">{studySubjects.map(subject => <option key={subject} value={subject}/>)}</datalist>
          </label>
          <div className="study-form-pair">
            <label>Date
              <input type="date" value={draft.date} min="2000-01-01" max={today} required
                onChange={e => setDraft({...draft, date: e.target.value})}/>
            </label>
            <label>Time in minutes
              <input type="number" inputMode="numeric" min="1" max="1440" step="1" placeholder="e.g. 60"
                value={draft.minutes} required onChange={e => setDraft({...draft, minutes: e.target.value})}/>
            </label>
          </div>
          <div className="study-quick" aria-label="Quick durations">
            {quickTimes.map(minutes => <button type="button" key={minutes} aria-pressed={draft.minutes === String(minutes)}
              onClick={() => setDraft({...draft, minutes: String(minutes)})}>{minutes}m</button>)}
          </div>
          <fieldset className="study-difficulty">
            <legend>How hard did it feel?</legend>
            <div className="study-ratings">
              {difficultyLabels.map((label, index) => <label className="study-rating" key={label}>
                <input type="radio" name="study-difficulty" required value={index + 1}
                  checked={draft.difficulty === index + 1} onChange={() => setDraft({...draft, difficulty: index + 1})}
                  aria-label={`${index + 1} of 5, ${label}`}/>
                <span>{index + 1}</span>
              </label>)}
            </div>
            <div className="study-rating-hint"><span>Easy</span><strong>{difficultyLabels[draft.difficulty - 1] ?? ''}</strong><span>Very hard</span></div>
          </fieldset>
          <label>What did you study? <small>Optional</small>
            <textarea rows={2} maxLength={240} value={draft.topic}
              placeholder="e.g. Complex numbers, De Moivre’s theorem"
              onChange={e => setDraft({...draft, topic: e.target.value})}/>
          </label>
          <div className="study-form-actions">
            <button className="primary-button" type="submit">{editing ? <Check size={17}/> : <Plus size={17}/>}
              {pending ? 'Working…' : editing ? 'Save changes' : 'Log session'}</button>
            {editing && <button className="text-button" type="button" onClick={() => resetForm(today)}>Cancel edit</button>}
          </div>
        </fieldset>
        {formError && <p className="study-error" role="alert">{formError}</p>}
        {message && <p className="study-success" role="status">{message}</p>}
      </form>

      <div className="study-analysis">
        <section className="study-panel study-chart">
          <div className="study-section-title">
            <span className="study-feature-icon"><BarChart3 size={21} aria-hidden="true"/></span>
            <div><h2>Daily study time</h2></div>
          </div>
          {loading ? <p className="study-empty" role="status">Loading study sessions…</p>
            : noData ? <p className="study-empty">Study time is unavailable.</p>
            : <ul className="study-chart-bars" aria-label="Study time by day">
              {summary.days.map(day => <li key={day.date} aria-label={`${day.label}, ${studyTime(day.minutes)}`}
                className={day.date === today ? 'study-chart-today' : ''}>
                <div className="study-chart-track" aria-hidden="true">
                  <span className="study-chart-value">{day.minutes ? studyTime(day.minutes) : ''}</span>
                  <span className="study-chart-bar" style={{'--bar-height': `${day.minutes ? Math.max(4, day.minutes / maxMinutes * 100) : 0}%`} as CSSProperties}/>
                </div>
                <span aria-hidden="true">{day.label}</span>
              </li>)}
            </ul>}
        </section>
        <section className="study-panel study-subjects">
          <div className="study-section-title">
            <span className="study-feature-icon study-icon-green"><BookOpen size={19} aria-hidden="true"/></span>
            <div><h2>Time by subject</h2></div>
          </div>
          {summary.bySubject.length ? <ul className="study-breakdown">
            {summary.bySubject.map((subject, index) => <li key={subject.key}>
              <div><span>{subject.label}</span><strong>{studyTime(subject.minutes)}</strong></div>
              <div className="study-breakdown-track" aria-hidden="true"><span style={{
                width: `${subject.minutes / summary.total * 100}%`, backgroundColor: subjectColours[index % subjectColours.length],
              }}/></div>
            </li>)}
          </ul> : <p className="study-empty">{noData ? 'Subject breakdown is unavailable.' : 'Your subject breakdown will appear once you log a session this week.'}</p>}
        </section>
      </div>
    </div>

    <StudyInsights entries={data ?? []} loading={loading} unavailable={!!loadError}/>

    <div className="study-bottom">
      <section className="study-panel study-history">
        <div className="study-history-top">
          <div className="study-section-title">
            <span className="study-feature-icon"><CalendarDays size={19} aria-hidden="true"/></span>
            <div><h2>Session log</h2><p>Sessions in the selected week.</p></div>
          </div>
          {!!summary.bySubject.length && <label className="study-log-filter">Filter by subject
            <select value={activeFilter} onChange={event => setSubjectFilter(event.target.value)}>
              <option value="">All subjects</option>
              {summary.bySubject.map(subject => <option key={subject.key} value={subject.key}>{subject.label}</option>)}
            </select>
          </label>}
        </div>
        {visibleEntries.length ? <ul className="study-log">
          {visibleEntries.map(entry => <li className="study-log-row" key={entry.id}>
            <div className="study-log-date"><span>{dateLabel(entry.studied_on, {weekday: 'short'})}</span>
              <strong>{dateLabel(entry.studied_on, {day: 'numeric', month: 'short'})}</strong></div>
            <div className="study-log-detail"><strong>{entry.subject}</strong>{entry.topic && <span>{entry.topic}</span>}</div>
            <div className="study-log-meta"><span>{studyTime(entry.duration_minutes)}</span>
              <span className={`study-difficulty-tag study-level-${entry.difficulty}`}>{entry.difficulty}/5 · {difficultyLabels[entry.difficulty - 1]}</span></div>
            <div className="study-log-actions">
              <button className="study-icon-button" type="button" disabled={pending}
                onClick={() => editEntry(entry)} aria-label={`Edit ${entry.subject} session`}><Pencil size={16}/></button>
              <button className="study-icon-button study-delete" type="button" disabled={pending}
                onClick={() => setDeleting(entry)} aria-label={`Delete ${entry.subject} session`}><Trash2 size={16}/></button>
            </div>
          </li>)}
        </ul> : <p className="study-empty">{loading ? 'Loading your session log…' : noData ? 'Session log is unavailable.' : 'No sessions logged in this week yet.'}</p>}
      </section>
      <section className="study-panel study-review">
        <div className="study-section-title">
          <span className="study-feature-icon study-icon-warm"><Target size={20} aria-hidden="true"/></span>
          <div><h2>Difficult sessions</h2><p>Sessions you rated 4 or 5 this week.</p></div>
        </div>
        {summary.review.length ? <ul>
          {summary.review.map(entry => <li key={entry.id}>
            <div><strong>{entry.subject}</strong>{entry.topic && <p>{entry.topic}</p>}</div>
            <span className={`study-difficulty-tag study-level-${entry.difficulty}`}>{entry.difficulty}/5</span>
          </li>)}
        </ul> : <p className="study-empty">{noData ? 'Review topics are unavailable.' : 'No sessions rated 4 or 5 this week.'}</p>}
      </section>
    </div>
    <Dialog open={!!deleting} onOpenChange={open => {if (!open && !pending) setDeleting(null);}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this study session?</DialogTitle>
          <DialogDescription>{deleting?.subject} will be removed from your study log and weekly totals.</DialogDescription>
        </DialogHeader>
        <div className="study-form-actions">
          <button type="button" className="outline-button study-delete" disabled={pending} onClick={() => void removeEntry()}>
            {pending ? 'Deleting…' : 'Delete session'}
          </button>
          <button type="button" className="text-button" disabled={pending} onClick={() => setDeleting(null)}>Cancel</button>
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
