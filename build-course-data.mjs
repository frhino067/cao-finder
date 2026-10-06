import {readFile} from 'node:fs/promises';

// Keep the editable JSON unchanged. Only the published bundle uses a compact
// table, sharing repeated field values across courses without dropping facts.
export function courseDataPlugin() {
 return {name:'compact-course-data', setup(builder) {
  builder.onLoad({filter:/[/\\]src[/\\]data[/\\]courses\.json$/}, async ({path}) => {
   const courses=JSON.parse(await readFile(path,'utf8'));
   const keys=[...new Set(courses.flatMap(course=>Object.keys(course)))];
   const values=[], lookup=new Map();
   const rows=courses.map(course=>keys.map(key=>{
    if(!Object.hasOwn(course,key))return -1;
    const value=course[key], serialised=JSON.stringify(value);
    if(!lookup.has(serialised)){lookup.set(serialised,values.length);values.push(value);}
    return lookup.get(serialised);
   }));
   const packed=JSON.stringify({keys,values,rows});
   return {loader:'js',contents:`const {keys,values,rows}=JSON.parse(${JSON.stringify(packed)}); export default rows.map(row=>Object.fromEntries(row.flatMap((value,i)=>value<0?[]:[[keys[i],values[value]]])));`};
  });
 }};
}
