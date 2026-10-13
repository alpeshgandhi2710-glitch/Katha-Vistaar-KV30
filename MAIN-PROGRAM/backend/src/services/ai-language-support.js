'use strict';

// Katha Vistaar v30: 22 Indian scheduled languages + English.
// Language routing is independent from AI permissions and is intentionally extensible.
const VERSION='KV30-P2-30W-language-v1';
const LANGUAGES=[
 ['en','English','Latin','eng'],['as','অসমীয়া','Assamese','asm'],['bn','বাংলা','Bengali','ben'],
 ['brx','बड़ो','Bodo','brx'],['doi','डोगरी','Dogri','doi'],['gu','ગુજરાતી','Gujarati','guj'],
 ['hi','हिन्दी','Hindi','hin'],['kn','ಕನ್ನಡ','Kannada','kan'],['ks','कॉशुर / کٲشُر','Kashmiri','kas'],
 ['kok','कोंकणी','Konkani','kok'],['mai','मैथिली','Maithili','mai'],['ml','മലയാളം','Malayalam','mal'],
 ['mni','মৈতৈলোন্ / ꯃꯤꯇꯩ ꯂꯣꯟ','Manipuri (Meitei)','mni'],['mr','मराठी','Marathi','mar'],
 ['ne','नेपाली','Nepali','nep'],['or','ଓଡ଼ିଆ','Odia','ori'],['pa','ਪੰਜਾਬੀ','Punjabi','pan'],
 ['sa','संस्कृतम्','Sanskrit','san'],['sat','ᱥᱟᱱᱛᱟᱲᱤ','Santali','sat'],['sd','सिन्धी / سنڌي','Sindhi','snd'],
 ['ta','தமிழ்','Tamil','tam'],['te','తెలుగు','Telugu','tel'],['ur','اردو','Urdu','urd']
];
const registry=Object.fromEntries(LANGUAGES.map(([code,native,english,iso639])=>[code,{code,native,english,iso639,enabled:true}]));
const SCRIPT_RANGES=[
 ['bn',/[\u0980-\u09FF]/u],['gu',/[\u0A80-\u0AFF]/u],['pa',/[\u0A00-\u0A7F]/u],['or',/[\u0B00-\u0B7F]/u],
 ['ta',/[\u0B80-\u0BFF]/u],['te',/[\u0C00-\u0C7F]/u],['kn',/[\u0C80-\u0CFF]/u],['ml',/[\u0D00-\u0D7F]/u],
 ['mni',/[\uABC0-\uABFF]/u],['sat',/[\u1C50-\u1C7F]/u],['ur',/[\u0600-\u06FF]/u],['sd',/[\u0600-\u06FF]/u],
 ['hi',/[\u0900-\u097F]/u]
];
const MESSAGES={
 en:{ready:'Internal AI is ready.',review:'Review required before action.',support:'Use the authorized support flow.',blocked:'This action is restricted by policy.',unknown:'This language is supported by the multilingual AI contract.'},
 gu:{ready:'આંતરિક AI તૈયાર છે.',review:'કાર્ય પહેલાં સમીક્ષા જરૂરી છે.',support:'અધિકૃત support flow વાપરો.',blocked:'આ કાર્ય policy દ્વારા પ્રતિબંધિત છે.',unknown:'આ ભાષા multilingual AI contract દ્વારા supported છે.'},
 hi:{ready:'आंतरिक AI तैयार है।',review:'कार्रवाई से पहले समीक्षा आवश्यक है।',support:'अधिकृत सहायता प्रवाह का उपयोग करें।',blocked:'यह कार्रवाई नीति द्वारा प्रतिबंधित है।',unknown:'यह भाषा multilingual AI contract द्वारा समर्थित है।'},
 mr:{ready:'अंतर्गत AI तयार आहे.',review:'कृतीपूर्वी पुनरावलोकन आवश्यक आहे.',support:'अधिकृत सहाय्य प्रवाह वापरा.',blocked:'ही कृती धोरणानुसार प्रतिबंधित आहे.',unknown:'ही भाषा multilingual AI contract द्वारे समर्थित आहे.'},
 bn:{ready:'অভ্যন্তরীণ AI প্রস্তুত।',review:'কাজের আগে পর্যালোচনা প্রয়োজন।',support:'অনুমোদিত সহায়তা প্রবাহ ব্যবহার করুন।',blocked:'এই কাজ নীতির দ্বারা সীমাবদ্ধ।',unknown:'এই ভাষা multilingual AI contract দ্বারা সমর্থিত।'},
 ta:{ready:'உள் AI தயாராக உள்ளது.',review:'செயலுக்கு முன் மதிப்பாய்வு தேவை.',support:'அங்கீகரிக்கப்பட்ட உதவி வழியைப் பயன்படுத்தவும்.',blocked:'இந்த செயல் கொள்கையால் கட்டுப்படுத்தப்பட்டுள்ளது.',unknown:'இந்த மொழி multilingual AI contract மூலம் ஆதரிக்கப்படுகிறது.'},
 te:{ready:'అంతర్గత AI సిద్ధంగా ఉంది.',review:'చర్యకు ముందు సమీక్ష అవసరం.',support:'అధీకృత సహాయ మార్గాన్ని ఉపయోగించండి.',blocked:'ఈ చర్య విధానంతో పరిమితం చేయబడింది.',unknown:'ఈ భాష multilingual AI contract ద్వారా మద్దతు పొందుతుంది.'},
 kn:{ready:'ಆಂತರಿಕ AI ಸಿದ್ಧವಾಗಿದೆ.',review:'ಕ್ರಿಯೆಗೆ ಮೊದಲು ಪರಿಶೀಲನೆ ಅಗತ್ಯ.',support:'ಅಧಿಕೃತ ಸಹಾಯ ಮಾರ್ಗ ಬಳಸಿ.',blocked:'ಈ ಕ್ರಿಯೆ ನೀತಿಯಿಂದ ನಿರ್ಬಂಧಿತವಾಗಿದೆ.',unknown:'ಈ ಭಾಷೆಯನ್ನು multilingual AI contract ಬೆಂಬಲಿಸುತ್ತದೆ.'},
 ml:{ready:'ആന്തരിക AI തയ്യാറാണ്.',review:'പ്രവർത്തനത്തിന് മുമ്പ് അവലോകനം ആവശ്യമാണ്.',support:'അംഗീകൃത സഹായ പ്രവാഹം ഉപയോഗിക്കുക.',blocked:'ഈ പ്രവർത്തനം നയപ്രകാരം നിയന്ത്രിച്ചിരിക്കുന്നു.',unknown:'ഈ ഭാഷ multilingual AI contract പിന്തുണയ്ക്കുന്നു.'},
 pa:{ready:'ਅੰਦਰੂਨੀ AI ਤਿਆਰ ਹੈ।',review:'ਕਾਰਵਾਈ ਤੋਂ ਪਹਿਲਾਂ ਸਮੀਖਿਆ ਲੋੜੀਂਦੀ ਹੈ।',support:'ਅਧਿਕਾਰਤ ਸਹਾਇਤਾ ਪ੍ਰਵਾਹ ਵਰਤੋ।',blocked:'ਇਹ ਕਾਰਵਾਈ ਨੀਤੀ ਅਨੁਸਾਰ ਸੀਮਿਤ ਹੈ।',unknown:'ਇਹ ਭਾਸ਼ਾ multilingual AI contract ਦੁਆਰਾ ਸਮਰਥਿਤ ਹੈ।'},
 or:{ready:'ଆଭ୍ୟନ୍ତରୀଣ AI ପ୍ରସ୍ତୁତ।',review:'କାର୍ଯ୍ୟ ପୂର୍ବରୁ ସମୀକ୍ଷା ଆବଶ୍ୟକ।',support:'ଅନୁମୋଦିତ ସହାୟତା ପ୍ରବାହ ବ୍ୟବହାର କରନ୍ତୁ।',blocked:'ଏହି କାର୍ଯ୍ୟ ନୀତି ଦ୍ୱାରା ସୀମିତ।',unknown:'ଏହି ଭାଷା multilingual AI contract ଦ୍ୱାରା ସମର୍ଥିତ।'},
 as:{ready:'আভ্যন্তৰীণ AI সাজু।',review:'কাৰ্যৰ আগতে পৰ্যালোচনা প্ৰয়োজন।',support:'অনুমোদিত সহায়তা ব্যৱহাৰ কৰক।',blocked:'এই কাৰ্য নীতি অনুসৰি সীমিত।',unknown:'এই ভাষা multilingual AI contract-এ সমৰ্থন কৰে।'},
 ur:{ready:'اندرونی AI تیار ہے۔',review:'کارروائی سے پہلے جائزہ ضروری ہے۔',support:'مجاز معاونت کا طریقہ استعمال کریں۔',blocked:'یہ کارروائی پالیسی کے تحت محدود ہے۔',unknown:'یہ زبان multilingual AI contract کے ذریعے معاونت یافتہ ہے۔'}
};

