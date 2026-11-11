import {useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft,
  ChevronRight, Clock3, LockKeyhole, Pencil, Plus, Target, Trash2,
} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {
  dateLabel, difficultyLabels, localDate, shiftStudyPeriod, studyPeriod, studySubjects,
  studySummary, studyTime, studyWeeks, type StudyEntry, type StudyPeriod,
} from './lib/study';
import type {useShortlist} from './lib/use-shortlist';
import StudyInsights from './study-insights';

type AccountState = ReturnType<typeof useShortlist>;
type Draft = {date: string; minutes: string; subject: string; difficulty: number; topic: string};
const overviewRoute = '#/study';
const logRoute = '#/study/log';
const table = 'cao_study_sessions';
const entryFields = 'id,studied_on,duration_minutes,subject,difficulty,topic';
const blankDraft = (date: string): Draft => ({date, minutes: '', subject: '', difficulty: 0, topic: ''});
const quickTimes = [25, 45, 60, 90];
const subjectColours = ['#6853dc', '#1d9e89', '#d97935', '#5985e0', '#cc5d88', '#78629e'];

function StudyBanner({title, description, children}: {title: string; description?: string; children?: ReactNode}) {
  return <section className="study-hero">
    <div className="content-width study-hero-inner">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {children}
    </div>
  </section>;
}

function compareEntries(a: StudyEntry, b: StudyEntry) {
  return b.studied_on.localeCompare(a.studied_on) || a.subject.localeCompare(b.subject, 'en-IE');
}

export default function StudyTracker({account, route}: {account: AccountState; route: string}) {
  const {client, user, authReady, authError} = account;
  if (user && client) return <div className="study-page">
    <StudyWorkspace key={user.id} client={client} userId={user.id} route={route}/>
  </div>;
  return <div className="study-page">
    <StudyBanner title="Study tracker" description="Log sessions and review your study time."/>
    {!authReady ? <div className="content-width study-panel study-access" role="status">Checking your account…</div>
      : <section className="content-width study-panel study-access">
        <span className="study-feature-icon"><LockKeyhole size={23} aria-hidden="true"/></span>
        <h2>Keep your study log in one place</h2>
        <p>Sign in to save sessions and see your progress on any device.</p>
        {authError && <p className="study-error" role="alert">{authError}</p>}
        <a className="primary-button" href="#/account">Sign in to CAO Finder<ArrowRight size={17}/></a>
        <div className="study-access-features">
          <span><Clock3 size={18} aria-hidden="true"/> Log time by subject</span>
          <span><BarChart3 size={18} aria-hidden="true"/> See your week at a glance</span>
          <span><Target size={18} aria-hidden="true"/> Find topics worth revisiting</span>
        </div>
      </section>}
  </div>;
}

