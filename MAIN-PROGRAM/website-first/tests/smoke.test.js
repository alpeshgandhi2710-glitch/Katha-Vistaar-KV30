require('./helpers/test-approved-monetization-fixture');
const {test:nodeTest}=require('node:test');
const test=(name,fn)=>nodeTest(name,{concurrency:false},fn);
nodeTest.beforeEach(()=>{process.env.KV_ADMIN_KEY='test-admin-key';process.env.KV_ADMIN_ROLE='master_admin';delete process.env.KV_PRODUCT_KEY;});
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
process.env.KV_ADMIN_KEY='test-admin-key';
process.env.ALLOW_LOCAL_DEMO='true';
const {features,languages,server,VERSION,services}=require('../src/server');
function start(){return new Promise(resolve=>{const srv=http.createServer(server);srv.listen(0,'127.0.0.1',()=>resolve(srv))})}
function request(port,method,url,body,cookie='',admin=false,adminRole='',binary=false){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const headers={'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{}),...(admin?{'Authorization':'Admin test-admin-key',...(adminRole?{'x-kv-admin-role':adminRole}:{})}: {})};const req=http.request({host:'127.0.0.1',port,method,path:url,headers},res=>{let chunks=[];if(!binary)res.setEncoding('utf8');res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:binary?Buffer.concat(chunks):chunks.join(''),headers:res.headers}))});req.on('error',reject);if(data)req.write(data);req.end()})}
function cookieFrom(r){return (r.headers['set-cookie']||[])[0]?.split(';')[0]||''}
async function register(port,name){const r=await request(port,'POST','/api/auth/register',{username:name,email:`${name}@example.com`,password:'secret1'});assert.equal(r.status,201);const v=await request(port,'POST','/api/auth/verify-otp',{target:`${name}@example.com`,purpose:'register-email',otp:'123456'});assert.equal(v.status,200);const l=await request(port,'POST','/api/auth/login',{identifier:name,password:'secret1'});assert.equal(l.status,200);return cookieFrom(l)}
async function internalCoin(port,cookie,coins){const cat=JSON.parse((await request(port,'GET','/api/monetization/catalog',null,cookie)).body).policy;const pack=cat.coinPacks.find(x=>x.coins===coins);assert.ok(pack);const st=await request(port,'POST','/api/payments/internal-otp/start',{action:'coin_purchase',reference:String(coins),amount:Number(pack.price||0)},cookie);assert.equal(st.status,200);const sj=JSON.parse(st.body);const vr=await request(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},cookie);assert.equal(vr.status,200);return request(port,'POST','/api/coins/purchase',{coins,method:'internal_test',paymentToken:sj.paymentToken,idempotencyKey:`smoke-coin-${Date.now()}-${Math.random()}`},cookie)}
async function internalAuthorSub(port,cookie,authorId){const cat=JSON.parse((await request(port,'GET','/api/monetization/catalog',null,cookie)).body).policy;const plan=cat.subscriptions.find(x=>x.id==='author_subscription');assert.ok(plan);const reference=`author_subscription:${authorId}`;const st=await request(port,'POST','/api/payments/internal-otp/start',{action:'subscription',reference,amount:Number(plan.price||0)},cookie);assert.equal(st.status,200);const sj=JSON.parse(st.body);const vr=await request(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},cookie);assert.equal(vr.status,200);return request(port,'POST','/api/subscriptions/purchase',{planId:'author_subscription',authorId,mode:'test',method:'internal_test',paymentToken:sj.paymentToken,idempotencyKey:`smoke-author-${authorId}-${Date.now()}-${Math.random()}`},cookie)}
async function internalSub(port,cookie,type){const cat=JSON.parse((await request(port,'GET','/api/monetization/catalog',null,cookie)).body).policy;const legacy={appReader:'app_reader',comicReader:'comic_reader',audioReader:'fm_reader',reelReader:'reel_reader',comicCreator:'comic_creator',audioCreator:'fm_creator',reelCreator:'reel_creator'};const id=legacy[type]||type;const plan=cat.subscriptions.find(x=>x.id===id);assert.ok(plan);let paymentToken=null;if(Number(plan.price||0)>0){const st=await request(port,'POST','/api/payments/internal-otp/start',{action:'subscription',reference:plan.id,amount:Number(plan.price||0)},cookie);assert.equal(st.status,200);const sj=JSON.parse(st.body);const vr=await request(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},cookie);assert.equal(vr.status,200);paymentToken=sj.paymentToken;}return request(port,'POST','/api/subscriptions/purchase',{type,planId:plan.id,mode:'test',method:'internal_test',paymentToken,idempotencyKey:`smoke-${type}-${Date.now()}-${Math.random()}`},cookie)}
test('v30 audited content-rules version and 22 scheduled non-English languages plus English UI fallback (23-language scope)',()=>{assert.equal(VERSION,'KV30-P2-30W');assert.equal(features.version,'30.0.0-v30-P2-30O');assert.equal(languages.languages.length,22);assert.equal(languages.languages.filter(x=>x.enabled&&x.scheduled).length,0);assert.equal(languages.languages.filter(x=>x.scheduled).length,22);assert.ok(languages.languages.some(x=>x.code==='brx'&&x.iso639_3==='brx'));assert.ok(languages.languages.some(x=>x.code==='ne'&&x.iso639_3==='nep'));assert.ok(!languages.languages.some(x=>x.code==='en'));assert.ok(Array.isArray(languages.uiFallbackLanguages)&&languages.uiFallbackLanguages.some(x=>x.code==='en'));assert.match(fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8'),/Nepali|नेपाली/);const rootNomedia=fs.existsSync(path.join(__dirname,'../.nomedia'))||fs.existsSync(path.join(__dirname,'../../website-first.nomedia'));const publicNomedia=fs.existsSync(path.join(__dirname,'../public/.nomedia'))||fs.existsSync(path.join(__dirname,'../public.nomedia'));assert.equal(rootNomedia,true);assert.equal(publicNomedia,true);const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));assert.equal(pkg.version,'KV30-P2-30W')});
test('public navigation is open; login happens at work-open/write',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');assert.equal((html.match(/id="primaryNav"/g)||[]).length,1);assert.match(html,/id="app"[^>]*><\/main>/);for(const token of ['forgotPassword','verify-otp','change-contact','contentViewer','content-type-nav','categoryByType','libraryTab','mediaRightsConfirmed','pending_admin','rejected_deleted','minGenuineFollowers'])assert.match(app+html,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))});

test('v30 complete navigation, profile menu, settings language and registration UI',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(html,/id="languageButton"/);
 assert.match(html,/id="primaryNav"[^>]*aria-label="Account navigation"/);
 assert.match(html,/id="primaryNav"[\s\S]*data-route="stories"/);
 assert.match(html,/id="primaryNav"[\s\S]*data-route="comic"/);
 assert.match(html,/id="primaryNav"[\s\S]*data-route="reel"/);
 assert.match(html,/id="primaryNav"[\s\S]*data-route="audio"/);
 assert.match(app,/function renderMobileNav\(\)/);
 assert.match(app,/account-settings/);
 assert.match(app,/mobile-nav-link/);
 assert.match(html,/id="primaryNav"[\s\S]*data-route="discover"/);
 assert.match(html,/id="profileMenu"/);
 assert.match(app,/cancel:'Cancel'/);
 assert.match(app,/function x\(/);
 assert.match(html,/data-close-dialog/);
 assert.match(app,/function phoneSettings\(\)/);
 assert.match(app,/phone-settings/);
 assert.match(app,/advancedSearch/);
 assert.match(app,/competitionSection\(type\)/);
 assert.match(app,/WORK_TYPES_BY_TYPE/);
 assert.match(app,/readersLabel\(\)/);
 assert.match(app,/authorLabel\(\)/);
 assert.match(app,/function openProfileMenu\(\)/);
});

test('v30 public content carries format type, work type, rating, readers and author',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  for(const type of ['story','comic','reel','audio']){
   const r=await request(port,'GET','/api/content?type='+type);assert.equal(r.status,200);
   const first=JSON.parse(r.body).content[0];assert.ok(first,`${type} sample missing`);assert.equal(first.type,type);assert.ok(first.workType);assert.ok(first.author);assert.ok(first.author.name);assert.ok(Number(first.readers)>=0);assert.ok(first.engagement);assert.ok(Number(first.engagement.rating)>=0);
  }
  assert.equal((await request(port,'GET','/phone-settings')).status,200);
  const search=await request(port,'GET','/api/search?q=Series&type=comic&workType=webtoon&sort=readers');assert.equal(search.status,200);
  assert.ok(JSON.parse(search.body).content.every(c=>c.type==='comic'&&c.workType==='webtoon'));
 }finally{srv.close()}
});

test('browser translation helper and 23-language governed UI bootstrap are runtime-safe',async()=>{
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(app,/function t\(key\)/);
 const codes=languages.languages.map(x=>x.code);assert.equal(codes.length,22);
 for(const code of codes)assert.match(app,new RegExp('(Object\\.assign\\(extra\\.'+code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'|extra\\['+code+'\\]|'+code+':\\{)'));
 assert.match(app,/EXTRA_LANGUAGE_CODES\.forEach\(code=>\{extra\[code\]\?\?=\{\}\}\)/);
 const appEl={innerHTML:''},header={innerHTML:''};
 const doc={readyState:'loading',documentElement:{lang:''},addEventListener:(ev,fn)=>{if(ev==='DOMContentLoaded')doc._init=fn},querySelector:sel=>sel==='.header-actions'?header:null,querySelectorAll:()=>[],getElementById:id=>id==='app'?appEl:null};
 const responses={'/api/languages':languages,'/api/features':features,'/api/auth/me':{user:null},'/api/content':{content:[]}};
 const ctx={location:{pathname:'/',hash:''},history:{pushState:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{}},document:doc,window:{addEventListener:()=>{}},console,URL,URLSearchParams,Map,Set,Date,Math,JSON,String,Number,Boolean,Object,Array,RegExp,Promise,encodeURIComponent,decodeURIComponent,fetch:async u=>({ok:true,json:async()=>responses[u]||{}})};
 vm.createContext(ctx);new vm.Script(app).runInContext(ctx);ctx.initApp();await new Promise(r=>setTimeout(r,20));
 assert.match(appEl.innerHTML,/home-hero/);
 for(const code of codes){vm.runInContext(`state.uiLanguage=${JSON.stringify(code)}`,ctx);for(const route of ['home','stories','comic','reel','audio','discover','categories','settings','help']){ctx.render(route);assert.doesNotMatch(appEl.innerHTML,/Application failed to render/,`${code}:${route}`);assert.ok(appEl.innerHTML.length>0,`${code}:${route} empty`)}}
 const categorySource=vm.runInContext('CATEGORY_LABELS',ctx);const allCategories=new Set(['all',...['story','comic','reel','audio'].flatMap(type=>vm.runInContext(`CATEGORIES_BY_TYPE.${type}`,ctx))]);for(const code of codes){const labels=categorySource[code]||{};for(const k of allCategories)assert.ok(labels[k],`${code}:${k} category label missing`)}
});

test('draft privacy, edit, unpublish, delete and reorder',async()=>{const srv=await start(),port=srv.address().port;try{const c1=await register(port,'author1');const c2=await register(port,'reader1');const draft=await request(port,'POST','/api/content',{type:'story',title:'Private Draft',body:'secret',status:'draft',rightsConfirmed:true},c1);assert.equal(draft.status,201);const id=JSON.parse(draft.body).content.id;const pub=await request(port,'GET','/api/content',null,c2);assert.ok(!JSON.parse(pub.body).content.some(x=>x.id===id));const edit=await request(port,'PATCH','/api/content/'+id,{title:'Edited Draft',status:'draft'},c1);assert.equal(edit.status,200);const unpub=await request(port,'PATCH','/api/content/'+id,{status:'unpublished'},c1);assert.equal(unpub.status,200);const del=await request(port,'DELETE','/api/content/'+id,null,c1);assert.equal(del.status,200)}finally{srv.close()}});
test('creator subscriptions and internal AI approval flow',async()=>{const srv=await start(),port=srv.address().port;try{const c=await register(port,'creator1');const denied=await request(port,'POST','/api/content',{type:'comic',title:'C',status:'draft'},c);assert.equal(denied.status,403);await internalSub(port,c,'comicCreator');const ok=await request(port,'POST','/api/content',{type:'comic',title:'Comic',status:'published',partNumber:1,rightsConfirmed:true,mediaRightsConfirmed:true},c);assert.equal(ok.status,201);assert.equal(JSON.parse(ok.body).publication.status,'published');const uncertain=await request(port,'POST','/api/content',{type:'comic',title:'Unclear',status:'published',partNumber:2,rightsConfirmed:false,mediaRightsConfirmed:false},c);assert.equal(JSON.parse(uncertain.body).publication.status,'pending_review');const id=JSON.parse(uncertain.body).content.id;const publicList=await request(port,'GET','/api/content');assert.ok(!JSON.parse(publicList.body).content.some(x=>x.id===id));const oldProduct=process.env.KV_PRODUCT_KEY,oldRole=process.env.KV_ADMIN_ROLE,oldId=process.env.KV_ADMIN_ID;process.env.KV_PRODUCT_KEY='katha-vistaar-local-product';process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='smoke-moderation-master';const ms=await request(port,'POST','/api/admin/session',{role:'master_admin',masterKey:'test-admin-key',productKey:'katha-vistaar-local-product'});assert.equal(ms.status,200);const mc=cookieFrom(ms);const approved=await request(port,'POST','/api/admin/moderation/'+id,{decision:'approve'},mc);assert.equal(approved.status,200);if(oldProduct===undefined)delete process.env.KV_PRODUCT_KEY;else process.env.KV_PRODUCT_KEY=oldProduct;if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole;if(oldId===undefined)delete process.env.KV_ADMIN_ID;else process.env.KV_ADMIN_ID=oldId}finally{srv.close()}});
test('policy violation deletes content, warns creator and locks after three',async()=>{const srv=await start(),port=srv.address().port;try{const c=await register(port,'badactor');await internalSub(port,c,'audioCreator');for(let i=0;i<3;i++){const bad=await request(port,'POST','/api/content',{type:'audio',title:'pirated copy',body:'copyright pirated',status:'published',rightsConfirmed:true,mediaRightsConfirmed:true},c);assert.equal(JSON.parse(bad.body).publication.status,'rejected_deleted')}const me=await request(port,'GET','/api/auth/me',null,c);assert.equal(JSON.parse(me.body).user.policyViolations,3);assert.equal(JSON.parse(me.body).user.locked,true);const appeal=await request(port,'POST','/api/account/appeal',{apology:'I apologize and request review.'},c);assert.equal(appeal.status,200);const uid=JSON.parse(me.body).user.id;const oldProduct=process.env.KV_PRODUCT_KEY,oldRole=process.env.KV_ADMIN_ROLE,oldId=process.env.KV_ADMIN_ID;process.env.KV_PRODUCT_KEY='katha-vistaar-local-product';process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='smoke-unlock-master';const ms=await request(port,'POST','/api/admin/session',{role:'master_admin',masterKey:'test-admin-key',productKey:'katha-vistaar-local-product'});assert.equal(ms.status,200);const mc=cookieFrom(ms);const unlock=await request(port,'POST','/api/admin/accounts/'+uid,{decision:'unlock'},mc);assert.equal(unlock.status,200);if(oldProduct===undefined)delete process.env.KV_PRODUCT_KEY;else process.env.KV_PRODUCT_KEY=oldProduct;if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole;if(oldId===undefined)delete process.env.KV_ADMIN_ID;else process.env.KV_ADMIN_ID=oldId}finally{srv.close()}});
test('v30 foundation content access rules: novels 15 free + 5 coin/ad/24h progression; comic/FM 10 free without app, 15 with app; reel 5 free without app, 15 with app; reels login',async()=>{const srv=await start(),port=srv.address().port;try{const owner=await register(port,'rulesownerp203');const u=await register(port,'rulesuserp203');const parts=[];for(let i=1;i<=17;i++){const r=await request(port,'POST','/api/content',{type:'story',workType:'novel',title:'Novel '+i,status:'published',partNumber:i,seriesId:'rules-novel',rightsConfirmed:true},owner);assert.equal(r.status,201);parts.push(JSON.parse(r.body).content.id)}assert.equal((await request(port,'GET','/api/content/'+parts[15],null,u)).status,402);assert.equal((await request(port,'POST','/api/content/'+parts[14]+'/read',null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+parts[15],null,u)).status,402);assert.equal((await request(port,'POST','/api/content/'+parts[15]+'/unlock',null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+parts[15],null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+parts[16],null,u)).status,402);assert.equal((await request(port,'POST','/api/content/'+parts[16]+'/rewarded-ad-unlock',null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+parts[16],null,u)).status,200);await internalSub(port,u,'comicCreator');await internalSub(port,u,'audioCreator');await internalSub(port,u,'reelCreator');await internalSub(port,owner,'comicCreator');await internalSub(port,owner,'audioCreator');await internalSub(port,owner,'reelCreator');const comic=[];for(let i=1;i<=16;i++){const r=await request(port,'POST','/api/content',{type:'comic',title:'Comic '+i,status:'published',partNumber:i,seriesId:'rules-comic',rightsConfirmed:true,mediaRightsConfirmed:true},owner);assert.equal(r.status,201);comic.push(JSON.parse(r.body).content.id)}assert.equal((await request(port,'GET','/api/content/'+comic[9],null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+comic[10],null,u)).status,402);await internalSub(port,u,'appReader');assert.equal((await request(port,'GET','/api/content/'+comic[14],null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+comic[15],null,u)).status,402);await internalSub(port,u,'comicReader');assert.equal((await request(port,'GET','/api/content/'+comic[15],null,u)).status,200);await request(port,'POST','/api/subscriptions',{type:'appReader',enabled:false},u);const fm=[];for(let i=1;i<=11;i++){const r=await request(port,'POST','/api/content',{type:'audio',title:'FM '+i,status:'published',partNumber:i,seriesId:'rules-fm',rightsConfirmed:true,mediaRightsConfirmed:true},owner);assert.equal(r.status,201);fm.push(JSON.parse(r.body).content.id)}assert.equal((await request(port,'GET','/api/content/'+fm[9],null,u)).status,200);assert.equal((await request(port,'GET','/api/content/'+fm[10],null,u)).status,402);await internalSub(port,u,'audioReader');assert.equal((await request(port,'GET','/api/content/'+fm[10],null,u)).status,200);const reel=await request(port,'POST','/api/content',{type:'reel',title:'Reel',status:'published',partNumber:1,rightsConfirmed:true,mediaRightsConfirmed:true},owner);assert.equal(reel.status,201);const rid=JSON.parse(reel.body).content.id;assert.equal((await request(port,'GET','/api/content/'+rid)).status,401);assert.equal((await request(port,'GET','/api/content/'+rid,null,u)).status,200);const short=await request(port,'POST','/api/content',{type:'story',workType:'short-story',title:'Short',status:'published',partNumber:20,rightsConfirmed:true},owner);assert.equal(short.status,201);const sid=JSON.parse(short.body).content.id;assert.equal((await request(port,'GET','/api/content/'+sid,null,u)).status,200)}finally{srv.close()}});
test('v30 reader engagement supports likes, 1-5 ratings, comments and stickers',async()=>{const srv=await start(),port=srv.address().port;try{const author=await register(port,'engauthov307'),reader=await register(port,'engreadev307');const r=await request(port,'POST','/api/content',{type:'story',workType:'short-story',title:'Engage',status:'published',rightsConfirmed:true},author);const cid=JSON.parse(r.body).content.id;assert.equal((await request(port,'POST','/api/likes',{contentId:cid,liked:true},reader)).status,200);assert.equal((await request(port,'POST','/api/reviews',{contentId:cid,rating:5},reader)).status,200);assert.equal((await request(port,'POST','/api/comments',{contentId:cid,body:'Helpful story'},reader)).status,201);const aid=JSON.parse((await request(port,'GET','/api/auth/me',null,author)).body).user.id;assert.equal((await request(port,'POST','/api/coins/give',{contentId:cid,authorId:aid,amount:1},reader)).status,200);assert.equal((await request(port,'POST','/api/stickers/gift',{contentId:cid,sticker:'thanks',cost:1},reader)).status,200)}finally{srv.close()}});

test('v30 author and app subscriptions unlock novel parts',async()=>{const srv=await start(),port=srv.address().port;try{const author=await register(port,'authov307'),reader=await register(port,'readev307');const aid=JSON.parse((await request(port,'GET','/api/auth/me',null,author)).body).user.id;const r=await request(port,'POST','/api/content',{type:'story',workType:'novel',title:'Premium Novel',status:'published',partNumber:16,seriesId:'premium117',rightsConfirmed:true},author);const cid=JSON.parse(r.body).content.id;assert.equal((await request(port,'GET','/api/content/'+cid,null,reader)).status,402);assert.equal((await internalAuthorSub(port,reader,aid)).status,200);assert.equal((await request(port,'GET','/api/content/'+cid,null,reader)).status,200);assert.equal((await request(port,'POST','/api/author-subscriptions',{authorId:aid,enabled:false},reader)).status,200);await internalSub(port,reader,'appReader');assert.equal((await request(port,'GET','/api/content/'+cid,null,reader)).status,200)}finally{srv.close()}});

test('v30 creator AI is advisory and coin/sticker purchase uses internal test ledger',async()=>{const srv=await start(),port=srv.address().port;try{const u=await register(port,'aitest117');const ai=await request(port,'POST','/api/ai/creator-assist',{type:'comic',title:'',body:''},u);assert.equal(ai.status,200);assert.equal(JSON.parse(ai.body).assistant.authorApprovalRequired,true);assert.equal(JSON.parse(ai.body).assistant.canModifyWithoutApproval,false);const cp=await internalCoin(port,u,100);assert.equal(cp.status,200);const sp=await request(port,'POST','/api/stickers/purchase',{sticker:'thanks',idempotencyKey:`sticker-${Date.now()}-${Math.random()}`},u);assert.equal(sp.status,200)}finally{srv.close()}});

test('OTP login/reset and private profile',async()=>{const srv=await start(),port=srv.address().port;try{const reg=await request(port,'POST','/api/auth/register',{username:'profile1',mobile:'9999999999',password:'secret1'});assert.equal(reg.status,201);const v=await request(port,'POST','/api/auth/verify-otp',{target:'9999999999',purpose:'register-mobile',otp:'123456'});const l=await request(port,'POST','/api/auth/login',{identifier:'9999999999',password:'secret1'});assert.equal(l.status,200);const c=cookieFrom(l);assert.ok(c);const prof=await request(port,'GET','/api/profile',null,c);assert.equal(prof.status,200);const up=await request(port,'PATCH','/api/profile',{name:'Test User',address:'Private Address'},c);assert.equal(up.status,200);const forgot=await request(port,'POST','/api/auth/forgot-password',{identifier:'9999999999'});assert.equal(forgot.status,200);const reset=await request(port,'POST','/api/auth/reset-password',{target:'9999999999',purpose:'reset-mobile',otp:'123456',password:'secret2'});assert.equal(reset.status,200);const publicMe=JSON.parse((await request(port,'GET','/api/auth/me')).body);assert.equal(publicMe.user,null)}finally{srv.close()}});
test('scheduled publication remains private until its publish time',async()=>{const srv=await start(),port=srv.address().port;try{const c=await register(port,'scheduler');const future=new Date(Date.now()+3600000).toISOString();const r=await request(port,'POST','/api/content',{type:'story',title:'Future story',status:'scheduled',publishAt:future,rightsConfirmed:true},c);assert.equal(JSON.parse(r.body).publication.status,'scheduled');const id=JSON.parse(r.body).content.id;const pub=await request(port,'GET','/api/content');assert.ok(!JSON.parse(pub.body).content.some(x=>x.id===id))}finally{srv.close()}});

test('v30 content isolation, category scoping, public settings and user library isolation',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  for(const route of ['/stories','/comics','/audio','/reels','/settings','/library']){
   const r=await request(port,'GET',route);assert.equal(r.status,200,route);
  }
  const romance=await request(port,'GET','/api/content?type=story&category=romance');
  assert.equal(romance.status,200);
  const romanceItems=JSON.parse(romance.body).content;
  assert.ok(romanceItems.length>0);
  assert.ok(romanceItems.every(c=>c.type==='story'&&c.category==='romance'));
  assert.equal((await request(port,'GET','/api/content?type=comic&category=romance')).status,400);
  assert.equal((await request(port,'GET','/api/library')).status,401);

  const userA=await register(port,'librarya');
  const userB=await register(port,'libraryb');
  const saved=await request(port,'POST','/api/library/save',{contentId:'sample-story-1',saved:true},userA);
  assert.equal(saved.status,200);
  await request(port,'GET','/api/content/sample-story-1',null,userA);
  const libA=JSON.parse((await request(port,'GET','/api/library?type=story',null,userA)).body);
  const libB=JSON.parse((await request(port,'GET','/api/library?type=story',null,userB)).body);
  assert.equal(libA.savedItems.length,1);
  assert.equal(libA.history.length,1);
  assert.equal(libB.savedItems.length,0);
  assert.equal(libB.history.length,0);
 }finally{srv.close()}
});