Object.assign(MESSAGES,{
 brx:{ready:'आंतरिक AI फिसा जाबाय।',review:'खामानायनि सिगां फिननाय नांगौ।',support:'मंजूर जानाय मदद जायगा बाहाय।',blocked:'बे खामानि नीति जों सीमाबद्ध।',unknown:'बे राव multilingual AI contract जों support खालामो।'},
 doi:{ready:'ਅੰਦਰੂਨੀ AI ਤਿਆਰ ਹੈ।',review:'ਕਾਰਵਾਈ ਤੋਂ ਪਹਿਲਾਂ ਸਮੀਖਿਆ ਲਾਜ਼ਮੀ ਹੈ।',support:'ਅਧਿਕਾਰਤ ਸਹਾਇਤਾ ਪ੍ਰਵਾਹ ਵਰਤੋ।',blocked:'ਇਹ ਕਾਰਵਾਈ ਨੀਤੀ ਅਨੁਸਾਰ ਸੀਮਿਤ ਹੈ।',unknown:'ਇਹ ਭਾਸ਼ਾ multilingual AI contract ਦੁਆਰਾ ਸਮਰਥਿਤ ਹੈ।'},
 ks:{ready:'اندرونی AI تیار چھُ۔',review:'کَم کَرنس منز پَتہٕ جایزہ ضروٗری۔',support:'مجاز مددس طریقہٕ استعمال کریو۔',blocked:'یہ کَم پالیسی سۭتۍ محدود چھُ۔',unknown:'یہ زبان multilingual AI contract ذریعہٕ معاونت یافتہ چھِ۔'},
 kok:{ready:'आंतरिक AI तयार आसा.',review:'कामा पयलीं तपासणी गरजेची आसा.',support:'अधिकृत सहाय्य प्रवाह वापरात.',blocked:'हें काम धोरणान प्रतिबंधीत आसा.',unknown:'ही भास multilingual AI contract कडेन समर्थीत आसा.'},
 mai:{ready:'आंतरिक AI तैयार अछि।',review:'काज सँ पहिने समीक्षा आवश्यक अछि।',support:'अधिकृत सहायता प्रवाहक उपयोग करू।',blocked:'ई काज नीतिक अनुसार सीमित अछि।',unknown:'ई भाषा multilingual AI contract द्वारा समर्थित अछि।'},
 mni:{ready:'ꯑꯥꯏꯅꯇꯔꯅꯦꯜ AI ꯁꯤꯗꯥ ꯂꯩꯔꯦ।',review:'ꯊꯕꯛ ꯊꯣꯛꯄꯒꯤ ꯃꯃꯥꯡꯗꯥ ꯌꯦꯡꯁꯤꯟꯕ ꯃꯇꯦꯡ ꯂꯩ।',support:'ꯑꯅꯨꯃꯣꯗꯤ ꯁꯍꯥꯏ ꯄꯥꯎꯖꯦꯜ ꯁꯤ ꯁꯤꯕꯤꯌꯥꯎ।',blocked:'ꯃꯁꯤꯒꯤ ꯊꯕꯛ ꯄꯣꯂꯤꯁꯤꯅꯥ ꯂꯦꯞꯇꯅꯥ ꯁꯤꯡꯁꯤꯅꯦ।',unknown:'ꯃꯁꯤ ꯂꯣꯟ multilingual AI contract ꯅꯥ ꯁꯣꯄꯣꯔꯠ ꯇꯧꯏ।'},
 ne:{ready:'आन्तरिक AI तयार छ।',review:'कार्य अघि समीक्षा आवश्यक छ।',support:'अधिकृत सहायता प्रवाह प्रयोग गर्नुहोस्।',blocked:'यो कार्य नीतिद्वारा सीमित छ।',unknown:'यो भाषा multilingual AI contract द्वारा समर्थित छ।'},
 sa:{ready:'आन्तरिकः AI सज्जः अस्ति।',review:'कार्यस्य पूर्वं समीक्षा आवश्यकी अस्ति।',support:'अधिकृत-सहायता-प्रवाहं प्रयुञ्जीत।',blocked:'एतत् कार्य नीत्या प्रतिबद्धम् अस्ति।',unknown:'एषा भाषा multilingual AI contract द्वारा समर्थिता अस्ति।'},
 sat:{ready:'ᱵᱷᱤᱛᱨᱤ AI ᱛᱟᱭᱟᱨ ᱠᱟᱱᱟ।',review:'ᱠᱟᱹᱢᱤ ᱢᱟᱲᱟᱝ ᱡᱟᱹᱛᱟᱹ ᱫᱚ ᱡᱟᱹᱸᱪ ᱞᱟᱹᱠᱛᱤ।',support:'ᱢᱚᱱᱡᱩᱨ ᱥᱟᱦᱟᱭᱛᱟ ᱯᱟᱹᱛᱷ ᱵᱟᱹᱦᱟᱹᱞ ᱢᱮ।',blocked:'ᱱᱚᱣᱟ ᱠᱟᱹᱢ ᱱᱤᱭᱟᱢ ᱫᱟᱨᱟ ᱥᱤᱢᱟᱵᱚᱫᱫᱷ।',unknown:'ᱱᱚᱣᱟ ᱯᱟᱹᱞᱤ multilingual AI contract ᱫᱟᱨᱟ ᱥᱟᱹᱦᱟᱭᱛᱟ।'},
 sd:{ready:'اندروني AI تيار آهي۔',review:'ڪم کان اڳ جائزو ضروري آهي۔',support:'مجاز مدد وارو رستو استعمال ڪريو۔',blocked:'هي ڪم پاليسي تحت محدود آهي۔',unknown:'هي ٻولي multilingual AI contract ذريعي سپورٽ ٿيل آهي۔'}
});

