import {build} from 'esbuild';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
await build({absWorkingDir:root,entryPoints:['src/entry.tsx'],outfile:'app.js',bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],minify:true,jsx:'automatic',alias:{'@/components':root+'/src/components','@/lib/utils':root+'/src/lib/utils'},define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline'});
console.log('Built course finder.');
