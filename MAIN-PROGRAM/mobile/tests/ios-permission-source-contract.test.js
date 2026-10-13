const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','ios','Runner','AppDelegate.swift'),'utf8');
test('iOS permission request contract is feature-scoped',()=>{
 assert.match(s,/requestRecordPermission/); assert.match(s,/requestAccess\(for: \.video\)/); assert.match(s,/requestAuthorization\(for: \.readWrite\)/);
 assert.match(s,/case "camera":/); assert.match(s,/case "photos":/);
});
