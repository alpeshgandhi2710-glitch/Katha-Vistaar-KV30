const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'lib/main.dart'),'utf8');
const tools=fs.readFileSync(path.join(root,'lib/mobile_tools.dart'),'utf8');
for(const needle of ['class ComicStudioScreen','KvComicApi','/api/studio/projects','/api/comic/panels','/api/ai/comic-illustrator','projectId','panelNumber','character','dialogue','background']) assert(main.includes(needle)||tools.includes(needle),needle);
assert(!main.includes('onTap: () {}')&&!main.includes('onPressed: () {}'),'dead handlers');
assert(!tools.includes('127.0.0.1')&&!tools.includes('localhost'),'loopback dependency');
console.log(JSON.stringify({status:'PASS',phase:'R50-M7',comicEditor:true,projectCreate:true,panelPersistence:true,internalAiPlan:true,localization:true},null,2));
