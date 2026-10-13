'use strict';
const net=require('node:net');
const tls=require('node:tls');

function b64(v){return Buffer.from(String(v),'utf8').toString('base64');}
function safeHeader(v,name){const s=String(v??'');if(/[\r\n]/.test(s))throw Object.assign(new Error(`smtp_invalid_${name}`),{code:`smtp_invalid_${name}`});return s;}
function smtpSend({host,port,secure=false,starttls=true,user='',pass='',from,to,subject,text,replyTo='',timeoutMs=10000}={}){
  if(!host||!from||!to) return Promise.reject(Object.assign(new Error('smtp_not_configured'),{code:'smtp_not_configured'}));
  try{from=safeHeader(from,'from');to=safeHeader(to,'to');subject=safeHeader(subject,'subject');replyTo=safeHeader(replyTo,'reply_to');}catch(e){return Promise.reject(e);}
  return new Promise((resolve,reject)=>{
    let socket,buffer='',step=0,done=false;
    const fail=e=>{if(done)return;done=true;try{socket?.destroy()}catch{};reject(e)};
    const finish=()=>{if(done)return;done=true;try{socket.end()}catch{};resolve({ok:true});};
    const send=s=>{try{socket.write(s+'\r\n')}catch(e){fail(e)}};
    const next=line=>{
      const code=Number(String(line).slice(0,3));
      if(code>=400)return fail(Object.assign(new Error(`smtp_${code}`),{code:`smtp_${code}`}));
      if(step===0){step=1;send('EHLO kathavistaar.local');return;}
      if(step===1){
        if(!secure&&starttls){step=2;send('STARTTLS');return;}
        if(user){step=3;send('AUTH LOGIN');return;}
        step=6;send('MAIL FROM:<'+from+'>');return;
      }
      if(step===2){
        if(!/^2\d\d/.test(String(line)))return fail(new Error('smtp_starttls_failed'));
        const oldSocket=socket;
        oldSocket.removeAllListeners('data');oldSocket.removeAllListeners('error');
        step=11;
        socket=tls.connect({socket:oldSocket,servername:host},()=>send('EHLO kathavistaar.local'));
        socket.on('data',onData);socket.on('error',fail);socket.setTimeout(timeoutMs,()=>fail(Object.assign(new Error('smtp_timeout'),{code:'smtp_timeout'})));
        return;
      }
      if(step===11){
        if(user){step=3;send('AUTH LOGIN');return;}
        step=6;send('MAIL FROM:<'+from+'>');return;
      }
      if(step===3){step=4;send(b64(user));return;}
      if(step===4){step=5;send(b64(pass));return;}
      if(step===5){step=6;send('MAIL FROM:<'+from+'>');return;}
      if(step===6){step=7;send('RCPT TO:<'+to+'>');return;}
      if(step===7){step=8;send('DATA');return;}
      if(step===8){
        step=9;
        const safeText=String(text||'').replace(/\r?\n/g,'\r\n').replace(/^\./gm,'..');
        const reply=replyTo?`\r\nReply-To: ${replyTo}`:'';
        send(`From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}${reply}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${safeText}\r\n.`);
        return;
      }
      if(step===9){step=10;send('QUIT');return finish();}
    };
    const onData=data=>{
      buffer+=data.toString();let i;
      while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);if(line && /^\d{3} /.test(line))next(line)}
    };
    const opts={host,port:Number(port||(secure?465:587)),timeout:timeoutMs};
    socket=secure?tls.connect({...opts,servername:host}):net.connect(opts);
    socket.on('data',onData);socket.on('error',fail);socket.setTimeout(timeoutMs,()=>fail(Object.assign(new Error('smtp_timeout'),{code:'smtp_timeout'})));
  });
}
module.exports={smtpSend};
