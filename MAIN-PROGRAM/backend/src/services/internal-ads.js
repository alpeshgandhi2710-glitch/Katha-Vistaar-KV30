const campaigns=[
 {id:'kv-app-features',type:'internal',titleKey:'internalAdExploreKatha',bodyKey:'internalAdExploreKathaBody',target:'features',active:true},
 {id:'kv-author',type:'internal',titleKey:'authorSubscription',bodyKey:'writeText',target:'author',active:true},
 {id:'kv-training',type:'internal',titleKey:'trainingAi',bodyKey:'trainingCoachHelp',target:'training',active:true}
];
function list(){return campaigns.filter(x=>x.active).map(x=>({...x}))}
function get(id){return campaigns.find(x=>x.id===id)||null}
function preview(id,actor){if(!actor)return {allowed:false,reason:'login_required'};if(!['user','admin','master_admin'].includes(actor.role))return {allowed:false,reason:'permission_denied'};return {allowed:true,campaign:get(id)}}
module.exports={list,get,preview};
