const test=require('node:test');const assert=require('node:assert/strict');const {decide}=require('../src/services/content-access-policy');
function u(sub={}){return {subscriptions:sub};}
for(const type of ['comic','audio','reel']){
 const free=type==='reel'?5:10;
 test(`${type}: login without app gets ${free} counters`,()=>{assert.equal(decide({user:u(),content:{type,partNumber:free}}).allowed,true);assert.equal(decide({user:u(),content:{type,partNumber:free+1}}).allowed,false);});
 test(`${type}: app without format subscription gets 15 counters ad-free`,()=>{assert.equal(decide({user:u({appReader:true}),content:{type,partNumber:15}}).allowed,true);const r=decide({user:u({appReader:true}),content:{type,partNumber:16}});assert.equal(r.allowed,false);assert.equal(r.adFree,true);});
 test(`${type}: format subscription unlocks all`,()=>{const key={comic:'comicReader',audio:'audioReader',reel:'reelReader'}[type];assert.equal(decide({user:u({[key]:true}),content:{type,partNumber:999}}).allowed,true);assert.equal(decide({user:u({[key]:true}),content:{type,partNumber:999}}).adFree,false);assert.equal(decide({user:u({appReader:true,[key]:true}),content:{type,partNumber:999}}).adFree,true);});
}
test('anonymous cannot consume content',()=>{assert.equal(decide({user:null,content:{type:'comic',partNumber:1}}).allowed,false);});
