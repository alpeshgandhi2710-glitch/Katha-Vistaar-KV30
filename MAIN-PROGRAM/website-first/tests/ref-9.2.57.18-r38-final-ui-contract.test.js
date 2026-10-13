const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const gate=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ui-final-development-gate-v30.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'..','shared','localization-contract-v30.json'),'utf8'));
const mobile=fs.readFileSync(path.join(ROOT,'..','mobile','lib','main.dart'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'..','mobile','assets','locales','registry.json'),'utf8'));
const localeDir=path.join(ROOT,'..','mobile','assets','locales');

function ok(name,condition){assert.ok(condition,name);console.log(`PASS ${name}`)}

test('R38 final UI contract governance',()=>{
  ok('no hardcoded UI rule',gate.renderRule.includes('No user-facing text may be hardcoded'));
  ok('English fallback rule',gate.missingUnreviewedRule.includes('English catalog')&&gate.missingUnreviewedRule.includes('[key]')&&gate.unavailableLocaleRule.includes('governed English fallback'));
  ok('English authoritative',gate.englishSourceRule.includes('authoritative'));
  ok('dynamic registry',gate.languageRegistryRule.includes('dynamic')&&gate.languageRegistryRule.includes('no hard-coded 23-language ceiling'));
  ok('web mobile shared contract',gate.platformContract.includes('same localization key and semantic contract'));
  ok('shared primitives',gate.sharedUiPrimitives.length===7);
  ok('dev prod parity',gate.environmentRule.includes('Development and Production')&&gate.environmentRule.includes('same governed localization source'));
  ok('master control immutable',gate.masterControl==='IMMUTABLE');
  ok('xStrict uses English fallback',/function xStrict\(key,lang=state\.uiLanguage\)[\s\S]*?if\(v==null\|\|String\(v\)\.trim\(\)===''\|\|String\(v\)\.trim\(\)===`\[\$\{key\}\]`\)v=localeValue\('en',key\)/.test(app));
});

test('R38 shared contract and mobile registry',()=>{
  ok('contract has English source keys',contract.usedUiKeyCount>800&&Object.keys(contract.keys).length===contract.usedUiKeyCount);
  ok('mobile registry is dynamic',mobile.includes("assets/locales/registry.json")&&!/const supportedLocales\s*=/.test(mobile));
  ok('future language registry rule',contract.rules.languageRegistry==='dynamic');
  ok('23 current registry entries',registry.languages.length===23);
  ok('future languages allowed',registry.futureLanguagesAllowed===true);
  const expected=Object.keys(contract.keys).sort();
  for(const row of registry.languages){
    const f=path.join(localeDir,`${row.code}.json`);
    const d=JSON.parse(fs.readFileSync(f,'utf8'));
    assert.deepEqual(Object.keys(d.translations).sort(),expected,`${row.code} must use the shared key contract`);
  }
  console.log('PASS all enabled mobile locales use the shared key contract');
});

test('R38 mobile source contains no hardcoded fallback copy',()=>{
  assert.doesNotMatch(mobile,/\.t\([^)]*,[^)]*\)/);;
  assert.doesNotMatch(mobile,/Text\(\s*(['"])(?:\\.|(?!\1).)*\1\s*\)/);
  assert.doesNotMatch(mobile,/label:Text\(['"][^'"]+['"]\)/);
  assert.doesNotMatch(mobile,/hintText:\s*['"]/);
  console.log('PASS mobile user-facing text is catalog-key driven');
});
