import courseRows from '../data/courses.json';
import collegeRows from '../data/colleges.json';
export type Course = { code:string; title:string; college:string; location:string|null; categories:string[]; level:number|null; levelGroup:number; points:number|null; pointsLabel:string; round2:string|null; special:boolean; random:boolean; source:string; duration:number|null; requirements:{subjects:string[];text:string}|null; detailUrl:string|null; requirementsSource?:string;requirementsChecked?:string;additionalPoints?:{label:string;value:string};pointsNote?:string };
export const courses = courseRows as Course[];
export const colleges = collegeRows;
export const collegeMap = Object.fromEntries(colleges.map(c=>[c.id,c]));
export const categories = ['Business','Economics','Finance','Law','Engineering','Computing','Medicine','Healthcare','Science','Psychology','Education','Arts','Humanities','Languages','Social Sciences','Architecture','Construction','Sports','Media','Journalism','Design','Agriculture'];
export const locations = ['Dublin','Cork','Galway','Limerick','Maynooth','Waterford','Kilkenny','Sligo','Athlone','Letterkenny','Other locations'];
export type Filters = { query:string; points:number[]; colleges:string[]; locations:string[]; categories:string[]; lengths:string[]; levels:string[]; types:string[]; subjects:string[] };
export const defaults:Filters = {query:'',points:[0,625],colleges:[],locations:[],categories:[],lengths:[],levels:['8'],types:[],subjects:[]};
const careerWords:Record<string,string[]>={lawyer:['Law'],solicitor:['Law'],barrister:['Law'],doctor:['Medicine'],nurse:['Healthcare'],developer:['Computing'],programmer:['Computing'],accountant:['Finance'],teacher:['Education'],architect:['Architecture'],journalist:['Journalism'],physiotherapist:['Healthcare'],engineer:['Engineering'],psychologist:['Psychology'],economist:['Economics'],designer:['Design']};
export function matches(c:Course,f:Filters){
 const q=f.query.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9\s]/g,' ').trim(); const col=collegeMap[c.college]; const text=[c.title,c.code,col.name,col.short,c.location,...c.categories].join(' ').toLowerCase();
 if(q&&!q.split(/\s+/).filter(w=>!['and','in','at','the','course','courses'].includes(w)).every(w=>text.includes(w)||careerWords[w]?.some(k=>c.categories.includes(k))))return false;
 if(f.points[0]>0||f.points[1]<625){if(c.points===null||c.special||c.points<f.points[0]||c.points>f.points[1])return false;}
 if(f.colleges.length&&!f.colleges.includes(c.college))return false;
 if(f.locations.length&&!f.locations.some(l=>l==='Other locations'?!!c.location&&!locations.slice(0,-1).includes(c.location):l===c.location))return false;
 if(f.categories.length&&!f.categories.some(k=>c.categories.includes(k)))return false;
 if(f.lengths.length&&(c.duration===null||!f.lengths.includes(c.duration>=5?'5+':String(c.duration))))return false;
 if(f.levels.length&&!f.levels.includes(String(c.level))&&!(c.level===null&&f.levels.includes('6/7')))return false;
 if(f.types.length&&!f.types.includes(col.type))return false;
 if(f.subjects.length&&(!c.requirements||!f.subjects.every(s=>c.requirements!.subjects.includes(s))))return false;
 return true;
}
export const gradePoints:Record<string,number>={H1:100,H2:88,H3:77,H4:66,H5:56,H6:46,H7:37,H8:0,O1:56,O2:46,O3:37,O4:28,O5:20,O6:12,O7:0,O8:0};
export function calculate(grades:{subject:string;grade:string}[]){return grades.map((g,i)=>({index:i,points:(gradePoints[g.grade]??0)+(g.subject==='Mathematics'&&/^H[1-6]$/.test(g.grade)?25:0)})).sort((a,b)=>b.points-a.points).slice(0,6);}
