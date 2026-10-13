const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const tools=fs.readFileSync(path.join(root,'lib','mobile_tools.dart'),'utf8');
const main=fs.readFileSync(path.join(root,'lib','main.dart'),'utf8');
test('mobile Help exposes anonymous and authenticated ticket contracts plus tracking/comments',()=>{
 for(const route of ['/api/help/public-ai','/api/help/public-ticket','/api/help/tickets/track','/api/ai/help','/api/help/tickets'])assert.match(tools,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(main,/class HelpScreen extends StatefulWidget/);
 assert.match(main,/KvMobileSession\.authenticated\?await api\.authenticatedCreate/);
 assert.match(main,/await api\.publicCreate/);
 assert.match(main,/KvHelpApi\(\)\.track/);
 assert.match(main,/publicComment/);
 assert.match(main,/TextButton\.icon\(onPressed:\(\)=>_open\(c,const HelpScreen\(\)\)/);
});