test('v30 reader engagement: follow, rating, comments, coins and reader-accessible actions',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  const author=await register(port,'engauthor'); const reader=await register(port,'engreader');
  const pub=await request(port,'POST','/api/content',{type:'story',title:'Engagement Story',body:'Read me',status:'published',rightsConfirmed:true},author); assert.equal(pub.status,201);
  const cid=JSON.parse(pub.body).content.id; const opened=await request(port,'GET','/api/content/'+cid,null,reader); assert.equal(opened.status,200);
  const authorId=JSON.parse(opened.body).content.author.id;
  const follow=await request(port,'POST','/api/follows',{authorId,following:true},reader); assert.equal(follow.status,200); assert.equal(JSON.parse(follow.body).following,true);
  const rating=await request(port,'POST','/api/reviews',{contentId:cid,rating:5},reader); assert.equal(rating.status,200); assert.equal(JSON.parse(rating.body).summary.rating,5);
  const comment=await request(port,'POST','/api/comments',{contentId:cid,body:'ખૂબ સરસ'},reader); assert.equal(comment.status,201);
  const coinsBefore=JSON.parse((await request(port,'GET','/api/coins',null,reader)).body).coins;
  const gift=await request(port,'POST','/api/coins/give',{contentId:cid,authorId,amount:5},reader); assert.equal(gift.status,200); assert.equal(JSON.parse(gift.body).coins,coinsBefore-5);
  const comments=await request(port,'GET','/api/comments?contentId='+cid,null,reader); assert.equal(JSON.parse(comments.body).comments.length,1);
 }finally{srv.close()}
});


