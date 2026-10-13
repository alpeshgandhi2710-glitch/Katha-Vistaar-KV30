import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';


final ValueNotifier<bool> kvSessionNotifier = ValueNotifier<bool>(false);

class KvMobileSession {
  KvMobileSession._();
  static String? token;
  static Map<String,dynamic>? user;
  static String? baseUrl;
  static String? canonicalStateHash;
  static String get clientId => Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');

  static bool get authenticated => token != null && token!.trim().isNotEmpty;

  static Future<Map<String,dynamic>> login({required String apiBaseUrl, required String identifier, required String password}) async {
    final client=HttpClient();
    try {
      final req=await client.postUrl(Uri.parse('$apiBaseUrl/api/auth/login'));
      req.headers.contentType=ContentType.json;
      req.headers.set('x-kv30-client',clientId);req.headers.set('x-kv-client',clientId);
      req.write(jsonEncode({'identifier':identifier,'password':password}));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'login_failed');
      final t=String(data['sessionToken']??'').trim();
      if(t.isEmpty) throw StateError('mobile_session_token_missing');
      token=t; canonicalStateHash=null; kvSessionNotifier.value=true; user=data['user'] is Map?Map<String,dynamic>.from(data['user'] as Map):null; baseUrl=apiBaseUrl;
      try { await KvAccountApi(baseUrl:apiBaseUrl,sessionToken:t).canonicalState(); } catch (_) { canonicalStateHash=null; }
      return data;
    } finally { client.close(force:true); }
  }

  static Future<void> logout() async {
    final api=baseUrl;final t=token;
    if(api!=null&&api.trim().isNotEmpty&&t!=null&&t.trim().isNotEmpty){final client=HttpClient();try{final req=await client.postUrl(Uri.parse('$api/api/auth/logout'));req.headers.set(HttpHeaders.authorizationHeader,'Bearer $t');await req.close();}catch(_){}finally{client.close(force:true);}}
    clear();
  }

  static void clear(){token=null;user=null;baseUrl=null;canonicalStateHash=null;kvSessionNotifier.value=false;}
}


class KvAccountApi {
  KvAccountApi({String? baseUrl, String? sessionToken})
      : baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),
        sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl;
  final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try {
      final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));
      req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');
      req.headers.set('x-kv30-client',KvMobileSession.clientId);
      req.headers.set('x-kv30-state-sync','true');
      if(KvMobileSession.canonicalStateHash!=null && const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);
      req.headers.contentType=ContentType.json;
      if(body!=null) req.write(jsonEncode(body));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_api_error');
      return data;
    } finally { client.close(force:true); }
  }
  Future<Map<String,dynamic>> canonicalState() async { final r=await _request('GET','/api/state/canonical'); if(r['stateHash']!=null) KvMobileSession.canonicalStateHash=String(r['stateHash']); return r; }
  Future<Map<String,dynamic>> refreshCanonicalState()=>canonicalState();
  Future<Map<String,dynamic>> profile()=>_request('GET','/api/profile');
  Future<Map<String,dynamic>> updateProfile(Map<String,dynamic> fields)=>_request('PATCH','/api/profile',body:fields);
  Future<Map<String,dynamic>> notificationPreferences()=>_request('GET','/api/notification-preferences');
  Future<Map<String,dynamic>> updateNotificationPreferences(Map<String,dynamic> fields)=>_request('PATCH','/api/notification-preferences',body:fields);
  Future<Map<String,dynamic>> coins()=>_request('GET','/api/coins');
  Future<Map<String,dynamic>> subscriptions()=>_request('GET','/api/subscriptions');
  Future<Map<String,dynamic>> catalog()=>_request('GET','/api/monetization/catalog');
  Future<Map<String,dynamic>> startPaymentOtp(String action,String reference,num amount)=>_request('POST','/api/payments/internal-otp/start',body:{'action':action,'reference':reference,'amount':amount});
  Future<Map<String,dynamic>> verifyPaymentOtp(String paymentToken,String otp)=>_request('POST','/api/payments/internal-otp/verify',body:{'paymentToken':paymentToken,'otp':otp});
  Future<Map<String,dynamic>> purchaseSubscription(String planId,{String? authorId,String? paymentToken,String method='internal_test',String? returnUrl})=>_request('POST','/api/subscriptions/purchase',body:{'planId':planId,'authorId':authorId,'mode':method=='internal_test'?'internal_test':'external','method':method,'paymentToken':paymentToken,'idempotencyKey':'mobile-sub-${DateTime.now().microsecondsSinceEpoch}','returnUrl':returnUrl??''});
  Future<Map<String,dynamic>> purchaseCoins(int coins,{required String paymentToken,String method='internal_test',String? offerCode})=>_request('POST','/api/coins/purchase',body:{'coins':coins,'method':method,'paymentToken':paymentToken,'offerCode':offerCode,'idempotencyKey':'mobile-coin-${DateTime.now().microsecondsSinceEpoch}'});
  Future<Map<String,dynamic>> publishProject(String type,String projectId,{required bool rightsConfirmed,required bool mediaRightsConfirmed})=>_request('POST','/api/studio/publish-project/$type/${Uri.encodeComponent(projectId)}',body:{'status':'published','rightsConfirmed':rightsConfirmed,'mediaRightsConfirmed':mediaRightsConfirmed,'idempotencyKey':'mobile-publish-${DateTime.now().microsecondsSinceEpoch}'});
}

