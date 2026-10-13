const TYPE_LABELS={story:'Story/Writing',comic:'Comic',audio:'FM/Audio',reel:'2-minute Reel'};
function suggest({type='story',title='',body=''}){
 const t=String(type), text=String(body||'').trim();
 const base={type:t,role:TYPE_LABELS[t]||'Creator',authorApprovalRequired:true,canModifyWithoutApproval:false};
 const suggestions=[];
 if(!String(title).trim())suggestions.push('Add a clear, reader-friendly title.');
 if(!text)suggestions.push('Start with a short opening that establishes the subject or scene.');
 else if(text.length<300)suggestions.push('Consider expanding the opening with context, character/subject detail, or a stronger hook.');
 if(t==='story')suggestions.push('Check continuity, pacing, chapter boundaries and rights before publishing.');
 if(t==='comic')suggestions.push('Check panel sequence, dialogue readability, image rights and visual continuity.');
 if(t==='audio')suggestions.push('Check narration flow, intro/outro, pronunciation, audio rights and loudness consistency.');
 if(t==='reel')suggestions.push('Keep the concept concise, verify media rights and ensure the final cut matches the declared duration.');
 return {...base,suggestions,policy:'AI is advisory. The creator must approve all content changes and publication.'};
}
module.exports={suggest};
