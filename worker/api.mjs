const tripKey = 'vietnam/shared-trip-v1.json';
const reply = (message, status) => new Response(message, {status, headers:{'Cache-Control':'no-store'}});
export async function tripApi(request, bucket) {
  if (request.method === 'GET') {
    const object = await bucket.get(tripKey);
    if (!object) return reply('', 404);
    return new Response(object.body, {headers:{'Content-Type':'application/json','Cache-Control':'no-store','ETag':object.httpEtag}});
  }
  if (request.method !== 'PUT') return reply('',405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return reply('',403);
  const match = request.headers.get('If-Match');
  const create = request.headers.get('If-None-Match') === '*';
  if (!match && !create) return reply('',428);
  const body = await request.text();
  if (body.length > 2000000) return reply('Trip exceeds size limit',413);
  try { if (!valid(JSON.parse(body))) return reply('Invalid trip',400); }
  catch { return reply('Invalid trip',400); }
  const condition = create ? {etagDoesNotMatch:'*'} : {etagMatches:match.replace(/^"|"$/g,'')};
  const object = await bucket.put(tripKey,body,{onlyIf:condition});
  if (!object) return reply('',412);
  return new Response(null,{status:204,headers:{'ETag':object.httpEtag,'Cache-Control':'no-store'}});
}
function valid(s){return s&&typeof s.date==='string'&&Number.isFinite(s.budget)&&s.budget>=0&&Array.isArray(s.days)&&s.days.length===6&&s.days.every(d=>['title','city','stay','tag'].every(k=>typeof d[k]==='string')&&Array.isArray(d.items)&&d.items.every(a=>['id','time','title','note'].every(k=>typeof a[k]==='string')))&&Array.isArray(s.expenses)&&s.expenses.every(e=>typeof e.id==='string'&&typeof e.title==='string'&&typeof e.category==='string'&&Number.isFinite(e.amount)&&e.amount>=0)&&Array.isArray(s.bookings)&&s.bookings.every(b=>['id','title','type','reference','detail','status'].every(k=>typeof b[k]==='string')&&(b.images===undefined||(Array.isArray(b.images)&&b.images.every(i=>i&&typeof i.name==='string'&&/^[0-9a-f-]{36}$/.test(i.id)))))&&Array.isArray(s.checklist)&&s.checklist.every(c=>typeof c.id==='string'&&typeof c.text==='string'&&typeof c.done==='boolean')&&typeof s.notes==='string'}

// Images are served only behind the site's private access policy.
const maxScreenshotBytes = 10 * 1024 * 1024;
function imageMime(bytes) {
  const starts = signature => signature.every((value,i)=>bytes[i]===value);
  if (starts([137,80,78,71,13,10,26,10])) return 'image/png';
  if (starts([255,216,255])) return 'image/jpeg';
  if (starts([82,73,70,70]) && String.fromCharCode(...bytes.subarray(8,12))==='WEBP') return 'image/webp';
}
export async function bookingImage(request,bucket,path) {
  const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if (!request.headers.get('oai-authenticated-user-id')) return reply('',401);
  if (path==='/api/booking-images' && request.method==='POST') {
    if (request.headers.get('Origin')!==new URL(request.url).origin) return reply('',403);
    if (Number(request.headers.get('Content-Length'))>maxScreenshotBytes) return reply('Maximum size is 10 MB',413);
    const reader=request.body?.getReader();
    if (!reader) return reply('Empty file',400);
    const chunks=[]; let size=0;
    for (;;) {
      const {value,done}=await reader.read(); if(done) break;
      size+=value.length;
      if(size>maxScreenshotBytes){await reader.cancel();return reply('Maximum size is 10 MB',413);}
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    const mime=imageMime(bytes);
    if(!mime || mime!==request.headers.get('Content-Type')) return reply('Choose a PNG, JPEG or WebP image',415);
    const id=crypto.randomUUID();
    await bucket.put('booking-images/'+id,bytes,{httpMetadata:{contentType:mime}});
    return Response.json({id},{status:201,headers});
  }
  const match=path.match(/^\/api\/booking-images\/([0-9a-f-]{36})$/);
  if(!match || request.method!=='GET') return reply('',404);
  const image=await bucket.get('booking-images/'+match[1]);
  if(!image)return reply('',404);
  return new Response(image.body,{headers:{...headers,'Content-Type':image.httpMetadata.contentType}});
}
