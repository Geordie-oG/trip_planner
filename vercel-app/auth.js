import {createClient} from '@supabase/supabase-js';
import {makeTripRequest} from './adapter.js';
const message=document.querySelector('#message');
const emailForm=document.querySelector('#email-login');
const google=document.querySelector('#google');
const switchAccount=document.querySelector('#switch');
const callback=new URL('/',location.origin).href;
function clearTripCache(){
  for(const key of Object.keys(localStorage))if(key==='two-tickets-v1'||key.startsWith('two-tickets-v1:'))localStorage.removeItem(key);
}
function script(path){return new Promise((ok,fail)=>{const el=document.createElement('script');el.src=path;el.onload=ok;el.onerror=fail;document.body.append(el);});}
async function start(){
  if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY){document.querySelector('#current-planner').hidden=false;google.disabled=true;emailForm.querySelector('button').disabled=true;message.textContent='Sign-in setup is pending. Please use the current trip site until the owner connects authentication.';return;}
  const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce'}});
  async function logout(){
    const {error}=await client.auth.signOut({scope:'local'});
    if(error){alert('Sign-out could not finish. Please reconnect and try again.');return;}
    clearTripCache();location.replace('/');
  }
  switchAccount.onclick=logout;
  google.onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback,queryParams:{prompt:'select_account'}}});if(error)message.textContent=error.message;};
  emailForm.onsubmit=async event=>{event.preventDefault();const button=emailForm.querySelector('button');button.disabled=true;
    try{const {error}=await client.auth.signInWithOtp({email:document.querySelector('#address').value.trim(),options:{emailRedirectTo:callback}});message.textContent=error?error.message:'Check your inbox. Open the sign-in link in this browser.';}finally{button.disabled=false;}
  };
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session&&session.user.id!==user.id)){clearTripCache();location.replace('/');}});
  const {data:member,error}=await client.rpc('is_trip_member');
  if(!member||error){google.hidden=true;emailForm.hidden=true;switchAccount.hidden=false;message.textContent=error?'Could not check trip access. Please reload.':'This account has not been invited to the trip.';return;}
  if(localStorage.getItem('two-tickets-user')!==user.id){clearTripCache();localStorage.setItem('two-tickets-user',user.id);}
  const result=await fetch('/planner.html');if(!result.ok)throw Error('Planner unavailable');
  document.body.innerHTML=await result.text();document.querySelector('#account-email').textContent=user.email;
  document.querySelector('#logout').onclick=logout;
  window.tripRequest=makeTripRequest(client);
  await script('/app.js');await script('/sync.js');
  const content=document.querySelector('#content');
  async function loadThumbnails(){
    for(const img of content.querySelectorAll('img[data-image-id]:not([data-pending])')){
      img.dataset.pending='true';
      const {data,error}=await client.storage.from('booking-images').createSignedUrl(img.dataset.imageId,300);
      if(!error)img.src=data.signedUrl;
    }
  }
  new MutationObserver(loadThumbnails).observe(content,{childList:true,subtree:true});loadThumbnails();
  content.addEventListener('click',async e=>{const anchor=e.target.closest('a[href^="/#image="]');if(!anchor)return;e.preventDefault();
    const preview=document.createElement('dialog');const close=document.createElement('button');close.textContent='Close';close.onclick=()=>preview.close();preview.append(close);document.body.append(preview);preview.onclose=()=>preview.remove();preview.showModal();
    const {data,error}=await client.storage.from('booking-images').createSignedUrl(anchor.hash.slice(7),300);
    if(error){preview.append('Screenshot unavailable');return;}const img=new Image();img.alt='Booking confirmation';img.style.width='100%';img.src=data.signedUrl;preview.append(img);
  });
}
start().catch(()=>{if(message.isConnected)message.textContent='Cannot connect. Refresh the page and try again.';else alert('Could not load the planner. Refresh to try again.');});
