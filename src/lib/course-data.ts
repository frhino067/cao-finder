import {parseCourseSearch,searchScore,type SearchQuery} from './course-search';
import courseRows from '../data/courses.json';
import collegeRows from '../data/colleges.json';
export type Course = { code:string; title:string; college:string; location:string|null; categories:string[]; level:number|null; levelGroup:number; points:number|null; pointsLabel:string; round2:string|null; special:boolean; random:boolean; source:string; duration:number|null; requirements:{subjects:string[];text:string}|null; detailUrl:string|null; requirementsSource?:string;requirementsChecked?:string;additionalPoints?:{label:string;value:string};pointsNote?:string };
export const courses = courseRows as Course[];
export const colleges = collegeRows;
export const collegeMap = Object.fromEntries(colleges.map(c=>[c.id,c]));
export const categories = ['Business','Economics','Finance','Law','Engineering','Computing','Medicine','Healthcare','Science','Psychology','Education','Arts','Humanities','Languages','Social Sciences','Architecture','Construction','Sports','Media','Journalism','Design','Agriculture'];
export const locations = ['Dublin','Cork','Galway','Limerick','Maynooth','Waterford','Kilkenny','Sligo','Athlone','Letterkenny','Other locations'];
export type Filters = { query:string; points:number[]; colleges:string[]; locations:string[]; categories:string[]; lengths:string[]; levels:string[]; types:string[]; subjects:string[]; pointsOnly?:boolean };
export const defaults:Filters = {query:'',points:[0,625],colleges:[],locations:[],categories:[],lengths:[],levels:['8'],types:[],subjects:[]};
export function matches(c:Course,f:Filters,search:SearchQuery=parseCourseSearch(f.query)){
 const col=collegeMap[c.college];
 if(searchScore(c,search)<0)return false;
 if(f.pointsOnly||f.points[0]>0||f.points[1]<625){if(c.points===null||c.special||c.points<f.points[0]||c.points>f.points[1])return false;}
 if(f.colleges.length&&!f.colleges.includes(c.college))return false;
 if(f.locations.length&&!f.locations.some(l=>l==='Other locations'?!!c.location&&!locations.slice(0,-1).includes(c.location):l===c.location))return false;
 if(f.categories.length&&!f.categories.some(k=>c.categories.includes(k)))return false;
 if(f.lengths.length&&(c.duration===null||!f.lengths.includes(c.duration>=5?'5+':String(c.duration))))return false;
 if(f.levels.length&&!f.levels.includes(String(c.level))&&!(c.level===null&&f.levels.includes('6/7')))return false;
 if(f.types.length&&!f.types.includes(col.type))return false;
 if(f.subjects.length&&(!c.requirements||!f.subjects.every(s=>c.requirements!.subjects.includes(s))))return false;
 return true;
}

export function filtersFromParams(p: URLSearchParams, view = 'courses'): Filters {
 const fromCalculator = p.get('from') === 'calculator';
 const numeric = (key: string, fallback: number) => {
  const raw = p.get(key); const n = Number(raw);
  return raw === null || !raw.trim() || !Number.isFinite(n) ? fallback : Math.max(0, Math.min(625, Math.round(n)));
 };
 const max = numeric('points', 625);
 return {...defaults, query:p.get('q')??'',
  colleges:p.has('college')&&collegeMap[p.get('college')!]?[p.get('college')!]:[],
  categories:p.has('category')&&categories.includes(p.get('category')!)?[p.get('category')!]:[],
  points:[Math.min(max,numeric('min',0)),max], pointsOnly:fromCalculator,
  levels:view==='saved'||fromCalculator?[]:['8']};
}
