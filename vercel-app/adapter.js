export function makeTripRequest(client) {
  return async function request(path, options={}) {
    if(path==='/api/booking-images'){
      const id=crypto.randomUUID();
      const {error}=await client.storage.from('booking-images').upload(id,options.body,{contentType:options.body.type});
      return error?new Response(null,{status:400}):Response.json({id},{status:201});
    }
    if(path!=='/api/trip')return new Response(null,{status:404});
    const table=client.from('vietnam_trip');
    if(options.method!=='PUT'){
      const {data,error}=await table.select('plan,revision').eq('id',1).maybeSingle();
      if(error)return new Response(null,{status:503});
      return data?Response.json(data.plan,{headers:{ETag:data.revision}}):new Response(null,{status:404});
    }
    const revision=crypto.randomUUID(),plan=JSON.parse(options.body);
    const creating=options.headers['If-None-Match']==='*';
    const query=creating?table.insert({id:1,plan,revision}):table.update({plan,revision}).eq('id',1).eq('revision',options.headers['If-Match']);
    const {data,error}=await query.select('revision').maybeSingle();
    if(error && error.code!=='23505')return new Response(null,{status:503});
    return data?new Response(null,{status:204,headers:{ETag:revision}}):new Response(null,{status:412});
  };
}