class KvHelpApi {
  KvHelpApi({String? baseUrl, String? sessionToken})
      : baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),
        sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl;
  final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body,bool authenticated=false}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(authenticated&&sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try{
      final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));
      req.headers.contentType=ContentType.json;
      req.headers.set('x-kv30-client',KvMobileSession.clientId);
      if(authenticated){
        req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');
        req.headers.set('x-kv30-state-sync','true');
        if(KvMobileSession.canonicalStateHash!=null&&const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);
      }
      if(body!=null) req.write(jsonEncode(body));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(authenticated&&res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){
        await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();
        return _request(method,path,body:body,authenticated:true);
      }
      if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_help_api_error');
      return data;
    }finally{client.close(force:true);}
  }
  Future<Map<String,dynamic>> publicAi(String problem,String language)=>_request('POST','/api/help/public-ai',body:{'problem':problem,'language':language});
  Future<Map<String,dynamic>> publicCreate(String identifier,String problem,String language)=>_request('POST','/api/help/public-ticket',body:{'identifier':identifier,'problem':problem,'channel':'ai','language':language});
  Future<Map<String,dynamic>> track(String ticketNumber,String identifier)=>_request('GET','/api/help/tickets/track?ticketNumber=${Uri.encodeQueryComponent(ticketNumber)}&identifier=${Uri.encodeQueryComponent(identifier)}');
  Future<Map<String,dynamic>> publicComment(String ticketNumber,String identifier,String comment)=>_request('PATCH','/api/help/public-ticket',body:{'ticketNumber':ticketNumber,'identifier':identifier,'comment':comment});
  Future<Map<String,dynamic>> authenticatedAi(String problem,String language)=>_request('POST','/api/ai/help',body:{'problem':problem,'language':language},authenticated:true);
  Future<Map<String,dynamic>> authenticatedCreate(String problem)=>_request('POST','/api/help/tickets',body:{'channel':'ai','problem':problem},authenticated:true);
  Future<Map<String,dynamic>> authenticatedComment(String ticketNumber,String comment)=>_request('PATCH','/api/help/tickets?id=${Uri.encodeQueryComponent(ticketNumber)}',body:{'comment':comment},authenticated:true);
}

class KvAdminApi {
  KvAdminApi({String? baseUrl,String? sessionToken}):baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl; final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try{
      final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));
      req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');
      req.headers.set('x-kv30-client',KvMobileSession.clientId);
      req.headers.set('x-kv30-state-sync','true');
      if(KvMobileSession.canonicalStateHash!=null&&const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);
      req.headers.contentType=ContentType.json;
      if(body!=null)req.write(jsonEncode(body));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){
        await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();
        return _request(method,path,body:body);
      }
      if(res.statusCode<200||res.statusCode>=300)throw HttpException(data['error']?.toString()??'kv_admin_api_error');
      return data;
    }finally{client.close(force:true);}
  }
  Future<Map<String,dynamic>> profile()=>_request('GET','/api/admin/profile');
  Future<Map<String,dynamic>> dashboard()=>_request('GET','/api/admin/dashboard');
}

