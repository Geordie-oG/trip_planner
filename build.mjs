import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const files={};
for(const name of ['index.html','app.js','style.css','terraces.webp','sync.js']){
  files['/'+name]=readFileSync(name,name.endsWith('.webp')?'base64':'utf8');
}
files['/index.html']=files['/index.html'].replace('<div id="content">','<p id="sync-message" role="status">Connecting to your shared trip…</p><div id="content">').replace('</body>','<script src="sync.js"></script></body>');
let worker=readFileSync('worker/api.mjs','utf8')+'\nconst files='+JSON.stringify(files)+';\n';
worker+=`export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/api/account'){
    const email=request.headers.get('oai-authenticated-user-email');
    return Response.json({email},{status:email?200:401,headers:{'Cache-Control':'private, no-store'}});
  }
  if(path==='/api/trip')return tripApi(request,env.BUCKET);
  const key=path==='/'?'/index.html':path;
  if(!Object.hasOwn(files,key))return new Response(null,{status:404});
  const ext=key.split('.').pop();
  const body=ext==='webp'?Uint8Array.from(atob(files[key]),c=>c.charCodeAt(0)):files[key];
  return new Response(body,{headers:{'Content-Type':{html:'text/html;charset=utf-8',js:'text/javascript',css:'text/css',webp:'image/webp'}[ext],'Cache-Control':'no-cache'}});
}};`;
mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js',worker);
