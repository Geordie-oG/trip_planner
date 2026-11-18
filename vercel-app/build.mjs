import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const out='vercel-dist';
await mkdir(out,{recursive:true});
for(const name of ['style.css','terraces.webp','app.js'])await copyFile(name,out+'/'+name);
const original=await readFile('index.html','utf8');
const shell=original.split('<body>')[1].split('<script src="app.js">')[0].replace('<div id="content">','<div class="account-bar"><span id="account-email"></span> <button id="logout">Sign out</button></div><p id="sync-message" role="status"></p><div id="content">');
await writeFile(out+'/planner.html',shell);
const login=await readFile('vercel-app/login.html','utf8');
await writeFile(out+'/index.html',original.split('<body>')[0]+'<body>'+login+'<script type="module" src="/auth.js"></script></body></html>');
const css=await readFile('style.css','utf8');
await writeFile(out+'/style.css',css+'\n.login{margin:8vh auto;padding:36px;max-width:420px;background:#fffbef;border:1px solid #d2c8b4;border-radius:12px}.login h1{font-size:36px}.login form{display:grid;gap:10px;margin:24px 0}.login input{padding:11px;width:100%}.account-bar{text-align:right;margin-top:12px}.account-bar button{margin-left:10px}');
const sync=await readFile('sync.js','utf8');
const start=sync.indexOf('// Account identity');const end=sync.indexOf('window.bookingScreenshots');
if(start<0||end<start)throw Error('Missing shared planner entry points');
await writeFile(out+'/sync.js',(sync.slice(0,start)+sync.slice(end)).replaceAll("fetch('/api/","window.tripRequest('/api/").replace("const url='/api/booking-images/'+encodeURIComponent(image.id);","const url='/#image='+encodeURIComponent(image.id);").replace('src="'+ "'+esc(url)+'" +'"','data-image-id="'+ "'+esc(image.id)+'" +'"'));
await build({entryPoints:['vercel-app/auth.js'],outfile:out+'/auth.js',bundle:true,minify:true,format:'esm',define:{
  SUPABASE_URL:JSON.stringify(process.env.SUPABASE_URL||''),SUPABASE_PUBLISHABLE_KEY:JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY||'')}});
