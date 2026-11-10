export type StudyEntry = {
  id: string;
  studied_on: string;
  duration_minutes: number;
  subject: string;
  difficulty: number;
  topic: string;
};

export const difficultyLabels = ['Easy', 'Manageable', 'Challenging', 'Hard', 'Very hard'] as const;

export const studySubjects = [
  'Agricultural Science', 'Applied Mathematics', 'Art', 'Biology', 'Business',
  'Chemistry', 'Classics', 'Computer Science', 'Design and Communication Graphics',
  'Economics', 'English', 'French', 'Geography', 'German', 'History', 'Home Economics',
  'Irish', 'Latin', 'Mathematics', 'Music', 'Physical Education', 'Physics',
  'Politics and Society', 'Spanish',
];

export function localDate(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

function calendarDate(date: string) {
  return new Date(date + 'T12:00:00Z');
}

export function addDays(date: string, count: number) {
  const next = calendarDate(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}

export function mondayOf(date: string) {
  return addDays(date, -((calendarDate(date).getUTCDay() + 6) % 7));
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return calendarDate(date).toLocaleDateString('en-IE', {...options, timeZone: 'UTC'});
}

export function weekLabel(start: string) {
  const end = addDays(start, 6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const left = dateLabel(start, {
    day: 'numeric',
    ...(sameMonth ? {} : {month: 'short'}),
    ...(start.slice(0, 4) === end.slice(0, 4) ? {} : {year: 'numeric'}),
  });
  return left + ' – ' + dateLabel(end, {day: 'numeric', month: 'short', year: 'numeric'});
}

export function studyTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return rest + 'm';
  return hours + 'h' + (rest ? ' ' + rest + 'm' : '');
}

export function studySummary(entries: StudyEntry[], start: string) {
  const minutesByDay = new Map<string, number>();
  const subjects = new Map<string, {key: string; label: string; minutes: number; count: number}>();
  let total = 0;
  let difficulty = 0;
  for (const entry of entries) {
    total += entry.duration_minutes;
    difficulty += entry.difficulty;
    minutesByDay.set(entry.studied_on, (minutesByDay.get(entry.studied_on) ?? 0) + entry.duration_minutes);
    const key = entry.subject.toLocaleLowerCase('en-IE');
    const subject = subjects.get(key) ?? {key, label: entry.subject, minutes: 0, count: 0};
    subject.minutes += entry.duration_minutes;
    subject.count++;
    subjects.set(key, subject);
  }

  const days = Array.from({length: 7}, (_, index) => {
    const date = addDays(start, index);
    return {date, label: dateLabel(date, {weekday: 'short'}), minutes: minutesByDay.get(date) ?? 0};
  });
  const bySubject = [...subjects.values()].sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, 'en-IE'));
  const reviewed = new Set<string>();
  const review = entries.filter(entry => entry.difficulty >= 4)
    .sort((a, b) => b.difficulty - a.difficulty || b.studied_on.localeCompare(a.studied_on))
    .filter(entry => {
      const key = (entry.subject + '\n' + entry.topic).toLocaleLowerCase('en-IE');
      if (reviewed.has(key)) return false;
      reviewed.add(key);
      return true;
    }).slice(0, 4);

  return {
    days, bySubject, review, total, activeDays: minutesByDay.size,
    averageDifficulty: entries.length ? difficulty / entries.length : null,
  };
}
