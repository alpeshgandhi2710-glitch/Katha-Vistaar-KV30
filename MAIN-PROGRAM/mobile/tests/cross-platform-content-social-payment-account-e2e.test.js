const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const tools=fs.readFileSync(path.join(root,'lib','mobile_tools.dart'),'utf8');
const story=fs.readFileSync(path.join(root,'lib','story_studio.dart'),'utf8');
const main=fs.readFileSync(path.join(root,'lib','main.dart'),'utf8');
const server=fs.readFileSync(path.join(root,'..','website-first','src','server.js'),'utf8');

const apiChecks=[
 ['authenticated session bearer',tools.includes('authorizationHeader')&&tools.includes('Bearer')&&tools.includes('KvMobileSession.token')],
 ['account read/write source',tools.includes("'/api/profile'")&&tools.includes("updateProfile")&&server.includes("u.pathname==='/api/profile'&&req.method==='PATCH'")],
 ['content source',tools.includes("'/api/content'")&&server.includes("u.pathname==='/api/content'&&req.method==='GET'")&&server.includes("u.pathname==='/api/content'&&req.method==='POST'")],
 ['reader state source',tools.includes("'/api/reader/state")&&server.includes("u.pathname==='/api/reader/state'")],
 ['social follow/like/comment source',tools.includes("'/api/follows'")&&tools.includes("'/api/likes")&&tools.includes("'/api/comments")&&server.includes("u.pathname==='/api/follows'")&&server.includes("u.pathname==='/api/likes'")&&server.includes("u.pathname==='/api/comments'")],
 ['message read/write source',tools.includes("'/api/messages")&&tools.includes('sendMessage')&&server.includes("u.pathname==='/api/messages'&&req.method==='POST'")],
 ['subscription/catalog source',tools.includes("'/api/subscriptions'")&&tools.includes("'/api/monetization/catalog'")&&server.includes("u.pathname==='/api/subscriptions'")&&server.includes("u.pathname==='/api/monetization/catalog'")],
 ['payment OTP source',tools.includes("'/api/payments/internal-otp/start'")&&tools.includes("'/api/payments/internal-otp/verify'")&&server.includes("u.pathname==='/api/payments/internal-otp/start'")&&server.includes("u.pathname==='/api/payments/internal-otp/verify'")],
 ['coin purchase source',tools.includes("'/api/coins/purchase'")&&server.includes("u.pathname==='/api/coins/purchase'")],
 ['creator publish source',tools.includes("/api/studio/publish-project/")&&story.includes("/api/studio/story/")&&server.includes("/api/studio/publish-project/")],
 ['no client localhost dependency',!(/localhost|127\.0\.0\.1/.test(tools))&&!(/localhost|127\.0\.0\.1/.test(main))],
 ['backend publication authority',server.includes('publishContract')&&server.includes('studioPublishContract')]
];
for(const [name,ok] of apiChecks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
assert.equal(apiChecks.filter(x=>!x[1]).length,0);
console.log(`${apiChecks.length}/${apiChecks.length} PASS cross-platform content/social/payment/account E2E contract`);
