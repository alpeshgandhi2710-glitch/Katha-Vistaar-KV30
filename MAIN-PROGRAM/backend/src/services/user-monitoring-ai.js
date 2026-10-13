const crypto=require('node:crypto');
const CONFIDENTIAL_FIELDS=new Set(['password','passwordHash','resetToken','otp','masterKey','productKey','recoveryKey','bankAccountNumber','pan','ifsc','bankBranch','bankAddress','royaltyDetails']);
const RULES=[
 {id:'sexual-minor',risk:'high',patterns:[/child\s*(sexual|porn|exploitation)/i,/minor\s*(sexual|porn)/i]},
 {id:'non-consensual-sexual',risk:'high',patterns:[/non[- ]consensual\s*(sexual|intimate)/i]},
 {id:'hate-violence',risk:'high',patterns:[/violent\s*(threat|attack)/i,/kill\s+you/i,/hate\s+group/i]},
 {id:'fraud-scam',risk:'high',patterns:[/fraud|scam|phishing|steal\s+(money|password)/i]},
 {id:'copyright',risk:'medium',patterns:[/pirated\s+copy|stolen\s+content|copyright\s+infringement/i]},
 {id:'abuse',risk:'medium',patterns:[/\b(idiot|abuse|harass|harassment)\b/i]},
 {id:'spam',risk:'low',patterns:[/(buy now|click here|free money|crypto offer)/i,/(.)\1{8,}/i]}
];
function sanitizeActivity(a={}){const out={};for(const [k,v] of Object.entries(a)){if(CONFIDENTIAL_FIELDS.has(k))continue;if(typeof v==='string')out[k]=v.slice(0,4000);else if(['number','boolean'].includes(typeof v))out[k]=v;else if(Array.isArray(v))out[k]=v.slice(0,30);else if(v&&typeof v==='object')out[k]=sanitizeActivity(v);}return out;}
function assess(activity={}){const safe=sanitizeActivity(activity);const text=Object.entries(safe).filter(([k])=>['body','comment','message','title','reason','content'].includes(k)).map(([,v])=>String(v)).join(' ');const hits=RULES.filter(r=>r.patterns.some(p=>p.test(text)));let risk='low';if(hits.some(x=>x.risk==='high'))risk='high';else if(hits.some(x=>x.risk==='medium'))risk='medium';return {id:crypto.randomUUID(),risk,violations:hits.map(x=>x.id),confidence:hits.length?Math.min(.99,.72+hits.length*.08):.62,observedAt:new Date().toISOString(),evidence: safe,confidentialFieldsExcluded:[...CONFIDENTIAL_FIELDS],decision:risk==='low'&&hits.length===0?'allow':'review'};}
function shouldAutoClose(assessment){return assessment.risk==='low' && assessment.violations.length>0;}
module.exports={CONFIDENTIAL_FIELDS,assess,shouldAutoClose,sanitizeActivity};