for(const code of Object.keys(registry))if(!MESSAGES[code])MESSAGES[code]=MESSAGES.en;
function normalize(code){const c=String(code||'').trim().toLowerCase().replace('_','-');if(registry[c])return c;const b=c.split('-')[0];return registry[b]?b:'en';}
function detect(text=''){const s=String(text);for(const [code,re] of SCRIPT_RANGES){if(re.test(s)){if(code==='ur'||code==='sd')return {code:'ur',requested:null,detected:true,confidence:.55};if(code==='mni'||code==='sat')return {code,requested:null,detected:true,confidence:.8};if(code==='hi')return {code:'hi',requested:null,detected:true,confidence:.55};return {code,requested:null,detected:true,confidence:.8};}}return {code:'en',requested:null,detected:true,confidence:.5};}
function resolve(requested,input=''){const explicit=String(requested||'').trim();if(explicit){return {code:normalize(explicit),requested:explicit,detected:false,confidence:1};}return detect(input);}
function info(code){return registry[normalize(code)];}
function all(){return LANGUAGES.map(([code])=>({...registry[code]}));}
function localize(code,key){const lang=normalize(code);return (MESSAGES[lang]||MESSAGES.en)[key]||MESSAGES.en[key]||'';}
function tokenize(text){const s=String(text||'').trim();if(typeof Intl!=='undefined'&&Intl.Segmenter){try{return [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(s)].map(x=>x.segment).filter(x=>/\p{L}|\p{N}/u.test(x));}catch{}}return s.split(/\s+/).filter(Boolean);}
function contract(){const rows=all();return {version:VERSION,requiredLanguageCount:rows.length,canonicalLanguageCount:rows.filter(x=>x.source==='canonical').length,indianLanguageCount:rows.filter(x=>x.source==='canonical'&&x.code!=='en').length,languages:rows,futureLanguagesAllowed:true,explicitLanguageWins:true,autoDetection:'best_effort',fallback:'en',fallbackRule:'only_when_selected_language_unavailable_or_uncapable',fullNativeGenerationRequiresInternalModel:true};}
module.exports={VERSION,registry,normalize,resolve,detect,info,all,localize,tokenize,contract};
