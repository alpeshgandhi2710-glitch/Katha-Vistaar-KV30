#!/usr/bin/env node
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const zip=process.argv[2];
if(!zip){console.error('usage: node scripts/verify-governed-release-package.js <zip>');process.exit(2)}
if(!fs.existsSync(zip)){console.error('ZIP_NOT_FOUND');process.exit(2)}
let names='';
try{names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:32*1024*1024});}catch(e){console.error('ZIP_LIST_FAILED');process.exit(3)}
const files=names.split(/\r?\n/).filter(Boolean);
const forbidden=files.filter(f=>[
  /(^|\/)node_modules\//,
  /MAIN-PROGRAM\/website-first\/data\//,
  /\/katha-vistaar\.sqlite(?:-wal|-shm)?$/,
  /internal-communications-outbox\.json$/,
  /\/\.env(?:\.|$)/
].some(rx=>rx.test(f)));
const required=[
  'MAIN-PROGRAM/website-first/src/server.js',
  'MAIN-PROGRAM/website-first/public/app.js',
  'MAIN-PROGRAM/website-first/public/index.html',
  'MAIN-PROGRAM/website-first/config/version.json',
  'MAIN-PROGRAM/website-first/RELEASE-MANIFEST-v30.json'
];
const missing=required.filter(x=>!files.includes(x));
console.log(JSON.stringify({ok:forbidden.length===0&&missing.length===0,fileCount:files.length,forbidden,missing},null,2));
process.exit(forbidden.length||missing.length?1:0);