test('v30 Internal AI Help supports public login/registration/OTP tickets, verified login tickets, and three AI layers',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  const anonymous=await request(port,'POST','/api/help/public-ticket',{identifier:'help-public@example.test',channel:'ai',problem:'I forgot my password'});assert.equal(anonymous.status,201);const anonymousTicket=JSON.parse(anonymous.body).ticket;assert.equal(anonymousTicket.contactVerified,false);const anonymousTrack=await request(port,'GET','/api/help/tickets/track?ticketNumber='+encodeURIComponent(anonymousTicket.id)+'&identifier='+encodeURIComponent('help-public@example.test'));assert.equal(anonymousTrack.status,200);const anonymousComment=await request(port,'PATCH','/api/help/public-ticket',{ticketNumber:anonymousTicket.id,identifier:'help-public@example.test',comment:'Still unable to log in.'});assert.equal(anonymousComment.status,200);
  const reg=await request(port,'POST','/api/auth/register',{username:'helpuser',mobile:'8888888888',password:'secret1'});assert.equal(reg.status,201);
  const v=await request(port,'POST','/api/auth/verify-otp',{target:'8888888888',purpose:'register-mobile',otp:'123456'});assert.equal(v.status,200);const l=await request(port,'POST','/api/auth/login',{identifier:'8888888888',password:'secret1'});assert.equal(l.status,200);const c=cookieFrom(l);assert.ok(c);
  const ctx=await request(port,'GET','/api/help/context',null,c);assert.equal(ctx.status,200);const context=JSON.parse(ctx.body);assert.equal(context.verifiedContactType,'mobile');assert.match(context.verifiedContact,/888/);
  const simple=await request(port,'POST','/api/help/tickets',{channel:'ai',problem:'I forgot my password'},c);assert.equal(simple.status,201);const st=JSON.parse(simple.body);assert.equal(st.ticket.status,'ai_resolved');assert.equal(st.ticket.contactVerified,true);
  const sensitive=await request(port,'POST','/api/help/tickets',{channel:'mobile',problem:'My account was hacked and I suspect account takeover'},c);assert.equal(sensitive.status,201);const sec=JSON.parse(sensitive.body);assert.equal(sec.ticket.status,'pending_admin');assert.equal(sec.ticket.status,'pending_admin');assert.equal(sec.ticket.contactType,'mobile');
  const oldRole=process.env.KV_ADMIN_ROLE,oldId=process.env.KV_ADMIN_ID;process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='smoke-master';
  const masterSession=await request(port,'POST','/api/admin/session',{role:'master_admin',masterKey:'test-admin-key',productKey:'katha-vistaar-local-product'},'',false);assert.equal(masterSession.status,200);const masterCookie=cookieFrom(masterSession);
  const adminQueue=await request(port,'GET','/api/admin/help/tickets?queue=admin',null,masterCookie);assert.equal(adminQueue.status,200);const masterQueue=await request(port,'GET','/api/admin/help/tickets',null,masterCookie);assert.equal(masterQueue.status,200);assert.ok(JSON.parse(masterQueue.body).tickets.some(x=>x.id===sec.ticket.id));
  const grant=await request(port,'POST','/api/admin/rbac/permissions',{adminId:'smoke-designated',permission:'support.help_ai'},masterCookie);assert.equal(grant.status,201);
  process.env.KV_ADMIN_ROLE='admin';process.env.KV_ADMIN_ID='smoke-designated';const delegatedSession=await request(port,'POST','/api/admin/session',{role:'admin',key:'test-admin-key'},'',false);assert.equal(delegatedSession.status,200);const delegatedCookie=cookieFrom(delegatedSession);
  const assist=await request(port,'POST','/api/admin/help/ai-assist',{problem:'Summarize this ordinary account support issue'},delegatedCookie);assert.equal(assist.status,200);assert.equal(JSON.parse(assist.body).layer,'designated_admin_assist');
  process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='smoke-master';const masterAssist=await request(port,'POST','/api/admin/help/ai-assist',{problem:'Analyze this security escalation'},masterCookie);assert.equal(masterAssist.status,200);assert.equal(JSON.parse(masterAssist.body).layer,'master_admin_assist');
  const resolved=await request(port,'POST','/api/admin/help/tickets/'+sec.ticket.id,{action:'resolve',resolution:'Security case reviewed by Master Admin.'},masterCookie);assert.equal(resolved.status,200);assert.equal(JSON.parse(resolved.body).ticket.status,'master_resolved');
  if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole;if(oldId===undefined)delete process.env.KV_ADMIN_ID;else process.env.KV_ADMIN_ID=oldId;
 }finally{srv.close()}
});


