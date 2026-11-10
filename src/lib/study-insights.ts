import type {StudyEntry} from './study';

type Ratings = Pick<StudyEntry, 'subject' | 'topic' | 'difficulty' | 'studied_on'>;
type Group = {key: string; label: string; subject: string; total: number; count: number; hard: number; days: Set<string>};
export type DifficultyInsight = {
  key: string; label: string; subject: string; average: number;
  count: number; hard: number; days: number; eligible: boolean;
};
export const insightMinimumSessions = 3;
export const insightMinimumDays = 2;

const normalise = (text: string) => text.trim().replace(/\s+/g, ' ');
const groupKey = (text: string) => normalise(text).toLocaleLowerCase('en-IE');

function addRating(groups: Map<string, Group>, key: string, label: string, subject: string, entry: Ratings) {
  const group = groups.get(key) ?? {key, label, subject, total: 0, count: 0, hard: 0, days: new Set<string>()};
  group.total += entry.difficulty;
  group.count++;
  if (entry.difficulty >= 4) group.hard++;
  group.days.add(entry.studied_on);
  groups.set(key, group);
}

function rank(groups: Map<string, Group>): DifficultyInsight[] {
  return [...groups.values()].map(group => ({
    key: group.key, label: group.label, subject: group.subject, average: group.total / group.count,
    count: group.count, hard: group.hard, days: group.days.size,
    eligible: group.count >= insightMinimumSessions && group.days.size >= insightMinimumDays,
  })).sort((a, b) => b.average - a.average || b.hard / b.count - a.hard / a.count
    || b.count - a.count || a.label.localeCompare(b.label, 'en-IE') || a.key.localeCompare(b.key));
}

export function studyInsights(entries: Ratings[]) {
  const subjects = new Map<string, Group>();
  const topics = new Map<string, Group>();
  for (const entry of entries) {
    const subject = normalise(entry.subject);
    const subjectKey = groupKey(subject);
    addRating(subjects, subjectKey, subject, subject, entry);
    const topic = normalise(entry.topic);
    if (topic) addRating(topics, JSON.stringify([subjectKey, groupKey(topic)]), topic, subjects.get(subjectKey)!.label, entry);
  }
  const rankedSubjects = rank(subjects);
  return {
    total: entries.length,
    subjects: rankedSubjects.filter(group => group.eligible),
    topics: rank(topics).filter(group => group.eligible),
    building: rankedSubjects.filter(group => !group.eligible).sort((a, b) => b.count - a.count || b.days - a.days
      || a.label.localeCompare(b.label, 'en-IE')),
  };
}
