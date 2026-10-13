const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const appPath = path.join(__dirname, '..', 'public', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');
const keys = ['sponsored','madeForIndia','continueReadingTitle','yourLibrary','openLibrary','scene','pages','coins','trainingTopicPlaceholder','trainingTopic','trainingLanguage','enterTrainingTopic','trainingPreparing','trainingAi','trainingUnavailable','productKeyPrompt','none','registeredContact','sendOtp'];
const locales = ['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];

test('R6 governed literal conversion preserves 19 direct 23-language keys', () => {
  for (const key of keys) {
    assert.ok(source.includes(`x('${key}')`), `governed runtime call missing for ${key}`);
  }
  for (const locale of locales) {
    const re = new RegExp(`Object\\.assign\\(extra\\.${locale},\\{([\\s\\S]*?)\\}\\);`,'g');
    const bodies = [...source.matchAll(re)].map(m=>m[1]).join(',');
    for (const key of keys) assert.match(bodies, new RegExp(`(?:^|,)${key}:`), `${locale} missing ${key}`);
  }
});
