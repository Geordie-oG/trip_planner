import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (publicKey && !publicKey.startsWith('sb_publishable_')) {
  let role;
  try { role = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url')).role; } catch {}
  if (role !== 'anon') throw new Error('Use a Supabase publishable key or legacy anon key for the web build.');
}
const out='vercel-dist';
await mkdir(out,{recursive:true});
for(const name of ['style.css','terraces.webp','app.js'])await copyFile(name,out+'/'+name);
const original=await readFile('index.html','utf8');
const profile=await readFile('vercel-app/profile.html','utf8');
const shell=original.split('<body>')[1].split('<script src="app.js">')[0].replace('<div id="content">',profile+'<p id="sync-message" role="status"></p><div id="content">');
await writeFile(out+'/planner.html',shell);
const login=await readFile('vercel-app/login.html','utf8');
await writeFile(out+'/index.html',original.split('<body>')[0]+'<body>'+login+'<script type="module" src="/auth.js"></script></body></html>');
const css=await readFile('style.css','utf8');
await writeFile(out+'/style.css',css+'\n'+await readFile('vercel-app/account.css','utf8'));
const sync=await readFile('sync.js','utf8');
const start=sync.indexOf('// Account identity');const end=sync.indexOf('window.bookingScreenshots');
if(start<0||end<start)throw Error('Missing shared planner entry points');
await writeFile(out+'/sync.js',(sync.slice(0,start)+sync.slice(end)).replaceAll("fetch('/api/","window.tripRequest('/api/").replace("const url='/api/booking-images/'+encodeURIComponent(image.id);","const url='/#image='+encodeURIComponent(image.id);").replace('src="'+ "'+esc(url)+'" +'"','data-image-id="'+ "'+esc(image.id)+'" +'"'));
await build({entryPoints:['vercel-app/auth.js'],outfile:out+'/auth.js',bundle:true,minify:true,format:'esm',define:{
  SUPABASE_URL:JSON.stringify(process.env.SUPABASE_URL||''),SUPABASE_PUBLISHABLE_KEY:JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY||'')}});

// Cloudflare Pages consumes _headers; Vercel uses the same rules from vercel.json.
const {headers} = JSON.parse(await readFile('vercel.json','utf8'));
await writeFile(out+'/_headers','/*\n'+headers[0].headers.map(({key,value})=>'  '+key+': '+value).join('\n')+'\n');