test('v30 master admin session protects dashboards and backup snapshot',async()=>{
 const srv=await start(); const port=srv.address().port;
 const bad=await request(port,'POST','/api/admin/session',{key:'wrong',role:'master_admin'}); assert.equal(bad.status,403);
 const ok=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'}); assert.equal(ok.status,200); const ac=cookieFrom(ok);
 const dash=await request(port,'GET','/api/admin/dashboard',null,ac); assert.equal(dash.status,200); assert.equal(JSON.parse(dash.body).role,'master_admin');
 const ai=await request(port,'GET','/api/admin/ai-dashboard',null,ac); assert.equal(ai.status,200); assert.match(ai.body,/security_ai/);
 const snap=await request(port,'GET','/api/admin/backup/snapshot',null,ac); assert.equal(snap.status,200); assert.match(snap.body,/KV30-P2-30W/);
 srv.close();
});

test('v30 reader/author dashboards, stickers and media fallback',async()=>{
 const srv=await start(); const port=srv.address().port; const cookie=await register(port,'v306user');
 const rd=await request(port,'GET','/api/dashboard/reader',null,cookie); assert.equal(rd.status,200);
 const ad=await request(port,'GET','/api/dashboard/author',null,cookie); assert.equal(ad.status,200);
 const st=await request(port,'GET','/api/stickers',null,cookie); assert.equal(st.status,200); assert.match(st.body,/Thanks/);
 const mj=await request(port,'POST','/api/media/jobs',{type:'audio'},cookie); assert.equal(mj.status,202); assert.match(mj.body,/"mode":"internal"/);
 const rep=await request(port,'GET','/api/reports/summary',null,cookie); assert.equal(rep.status,200);
 srv.close();
});


