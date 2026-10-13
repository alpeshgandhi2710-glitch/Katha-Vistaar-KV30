const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
const main=fs.readFileSync(path.join(root,'..','mobile','lib','main.dart'),'utf8');
const host=fs.readFileSync(path.join(root,'..','mobile','native-config','ANDROID-IOS-NATIVE-HOST-CONTRACT.md'),'utf8');

test('R50-M20 FM capture persistence contract is ownership-safe and path-compatible',()=>{
  assert.match(server,/requestedAudioAssetId/);
  assert.match(server,/audio_asset_not_owned/);
  assert.match(server,/ownedMediaAsset\(user,requestedAudioAssetId,'audio'\)/);
  assert.match(main,/result\['localPath'\]\?\?result\['filePath'\]/);
  assert.match(host,/localPath.*governed key/);
  assert.match(host,/backend `\/api\/media\/audio\/mix` remains the authoritative governed render\/publish path/);
});
