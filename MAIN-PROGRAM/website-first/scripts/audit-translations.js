const fs = require('fs');
const vm = require('vm');

const file = 'public/app.js';
const src = fs.readFileSync(file, 'utf8');

function extractBalanced(source, startIndex) {
  const open = source[startIndex];
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = startIndex; i < source.length; i++) {
    const c = source[i];

    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }

    if (c === open) depth++;

    if (c === close) {
      depth--;

      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }

  throw new Error('Unbalanced object');
}

function extractConstObject(name) {
  const marker = new RegExp(`const\\s+${name}\\s*=`);
  const match = marker.exec(src);
  const p = match ? match.index : -1;

  if (p < 0) {
    throw new Error(`${name} not found`);
  }

  const start = src.indexOf('{', p + match[0].length);

  if (start < 0) {
    throw new Error(`${name} object start not found`);
  }

  return extractBalanced(src, start);
}

function loadObject(name) {
  return vm.runInNewContext(
    `(${extractConstObject(name)})`,
    {}
  );
}

const T = loadObject('T');
const extra = loadObject('extra');

// R26 locale bundles are part of the actual runtime lookup and must be
// included in this audit. The runtime localeValue() checks
// state.localeBundles[lang].translations before T/extra. Ignoring those
// bundles creates false 'missing' counts.
const localeBundles = {};
for (const lang of Object.keys(T)) {
  const bundlePath = require('path').join('public','locales',`${lang}.json`);
  if (fs.existsSync(bundlePath)) {
    try {
      const bundle = JSON.parse(fs.readFileSync(bundlePath,'utf8'));
      localeBundles[lang] = bundle.translations || {};
    } catch (_) {}
  }
}

/*
 * R31 common UI localization is a governed source object applied at
 * runtime before later extra.* Object.assign blocks. Reproduce that
 * exact source-level merge so the audit does not misclassify these
 * existing reviewed values as missing.
 */
try {
  const R31_UI = loadObject('R31_UI');
  for (const [key, values] of Object.entries(R31_UI)) {
    for (const [lang, value] of Object.entries(values)) {
      if (extra[lang]) extra[lang][key] = value;
    }
  }
} catch (_) {
  /* R31_UI is optional in older source baselines. */
}

/*
 * Load all later Object.assign(extra.xx,{...}) blocks.
 */
let assignCount = 0;
let assignCursor = 0;

while (true) {
  const marker = src.indexOf('Object.assign(extra.', assignCursor);
  if (marker < 0) break;

  const langStart = marker + 'Object.assign(extra.'.length;
  const comma = src.indexOf(',', langStart);
  if (comma < 0) break;

  const lang = src.slice(langStart, comma).trim();
  const objectStart = src.indexOf('{', comma + 1);
  if (objectStart < 0) break;

  try {
    const objectSource = extractBalanced(src, objectStart);
    const closeParen = src.indexOf(');', objectStart + objectSource.length);
    if (closeParen < 0) throw new Error('Object.assign closing ); not found');

    const additions = vm.runInNewContext(`(${objectSource})`, {});
    extra[lang] = Object.assign(extra[lang] || {}, additions);
    assignCount++;
    assignCursor = closeParen + 2;
  } catch (e) {
    console.error(`Could not parse extra.${lang}: ${e.message}`);
    assignCursor = objectStart + 1;
  }
}

/*
 * Load fallback object if present.
 * It is a valid final translation source for t()/x().
 */
let fallback = {};

try {
  fallback = loadObject('fallback');
} catch (_) {
  /*
   * fallback may be declared in another form.
   * Keep empty if it cannot be extracted.
   */
}

/*
 * Find literal keys actually used by t('...') / x('...').
 */
const used = new Set();

const keyRegex =
  /\b(?:t|x)\(\s*['"]([^'"]+)['"]\s*\)/g;

while ((m = keyRegex.exec(src))) {
  used.add(m[1]);
}

/*
 * CATEGORY_LABELS are not handled by t()/x().
 * Audit them separately because categoryLabel() reads:
 *
 * CATEGORY_LABELS[state.uiLanguage][key]
 */
let categoryLabels = {};
try { categoryLabels = loadObject('CATEGORY_LABELS'); } catch (_) { categoryLabels = {}; }
let contentCategories = {};
try { contentCategories = loadObject('CATEGORIES_BY_TYPE'); } catch (_) { contentCategories = {}; }
const categoryUsed = new Set(['all']);
for (const values of Object.values(contentCategories)) for (const key of values) categoryUsed.add(key);
const categoryRegex = /categoryLabel\(\s*['"]([^'"]+)['"]\s*\)/g;
while ((m = categoryRegex.exec(src))) categoryUsed.add(m[1]);

/*
 * Runtime-equivalent lookup for t().
 */
/*
 * Strict runtime-equivalent lookup for the final UI contract.
 * An enabled non-English locale may never inherit extra.en/T.en for a
 * missing key. English is only authoritative for the English locale;
 * an unavailable whole locale is handled by the application loader.
 */
