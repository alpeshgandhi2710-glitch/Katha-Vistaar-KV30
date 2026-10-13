'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../../website-first');
const FILE=path.join(ROOT,'config','creator-limits-v30.json');
function load(){return JSON.parse(fs.readFileSync(FILE,'utf8'));}
function status(){const c=load();return {version:c.version,governance:c.governance,defaults:{...c.defaults},safetyCeilings:{...c.safetyCeilings},units:{...c.units}};}
function current(){return load().defaults;}
function validate(next){const c=load();const out={...c.defaults};for(const [k,v] of Object.entries(next||{})){if(!Object.prototype.hasOwnProperty.call(c.defaults,k))throw Object.assign(new Error('unknown_creator_limit'),{code:'unknown_creator_limit',key:k});const n=Number(v);if(!Number.isFinite(n)||n<0||n>Number(c.safetyCeilings[k]))throw Object.assign(new Error('invalid_creator_limit'),{code:'invalid_creator_limit',key:k,max:c.safetyCeilings[k]});out[k]=Math.floor(n);}return out;}
function set(next){const c=load();const values=validate(next);const tmp=FILE+'.tmp-'+process.pid+'-'+Date.now();fs.writeFileSync(tmp,JSON.stringify({...c,defaults:values,updatedAt:new Date().toISOString()},null,2)+'\n');fs.renameSync(tmp,FILE);return status();}
module.exports={status,current,set,validate};
