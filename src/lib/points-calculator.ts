export type GradeLevel = 'H' | 'O' | 'LCVP';
export type PointEntry = {id: number; kind: 'maths' | 'subject' | 'lcvp'; grade: string};
export type CalculatorDraft = {step: 'intro' | 'maths' | 'grades'; mathsLevel: 'H' | 'O'; entries: PointEntry[]};
export const gradePoints: Record<string, number> = {
  H1: 100, H2: 88, H3: 77, H4: 66, H5: 56, H6: 46, H7: 37, H8: 0,
  O1: 56, O2: 46, O3: 37, O4: 28, O5: 20, O6: 12, O7: 0, O8: 0,
  Distinction: 66, Merit: 46, Pass: 28,
};
export const gradeRanges = ['90–100%', '80–89%', '70–79%', '60–69%', '50–59%', '40–49%', '30–39%', '0–29%'];
export const MAX_SUBJECTS = 10;
export const emptyDraft: CalculatorDraft = {step: 'intro', mathsLevel: 'H', entries: []};
export function pointsFor(entry: Pick<PointEntry, 'kind' | 'grade'>) {
  const base = gradePoints[entry.grade] ?? 0;
  const bonus = entry.kind === 'maths' && /^H[1-6]$/.test(entry.grade) ? 25 : 0;
  return {base, bonus, points: base + bonus};
}
export function calculatePoints(entries: PointEntry[]) {
  const ranked = entries.map(entry => ({...entry, ...pointsFor(entry)})).sort((a, b) => b.points - a.points || a.id - b.id);
  const best = ranked.slice(0, 6);
  return {best, total: best.reduce((sum, entry) => sum + entry.points, 0), bonusIncluded: best.some(entry => entry.bonus > 0)};
}
export function readCalculatorDraft(value: string | null): CalculatorDraft {
  try {
    const data = JSON.parse(value ?? 'null');
    if (!data || data.version !== 1 || !['intro', 'maths', 'grades'].includes(data.step)
      || !['H', 'O'].includes(data.mathsLevel) || !Array.isArray(data.entries) || data.entries.length > MAX_SUBJECTS) return emptyDraft;
    const entries = data.entries as PointEntry[];
    if (entries.some(e => !e || !Number.isSafeInteger(e.id) || e.id < 1 || !['maths', 'subject', 'lcvp'].includes(e.kind)
      || typeof e.grade !== 'string' || (e.kind === 'lcvp' ? !['Distinction', 'Merit', 'Pass'].includes(e.grade) : !/^[HO][1-8]$/.test(e.grade)))
      || new Set(entries.map(e => e.id)).size !== entries.length
      || entries.filter(e => e.kind === 'maths').length > 1 || entries.filter(e => e.kind === 'lcvp').length > 1
      || (data.step === 'intro' && entries.length > 0) || (data.step === 'maths' && entries.some(e => e.kind === 'maths'))) return emptyDraft;
    return {step: data.step, mathsLevel: data.mathsLevel, entries};
  } catch { return emptyDraft; }
}
export function coursePointsLink(total: number, nearby = false) {
  const max = Math.max(0, Math.min(625, Math.round(Number.isFinite(total) ? total : 0)));
  return `#/courses?from=calculator&points=${max}&min=${nearby ? Math.max(0, max - 50) : 0}`;
}
