import {useMemo, useState} from 'react';
import {Brain, Layers3, TrendingUp} from 'lucide-react';
import {studyInsights, insightMinimumDays, insightMinimumSessions, type DifficultyInsight} from './lib/study-insights';
import type {StudyEntry} from './lib/study';

function Rankings({groups, topics = false}: {groups: DifficultyInsight[]; topics?: boolean}) {
  return <ol className="insight-rankings">
    {groups.slice(0, 5).map((group, index) => <li key={group.key}>
      <span className="insight-position" aria-hidden="true">{index + 1}</span>
      <div className="insight-detail">
        <strong>{group.label}</strong>
        {topics && <span className="insight-subject">{group.subject}</span>}
        <div className="insight-meter" aria-hidden="true"><span style={{width: `${group.average / 5 * 100}%`}}/></div>
        <small>{group.count} sessions · {group.days} days · {group.hard} rated hard or very hard</small>
      </div>
      <span className="insight-score" aria-label={`Average difficulty ${group.average.toFixed(1)} out of 5`}>
        <strong>{group.average.toFixed(1)}</strong><small>/ 5</small>
      </span>
    </li>)}
  </ol>;
}

export default function StudyInsights({entries, loading, unavailable}: {
  entries: StudyEntry[]; loading: boolean; unavailable: boolean;
}) {
  const insights = useMemo(() => studyInsights(entries), [entries]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const subjects = [...new Set(insights.topics.map(topic => topic.subject))].sort((a, b) => a.localeCompare(b, 'en-IE'));
  const activeSubject = subjects.includes(subjectFilter) ? subjectFilter : '';
  const topics = activeSubject ? insights.topics.filter(topic => topic.subject === activeSubject) : insights.topics;
  const waiting = loading || unavailable;

  return <section className="study-insights" aria-labelledby="insights-heading">
    <div className="insights-heading">
      <div><p className="study-kicker"><TrendingUp size={14} aria-hidden="true"/> YOUR PATTERNS OVER TIME</p>
        <h2 id="insights-heading">Where study feels hardest</h2>
        <p>Based on all your study logs, across every week.</p></div>
      <span className="insights-sample">{waiting ? 'All-time insights' : `${insights.total} sessions analysed`}</span>
    </div>
    <div className="insights-grid">
      <section className="study-panel insight-panel">
        <div className="study-section-title"><span className="study-feature-icon"><Brain size={21} aria-hidden="true"/></span>
          <div><h3>Hardest subjects</h3><p>Highest average difficulty first.</p></div></div>
        {waiting ? <p className="study-empty" role="status">{loading ? 'Analysing your study history…' : 'Insights are unavailable until your logs reload.'}</p>
          : insights.subjects.length ? <Rankings groups={insights.subjects}/>
          : <div className="insight-building"><strong>Your patterns are taking shape</strong>
            <p>Log the same subject at least {insightMinimumSessions} times on {insightMinimumDays} different days to see it ranked.</p>
            {insights.building.length > 0 && <ul>{insights.building.slice(0, 4).map(subject => <li key={subject.key}>
              <span>{subject.label}</span><span>{Math.min(subject.count, insightMinimumSessions)}/{insightMinimumSessions} sessions · {Math.min(subject.days, insightMinimumDays)}/{insightMinimumDays} days</span>
            </li>)}</ul>}
          </div>}
      </section>
      <section className="study-panel insight-panel">
        <div className="study-section-title"><span className="study-feature-icon study-icon-warm"><Layers3 size={21} aria-hidden="true"/></span>
          <div><h3>Hardest topics</h3><p>Pinpoint the parts worth practising.</p></div></div>
        {!waiting && subjects.length > 0 && <label className="study-log-filter insight-filter">Topics within
          <select aria-label="Topics within" value={activeSubject} onChange={event => setSubjectFilter(event.target.value)}>
            <option value="">All subjects</option>{subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>}
        {waiting ? <p className="study-empty">{loading ? 'Finding patterns in your topics…' : 'Topic insights are unavailable until your logs reload.'}</p>
          : topics.length ? <Rankings groups={topics} topics/>
          : <div className="insight-building"><strong>Go a little deeper</strong>
            <p>Add a topic when you log study. A topic appears here after {insightMinimumSessions} sessions on {insightMinimumDays} different days within the same subject.</p>
            <p>Use a consistent topic name, such as “Complex numbers”, so repeat sessions count together.</p>
          </div>}
      </section>
    </div>
    <p className="insights-method">Each session counts equally. Rankings use your average 1–5 rating after at least {insightMinimumSessions} sessions on {insightMinimumDays} days per subject or topic. They update as you add, edit, or delete logs.</p>
  </section>;
}
