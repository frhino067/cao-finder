import type {StudyEntry} from './study';

type Ratings = Pick<StudyEntry, 'subject' | 'topic' | 'difficulty' | 'studied_on'>;
type Group = {
  key: string; label: string; subject: string; total: number; count: number; hard: number;
  days: Map<string, {total: number; count: number}>;
};
export type DifficultyInsight = {
  key: string; label: string; subject: string; average: number;
  count: number; hard: number; days: number; eligible: boolean;
  lastStudied: string; change: number | null;
};
export const insightMinimumSessions = 3;
export const insightMinimumDays = 2;

const normalise = (text: string) => text.trim().replace(/\s+/g, ' ');
const groupKey = (text: string) => normalise(text).toLocaleLowerCase('en-IE');

function addRating(groups: Map<string, Group>, key: string, label: string, subject: string, entry: Ratings) {
  const group = groups.get(key) ?? {key, label, subject, total: 0, count: 0, hard: 0, days: new Map()};
  group.total += entry.difficulty;
  group.count++;
  if (entry.difficulty >= 4) group.hard++;
  const day = group.days.get(entry.studied_on) ?? {total: 0, count: 0};
  group.days.set(entry.studied_on, {total: day.total + entry.difficulty, count: day.count + 1});
  groups.set(key, group);
}

function compareDifficulty(a: DifficultyInsight, b: DifficultyInsight) {
  return b.average - a.average || b.hard / b.count - a.hard / a.count
    || b.count - a.count || a.label.localeCompare(b.label, 'en-IE') || a.key.localeCompare(b.key);
}

function rank(groups: Map<string, Group>): DifficultyInsight[] {
  return [...groups.values()].map(group => {
    const recent = [...group.days.keys()].sort().reverse().slice(0, 4);
    // Compare distinct study days so several sessions on one day cannot skew the trend.
    const scores = recent.map(date => {
      const {total, count} = group.days.get(date)!;
      return total / count;
    });
    return {
      key: group.key, label: group.label, subject: group.subject, average: group.total / group.count,
      count: group.count, hard: group.hard, days: group.days.size,
      eligible: group.count >= insightMinimumSessions && group.days.size >= insightMinimumDays,
      lastStudied: recent[0],
      change: scores.length === 4 ? (scores[0] + scores[1] - scores[2] - scores[3]) / 2 : null,
    };
  }).sort(compareDifficulty);
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
  const topicRatings = rank(topics);
  return {
    total: entries.length,
    subjects: rankedSubjects.filter(group => group.eligible),
    topics: topicRatings.filter(group => group.eligible).sort((a, b) =>
      b.hard / b.count - a.hard / a.count || compareDifficulty(a, b)),
    earlyTopics: topicRatings.filter(group => !group.eligible && group.hard > 0),
    building: rankedSubjects.filter(group => !group.eligible).sort((a, b) => b.count - a.count || b.days - a.days
      || a.label.localeCompare(b.label, 'en-IE')),
  };
}
