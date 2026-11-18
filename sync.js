(() => {
  const info = document.querySelector('#sync-message');
  const cacheKey = KEY + ':shared-base';
  let base, revision, busy = false, changed = false, timer;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && valid(cached.base)) ({base, revision} = cached);
  } catch {}
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  // Merge independent edits by field and stable item ID, including additions and removals.
  function merge(before, local, remote) {
    if (equal(before,local) || equal(local,remote)) return remote;
    if (equal(before,remote)) return local;
    if (Array.isArray(before) && Array.isArray(local) && Array.isArray(remote)) {
      if ([...before,...local,...remote].every(item=>item && item.id)) {
        const maps = [before,local,remote].map(list=>new Map(list.map(item=>[item.id,item])));
        return [...new Set([...maps[2].keys(),...maps[1].keys()])]
          .map(key=>merge(...maps.map(map=>map.get(key)))).filter(Boolean);
      }
      return before.map((item,i)=>merge(item,local[i],remote[i]));
    }
    if ([before,local,remote].every(value=>value && typeof value==='object')) {
      return Object.fromEntries(Object.keys(before).map(key=>[key,merge(before[key],local[key],remote[key])]));
    }
    throw new Error('conflict');
  }
  function remember(remote, tag) {
    base = structuredClone(remote); revision = tag;
    localStorage.setItem(cacheKey,JSON.stringify({base,revision}));
  }
  function install(next) {
    if (equal(next,state)) return;
    state = next;
    localStorage.setItem(KEY,JSON.stringify(state));
    render();
  }
  async function synchronize() {
    if (busy || document.querySelector('#editor').open) return;
    busy = true;
    try {
      const read = await fetch('/api/trip',{cache:'no-store'});
      if (read.status !== 404 && !read.ok) throw Error('network');
      if (read.ok) {
        const remote = await read.json();
        if (!valid(remote)) throw Error('network');
        const tag = read.headers.get('ETag');
        if (tag !== revision || !base) {
          if (document.activeElement?.id === 'notes' && !equal(remote.notes,state.notes)) {
            info.textContent='Finish editing your note and tap outside it to sync.';return;
          }
          if (!base && localStorage.getItem(KEY) && !equal(remote,state))
            localStorage.setItem(KEY+':previous-device',JSON.stringify(state));
          let next;
          try { next = base ? merge(base,state,remote) : remote; }
          catch {
            localStorage.setItem(KEY+':previous-device',JSON.stringify(state));
            next = remote;
            toast('Another person edited the same field. Your version is saved under Download device copy.');
          }
          install(next);remember(remote,tag);
        }
      }
      if (read.status===404 || !equal(state,base)) {
        const snapshot=structuredClone(state);
        const write=await fetch('/api/trip',{method:'PUT',headers:{
          'Content-Type':'application/json',...(read.status===404?{'If-None-Match':'*'}:{'If-Match':revision})
        },body:JSON.stringify(snapshot)});
        if (write.status===412) {info.textContent='Combining recent changes…';return;}
        if (!write.ok) throw Error('network');
        remember(snapshot,write.headers.get('ETag'));
      }
      changed=!equal(base,state);
      info.textContent=changed?'Saving changes…':'● Shared trip · changes synced';
    } catch {info.textContent='Shared sync unavailable · retrying automatically';}
    finally {busy=false;showBackup();}
  }
  function showBackup(){
    if (!localStorage.getItem(KEY+':previous-device') || document.querySelector('#device-copy'))return;
    const button=document.createElement('button');button.id='device-copy';button.className='quiet';button.textContent='Download device copy';
    button.onclick=()=>{const url=URL.createObjectURL(new Blob([localStorage.getItem(KEY+':previous-device')],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='previous-device-trip.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};info.after(button);
  }
  window.addEventListener('trip-edit',()=>{changed=true;info.textContent='Saving changes…';clearTimeout(timer);timer=setTimeout(synchronize,500);});
  window.addEventListener('online',synchronize);
  setInterval(()=>{if(!document.hidden)synchronize()},4000);
  synchronize();
})();