class KvSocialApi {
  KvSocialApi({String? baseUrl, String? sessionToken})
      : baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),
        sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl; final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try {
      final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));
      req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');
      req.headers.set('x-kv30-client',KvMobileSession.clientId);
      req.headers.set('x-kv30-state-sync','true');
      if(KvMobileSession.canonicalStateHash!=null && const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);
      req.headers.contentType=ContentType.json;
      if(body!=null) req.write(jsonEncode(body));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_social_api_error');
      return data;
    } finally { client.close(force:true); }
  }
  Future<Map<String,dynamic>> profile()=>_request('GET','/api/profile');
  Future<Map<String,dynamic>> messages({String? peerId})=>_request('GET','/api/messages${peerId==null?'':'?peerId=${Uri.encodeQueryComponent(peerId)}'}');
  Future<Map<String,dynamic>> sendMessage(String toUserId,String body,{Map<String,dynamic>? attachment})=>_request('POST','/api/messages',body:{'toUserId':toUserId,'body':body,'attachment':attachment});
  Future<Map<String,dynamic>> follow(String authorId,bool following)=>_request('POST','/api/follows',body:{'authorId':authorId,'following':following});
  Future<Map<String,dynamic>> likes(String contentId)=>_request('GET','/api/likes?contentId=${Uri.encodeQueryComponent(contentId)}');
  Future<Map<String,dynamic>> setLike(String contentId,bool liked)=>_request('POST','/api/likes',body:{'contentId':contentId,'liked':liked});
  Future<Map<String,dynamic>> comments(String contentId)=>_request('GET','/api/comments?contentId=${Uri.encodeQueryComponent(contentId)}');
  Future<Map<String,dynamic>> addComment(String contentId,String body)=>_request('POST','/api/comments',body:{'contentId':contentId,'body':body});
  Future<Map<String,dynamic>> subscriptions()=>_request('GET','/api/subscriptions');
  Future<Map<String,dynamic>> content()=>_request('GET','/api/content');
}

class KvReaderApi {
  KvReaderApi({String? baseUrl,String? sessionToken}):baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl; final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();try{final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');req.headers.set('x-kv30-client',KvMobileSession.clientId);req.headers.set('x-kv30-state-sync','true');if(KvMobileSession.canonicalStateHash!=null&&const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);req.headers.contentType=ContentType.json;if(body!=null)req.write(jsonEncode(body));final res=await req.close();final responseHash=res.headers.value('x-kv30-state-hash');if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;final raw=await utf8.decoder.bind(res).join();final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300)throw HttpException(data['error']?.toString()??'kv_api_error');return data;}finally{client.close(force:true);}
  }
  Future<Map<String,dynamic>> state({String? contentId,required String format})=>_request('GET','/api/reader/state?format=${Uri.encodeQueryComponent(format)}${contentId==null?'':'&contentId=${Uri.encodeQueryComponent(contentId)}'}');
  Future<Map<String,dynamic>> save({String? contentId,required String format,required double progress,required bool bookmarked})=>_request('PUT','/api/reader/state',body:{'contentId':contentId,'format':format,'progress':progress,'bookmarked':bookmarked});
}

class KvComicPanel {
  KvComicPanel({this.id, required this.panelNumber, this.character='', this.dialogue='', this.background='', this.layout='single'});
  String? id;
  int panelNumber;
  String character;
  String dialogue;
  String background;
  String layout;
  Map<String,dynamic> toJson()=>{'panelNumber':panelNumber,'character':character,'dialogue':dialogue,'background':background,'layout':layout};
  factory KvComicPanel.fromJson(Map<String,dynamic> j)=>KvComicPanel(id:j['id']?.toString(),panelNumber:int.tryParse('${j['panelNumber']??1}')??1,character:'${j['character']??''}',dialogue:'${j['dialogue']??''}',background:'${j['background']??''}',layout:'${j['layout']??'single'}');
}

class KvComicApi {
  KvComicApi({String? baseUrl, String? sessionToken})
      : baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL', defaultValue:''),
        sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN', defaultValue:'');
  final String baseUrl;
  final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try{
      final req=await client.openUrl(method,Uri.parse('$baseUrl$path'));
      req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');
      req.headers.set('x-kv30-client',KvMobileSession.clientId);
      req.headers.set('x-kv30-state-sync','true');
      if(KvMobileSession.canonicalStateHash!=null && const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!);
      req.headers.contentType=ContentType.json;
      if(body!=null) req.write(jsonEncode(body));
      final res=await req.close();
      final responseHash=res.headers.value('x-kv30-state-hash');
      if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash;
      final raw=await utf8.decoder.bind(res).join();
      final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map);
      if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_api_error');
      return data;
    } finally { client.close(force:true); }
  }
  Future<String> createProject(String title,String language) async {
    final r=await _request('POST','/api/studio/projects',body:{'type':'comic','title':title,'metadata':{'language':language,'mobileClient':true}});
    return Map<String,dynamic>.from(r['project'] as Map)['id'].toString();
  }
  Future<List<KvComicPanel>> loadPanels(String projectId) async {
    final r=await _request('GET','/api/comic/panels?projectId=${Uri.encodeQueryComponent(projectId)}');
    return (r['panels'] as List? ?? const []).map((e)=>KvComicPanel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }
  Future<KvComicPanel> savePanel(String projectId,KvComicPanel panel) async {
    final r=await _request('POST','/api/comic/panels',body:{'projectId':projectId,...panel.toJson()});
    return KvComicPanel.fromJson(Map<String,dynamic>.from(r['panel'] as Map));
  }
  Future<Map<String,dynamic>> aiPlan(String prompt,String language) => _request('POST','/api/ai/comic-illustrator',body:{'prompt':prompt,'language':language});
}