test('v30 internal media asset and test payment drivers work without external providers',async()=>{
 const srv=await start(); const port=srv.address().port; const cookie=await register(port,'driveruser');
 const asset=await request(port,'POST','/api/media/assets',{mimeType:'application/pdf',data:Buffer.from('PDF test').toString('base64')},cookie); assert.equal(asset.status,201); assert.match(asset.body,/scan/);
 const pay=await request(port,'POST','/api/payments/test',{method:'upi',amount:99,idempotencyKey:'smoke-payment-1'},cookie); assert.equal(pay.status,200); assert.match(pay.body,/test_only/);
 srv.close();
});


test('v30 email verification delivery path and login OTP recovery',async()=>{
 const srv=await start();const port=srv.address().port;const name='otpfixuser';
 const r=await request(port,'POST','/api/auth/register',{username:name,email:`${name}@example.com`,password:'secret1'});assert.equal(r.status,201);const reg=JSON.parse(r.body);assert.equal(reg.purpose,'register-email');
 const mb=await request(port,'GET','/api/dev/mailbox?target='+encodeURIComponent(reg.target));assert.equal(mb.status,200);assert.match(mb.body,/demoOtp/);assert.match(mb.body,/local_test_outbox/);
 const login=await request(port,'POST','/api/auth/login',{identifier:`${name}@example.com`,password:'secret1'});assert.equal(login.status,403);assert.match(login.body,/verification_required/);
 const send=await request(port,'POST','/api/auth/send-otp',{identifier:`${name}@example.com`});assert.equal(send.status,200);const sr=JSON.parse(send.body);assert.equal(sr.purpose,'login-email');assert.equal(sr.demoOtp,'123456');
 const verify=await request(port,'POST','/api/auth/verify-login-otp',{target:sr.target,purpose:sr.purpose,otp:sr.demoOtp});assert.equal(verify.status,200);assert.equal(JSON.parse(verify.body).authenticated,true);srv.close();
});