function resolveT(lang, key) {
  if (localeBundles[lang] && Object.prototype.hasOwnProperty.call(localeBundles[lang], key)) return localeBundles[lang][key];
  if (lang === 'en') return (T.en || {})[key] || (extra.en || {})[key] || fallback[key];
  return (T[lang] || {})[key] || (extra[lang] || {})[key];
}

function resolveX(lang, key) {
  if (localeBundles[lang] && Object.prototype.hasOwnProperty.call(localeBundles[lang], key)) return localeBundles[lang][key];
  if (lang === 'en') return (extra.en || {})[key] || (T.en || {})[key] || fallback[key];
  return (extra[lang] || {})[key] || (T[lang] || {})[key];
}

/*
 * Detect which used keys are called through t() and x().
 * This matters because their fallback chains differ.
 */
const usedT = new Set();
const usedX = new Set();

let tm;

const tRegex =
  /\bt\(\s*['"]([^'"]+)['"]\s*\)/g;

while ((tm = tRegex.exec(src))) {
  usedT.add(tm[1]);
}

const xRegex =
  /\bx\(\s*['"]([^'"]+)['"]\s*\)/g;

while ((tm = xRegex.exec(src))) {
  usedX.add(tm[1]);
}

const languages = Object.keys(T);

console.log('');
console.log('==============================================');
console.log(' KATHA VISTAAR 30 — TRANSLATION AUDIT');
console.log('==============================================');
console.log(`Languages found       : ${languages.length}`);
console.log(`Used translation keys : ${used.size}`);
console.log(`  t() keys            : ${usedT.size}`);
console.log(`  x() keys            : ${usedX.size}`);
console.log(`Object.assign loaded  : ${assignCount}`);
console.log(`Fallback keys         : ${Object.keys(fallback).length}`);
console.log('');

const rows = [];

for (const lang of languages) {

  /*
   * A key is considered available if the actual runtime
   * lookup for t() or x() resolves it to a translation.
   */
  const missing = [...used]
    .filter(key => {
      const needsT = usedT.has(key);
      const needsX = usedX.has(key);

      const tOK = !needsT || Boolean(resolveT(lang, key));
      const xOK = !needsX || Boolean(resolveX(lang, key));

      return !tOK || !xOK;
    })
    .sort();

  const present = used.size - missing.length;

  rows.push({
    lang,
    present,
    total: used.size,
    missing
  });

  const status =
    missing.length === 0
      ? 'PASS'
      : 'MISSING';

  console.log(
    `${lang.padEnd(5)} ${status.padEnd(8)} ${present}/${used.size}`
  );

  if (missing.length) {
    console.log(
      '      ' + missing.join(', ')
    );
  }
}

/*
 * Audit category labels independently.
 */
console.log('');
console.log('----------------------------------------------');
console.log(' LOCALE BUNDLE REVIEW AUDIT');
console.log('----------------------------------------------');
const englishBundle = localeBundles.en || {};
let totalEqualEnglish = 0;
for (const lang of languages) {
  if (lang === 'en') continue;
  const b = localeBundles[lang] || {};
  const equal = [...used].filter(key => Object.prototype.hasOwnProperty.call(b,key) && b[key] === englishBundle[key]);
  totalEqualEnglish += equal.length;
  console.log(`${lang.padEnd(5)} bundle=${Object.keys(b).length}/${used.size} equalEnglish=${equal.length}`);
}
console.log(`TOTAL EQUAL-ENGLISH USED VALUES: ${totalEqualEnglish}`);

console.log('');
console.log('----------------------------------------------');
console.log(' CATEGORY LABEL AUDIT');
console.log('----------------------------------------------');
console.log(`Used category keys    : ${categoryUsed.size}`);

let categoryMissingTotal = 0;

for (const lang of languages) {
  const labels = categoryLabels[lang] || categoryLabels.en || {};

  const missing = [...categoryUsed]
    .filter(k => !labels[k])
    .sort();

  categoryMissingTotal += missing.length;

  const status =
    missing.length === 0
      ? 'PASS'
      : 'MISSING';

  console.log(
    `${lang.padEnd(5)} ${status.padEnd(8)} ${categoryUsed.size - missing.length}/${categoryUsed.size}`
  );

  if (missing.length) {
    console.log(
      '      ' + missing.join(', ')
    );
  }
}

const totalMissing =
  rows.reduce(
    (sum, row) => sum + row.missing.length,
    0
  );

console.log('');
console.log('==============================================');
console.log(
  `TOTAL MISSING LOCALIZED KEYS: ${totalMissing}`
);
console.log(
  `TOTAL MISSING CATEGORY KEYS : ${categoryMissingTotal}`
);
console.log('==============================================');

if (totalMissing === 0 && categoryMissingTotal === 0) {
  console.log(
    'STATUS: ALL USED KEYS RESOLVE AT RUNTIME'
  );
} else {
  console.log(
    'STATUS: TRANSLATIONS NEED COMPLETION'
  );
}

console.log('');
