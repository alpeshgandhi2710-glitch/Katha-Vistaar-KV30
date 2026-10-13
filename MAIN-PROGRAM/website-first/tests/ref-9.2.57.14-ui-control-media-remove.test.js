const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');

test('REF-9.2.57.14 editor media remove control rebinds after each mutation',()=>{
  assert.match(app,/function renderEditorMediaList\(\)/);
  assert.match(app,/data-remove-editor-media="\$\{i\}"/);
  assert.match(app,/state\.editorMedia\.splice\(Number\(b\.dataset\.removeEditorMedia\),1\);renderEditorMediaList\(\)/);
  assert.match(app,/async function uploadEditorMedia\(\)[\s\S]*?renderEditorMediaList\(\);/);
  assert.doesNotMatch(app,/uploadEditorMedia\.bind;list\.innerHTML/);
});
