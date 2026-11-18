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
const $ = selector => document.querySelector(selector);
const modes = {
  login:['Welcome back','Pick up where you and your travel partner left off.','Log in'],
  signup:['Create an account','Use the email invited to your Vietnam trip.','Create account'],
  reset:['Forgot your password?','We’ll send a reset link to your email.','Send reset link'],
  recovery:['Choose a new password','Enter a new password for your account.','Save password'],
  magic:['Email sign-in','Open your sign-in link in this browser.','Send sign-in link']
};
function bindLogin(client){
  let mode='login';
  function view(next){
    mode=next;
    const [title,copy,submit]=modes[mode];
    $('#auth-title').textContent=title;$('#auth-copy').textContent=copy;$('#submit-auth').textContent=submit;
    const needsPassword=['login','signup','recovery'].includes(mode);
    $('#password').hidden=$('#password-label').hidden=!needsPassword;
    $('#password').required=needsPassword;$('#password').value='';
    $('#password').autocomplete=mode==='login'?'current-password':'new-password';
    $('#password').minLength=mode==='login'?1:8;
    $('#address').hidden=$('#email-label').hidden=mode==='recovery';$('#address').required=mode!=='recovery';
    $('#forgot').hidden=mode!=='login';$('#alternatives').hidden=mode!=='login';
    $('#mode-label').textContent=mode==='login'?'New here?':'';
    $('#change-mode').textContent=mode==='login'?'Create an account':'Back to login';
    $('#change-mode').hidden=mode==='recovery';message.textContent='';
    if(!client)message.textContent='Account setup is pending. You can still use the current planner.';
  }
  $('#change-mode').onclick=()=>view(mode==='login'?'signup':'login');
  $('#magic').onclick=()=>view('magic');$('#forgot').onclick=()=>view('reset');
  emailForm.onsubmit=async event=>{
    event.preventDefault();if(!client)return;
    const email=$('#address').value.trim(),password=$('#password').value;
    const button=$('#submit-auth');button.disabled=true;
    try{
      let result;
      if(mode==='login') result=await client.auth.signInWithPassword({email,password});
      if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:callback}});
      if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:callback+'?reset=1'});
      if(mode==='recovery')result=await client.auth.updateUser({password});
      if(mode==='magic')result=await client.auth.signInWithOtp({email,options:{emailRedirectTo:callback}});
      if(result.error)throw result.error;
      if(mode==='login'||mode==='recovery'||result.data?.session){location.replace('/');return;}
      message.textContent='Check your email and open the link in this browser.';
    }catch(error){message.textContent=error.message||'Could not complete this request.';}
    finally{button.disabled=false;}
  };
  return view;
}
function bindProfile(user,client,logout){
  const name=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email.split('@')[0];
  $('#display-name').textContent=name;$('#initials').textContent=name.slice(0,2).toUpperCase();$('#account-email').textContent=user.email;
  const menu=$('#profile-menu'),dialog=$('#account-dialog'),detail=$('#account-detail'),exit=$('#exit-dialog');
  $('#logout').onclick=()=>{menu.open=false;exit.showModal();};$('#stay').onclick=()=>exit.close();
  $('#confirm-exit').onclick=logout;$('#dismiss-account').onclick=()=>dialog.close();
  menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
  document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false;});
  menu.addEventListener('click',e=>{
    const key=e.target.closest('[data-profile]')?.dataset.profile;if(!key)return;menu.open=false;
    if(key==='trip'){document.querySelector('[data-tab="itinerary"]').click();$('#content').scrollIntoView();return;}
    detail.replaceChildren();
    const heading=document.createElement('h2'),copy=document.createElement('p');
    detail.append(heading,copy);
    if(key==='profile'){heading.textContent='My profile';copy.textContent=$('#display-name').textContent+' · '+user.email;}
    if(key==='share'){
      heading.textContent='Share trip link';copy.textContent='Your partner can open this link with an invited account.';
      const input=document.createElement('input');input.readOnly=true;input.value=callback;input.setAttribute('aria-label','Trip link');detail.append(input);
      const button=document.createElement('button');button.className='bright';button.textContent='Copy link';button.onclick=async()=>{try{await navigator.clipboard.writeText(callback);button.textContent='Copied';}catch{input.select();}};detail.append(button);
    }
    if(key==='settings'){
      heading.textContent='Account settings';copy.textContent='Choose the name shown in your profile.';
      const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),save=document.createElement('button');
      label.textContent='Display name';input.value=$('#display-name').textContent;input.required=true;input.maxLength=60;label.append(input);save.className='bright';save.textContent='Save changes';form.append(label,save);detail.append(form);
      form.onsubmit=async ev=>{ev.preventDefault();const value=input.value.trim();if(!value)return;save.disabled=true;
        try{const {error}=await client.auth.updateUser({data:{display_name:value}});if(error)throw error;$('#display-name').textContent=value;$('#initials').textContent=value.slice(0,2).toUpperCase();copy.textContent='Profile saved.';}
        catch(error){copy.textContent=error.message;}finally{save.disabled=false;}};
    }
    dialog.showModal();
  });
}

async function start(){
  if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY){bindLogin(null)('login');document.querySelector('#current-planner').hidden=false;google.disabled=true;document.querySelector('#submit-auth').disabled=true;message.textContent='Sign-in setup is pending. Please use the current trip site until the owner connects authentication.';return;}
  const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce'}});
  async function logout(){
    const {error}=await client.auth.signOut({scope:'local'});
    if(error){alert('Sign-out could not finish. Please reconnect and try again.');return;}
    clearTripCache();location.replace('/');
  }
  switchAccount.onclick=logout;
  google.onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback,queryParams:{prompt:'select_account'}}});if(error)message.textContent=error.message;};
  const view=bindLogin(client);
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
  if(new URLSearchParams(location.search).get('reset')==='1'){view('recovery');return;}
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session&&session.user.id!==user.id)){clearTripCache();location.replace('/');}});
  const {data:member,error}=await client.rpc('is_trip_member');
  if(!member||error){google.hidden=true;emailForm.hidden=true;switchAccount.hidden=false;message.textContent=error?'Could not check trip access. Please reload.':'This account has not been invited to the trip.';return;}
  if(localStorage.getItem('two-tickets-user')!==user.id){clearTripCache();localStorage.setItem('two-tickets-user',user.id);}
  const result=await fetch('/planner.html');if(!result.ok)throw Error('Planner unavailable');
  document.body.innerHTML=await result.text();bindProfile(user,client,logout);
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
