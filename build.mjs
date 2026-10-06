import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {renderToString} from 'react-dom/server';
import React from 'react';
import {courseDataPlugin} from './build-course-data.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const alias={'@/components':root+'/src/components','@/lib/utils':root+'/src/lib/utils'};
const shared={absWorkingDir:root,bundle:true,jsx:'automatic',alias,define:{'process.env.NODE_ENV':'"production"'}};
await build({...shared,entryPoints:['src/entry.tsx'],outfile:'app.js',format:'iife',platform:'browser',target:['chrome100','edge100'],minify:true,plugins:[courseDataPlugin()],legalComments:'inline'});
const serverPath=path.join(root,'.prerender.mjs');
try{
 await build({...shared,entryPoints:['src/app.tsx'],outfile:serverPath,platform:'node',format:'esm',packages:'external'});
 const {default:App}=await import(pathToFileURL(serverPath).href+'?t='+Date.now());
 const html=renderToString(React.createElement(App));
 const template=await readFile(path.join(root,'index.template.html'),'utf8');
 await writeFile(path.join(root,'index.html'),template.replace('<div id="root"></div>',`<div id="root">${html}</div>`));
 console.log(`Built course finder and pre-rendered homepage (${Buffer.byteLength(html)} bytes).`);
}finally{await unlink(serverPath).catch(()=>{});}
