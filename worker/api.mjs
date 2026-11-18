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
function valid(s){return s&&typeof s.date==='string'&&Number.isFinite(s.budget)&&s.budget>=0&&Array.isArray(s.days)&&s.days.length===6&&s.days.every(d=>['title','city','stay','tag'].every(k=>typeof d[k]==='string')&&Array.isArray(d.items)&&d.items.every(a=>['id','time','title','note'].every(k=>typeof a[k]==='string')))&&Array.isArray(s.expenses)&&s.expenses.every(e=>typeof e.id==='string'&&typeof e.title==='string'&&typeof e.category==='string'&&Number.isFinite(e.amount)&&e.amount>=0)&&Array.isArray(s.bookings)&&s.bookings.every(b=>['id','title','type','reference','detail','status'].every(k=>typeof b[k]==='string'))&&Array.isArray(s.checklist)&&s.checklist.every(c=>typeof c.id==='string'&&typeof c.text==='string'&&typeof c.done==='boolean')&&typeof s.notes==='string'}