test('v30 media pipeline exposes HLS encryption architecture and protected key delivery',async()=>{
 const srv=await start();const port=srv.address().port;const cookie=await register(port,'hlsuser');
 const ff=spawnSync('ffmpeg',['-version'],{encoding:'utf8',timeout:10000});assert.equal(ff.status,0,'ffmpeg must be installed for the HLS runtime test');
 const tmp=path.join(require('node:os').tmpdir(),'kv-smoke-'+Date.now()+'.wav');const generated=spawnSync('ffmpeg',['-y','-f','lavfi','-i','anullsrc=r=8000:cl=mono','-t','1',tmp],{encoding:'utf8',timeout:30000});assert.equal(generated.status,0,`ffmpeg fixture generation failed: ${generated.stderr||generated.error||''}`);const raw=fs.readFileSync(tmp);const upload=await request(port,'POST','/api/media/assets',{mimeType:'audio/wav',filename:'smoke.wav',data:raw.toString('base64')},cookie);assert.equal(upload.status,201);const asset=JSON.parse(upload.body).asset;const h=await request(port,'POST','/api/media/hls/create',{assetId:asset.id},cookie);assert.equal(h.status,201);const hls=JSON.parse(h.body).hls;assert.equal(hls.encryption,'AES-128');const playlist=await request(port,'GET',hls.playlist,null,cookie);assert.equal(playlist.status,200);assert.match(playlist.body,/EXT-X-KEY/);assert.match(playlist.body,/api\/media\/hls\/key/);const keyPath=new URL('http://127.0.0.1:'+port+new URL(hls.playlist,'http://x').pathname).pathname;const keyUri=playlist.body.match(/URI="([^"]+)"/)[1];const key=await request(port,'GET',keyUri,null,cookie,false,'',true);assert.equal(key.status,200);assert.equal(key.body.length,16);const noAuth=await request(port,'GET',keyUri);assert.equal(noAuth.status,401);try{fs.unlinkSync(tmp)}catch{}try{fs.rmSync(path.join(__dirname,'../data/hls',hls.id),{recursive:true,force:true})}catch{}srv.close();
});