function StudyWorkspace({client, userId, route}: {client: SupabaseClient; userId: string; route: string}) {
  const today = localDate();
  const [period, setPeriod] = useState<StudyPeriod>('week');
  const [selectedDate, setSelectedDate] = useState(today);
  const [deleting, setDeleting] = useState<StudyEntry | null>(null);
  const [data, setData] = useState<StudyEntry[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');
  const removing = useRef(false);
  const active = useRef(true);
  const {start, end, days, label} = studyPeriod(selectedDate, period);
  const currentStart = studyPeriod(today, period).start;
  const entries = useMemo(() => (data ?? []).filter(entry => entry.studied_on >= start
    && entry.studied_on < end), [data, start, end]);
  const summary = useMemo(() => studySummary(entries, start, days), [entries, start, days]);
  const totalMinutes = useMemo(() => data?.reduce((sum, entry) => sum + entry.duration_minutes, 0), [data]);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

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
        all.sort(compareEntries);
        setData(all);
      } catch {
        if (!controller.signal.aborted) setLoadError('Could not load study sessions. Reload to see your latest totals and insights.');
      }
    }
    void loadHistory();
    return () => controller.abort();
  }, [client, userId, refresh]);

  function selectDate(next: string) {
    setSelectedDate(next);
    setSubjectFilter('');
  }

  function savedEntry(entry: StudyEntry, edited: boolean) {
    if (!active.current) return;
    setData(previous => previous && [...previous.filter(row => row.id !== entry.id), entry].sort(compareEntries));
    selectDate(entry.studied_on);
    setRefresh(value => value + 1);
    setActionError('');
    setMessage(edited ? 'Study session updated.' : 'Study session logged.');
    if (window.location.hash === route) window.location.replace(overviewRoute);
  }

  async function removeEntry() {
    if (!deleting || removing.current) return;
    removing.current = true;
    setPending(true);
    setMessage('');
    setActionError('');
    try {
      const {error} = await client.from(table).delete().eq('id', deleting.id).eq('user_id', userId);
      if (error) throw error;
      setData(previous => previous?.filter(entry => entry.id !== deleting.id) ?? null);
      setDeleting(null);
      setRefresh(value => value + 1);
      setMessage('Study session deleted.');
    } catch {
      setDeleting(null);
      setActionError('Could not delete the session. Please try again.');
    } finally {
      removing.current = false;
      setPending(false);
    }
  }

  const loading = data === null && !loadError;
  const [page, query] = route.split('?');
  if (page === logRoute) {
    const editId = new URLSearchParams(query).get('edit');
    const entry = editId ? data?.find(row => row.id === editId) : undefined;
    return <>
      <StudyBanner title={editId ? 'Edit session' : 'Log a session'}/>
      <section className="content-width study-editor">
        <a className="study-back" href={overviewRoute}><ArrowLeft size={17} aria-hidden="true"/> Back to overview</a>
        {editId && !entry ? <div className="study-panel" role="status">
          {loading ? 'Loading session…' : loadError ? 'Could not load the session.' : 'This session is no longer in your log.'}
          {loadError && <button type="button" className="text-button" onClick={() => setRefresh(value => value + 1)}>Try again</button>}
        </div> : <StudySessionForm key={editId ?? 'new'} client={client} userId={userId} entry={entry} today={today} onSaved={savedEntry}/>}
      </section>
    </>;
  }

  const activeFilter = summary.bySubject.some(subject => subject.key === subjectFilter) ? subjectFilter : '';
  const visibleEntries = activeFilter
    ? entries.filter(entry => entry.subject.toLocaleLowerCase('en-IE') === activeFilter)
    : entries;
  const bars = period === 'month' ? studyWeeks(summary.days) : summary.days.map(day => ({...day, end: day.date}));
  const maxMinutes = Math.max(1, ...bars.map(bar => bar.minutes));
  const noData = loading || (loadError && data === null);
  const metrics = [
    {label: 'Study time', value: studyTime(summary.total), note: 'Across all subjects', icon: Clock3},
    {label: 'Sessions', value: entries.length, note: `Logged this ${period}`, icon: BookOpen},
    {label: 'Active days', value: summary.activeDays + ' / ' + days, note: 'Days with study logged', icon: CalendarDays},
    {label: 'Average difficulty', value: summary.averageDifficulty === null ? '—' : summary.averageDifficulty.toFixed(1) + ' / 5', note: 'Based on your ratings', icon: Activity},
  ];

  return <>
    <StudyBanner title="Study tracker" description="Log sessions and review your study time.">
      <div className="study-hero-actions">
        <div className="study-total">
          <span>Total hours · all time</span>
          <strong>{totalMinutes === undefined ? '—' : totalMinutes < 60 ? `0h${totalMinutes ? ` ${totalMinutes}m` : ''}` : studyTime(totalMinutes)}</strong>
        </div>
        <a className="primary-button study-log-button" href={logRoute}><Plus size={18} aria-hidden="true"/> Log a session</a>
      </div>
    </StudyBanner>
    <section className="content-width study-workspace" aria-label="Study overview">
      {message && <p className="study-success study-overview-message" role="status">{message}</p>}
      {actionError && <p className="study-load-error" role="alert">{actionError}</p>}
      <div className="study-week">
        <div>
          <p className="study-kicker">{period === 'week' ? 'WEEKLY OVERVIEW' : 'MONTHLY OVERVIEW'}</p>
          <h2>{label}</h2>
        </div>
        <div className="study-week-actions">
          <div className="study-period-toggle" role="group" aria-label="Overview period">
            <button type="button" aria-pressed={period === 'week'} onClick={() => {setPeriod('week'); setSubjectFilter('');}}>Weekly</button>
            <button type="button" aria-pressed={period === 'month'} onClick={() => {setPeriod('month'); setSubjectFilter('');}}>Monthly</button>
          </div>
          <div className="study-week-actions" role="group" aria-label={`Choose a ${period}`}>
            <button type="button" className="study-icon-button" aria-label={`Previous ${period}`}
              disabled={pending || start <= studyPeriod('2000-01-01', period).start}
              onClick={() => selectDate(shiftStudyPeriod(start, period, -1))}><ChevronLeft size={20}/></button>
            <button type="button" className="study-week-today" disabled={pending || start === currentStart}
              onClick={() => selectDate(today)}>This {period}</button>
            <button type="button" className="study-icon-button" aria-label={`Next ${period}`}
              disabled={pending || start >= currentStart} onClick={() => selectDate(shiftStudyPeriod(start, period, 1))}><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      <div className="study-metrics" aria-label="Study totals">
        {metrics.map(({label, value, note, icon: Icon}) => <div className="study-panel study-metric" key={label}>
          <span className="study-metric-icon"><Icon size={20} aria-hidden="true"/></span>
          <p>{label}</p><strong>{noData ? '—' : value}</strong><small>{note}</small>
        </div>)}
      </div>
      {loadError && <div className="study-load-error" role="alert">{loadError} <button type="button" className="text-button"
        onClick={() => setRefresh(value => value + 1)}>Try again</button></div>}

      <div className="study-analysis">
        <section className="study-panel study-chart">
          <div className="study-section-title">
            <span className="study-feature-icon"><BarChart3 size={21} aria-hidden="true"/></span>
            <div><h2>{period === 'month' ? 'Study time by week' : 'Daily study time'}</h2><p>Minutes logged in the selected {period}.</p></div>
          </div>
          {loading ? <p className="study-empty" role="status">Loading study sessions…</p>
            : noData ? <p className="study-empty">Study time is unavailable.</p>
            : <ul className="study-chart-bars" aria-label={period === 'month' ? 'Study time by week' : 'Study time by day'}
                style={{'--chart-columns': bars.length} as CSSProperties}>
              {bars.map(day => <li key={day.date} aria-label={`${day.label}, ${studyTime(day.minutes)}`}
                className={day.date <= today && today <= day.end ? 'study-chart-today' : ''}>
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
            <div><h2>Time by subject</h2><p>How your study time is split this {period}.</p></div>
          </div>
          {summary.bySubject.length ? <ul className="study-breakdown">
            {summary.bySubject.map((subject, index) => <li key={subject.key}>
              <div><span>{subject.label}</span><strong>{studyTime(subject.minutes)}</strong></div>
              <div className="study-breakdown-track" aria-hidden="true"><span style={{
                width: `${subject.minutes / summary.total * 100}%`, backgroundColor: subjectColours[index % subjectColours.length],
              }}/></div>
            </li>)}
          </ul> : <p className="study-empty">{noData ? 'Subject breakdown is unavailable.' : `Your subject breakdown will appear once you log a session this ${period}.`}</p>}
        </section>
      </div>

      <StudyInsights entries={data ?? []} loading={loading} unavailable={!!loadError}/>

      <div className="study-bottom">
        <section className="study-panel study-history">
          <div className="study-history-top">
            <div className="study-section-title">
              <span className="study-feature-icon"><CalendarDays size={19} aria-hidden="true"/></span>
              <div><h2>Session log</h2><p>Sessions in the selected {period}.</p></div>
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
                  onClick={() => { window.location.hash = logRoute + '?edit=' + encodeURIComponent(entry.id); }} aria-label={`Edit ${entry.subject} session`}><Pencil size={16}/></button>
                <button className="study-icon-button study-delete" type="button" disabled={pending}
                  onClick={() => setDeleting(entry)} aria-label={`Delete ${entry.subject} session`}><Trash2 size={16}/></button>
              </div>
            </li>)}
          </ul> : <p className="study-empty">{loading ? 'Loading your session log…' : noData ? 'Session log is unavailable.' : `No sessions logged in this ${period} yet.`}</p>}
        </section>
        <section className="study-panel study-review">
          <div className="study-section-title">
            <span className="study-feature-icon study-icon-warm"><Target size={20} aria-hidden="true"/></span>
            <div><h2>Worth revisiting</h2><p>Sessions you rated 4 or 5 in the selected {period}.</p></div>
          </div>
          {summary.review.length ? <ul>
            {summary.review.map(entry => <li key={entry.id}>
              <div><strong>{entry.subject}</strong>{entry.topic && <p>{entry.topic}</p>}</div>
              <span className={`study-difficulty-tag study-level-${entry.difficulty}`}>{entry.difficulty}/5</span>
            </li>)}
          </ul> : <p className="study-empty">{noData ? 'Review topics are unavailable.' : 'Hard sessions will show up here as ideas for what to study next.'}</p>}
        </section>
      </div>
      <Dialog open={!!deleting} onOpenChange={open => {if (!open && !pending) setDeleting(null);}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this study session?</DialogTitle>
            <DialogDescription>{deleting?.subject} will be removed from your study log and totals.</DialogDescription>
          </DialogHeader>
          <div className="study-form-actions">
            <button type="button" className="outline-button study-delete" disabled={pending} onClick={() => void removeEntry()}>
              {pending ? 'Deleting…' : 'Delete session'}
            </button>
            <button type="button" className="text-button" disabled={pending} onClick={() => setDeleting(null)}>Cancel</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  </>;
}

