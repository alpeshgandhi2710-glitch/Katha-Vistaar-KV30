const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/languages.json'), 'utf8'));

function extractConstObject(name) {
  const marker = `const ${name}=`;
  const p = app.indexOf(marker);
  assert.ok(p >= 0, `${name} not found`);
  const start = app.indexOf('{', p + marker.length);
  let depth = 0, quote = null, escaped = false;
  for (let i = start; i < app.length; i++) {
    const c = app[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`Unbalanced ${name}`);
}

function load(name) { return vm.runInNewContext(`(${extractConstObject(name)})`, {}); }

function loadExtra() {
  const extra = load('extra');
  function balanced(start) {
    const open=app[start], close=open==='{'?'}':']';
    let depth=0, quote=null, escaped=false;
    for(let i=start;i<app.length;i++){
      const c=app[i];
      if(quote){ if(escaped) escaped=false; else if(c==='\\') escaped=true; else if(c===quote) quote=null; continue; }
      if(c==="'"||c==='\"'||c==='`'){ quote=c; continue; }
      if(c===open) depth++;
      else if(c===close && --depth===0) return app.slice(start,i+1);
    }
    throw new Error('unbalanced Object.assign block');
  }
  let cursor=0;
  while(true){
    const marker=app.indexOf('Object.assign(extra.',cursor);
    if(marker<0) break;
    const langStart=marker+'Object.assign(extra.'.length;
    const comma=app.indexOf(',',langStart);
    const lang=app.slice(langStart,comma).trim();
    const objectStart=app.indexOf('{',comma+1);
    const objectSource=balanced(objectStart);
    const closeParen=app.indexOf(');',objectStart+objectSource.length);
    assert.ok(closeParen>=0,`Object.assign close missing for ${lang}`);
    const additions=vm.runInNewContext(`(${objectSource})`,{});
    extra[lang]=Object.assign(extra[lang]||{},additions);
    cursor=closeParen+2;
  }
  return extra;
}

test('v30 help page has localized content for all 22 registered languages', () => {
  const T = load('T');
  const extra = loadExtra();
  const codes = registry.languages.map(x => x.code);
  assert.equal(codes.length, 22);
  assert.ok(codes.includes('brx'));
  assert.ok(codes.includes('ne'));assert.ok(!codes.includes('en'));
  const required = ['uncertainCases', 'policyTitle', 'policyText', 'privacyTitle', 'open'];
  for (const code of codes) {
    assert.ok(T[code], `${code}: base translation object missing`);
    assert.ok(extra[code], `${code}: extra translation object missing`);
    for (const key of required) {
      assert.ok(extra[code][key], `${code}: ${key} missing`);
      assert.notEqual(extra[code][key], key, `${code}: ${key} is still a placeholder`);
    }
    assert.ok(T[code].help, `${code}: help title missing`);
    assert.ok(T[code].language, `${code}: language label missing`);
    assert.ok(T[code].login, `${code}: login label missing`);
  }
});

test('v30.1 corrected public/help UI does not hard-code the reported English home strings', () => {
  const homeStart=app.indexOf('function home('); const homeEnd=app.indexOf('function categoryChipBar',homeStart); const home=app.slice(homeStart,homeEnd);
  const literals=["<h2>✨ Recommended</h2>","<strong>Explore Katha Vistaar</strong>","Discover stories, author features and guided training.",">Explore features<",">Get Help<"];
  for (const literal of literals) {
    assert.equal(home.includes(literal), false, `hard-coded home UI literal remains: ${literal}`);
  }
  assert.match(app, /homeRecommended/);
  assert.match(app, /helpLoginTitle/);
});

test('v30.1 Help is public for login/account assistance and public login/registration tickets', () => {
  assert.match(app, /function help\(\)\{const loggedIn=!!state\.user/);
  assert.match(app, /data-open-login/);
  assert.match(app, /data-register/);
  assert.match(app, /helpForgotText/);
  assert.match(app, /api\/help\/public-ticket/);
  assert.match(app, /api\/help\/tickets\/track/);
});