class KvAudioSegment {
  KvAudioSegment({this.id, required this.segmentNumber, this.title='', this.script='', this.startMs=0, this.endMs=0, this.audioAssetId, this.effects=const []});
  String? id;
  int segmentNumber;
  String title;
  String script;
  int startMs;
  int endMs;
  String? audioAssetId;
  List<String> effects;
  Map<String,dynamic> toJson()=>{'segmentNumber':segmentNumber,'title':title,'script':script,'startMs':startMs,'endMs':endMs,'audioAssetId':audioAssetId,'effects':effects};
  factory KvAudioSegment.fromJson(Map<String,dynamic> j)=>KvAudioSegment(id:j['id']?.toString(),segmentNumber:int.tryParse('${j['segmentNumber']??1}')??1,title:'${j['title']??''}',script:'${j['script']??''}',startMs:int.tryParse('${j['startMs']??0}')??0,endMs:int.tryParse('${j['endMs']??0}')??0,audioAssetId:j['audioAssetId']?.toString(),effects:(j['effects'] as List? ?? const []).map((e)=>e.toString()).toList());
}

class KvAudioApi {
  KvAudioApi({String? baseUrl,String? sessionToken}):baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl; final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try { final req=await client.openUrl(method,Uri.parse('$baseUrl$path')); req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');req.headers.set('x-kv30-client',KvMobileSession.clientId);req.headers.set('x-kv30-state-sync','true');if(KvMobileSession.canonicalStateHash!=null&&const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!); req.headers.contentType=ContentType.json; if(body!=null) req.write(jsonEncode(body)); final res=await req.close();final responseHash=res.headers.value('x-kv30-state-hash');if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash; final raw=await utf8.decoder.bind(res).join(); final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map); if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_api_error'); return data; }
    finally { client.close(force:true); }
  }
  Future<List<KvAudioSegment>> loadSegments(String projectId) async { final r=await _request('GET','/api/audio/projects?projectId=${Uri.encodeQueryComponent(projectId)}'); return (r['segments'] as List? ?? const []).map((e)=>KvAudioSegment.fromJson(Map<String,dynamic>.from(e as Map))).toList(); }
  Future<String> createProject(String title,String language) async { final r=await _request('POST','/api/studio/works',body:{'type':'audio','title':title,'language':language}); return Map<String,dynamic>.from(r['work'] as Map)['id'].toString(); }
  Future<KvAudioSegment> saveSegment(String projectId,KvAudioSegment segment) async { final r=await _request('POST','/api/audio/projects',body:{'projectId':projectId,...segment.toJson()}); return KvAudioSegment.fromJson(Map<String,dynamic>.from(r['segment'] as Map)); }
  Future<String> uploadRecordedFile(String filePath,{String mimeType='audio/wav'}) async { final file=File(filePath); if(!await file.exists()) throw StateError('recording_file_not_found'); final bytes=await file.readAsBytes(); if(bytes.isEmpty) throw StateError('recording_file_empty'); if(bytes.length>10*1024*1024) throw StateError('recording_file_too_large'); final filename=file.uri.pathSegments.isEmpty?'recording.wav':file.uri.pathSegments.last; final r=await _request('POST','/api/media/assets',body:{'mimeType':mimeType,'filename':filename,'data':'data:$mimeType;base64,${base64Encode(bytes)}'}); final a=Map<String,dynamic>.from(r['asset'] as Map); return a['id'].toString(); }
  Future<Map<String,dynamic>> renderMix(List<String> assetIds) => _request('POST','/api/media/audio/mix',body:{'assetIds':assetIds});
  Future<Map<String,dynamic>> publishProject(String projectId,{required bool rightsConfirmed,required bool mediaRightsConfirmed})=>_request('POST','/api/studio/publish-project/audio/${Uri.encodeComponent(projectId)}',body:{'status':'published','rightsConfirmed':rightsConfirmed,'mediaRightsConfirmed':mediaRightsConfirmed,'idempotencyKey':'mobile-audio-publish-${DateTime.now().microsecondsSinceEpoch}'});
  Future<Map<String,dynamic>> enhancementPlan(String assetId,String language) => _request('POST','/api/ai/audio/enhance',body:{'assetId':assetId,'language':language,'targetLufs':-16});
}


