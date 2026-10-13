const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const tools=fs.readFileSync(path.join(root,'lib','mobile_tools.dart'),'utf8');const main=fs.readFileSync(path.join(root,'lib','main.dart'),'utf8');const server=fs.readFileSync(path.join(root,'..','website-first','src','server.js'),'utf8');
const checks=[
 ['shared social API session',tools.includes('class KvSocialApi')&&tools.includes('KvMobileSession.token')&&tools.includes('Future<Map<String,dynamic>> content()')],
 ['profile source',tools.includes("'/api/profile'")],
 ['messages source',tools.includes("'/api/messages")&&server.includes("u.pathname==='/api/messages'")],
 ['follow source',tools.includes("'/api/follows'")&&server.includes("u.pathname==='/api/follows'")],
 ['like source',tools.includes("'/api/likes")&&server.includes("u.pathname==='/api/likes'")],
 ['comment source',tools.includes("'/api/comments")&&server.includes("u.pathname==='/api/comments'")],
 ['subscription source',tools.includes("'/api/subscriptions'")&&server.includes("u.pathname==='/api/subscriptions'")],
 ['social sync UI',main.includes('class SocialSyncScreen')&&main.includes('SocialSyncScreen()')]
];
for(const [n,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${n}`);if(checks.some(x=>!x[1]))process.exit(1);console.log('8/8 PASS');