test('v30 creator media attachments persist across content create and content read',async()=>{
 const srv=await start();const port=srv.address().port;const cookie=await register(port,'mediaattach');
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
 const up=await request(port,'POST','/api/media/assets',{mimeType:'image/png',filename:'panel.png',data:png},cookie);assert.equal(up.status,201);const asset=JSON.parse(up.body).asset;
 const cr=await request(port,'POST','/api/content',{type:'story',workType:'short-story',title:'Media attached story',category:'life',body:'Body',mediaAssetIds:[asset.id],rightsConfirmed:true,mediaRightsConfirmed:true},cookie);assert.equal(cr.status,201);
 const cid=JSON.parse(cr.body).content.id;const got=await request(port,'GET','/api/content/'+cid,null,cookie);assert.equal(got.status,200);const c=JSON.parse(got.body).content;assert.equal(c.mediaItems.length,1);assert.equal(c.mediaItems[0].assetId,asset.id);assert.equal(c.mediaItems[0].mimeType,'image/png');srv.close();
});
test('v30 language registry uses canonical platform codes with ISO-639 metadata where defined',()=>{
 const registry=languages.languages;
 const expected={gu:['gu','guj'],hi:['hi','hin'],bn:['bn','ben'],mr:['mr','mar'],ta:['ta','tam'],te:['te','tel'],kn:['kn','kan'],ml:['ml','mal'],pa:['pa','pan'],or:['or','ori'],as:['as','asm'],ur:['ur','urd'],ks:['ks','kas'],sd:['sd','snd'],ne:['ne','nep'],sa:['sa','san'],kok:[null,'kok'],doi:[null,'doi'],mni:[null,'mni'],brx:[null,'brx'],sat:[null,'sat'],mai:[null,'mai']};
 for(const [code,[iso2,iso3]] of Object.entries(expected)){const x=registry.find(v=>v.code===code);assert.ok(x,code);assert.equal(x.iso639_1,iso2,code+' iso639_1');assert.equal(x.iso639_3,iso3,code+' iso639_3');}
});