class KvReelClip {
  KvReelClip({this.id, required this.assetId, this.start=0, this.duration=0, this.caption='', this.scene='', this.order=1});
  String? id;
  String assetId;
  double start;
  double duration;
  String caption;
  String scene;
  int order;
  Map<String,dynamic> toJson()=>{'id':id,'assetId':assetId,'start':start,'duration':duration,'caption':caption,'scene':scene,'order':order};
  factory KvReelClip.fromJson(Map<String,dynamic> j)=>KvReelClip(id:j['id']?.toString(),assetId:'${j['assetId']??''}',start:double.tryParse('${j['start']??0}')??0,duration:double.tryParse('${j['duration']??0}')??0,caption:'${j['caption']??''}',scene:'${j['scene']??''}',order:int.tryParse('${j['order']??1}')??1);
}

class KvReelApi {
  KvReelApi({String? baseUrl,String? sessionToken}):baseUrl=baseUrl??KvMobileSession.baseUrl??const String.fromEnvironment('KV_API_BASE_URL',defaultValue:''),sessionToken=sessionToken??KvMobileSession.token??const String.fromEnvironment('KV_SESSION_TOKEN',defaultValue:'');
  final String baseUrl; final String sessionToken;
  Future<Map<String,dynamic>> _request(String method,String path,{Map<String,dynamic>? body}) async {
    if(baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if(sessionToken.trim().isEmpty) throw StateError('mobile_session_required');
    final client=HttpClient();
    try { final req=await client.openUrl(method,Uri.parse('$baseUrl$path')); req.headers.set(HttpHeaders.authorizationHeader,'Bearer $sessionToken');req.headers.set('x-kv30-client',KvMobileSession.clientId);req.headers.set('x-kv30-state-sync','true');if(KvMobileSession.canonicalStateHash!=null&&const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) req.headers.set('x-kv30-state-hash',KvMobileSession.canonicalStateHash!); req.headers.contentType=ContentType.json; if(body!=null) req.write(jsonEncode(body)); final res=await req.close();final responseHash=res.headers.value('x-kv30-state-hash');if(responseHash!=null&&responseHash.isNotEmpty)KvMobileSession.canonicalStateHash=responseHash; final raw=await utf8.decoder.bind(res).join(); final data=raw.isEmpty?<String,dynamic>{}:Map<String,dynamic>.from(jsonDecode(raw) as Map); if(res.statusCode==409&&data['error']=='stale_canonical_state'&&method.toUpperCase()!='GET'){await KvAccountApi(baseUrl:baseUrl,sessionToken:sessionToken).refreshCanonicalState();return _request(method,path,body:body);}if(res.statusCode<200||res.statusCode>=300) throw HttpException(data['error']?.toString()??'kv_api_error'); return data; }
    finally { client.close(force:true); }
  }
  Future<String> createProject(String title,String language) async { final r=await _request('POST','/api/reel/projects',body:{'title':title,'language':language}); return Map<String,dynamic>.from(r['project'] as Map)['id'].toString(); }
  Future<List<KvReelClip>> loadClips(String projectId) async { final r=await _request('GET','/api/reel/projects?projectId=${Uri.encodeQueryComponent(projectId)}'); return (r['clips'] as List? ?? const []).map((e)=>KvReelClip.fromJson(Map<String,dynamic>.from(e as Map))).toList(); }
  Future<KvReelClip> saveClip(String projectId,KvReelClip clip) async { final r=await _request('POST','/api/reel/clips',body:{'projectId':projectId,...clip.toJson()}); return KvReelClip.fromJson(Map<String,dynamic>.from(r['clip'] as Map)); }
  Future<Map<String,dynamic>> storyboard(String prompt,String language) => _request('POST','/api/ai/storyboard',body:{'type':'reel','prompt':prompt,'language':language,'scenes':5});
  Future<Map<String,dynamic>> render(List<KvReelClip> clips,{int fps=30,String resolution='720x1280'}) => _request('POST','/api/media/video/render',body:{'clips':clips.map((c)=>c.toJson()).toList(),'fps':fps,'resolution':resolution});
}
