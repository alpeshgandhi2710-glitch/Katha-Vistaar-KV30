'use strict';
const crypto=require('node:crypto');
const SENSITIVE=new Set(['mobile','email','pan','bankAccountNumber','ifsc','bankBranch','bankAddress','bankName','otp','password']);
function mask(value){const s=String(value??'');if(!s)return null;if(s.includes('@'))return s.slice(0,1)+'•••'+s.slice(s.indexOf('@'));return s.length<=4?'••••':s.slice(0,2)+'••••'+s.slice(-2);}
function encrypt(value,key){const secret=crypto.createHash('sha256').update(String(key)).digest();const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',secret,iv);const data=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return {iv:iv.toString('base64'),data:data.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
function decrypt(box,key){const secret=crypto.createHash('sha256').update(String(key)).digest();const decipher=crypto.createDecipheriv('aes-256-gcm',secret,Buffer.from(box.iv,'base64'));decipher.setAuthTag(Buffer.from(box.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(box.data,'base64')),decipher.final()]).toString('utf8');}
function project(obj,fields){return Object.fromEntries(fields.filter(f=>Object.prototype.hasOwnProperty.call(obj,f)).map(f=>[f,SENSITIVE.has(f)?mask(obj[f]):obj[f]]));}
module.exports={SENSITIVE,mask,encrypt,decrypt,project};