function StudySessionForm({client, userId, entry, today, onSaved}: {
  client: SupabaseClient;
  userId: string;
  entry?: StudyEntry;
  today: string;
  onSaved: (entry: StudyEntry, edited: boolean) => void;
}) {
  const editing = entry?.id;
  const [draft, setDraft] = useState<Draft>(() => entry ? {
    date: entry.studied_on, minutes: String(entry.duration_minutes), subject: entry.subject,
    difficulty: entry.difficulty, topic: entry.topic,
  } : blankDraft(today));
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const draftId = useRef<string | null>(null);

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
    try {
      const patch = {
        studied_on: date, duration_minutes: duration, subject,
        difficulty: draft.difficulty, topic: draft.topic.trim(),
      };
      // Keep the same id if a save is retried after a connection drops.
      const result = editing
        ? await client.from(table).update(patch).eq('id', editing).eq('user_id', userId).select(entryFields).maybeSingle()
        : await client.from(table).upsert({id: (draftId.current ??= crypto.randomUUID()), ...patch}, {onConflict: 'id'})
            .select(entryFields).single();
      if (result.error) throw result.error;
      if (!result.data) {
        setFormError('This session was removed on another device.');
        return;
      }
      onSaved(result.data, !!editing);
    } catch {
      setFormError('Could not save this session. Try again when your connection is back.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return <form className="study-panel study-form" onSubmit={saveEntry}>
    <div className="study-section-title">
      <span className="study-feature-icon"><Pencil size={19} aria-hidden="true"/></span>
      <h2>Session details</h2>
    </div>
    <fieldset className="study-form-fields" disabled={pending}>
      <label>Subject
        <input list="study-subjects" value={draft.subject} maxLength={60} required
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
        <a className="text-button" href={overviewRoute}>Cancel</a>
      </div>
    </fieldset>
    {formError && <p className="study-error" role="alert">{formError}</p>}
  </form>;
}
