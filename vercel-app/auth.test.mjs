import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./auth.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
function browser({user=null,member=false,configured=true}={}){
  const elements=new Map();
  const node=id=>{if(!elements.has(id))elements.set(id,{value:'two@example.com',querySelector:()=>node('button'),addEventListener(){}});
    return elements.get(id)};
  const storage={'two-tickets-v1':'private cache',removeItem(key){delete this[key]},getItem(key){return this[key]},setItem(key,value){this[key]=value}};
  const calls=[];const auth={getUser:async()=>({data:{user}}),onAuthStateChange(){},signOut:async()=>{calls.push('signOut');return {}},signInWithOtp:async options=>{calls.push(options);return {}},signInWithOAuth:async options=>{calls.push(options);return {}}};
  const ctx={SUPABASE_URL:configured?'https://example.test':'',SUPABASE_PUBLISHABLE_KEY:'test',createClient:()=>({auth,rpc:async()=>({data:member})}),URL,URLSearchParams,location:{origin:'https://trip.test',replace:p=>calls.push(p)},document:{querySelector:node,body:{},createElement:()=>({})},localStorage:storage,alert(){},fetch:async url=>{calls.push(url);return {ok:false}}};
  vm.runInNewContext(source,ctx);return {calls,node,storage};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Google sign-in uses the canonical origin and email uses a same-origin callback',async()=>{
 const b=browser();await tick();await b.node('#google').onclick();b.node('#magic').onclick();await b.node('#email-login').onsubmit({preventDefault(){}});
 assert.equal(b.calls[0].provider,'google');assert.equal(b.calls[0].options.redirectTo,'https://trip.test/');assert.equal(b.calls[1].options.emailRedirectTo,'https://trip.test/');assert(!b.calls.includes('/planner.html'));
});
test('uninvited account cannot enter planner and sign-out clears local trip data',async()=>{
 const b=browser({user:{id:'guest'}});await tick();assert.match(b.node('#message').textContent,/not been invited/);await b.node('#switch').onclick();assert.equal(b.storage['two-tickets-v1'],undefined);assert.deepEqual(b.calls,['signOut','/']);
});
test('only verified membership loads the planner',async()=>{
 const b=browser({user:{id:'member'},member:true});await tick();assert(b.calls.includes('/planner.html'));
});
test('missing configuration offers the existing planner',async()=>{
 const b=browser({configured:false});await tick();assert.equal(b.node('#current-planner').hidden,false);assert.equal(b.node('#google').disabled,true);
});
test('signup and reset select the correct form and password requirements',async()=>{
 const b=browser();await tick();b.node('#change-mode').onclick();
 assert.equal(b.node('#submit-auth').textContent,'Create account');
 assert.equal(b.node('#password').autocomplete,'new-password');
 b.node('#change-mode').onclick();b.node('#forgot').onclick();
 assert.equal(b.node('#submit-auth').textContent,'Send reset link');assert.equal(b.node('#password').required,false);
});
test('stay logged in dismisses the logout dialog without ending the session',()=>{
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(){},showModal(){this.open=true},close(){this.open=false}});return nodes.get(id)};
 let signedOut=0;const ctx={document:{querySelector:get,addEventListener(){}},user:{email:'test@example.com'},logout:()=>signedOut++};
 vm.runInNewContext("const $=document.querySelector;"+source.slice(source.indexOf('function bindProfile'),source.indexOf('async function start'))+";bindProfile(user,{},logout)",ctx);
 get('#logout').onclick();assert.equal(get('#exit-dialog').open,true);
 get('#stay').onclick();assert.equal(get('#exit-dialog').open,false);assert.equal(signedOut,0);
 get('#logout').onclick();get('#confirm-exit').onclick();assert.equal(signedOut,1);
});
