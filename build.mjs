import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {renderToStaticMarkup,renderToString} from 'react-dom/server';
import React from 'react';
import {courseDataPlugin} from './build-course-data.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const alias={'@/components':root+'/src/components','@/lib/utils':root+'/src/lib/utils'};
const shared={absWorkingDir:root,bundle:true,jsx:'automatic',alias,define:{'process.env.NODE_ENV':'"production"'}};
const staticPages=[
 'blog.html','privacy.html','cao-available-places.html','cao-order-of-preference-explained.html',
 'college-open-day-guide-leaving-cert.html','level-6-7-8-cao-courses-explained.html',
 'colleges/trinity/index.html','colleges/ucd/index.html','courses/business/index.html','courses/engineering/index.html',
];
await build({...shared,entryPoints:['src/entry.tsx'],outfile:'app.js',format:'iife',platform:'browser',target:['chrome100','edge100'],minify:true,plugins:[courseDataPlugin()],legalComments:'inline'});
await build({...shared,entryPoints:['src/lib/account-client.ts'],outfile:'account-client.js',format:'esm',platform:'browser',target:['chrome100','edge100'],minify:true,legalComments:'inline'});
const serverPath=path.join(root,'.prerender.mjs');
try{
 await build({...shared,entryPoints:['src/app.tsx'],outfile:serverPath,platform:'node',format:'esm',packages:'external'});
 const {default:App,SiteHeader}=await import(pathToFileURL(serverPath).href+'?t='+Date.now());
 const html=renderToString(React.createElement(App));
 const template=await readFile(path.join(root,'index.template.html'),'utf8');
 await writeFile(path.join(root,'index.html'),template.replace('<div id="root"></div>',`<div id="root">${html}</div>`));
 for(const page of staticPages){
  const file=path.join(root,page);
  const source=await readFile(file,'utf8');
  const header=renderToStaticMarkup(React.createElement(SiteHeader,{standalone:true,page:page==='blog.html'?'blog':undefined}));
  if(!source.includes('<header class="cao-header">')) throw new Error('Missing site header in '+page);
  const updated=source.replace(/<header class="cao-header">[\s\S]*?<\/header>/,header);
  if(updated!==source) await writeFile(file,updated);
 }
 console.log(`Built course finder and pre-rendered homepage (${Buffer.byteLength(html)} bytes).`);
}finally{await unlink(serverPath).catch(()=>{});}
