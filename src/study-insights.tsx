import {useMemo, useState} from 'react';
import {Brain, Layers3, TrendingUp} from 'lucide-react';
import {studyInsights, insightMinimumDays, insightMinimumSessions, type DifficultyInsight} from './lib/study-insights';
import {dateLabel, type StudyEntry} from './lib/study';

function TopicTrend({change}: {change: number}) {
  if (Math.abs(change) < 0.5) return <span className="insight-trend">Difficulty steady</span>;
  return <span className="insight-trend" data-direction={change < 0 ? 'easier' : 'harder'}>
    {change < 0 ? 'Getting easier' : 'Getting harder'} · {Math.abs(change).toFixed(1)} points
  </span>;
}

function Rankings({groups, topics = false, early = false}: {groups: DifficultyInsight[]; topics?: boolean; early?: boolean}) {
  return <ol className="insight-rankings">
    {groups.slice(0, 5).map((group, index) => <li key={group.key}>
      {!early && <span className="insight-position" aria-hidden="true">{index + 1}</span>}
      <div className="insight-detail">
        <strong>{group.label}</strong>
        {topics ? <>
          <span className="insight-subject">{group.subject} · Last studied {dateLabel(group.lastStudied, {day: 'numeric', month: 'short', year: 'numeric'})}</span>
          <small>{group.hard} of {group.count} sessions rated hard or very hard</small>
          {group.change !== null && <TopicTrend change={group.change}/>}
        </> : <>
          <div className="insight-meter" aria-hidden="true"><span style={{width: `${group.average / 5 * 100}%`}}/></div>
          <small>{group.count} sessions · {group.days} days · {group.hard} rated hard or very hard</small>
        </>}
      </div>
      {!early && <span className="insight-score" aria-label={`Average difficulty ${group.average.toFixed(1)} out of 5`}>
        <strong>{group.average.toFixed(1)}</strong><small>/ 5</small>
      </span>}
    </li>)}
  </ol>;
}

export default function StudyInsights({entries, loading, unavailable}: {
  entries: StudyEntry[]; loading: boolean; unavailable: boolean;
}) {
  const insights = useMemo(() => studyInsights(entries), [entries]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const subjects = [...new Set([...insights.topics, ...insights.earlyTopics].map(topic => topic.subject))]
    .sort((a, b) => a.localeCompare(b, 'en-IE'));
  const activeSubject = subjects.includes(subjectFilter) ? subjectFilter : '';
  const topics = activeSubject ? insights.topics.filter(topic => topic.subject === activeSubject) : insights.topics;
  const earlyTopics = activeSubject ? insights.earlyTopics.filter(topic => topic.subject === activeSubject) : insights.earlyTopics;
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
          <div><h3>Hardest topics</h3><p>Ranked by how often you rate them hard or very hard.</p></div></div>
        {!waiting && subjects.length > 0 && <label className="study-log-filter insight-filter">Topics within
          <select aria-label="Topics within" value={activeSubject} onChange={event => setSubjectFilter(event.target.value)}>
            <option value="">All subjects</option>{subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>}
        {waiting ? <p className="study-empty">{loading ? 'Finding patterns in your topics…' : 'Topic insights are unavailable until your logs reload.'}</p>
          : <>
            {topics.length > 0 && <Rankings groups={topics} topics/>}
            {earlyTopics.length > 0 && <div className="insight-building">
              <strong>Hard topics with fewer ratings</strong>
              <p>Rankings start after {insightMinimumSessions} sessions on {insightMinimumDays} different days.</p>
              <Rankings groups={earlyTopics} topics early/>
            </div>}
            {!topics.length && !earlyTopics.length && <p className="study-empty">
              Add a topic when logging study. Use the same topic name across sessions to see it ranked.
            </p>}
          </>}
      </section>
    </div>
    <p className="insights-method">Rankings require {insightMinimumSessions} sessions on {insightMinimumDays} different days.
      Topic trends compare your two latest study days for that topic with the two before them.</p>
  </section>;
}
