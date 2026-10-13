const sessions=new Map();
const crypto=require('node:crypto');
const curriculum={
 author:['rights and licensing','content policy','publication workflow','media rights','privacy and security'],
 admin:['ticket triage','permission engine','AI governance','policy escalation','audit and incident response'],
 master_admin:['supremacy and recovery','permission governance','service/license gates','security incident decisions','audit and business controls'],
 user:['account basics','reading and library','writing basics','help and ticket use','privacy and safety']
};
function start(role,userId){const id=crypto.randomUUID();const s={id,userId,role,lessons:curriculum[role]||curriculum.user,index:0,startedAt:new Date().toISOString(),status:'active'};sessions.set(id,s);return s}
function next(id){const s=sessions.get(id);if(!s)throw new Error('training_session_not_found');if(s.index<s.lessons.length)s.index++;if(s.index>=s.lessons.length)s.status='completed';return s}
function get(id){return sessions.get(id)||null}
module.exports={curriculum,start,next,get};
