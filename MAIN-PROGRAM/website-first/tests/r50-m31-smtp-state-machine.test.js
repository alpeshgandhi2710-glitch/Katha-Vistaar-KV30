const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const net=require('node:net');
const tls=require('node:tls');
const {smtpSend}=require('../services/otp-smtp');
function fakeSocket(){const s=new EventEmitter();s.writes=[];s.destroyed=false;s.setTimeout=()=>s;s.destroy=()=>{s.destroyed=true};s.end=()=>{s.ended=true};return s;}
async function runFake({starttls=false,auth=false}){
 const originalNet=net.connect,originalTls=tls.connect;const all=[];let tlsSocket=null;
 const makeResponder=(socket,phase)=>line=>{
  if(line.startsWith('EHLO'))return setImmediate(()=>socket.emit('data',Buffer.from(`250-${phase}\r\n250 AUTH LOGIN\r\n`)));
  if(line==='STARTTLS'&&phase==='plain')return setImmediate(()=>socket.emit('data',Buffer.from('220 ready\r\n')));
  if(line==='AUTH LOGIN'&&auth)return setImmediate(()=>socket.emit('data',Buffer.from('334 VXNlcm5hbWU6\r\n')));
  if(auth&&line==='dXNlcg==')return setImmediate(()=>socket.emit('data',Buffer.from('334 UGFzc3dvcmQ6\r\n')));
  if(auth&&line==='cGFzcw==')return setImmediate(()=>socket.emit('data',Buffer.from('235 authenticated\r\n')));
  if(line.startsWith('MAIL FROM'))return setImmediate(()=>socket.emit('data',Buffer.from('250 mail\r\n')));
  if(line.startsWith('RCPT TO'))return setImmediate(()=>socket.emit('data',Buffer.from('250 rcpt\r\n')));
  if(line==='DATA')return setImmediate(()=>socket.emit('data',Buffer.from('354 data\r\n')));
  if(line==='QUIT')return setImmediate(()=>socket.emit('data',Buffer.from('221 bye\r\n')));
  if(line==='.')return setImmediate(()=>socket.emit('data',Buffer.from('250 queued\r\n')));
 };
 try{
  net.connect=()=>{const s=fakeSocket();const responder=makeResponder(s,'plain');s.write=p=>{s.writes.push(String(p));for(const line of String(p).split('\r\n').filter(Boolean))responder(line);return true;};setImmediate(()=>s.emit('data',Buffer.from('220 greeting\r\n')));all.push(s);return s;};
  tls.connect=(opts,cb)=>{const s=fakeSocket();const responder=makeResponder(s,'tls');s.write=p=>{s.writes.push(String(p));for(const line of String(p).split('\r\n').filter(Boolean))responder(line);return true;};tlsSocket=s;all.push(s);setImmediate(cb);return s;};
  const result=await smtpSend({host:'mail.internal',port:2525,starttls,user:auth?'user':'',pass:auth?'pass':'',from:'no-reply@kathavistaar.internal',to:'u@example.test',subject:'Test',text:'.hello\nsecond'});
  return {result,plain:all[0],tls:tlsSocket};
 }finally{net.connect=originalNet;tls.connect=originalTls;}
}
test('SMTP authentication state machine sends username then password',async()=>{const {result,plain}=await runFake({auth:true});assert.equal(result.ok,true);assert.ok(plain.writes.join('').includes('AUTH LOGIN\r\ndXNlcg==\r\ncGFzcw==\r\nMAIL FROM:<no-reply@kathavistaar.internal>'));});
test('SMTP STARTTLS state machine upgrades once and continues after TLS EHLO',async()=>{const {result,plain,tls}=await runFake({starttls:true});assert.equal(result.ok,true);assert.equal(plain.writes.filter(x=>x.includes('STARTTLS')).length,1);assert.ok(tls.writes.join('').includes('EHLO kathavistaar.local\r\nMAIL FROM:<no-reply@kathavistaar.internal>'));});
test('SMTP header injection is rejected before network use',async()=>{await assert.rejects(()=>smtpSend({host:'127.0.0.1',port:1,starttls:false,from:'x\r\ny',to:'u@example.test',subject:'x',text:'x'}),e=>e.code==='smtp_invalid_from');});
