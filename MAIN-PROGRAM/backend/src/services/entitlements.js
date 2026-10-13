const FREE={app:{id:'app_free_adfree',label:'Complimentary Ad-Free App'},author:{id:'author_free',label:'Complimentary Author'}};
function grantFree(login,type){
  if(!FREE[type])throw new Error('unknown_free_entitlement');
  login.entitlements=login.entitlements||{};
  login.entitlements[type]={...FREE[type],kind:'complimentary',price:0,revenue:0,profit:0,grantedAt:new Date().toISOString()};
  return login.entitlements[type];
}
function revokeFree(login,type){if(login.entitlements)delete login.entitlements[type];}
function grantDefaultStaff(login){grantFree(login,'app');grantFree(login,'author');return login;}
function commercialCount(login,type){const e=login?.entitlements?.[type];return e&&e.kind==='commercial'?1:0}
function complimentaryCount(login,type){const e=login?.entitlements?.[type];return e&&e.kind==='complimentary'?1:0}
module.exports={FREE,grantFree,revokeFree,grantDefaultStaff,commercialCount,complimentaryCount};