test('v30 email external layer uses provider endpoint only after Master Admin health check',async()=>{
 const http=require('node:http');
 let received=null;
 const provider=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200);return res.end('ok')}let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{received=JSON.parse(raw);res.writeHead(202);res.end('accepted')})});
 await new Promise(r=>provider.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${provider.address().port}`;
 process.env.KV_EMAIL_PROVIDER='test';process.env.KV_EMAIL_API_KEY='secret';process.env.KV_EMAIL_ENDPOINT=endpoint;
 await services.toggleAsync('email',false,'master_admin').catch(()=>{});
 const ready=await services.healthCheck('email');assert.equal(ready.available,true);
 await services.toggleAsync('email',true,'master_admin');assert.equal(services.get('email').enabled,true);
 const srv=await start();const port=srv.address().port;
 const r=await request(port,'POST','/api/auth/register',{username:'extmail',email:'extmail@example.com',password:'secret1'});assert.equal(r.status,201);
 await new Promise(r=>setTimeout(r,80));assert.equal(received.to,'extmail@example.com');assert.equal(received.purpose,'register-email');
 services.toggle('email',false,'master_admin');srv.close();await new Promise(r=>provider.close(r));
});

test('Phase 1 monetization policy is dynamic, 20 stickers exist, paid subscription cannot self-activate, and internal test purchase works',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  const u=await register(port,'p1monetize');
  const cat=await request(port,'GET','/api/monetization/catalog',null,u);assert.equal(cat.status,200);const policy=JSON.parse(cat.body).policy;assert.equal(policy.stickerCoinRate,5);assert.equal(policy.stickers.length,20);assert.ok(policy.subscriptions.some(x=>x.id==='app_reader'));
  const direct=await request(port,'POST','/api/subscriptions',{type:'appReader',enabled:true},u);assert.equal(direct.status,402);
  const testPurchase=await internalSub(port,u,'appReader');assert.equal(testPurchase.status,200);assert.equal(JSON.parse(testPurchase.body).subscriptions.appReader,true);
  const stickers=await request(port,'GET','/api/stickers',null,u);assert.equal(stickers.status,200);assert.equal(JSON.parse(stickers.body).catalog.length,20);
  const coin=await internalCoin(port,u,100);assert.equal(coin.status,200);
  const al=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'},null,false);assert.equal(al.status,200);const ac=cookieFrom(al);const coupon=await request(port,'POST','/api/admin/monetization/offers',{id:'P1TEST',bonusCoins:25,active:true},ac);assert.equal(coupon.status,200);
 }finally{srv.close()}
});

test('Phase 1 notifications, message follow-gate, replies, and preferences work',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  const a=await register(port,'p1author'),b=await register(port,'p1reader');
  const aid=JSON.parse((await request(port,'GET','/api/auth/me',null,a)).body).user.id;
  const cid=JSON.parse((await request(port,'POST','/api/content',{type:'story',workType:'short-story',title:'P1 activity',status:'published',rightsConfirmed:true},a)).body).content.id;
  const blocked=await request(port,'POST','/api/messages',{toUserId:aid,body:'hello'},b);assert.equal(blocked.status,403);
  assert.equal((await request(port,'POST','/api/follows',{authorId:aid,following:true},b)).status,200);
  assert.equal((await request(port,'POST','/api/messages',{toUserId:aid,body:'hello'},b)).status,201);
  assert.equal((await request(port,'POST','/api/comments',{contentId:cid,body:'nice'},b)).status,201);
  const ns=await request(port,'GET','/api/notifications',null,a);assert.equal(ns.status,200);const notes=JSON.parse(ns.body).notifications;assert.ok(notes.some(x=>x.category==='message'));assert.ok(notes.some(x=>x.category==='comment'));
  const prefs=await request(port,'PATCH','/api/notification-preferences',{channels:{email:false,web:false,in_app:true},notifications:{comment:false,follow:false,author:false}},a);assert.equal(prefs.status,200);const p=JSON.parse(prefs.body).preferences;assert.equal(p.channels.email,false);assert.equal(p.notifications.comment,false);
 }finally{srv.close()}
});

test('Phase 1 coin offer applies bonus only; coin purchase price is never discounted',async()=>{
 const srv=await start(),port=srv.address().port;
 try{
  const al=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'});assert.equal(al.status,200);const ac=cookieFrom(al);
  assert.equal((await request(port,'POST','/api/admin/monetization/offers',{id:'P1DISC',discountPercent:10,bonusCoins:25,active:true},ac)).status,200);
  const u=await register(port,'p1offer');
  const st=await request(port,'POST','/api/payments/internal-otp/start',{action:'coin_purchase',reference:'100',amount:99},u);assert.equal(st.status,200);const sj=JSON.parse(st.body);
  const vr=await request(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},u);assert.equal(vr.status,200);
  const r=await request(port,'POST','/api/coins/purchase',{coins:100,method:'internal_test',paymentToken:sj.paymentToken,offerCode:'P1DISC',idempotencyKey:'offer-1'},u);assert.equal(r.status,200,r.body);const tx=JSON.parse(r.body).transaction;assert.equal(tx.baseCoins,100);assert.equal(tx.coins,125);assert.equal(tx.amount,99);assert.equal(tx.offerId,'P1DISC');
 }finally{srv.close()}
});

test('Phase 1A governed monetization: plan CRUD, ad campaigns, grants, delegated admin permissions and authoritative sticker pricing',async()=>{
 const oldRole=process.env.KV_ADMIN_ROLE,oldId=process.env.KV_ADMIN_ID;process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='master-test';
 const srv=await start(),port=srv.address().port;
 try{
  const master=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'});assert.equal(master.status,200);const mc=cookieFrom(master);
  const perm=await request(port,'PATCH','/api/admin/monetization/permissions',{permissions:{'delegated-1':['monetization.policy','ads.manage','coins.grant','stickers.grant']}},mc);assert.equal(perm.status,200);
  assert.equal((await request(port,'POST','/api/admin/monetization/subscriptions',{id:'custom_reader_p1',label:'Custom Reader P1',type:'reader',price:49,durationDays:7,adFree:true,active:true},mc)).status,200);
  assert.equal((await request(port,'DELETE','/api/admin/monetization/subscriptions/custom_reader_p1',null,mc)).status,200);
  assert.equal((await request(port,'POST','/api/admin/monetization/ads',{id:'p1-ad-1',name:'P1 Test Ad',type:'video',placement:'home',active:true,languages:'all'},mc)).status,200);
  assert.equal((await request(port,'DELETE','/api/admin/monetization/ads/p1-ad-1',null,mc)).status,200);
  const u=await register(port,'p1governed');const uid=JSON.parse((await request(port,'GET','/api/auth/me',null,u)).body).user.id;
  const grant=await request(port,'POST','/api/admin/coins/grant',{userId:uid,amount:17,reason:'P1 test grant'},mc);assert.equal(grant.status,200);assert.equal(JSON.parse(grant.body).coins,67);
  const sg=await request(port,'POST','/api/admin/stickers/grant',{userId:uid,sticker:'thanks'},mc);assert.equal(sg.status,200);
  assert.equal((await request(port,'POST','/api/admin/monetization/stickers',{id:'p1price',label:'P1 Price',emoji:'🎯',costCoins:77,active:true},mc)).status,200);
  const before=JSON.parse((await request(port,'GET','/api/coins',null,u)).body).coins;
  const fakeCost=await request(port,'POST','/api/stickers/gift',{toUserId:uid,sticker:'p1price',cost:1},u);assert.equal(fakeCost.status,400);assert.equal((await request(port,'DELETE','/api/admin/monetization/stickers/p1price',null,mc)).status,200);
  process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_ADMIN_ID='master-test';
  for(const permission of ['ads.manage','coins.grant','stickers.grant']){const rg=await request(port,'POST','/api/admin/rbac/permissions',{adminId:'delegated-1',permission},mc);assert.equal(rg.status,201);}
  process.env.KV_ADMIN_ROLE='admin';process.env.KV_ADMIN_ID='delegated-1';
  const admin=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'admin'});assert.equal(admin.status,200);const ac=cookieFrom(admin);
  assert.equal((await request(port,'POST','/api/admin/monetization/ads',{id:'p1-ad-admin',name:'Admin Ad',type:'text',placement:'discover'},ac)).status,200);
  assert.equal((await request(port,'POST','/api/admin/coins/grant',{userId:uid,amount:3},ac)).status,200);
  assert.equal((await request(port,'PATCH','/api/admin/monetization/permissions',{permissions:{}},ac)).status,403);
  process.env.KV_ADMIN_ID='ungranted-1';
  const deniedLogin=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'admin'});assert.equal(deniedLogin.status,200);const dc=cookieFrom(deniedLogin);
  const denied=await request(port,'POST','/api/admin/coins/grant',{userId:uid,amount:3},dc);assert.equal(denied.status,403);
 }finally{srv.close();if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole;if(oldId===undefined)delete process.env.KV_ADMIN_ID;else process.env.KV_ADMIN_ID=oldId;}
});
