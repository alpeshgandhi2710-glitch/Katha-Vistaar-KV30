'use strict';
const crypto=require('node:crypto');
function createAudit(){const rows=[];return {record(event){const row={id:'AUD-'+crypto.randomBytes(6).toString('hex').toUpperCase(),at:new Date().toISOString(),...event};rows.push(row);return {...row};},list(){return rows.map(x=>({...x}));}}}
module.exports={createAudit};
