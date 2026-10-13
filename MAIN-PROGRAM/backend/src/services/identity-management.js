const crypto=require('node:crypto');
const EXISTING_LOGIN_STATES=new Set(['active','pending_admin','locked','deactivated','suspended']);
const STATUS={ACTIVE:'active',PENDING_ADMIN:'pending_admin',LOCKED:'locked',DEACTIVATED:'deactivated',SUSPENDED:'suspended',DELETED:'deleted'};
function id(){return crypto.randomUUID();}
function createIdentity(meta={}){return {id:id(),label:String(meta.label||''),createdAt:new Date().toISOString(),logins:[]};}
function assertIdentity(identity){if(!identity||!identity.id)throw new Error('identity_not_found');}
function createLogin(identity,{actorRole='user',role='user',username='',email='',mobile=''}={}){
  assertIdentity(identity);
  if(identity.logins.some(x=>EXISTING_LOGIN_STATES.has(x.status)))throw Object.assign(new Error('identity_already_has_login'),{code:'identity_already_has_login'});
  if(actorRole!=='master_admin'&&actorRole!=='admin')throw Object.assign(new Error('login_creation_not_permitted'),{code:'login_creation_not_permitted'});
  const status=role==='admin'&&actorRole==='admin'?STATUS.PENDING_ADMIN:STATUS.ACTIVE;
  const login={id:id(),identityId:identity.id,username,email,mobile,role,status,rightsGranted:role!=='admin',createdAt:new Date().toISOString(),deletedAt:null};
  identity.logins.push(login);return login;
}
function createAdditionalLogin(identity,opts={}){assertIdentity(identity);if(opts.actorRole!=='master_admin')throw Object.assign(new Error('master_admin_required_for_multiple_logins'),{code:'master_admin_required_for_multiple_logins'});return createLoginAfterDeletion(identity,opts);}
function createLoginAfterDeletion(identity,opts={}){assertIdentity(identity);if(identity.logins.some(x=>EXISTING_LOGIN_STATES.has(x.status)))throw Object.assign(new Error('identity_already_has_login'),{code:'identity_already_has_login'});return createLoginUnsafe(identity,opts);}
function createLoginUnsafe(identity,{role='user',username='',email='',mobile='',rightsGranted=false}={}){const login={id:id(),identityId:identity.id,username,email,mobile,role,status:role==='admin'&&!rightsGranted?STATUS.PENDING_ADMIN:STATUS.ACTIVE,rightsGranted:Boolean(rightsGranted),createdAt:new Date().toISOString(),deletedAt:null};identity.logins.push(login);return login;}
function grantAdminRights(login,masterApproved){if(!masterApproved)throw Object.assign(new Error('master_admin_approval_required'),{code:'master_admin_approval_required'});login.role='admin';login.status=STATUS.ACTIVE;login.rightsGranted=true;login.adminRightsGrantedAt=new Date().toISOString();return login;}
function revokeAdminRights(login){login.role='user';login.status=STATUS.ACTIVE;login.rightsGranted=false;login.adminRightsRevokedAt=new Date().toISOString();return login;}
function lockLogin(login){login.status=STATUS.LOCKED;return login;}
function deactivateLogin(login){login.status=STATUS.DEACTIVATED;return login;}
function suspendLogin(login){login.status=STATUS.SUSPENDED;return login;}
function deleteLogin(login){if(!login)throw new Error('login_not_found');login.status=STATUS.DELETED;login.deletedAt=new Date().toISOString();return login;}
function canCreateAnother(identity){return !identity.logins.some(x=>EXISTING_LOGIN_STATES.has(x.status));}
function statusMeaning(status){return ({active:'Login is active.',pending_admin:'Admin role is awaiting Master Admin approval.',locked:'Login is temporarily blocked; identity slot remains occupied.',deactivated:'Login is disabled; identity slot remains occupied.',suspended:'Login is suspended by policy/review; identity slot remains occupied.',deleted:'Login is permanently marked deleted; only this state reopens the identity login slot.'})[status]||'Unknown status.';}
function assertMaster(role){if(role!=='master_admin')throw Object.assign(new Error('master_admin_required'),{code:'master_admin_required'});}
module.exports={STATUS,EXISTING_LOGIN_STATES,createIdentity,createLogin,createAdditionalLogin,createLoginAfterDeletion,grantAdminRights,revokeAdminRights,lockLogin,deactivateLogin,suspendLogin,deleteLogin,canCreateAnother,statusMeaning,assertMaster};
