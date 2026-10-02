import courseRows from '../data/courses.json';
import collegeRows from '../data/colleges.json';
import type {Course} from './course-data';

export type SearchQuery = {
 terms:string[]; locations:string[]; colleges:string[]; categories:string[];
 min:number|null; max:number|null; order:'low'|'high'|null;
 labels:string[]; corrections:string[]; meaningful:boolean;
};
const normalise=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'`]/g,'').replace(/&/g,' and ').replace(/[–—]/g,'-').replace(/[^a-z0-9+<>=\s-]/g,' ').replace(/\s+/g,' ').trim();
const words=(value:string)=>normalise(value).match(/[a-z0-9]+/g)??[];
const phrase=(value:string)=>normalise(value).replace(/-/g,' ');
const collegeMap=Object.fromEntries(collegeRows.map(c=>[c.id,c]));
const categoryAliases:Record<string,string[]>={
 Business:['business','commerce'],Economics:['economics','economist'],Finance:['finance','financial'],Law:['law','lawyer','solicitor','barrister'],
 Engineering:['engineering','engineer'],Computing:['computer science','computing','computer','computers','coding','programming','programmer','software developer','developer','it'],
 Medicine:['medicine','doctor'],Healthcare:['healthcare','health care'],Science:['science','scientist'],Psychology:['psychology','psychologist'],
 Education:['education','teaching','teacher'],Arts:['arts'],Humanities:['humanities'],Languages:['languages'],
 'Social Sciences':['social sciences','social science'],Architecture:['architecture','architect'],Construction:['construction'],
 Sports:['sports','sport'],Media:['media'],Journalism:['journalism','journalist'],Design:['design','designer'],Agriculture:['agriculture','agricultural','farming']
};
const termAliases:Record<string,string>={nurse:'nursing',nurses:'nursing',physio:'physiotherapy',physiotherapist:'physiotherapy',accountant:'accounting',accountants:'accounting',accountancy:'accounting',math:'mathematics',maths:'mathematics',vet:'veterinary',veterinarian:'veterinary'};
const spelling:Record<string,string>={buissness:'business',buisness:'business',bussiness:'business',engeneering:'engineering',enginnering:'engineering',psycology:'psychology',physcology:'psychology',dunlin:'dublin'};
const stop=new Set('all some do doing about that are is have got get a an the and or in at on of for to from with me my i im want interested looking look find show can could would like study studying course courses college colleges university universities degree degrees programme programmes ireland irish please around near city county cao leaving cert certificate points point pts pt'.split(' '));
const grammar=new Set('under below less fewer up least most maximum max minimum min no more over above low lower lowest high higher highest ascending descending between than'.split(' '));
const cityNames=[...new Set(courseRows.map(c=>c.location).filter((v):v is string=>!!v))];
const collegeAliases:Record<string,string[]>={
 TR:['trinity','tcd'],DN:['ucd'],DC:['dcu'],TU:['tu dublin','tudublin','tud','dit'],GY:['university of galway','nui galway','nuig'],CK:['ucc'],LM:['ul'],MH:['maynooth university','nuim'],
 AU:['atu'],MT:['mtu'],SE:['setu'],US:['tus'],RC:['rcsi'],CM:['marino'],DL:['iadt'],DB:['dbs'],AD:['ncad'],NC:['nci'],DK:['dkit'],MI:['mic'],GC:['griffith'],SC:['setanta'],MU:['st patricks','st patricks college']
};
for(const c of collegeRows){collegeAliases[c.id]??=[];collegeAliases[c.id].push(c.name);if(!cityNames.some(city=>phrase(city)===phrase(c.short)))collegeAliases[c.id].push(c.short);}
const collegePhrases=Object.entries(collegeAliases).flatMap(([id,names])=>names.map(n=>({name:phrase(n),id}))).sort((a,b)=>b.name.length-a.name.length);
const subjectPhrases=Object.entries(categoryAliases).flatMap(([category,names])=>names.map(name=>({name,category}))).sort((a,b)=>b.name.length-a.name.length);
// The index contains course facts only; requirement text is not a subject match.
const index=new Map(courseRows.map(c=>[c.code,{
 title:phrase(c.title), code:c.code.toLowerCase(),
 tokens:new Set(words([c.title,...c.categories,collegeMap[c.college].name,collegeMap[c.college].short].join(' ')))
}]));
const vocabulary=new Set([...index.values()].flatMap(v=>[...v.tokens]).concat(cityNames.flatMap(words),Object.keys(termAliases)));
const fuzzyVocabulary=[...vocabulary].filter(w=>w.length>=5&&!/\d/.test(w));
function oneEdit(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);return diff.length===1||(diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]]);}
 const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;
 let i=0;while(i<shorter.length&&shorter[i]===longer[i])i++;
 return shorter.slice(i)===longer.slice(i+1);
}
let lastInput:string|undefined,lastQuery:SearchQuery;
export function parseCourseSearch(input:string):SearchQuery{
 if(input===lastInput)return lastQuery;
 const q:SearchQuery={terms:[],locations:[],colleges:[],categories:[],min:null,max:null,order:null,labels:[],corrections:[],meaningful:false};
 let rest=normalise(input).replace(/\b([a-z]{2})\s+(\d{3})\b/g,(match,prefix,n)=>collegeMap[prefix.toUpperCase()]?prefix+n:match);
 rest=rest.replace(/[a-z]+/g,word=>{
  let corrected=spelling[word];
  if(!corrected&&word.length>=5&&!vocabulary.has(word)&&!stop.has(word)&&!grammar.has(word)){
   const candidates=fuzzyVocabulary.filter(v=>oneEdit(word,v));if(candidates.length===1)corrected=candidates[0];
  }
  if(corrected&&corrected!==word){q.corrections.push(`${word} → ${corrected}`);return corrected;}return word;
 });
 const setMin=(v:number)=>{q.min=q.min===null?v:Math.max(q.min,v);};
 const setMax=(v:number)=>{q.max=q.max===null?v:Math.min(q.max,v);};
 // Consume numeric constraints before individual keywords. Bounds intersect.
 rest=rest.replace(/\b(?:between\s+)?(\d{2,3})\s*(?:-|to|and)\s*(\d{2,3})(?:\s*(?:cao\s+)?(?:points?|pts?))?\b/g,(_,a,b)=>{setMin(Math.min(+a,+b));setMax(Math.max(+a,+b));return ' ';});
 rest=rest.replace(/\b(?:under|below|less than|fewer than)\s+(\d{1,3})\b/g,(_,n)=>{setMax(+n-1);return ' ';});
 rest=rest.replace(/\b(?:up to|at most|maximum(?: of)?|max(?:imum)?|no more than)\s+(\d{1,3})\b/g,(_,n)=>{setMax(+n);return ' ';});
 rest=rest.replace(/\b(?:over|above|more than)\s+(\d{1,3})\b/g,(_,n)=>{setMin(+n+1);return ' ';});
 rest=rest.replace(/\b(?:at least|minimum(?: of)?|min)\s+(\d{1,3})\b/g,(_,n)=>{setMin(+n);return ' ';});
 rest=rest.replace(/(<=|>=|<|>)\s*(\d{1,3})\b/g,(_,op,n)=>{if(op[0]==='<')setMax(+n-(op==='<'?1:0));else setMin(+n+(op==='>'?1:0));return ' ';});
 rest=rest.replace(/\b(\d{1,3})\s*\+/g,(_,n)=>{setMin(+n);return ' ';});
 rest=rest.replace(/\b(\d{1,3})\s*(?:points?|pts?)\s*(?:or\s+)?(?:less|under|below|fewer)\b/g,(_,n)=>{setMax(+n);return ' ';});
 rest=rest.replace(/\b(\d{1,3})\s*(?:points?|pts?)\s*(?:or\s+)?(?:more|over|above)\b/g,(_,n)=>{setMin(+n);return ' ';});
 rest=rest.replace(/\b(\d{1,3})\s*(?:points?|pts?)\b/g,(_,n)=>{setMax(+n);return ' ';});
 rest=rest.replace(/\b(?:low(?:er|est)?[-\s]+(?:cao\s+)?points?|points?\s+(?:low to high|ascending))\b/g,()=>{q.order='low';return ' ';});
 rest=rest.replace(/\b(?:high(?:er|est)?[-\s]+(?:cao\s+)?points?|points?\s+(?:high to low|descending))\b/g,()=>{q.order='high';return ' ';});
 rest=' '+rest.replace(/-/g,' ').replace(/\s+/g,' ').trim()+' ';
 const consume=(name:string)=>{const needle=' '+name+' ';if(!rest.includes(needle))return false;rest=rest.split(needle).join(' ');return true;};
 for(const {name,id} of collegePhrases)if(consume(name)&&!q.colleges.includes(id))q.colleges.push(id);
 for(const city of cityNames)if(consume(phrase(city)))q.locations.push(city);
 for(const {name,category} of subjectPhrases)if(consume(name)&&!q.categories.includes(category))q.categories.push(category);
 q.terms=[...new Set(words(rest).filter(w=>!stop.has(w)).map(w=>termAliases[w]??w))];
 q.labels.push(...q.locations,...q.colleges.map(id=>collegeMap[id].short),...q.categories);
 if(q.min!==null||q.max!==null)q.labels.push(`${q.min??0}–${q.max??625} points`);
 if(q.order)q.labels.push(q.order==='low'?'Lowest published points first':'Highest published points first');
 q.meaningful=!!(q.terms.length||q.labels.length);
 lastInput=input;lastQuery=q;return q;
}
function tokenScore(term:string,tokens:Set<string>){
 if(tokens.has(term))return 5;
 if(term.length>=3&&[...tokens].some(w=>w.startsWith(term)))return 2;
 return 0;
}
export function searchScore(c:Course,q:SearchQuery):number{
 if(q.locations.length&&!q.locations.includes(c.location??''))return -1;
 if(q.colleges.length&&!q.colleges.includes(c.college))return -1;
 if(q.categories.some(category=>!c.categories.includes(category)))return -1;
 if(q.min!==null||q.max!==null){if(c.points===null||c.special||c.additionalPoints||c.points<(q.min??0)||c.points>(q.max??625))return -1;}
 const item=index.get(c.code);if(!item)return -1;
 let score=0;
 for(const term of q.terms){
  const value=item.code===term?100:item.code.startsWith(term)?25:tokenScore(term,item.tokens);
  if(!value)return -1;score+=value;
 }
 for(const category of q.categories)if(words(item.title).includes(category.toLowerCase()))score+=8;
 return score;
}
export function comparablePoints(c:Course){return c.points!==null&&!c.special&&!c.additionalPoints&&c.points<=625?c.points:null;}
