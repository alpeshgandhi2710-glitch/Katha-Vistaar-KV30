const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const http=require('node:http');
const {makeOtpGateway}=require('../services/otp-gateway');
const {makeInternalTransactionalMail}=require('../services/internal-transactional-mail');
const ROOT=path.join(__dirname,'..');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

test('internal communications contract uses governed domain and internal transports',async()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'config/internal-communications-v30.json')));
 assert.equal(cfg.internalDomain,'kathavistaar.internal');
 assert.equal(cfg.rules.internalSenderMustMatchDomain,true);
 assert.equal(cfg.rules.smsExternalProviderNeverUsedAsInternalTransport,true);
 let smsBody=null;
 const sms=http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{smsBody=JSON.parse(b);res.writeHead(200,{'content-type':'application/json'});res.end('{"status":"accepted"}');});}).listen(0);
 let smtpReceived='';
 const net=require('node:net');
 const smtp=net.createServer(sock=>{let dataMode=false;let buf='';sock.write('220 internal.test ESMTP\r\n');sock.on('data',d=>{buf+=d.toString();while(true){const idx=buf.indexOf('\r\n');if(idx<0)break;const line=buf.slice(0,idx);buf=buf.slice(idx+2);if(dataMode){smtpReceived+=line+'\r\n';if(line==='.') {dataMode=false;sock.write('250 queued\r\n');}continue;}if(line.startsWith('EHLO'))sock.write('250-internal.test\r\n250 OK\r\n');else if(line.startsWith('MAIL FROM'))sock.write('250 ok\r\n');else if(line.startsWith('RCPT TO'))sock.write('250 ok\r\n');else if(line==='DATA'){dataMode=true;sock.write('354 go\r\n');}else if(line==='QUIT'){sock.write('221 bye\r\n');sock.end();}else if(/^[A-Za-z0-9+/=]+$/.test(line))sock.write('235 auth ok\r\n');}});}).listen(0);
 try{
  const smsPort=sms.address().port;
  const smtpPort=smtp.address().port;
  const env={KV_INTERNAL_MAIL_DOMAIN:'kathavistaar.internal',KV_INTERNAL_SMTP_EMAIL_HOST:'127.0.0.1',KV_INTERNAL_SMTP_EMAIL_PORT:String(smtpPort),KV_INTERNAL_SMTP_EMAIL_SECURE:'false',KV_INTERNAL_SMTP_EMAIL_STARTTLS:'false',KV_INTERNAL_SMTP_EMAIL_USER:'',KV_INTERNAL_SMTP_EMAIL_PASSWORD:'',KV_INTERNAL_SMTP_EMAIL_FROM:'wrong@example.com',KV_INTERNAL_SMS_GATEWAY_ENDPOINT:`http://127.0.0.1:${smsPort}`,KV_INTERNAL_SMS_GATEWAY_API_KEY:'internal-test-key'};
  const services={capability:()=>({enabled:false})};
  const g=makeOtpGateway({root:ROOT,services,mailOutbox:[],env});
  const er=await g.deliverInternalOnly({type:'email',target:'user@example.test',purpose:'test',otp:'123456',row:{id:'M30E'}});
  assert.equal(er.delivered,true);assert.equal(er.internalDomain,'kathavistaar.internal');assert.equal(er.from,'no-reply@kathavistaar.internal');assert.match(smtpReceived,/From: no-reply@kathavistaar\.internal/);
  const sr=await g.deliverInternalOnly({type:'sms',target:'9999900001',purpose:'test',otp:'123456',row:{id:'M30S'}});
  assert.equal(sr.delivered,true);assert.equal(smsBody.to,'9999900001');
 }finally{sms.close();smtp.close();}
});

test('transactional outbox persists and restores Dev/Prod-safe state',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-m30-mail-'));const file=path.join(dir,'outbox.json');const out=[];
 const m=makeInternalTransactionalMail({mailOutbox:out,persistPath:file,services:{capability:()=>({enabled:false})},sendInternal:async()=>({mode:'internal',delivered:true})});
 m.enqueue({channel:'email',to:'a@example.test',subject:'x',text:'hello',category:'test'});await m.flush();assert.ok(fs.existsSync(file));
 const restored=[];makeInternalTransactionalMail({mailOutbox:restored,persistPath:file,services:{capability:()=>({enabled:false})}});assert.equal(restored.length,1);assert.equal(restored[0].to,'a@example.test');assert.equal(restored[0].channel,'email');
 fs.rmSync(dir,{recursive:true,force:true});
});


test('transactional queue preserves email versus SMS channel routing',async()=>{
 const rows=[];const m=makeInternalTransactionalMail({mailOutbox:rows,services:{capability:()=>({enabled:false})},sendInternal:async row=>{assert.equal(row.channel,'sms');return {mode:'internal_sms',delivered:true};}});
 m.enqueue({channel:'sms',to:'9999900001',subject:'ticket',text:'update',category:'ticket-update'});
 const out=await m.flush();assert.equal(out[0].channel,'sms');assert.equal(out[0].status,'sent');
});

test('transactional SMS queue delivers the actual message text through the internal SMS gateway',async()=>{
 let received=null;
 const sms=http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{received=JSON.parse(b);res.writeHead(200,{'content-type':'application/json'});res.end('{\"status\":\"accepted\"}');});}).listen(0);
 try{
  const env={KV_INTERNAL_MAIL_DOMAIN:'kathavistaar.internal',KV_INTERNAL_SMS_GATEWAY_ENDPOINT:`http://127.0.0.1:${sms.address().port}`,KV_INTERNAL_SMS_GATEWAY_API_KEY:'internal-test-key',KV_INTERNAL_SMTP_EMAIL_HOST:'',KV_INTERNAL_SMTP_EMAIL_FROM:'no-reply@kathavistaar.internal'};
  const g=makeOtpGateway({root:ROOT,services:{capability:()=>({enabled:false})},mailOutbox:[],env});
  const rows=[];const m=makeInternalTransactionalMail({mailOutbox:rows,services:{capability:()=>({enabled:false})},sendInternal:row=>g.sendInternalMessage({type:row.channel,target:row.to,subject:row.subject,text:row.text,category:row.category,row})});
  m.enqueue({channel:'sms',to:'9999900001',subject:'Ticket update',text:'Your ticket has been updated.',category:'ticket-update'});
  const out=await m.flush();
  assert.equal(out[0].status,'sent');assert.equal(received.to,'9999900001');assert.equal(received.message,'Your ticket has been updated.');assert.equal(received.category,'ticket-update');
 }finally{sms.close();}
});

test('ticket stakeholder source is wired to transactional internal queue',()=>{
 const src=fs.readFileSync(path.join(ROOT,'src/server.js'),'utf8');
 assert.match(src,/internalTransactionalMail\.enqueue\(\{channel:'email'/);assert.match(src,/internalTransactionalMail\.enqueue\(\{channel:'sms'/);
 assert.match(src,/row\.channel.*otpGateway\.(sendInternalMessage|deliverInternalOnly)|otpGateway\.(sendInternalMessage|deliverInternalOnly)\(\{type,target:row\.to/);
 assert.match(src,/internal-communications-outbox\.json/);
});
