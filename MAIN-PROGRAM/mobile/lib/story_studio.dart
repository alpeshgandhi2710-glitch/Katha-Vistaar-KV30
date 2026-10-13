import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'mobile_tools.dart';

class KvStoryChapter {
  KvStoryChapter({required this.id, required this.title, this.body = ''});
  final String id;
  String title;
  String body;
  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'body': body};
}

class KvStoryDraft {
  KvStoryDraft({required this.localId, required this.language, required this.title, this.summary = '', List<KvStoryChapter>? chapters})
      : chapters = chapters ?? <KvStoryChapter>[];
  final String localId;
  String? serverContentId;
  String language;
  String title;
  String summary;
  final List<KvStoryChapter> chapters;
  DateTime updatedAt = DateTime.now();
  bool dirty = true;
  String get body => chapters.map((c) => c.body).join('\n\n');
  int get wordCount => body.trim().isEmpty ? 0 : body.trim().split(RegExp(r'\s+')).length;
  Map<String, dynamic> toJson() => {
    'localId': localId, 'serverContentId': serverContentId, 'language': language,
    'title': title, 'summary': summary, 'chapters': chapters.map((e) => e.toJson()).toList(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

class KvStoryApi {
  KvStoryApi({String? baseUrl, String? sessionToken}) : baseUrl = baseUrl ?? KvMobileSession.baseUrl ?? const String.fromEnvironment('KV_API_BASE_URL', defaultValue: ''), sessionToken = sessionToken ?? KvMobileSession.token;
  String baseUrl;
  static String configuredBaseUrl() => const String.fromEnvironment('KV_API_BASE_URL', defaultValue: '');
  String? sessionToken;

  Future<Map<String, dynamic>> _request(String method, String path, {Map<String, dynamic>? body}) async {
    if (baseUrl.trim().isEmpty) throw StateError('mobile_api_base_url_required');
    if ((sessionToken ?? '').isEmpty) throw StateError('mobile_session_required');
    final client = HttpClient();
    try {
      final uri = Uri.parse('$baseUrl$path');
      final req = await client.openUrl(method, uri);
      req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $sessionToken');
      req.headers.contentType = ContentType.json;
      req.headers.set('x-kv30-client', KvMobileSession.clientId);
      req.headers.set('x-kv30-state-sync', 'true');
      req.headers.set('x-kv-ui-language', body?['language']?.toString() ?? 'en');
      if (KvMobileSession.canonicalStateHash != null && const {'POST','PUT','PATCH','DELETE'}.contains(method.toUpperCase())) {
        req.headers.set('x-kv30-state-hash', KvMobileSession.canonicalStateHash!);
      }
      if (body != null) req.write(jsonEncode(body));
      final res = await req.close();
      final responseHash = res.headers.value('x-kv30-state-hash');
      if (responseHash != null && responseHash.isNotEmpty) KvMobileSession.canonicalStateHash = responseHash;
      final raw = await utf8.decoder.bind(res).join();
      final data = raw.isEmpty ? <String, dynamic>{} : Map<String, dynamic>.from(jsonDecode(raw) as Map);
      if (res.statusCode == 409 && data['error'] == 'stale_canonical_state') {
        await KvAccountApi(baseUrl: baseUrl, sessionToken: sessionToken).refreshCanonicalState();
        if (method.toUpperCase() != 'GET') return _request(method, path, body: body);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) throw HttpException(data['error']?.toString() ?? 'kv_api_error');
      return data;
    } finally {
      client.close(force: true);
    }
  }

  Future<String> createStory(KvStoryDraft d) async {
    final r = await _request('POST', '/api/content', body: {
      'type': 'story', 'workType': 'story', 'title': d.title, 'summary': d.summary,
      'body': d.body, 'rightsConfirmed': false, 'mediaRightsConfirmed': false,
    });
    final c = Map<String, dynamic>.from(r['content'] as Map);
    return c['id'].toString();
  }

  Future<Map<String, dynamic>> save(KvStoryDraft d) async {
    final id = d.serverContentId ??= await createStory(d);
    final acts = d.chapters.asMap().entries.map((e) => {
      'id': 'mobile-act-${e.key + 1}', 'number': e.key + 1, 'title': e.value.title,
      'summary': '', 'status': 'draft',
    }).toList();
    final scenes = d.chapters.asMap().entries.map((e) => {
      'id': 'mobile-scene-${e.key + 1}', 'actId': 'mobile-act-${e.key + 1}',
      'number': e.key + 1, 'title': e.value.title, 'body': e.value.body, 'status': 'draft',
    }).toList();
    return _request('PUT', '/api/studio/story/$id', body: {
      'title': d.title, 'summary': d.summary, 'body': d.body, 'language': d.language,
      'project': {'acts': acts, 'scenes': scenes, 'characters': [], 'beats': [], 'characterMatrix': [],
        'continuity': {'facts': [], 'threads': []}, 'mobileClient': true},
    });
  }

  Future<Map<String, dynamic>> autosave(KvStoryDraft d) async {
    if (d.serverContentId == null) return save(d);
    return _request('POST', '/api/studio/story/${d.serverContentId}/autosave', body: d.toJson());
  }

  Future<Map<String, dynamic>> publish(KvStoryDraft d,{required bool rightsConfirmed,required bool mediaRightsConfirmed}) async {
    if (d.serverContentId == null || d.dirty) await save(d);
    final contentId = d.serverContentId!;
    return _request('POST','/api/studio/publish/$contentId',body:{'status':'published','rightsConfirmed':rightsConfirmed,'mediaRightsConfirmed':mediaRightsConfirmed,'idempotencyKey':'mobile-story-publish-${DateTime.now().microsecondsSinceEpoch}'});
  }

  Future<Map<String, dynamic>> review(KvStoryDraft d) async {
    if (d.serverContentId == null) await save(d);
    return _request('POST', '/api/studio/story/${d.serverContentId}/review', body: {'language': d.language});
  }

  Future<Map<String, dynamic>> getReview(KvStoryDraft d) async {
    if (d.serverContentId == null) await save(d);
    return _request('GET', '/api/studio/story/${d.serverContentId}/review');
  }

  Future<Map<String, dynamic>> publishingChecklist(KvStoryDraft d) async {
    if (d.serverContentId == null) await save(d);
    return _request('GET', '/api/studio/story/${d.serverContentId}/publishing-checklist');
  }

  Future<Map<String, dynamic>> saveTranslationDraft(KvStoryDraft d, String language, Map<String, dynamic> translationDraft) async {
    if (d.serverContentId == null) await save(d);
    return _request('PUT', '/api/studio/story/${d.serverContentId}/translation-drafts', body: {'language': language, 'draft': translationDraft});
  }

  Future<Map<String, dynamic>> translationDrafts(KvStoryDraft d) async {
    if (d.serverContentId == null) await save(d);
    return _request('GET', '/api/studio/story/${d.serverContentId}/translation-drafts');
  }

  Future<Map<String, dynamic>> saveCharacterMatrix(KvStoryDraft d, List<dynamic> characterMatrix) async {
    if (d.serverContentId == null) await save(d);
    return _request('PUT', '/api/studio/story/${d.serverContentId}/character-matrix', body: {'characterMatrix': characterMatrix});
  }

  Future<Map<String, dynamic>> saveContinuity(KvStoryDraft d, Map<String, dynamic> continuity) async {
    if (d.serverContentId == null) await save(d);
    return _request('PUT', '/api/studio/story/${d.serverContentId}/continuity', body: {'continuity': continuity});
  }

  Future<Map<String, dynamic>> runReviewFindingUpdate(KvStoryDraft d, String findingId, String status) async {
    if (d.serverContentId == null) await save(d);
    return _request('PATCH', '/api/studio/story/${d.serverContentId}/review/finding/$findingId', body: {'status': status});
  }

  Future<Map<String, dynamic>> storyAiAssist(KvStoryDraft d, {String task = 'story_map', required String request}) async {
    if (d.serverContentId == null) await save(d);
    return _request('POST', '/api/studio/story/${d.serverContentId}/ai-assist', body: {'task': task, 'request': request, 'language': d.language});
  }

  Future<Map<String, dynamic>> aiComplete(KvStoryDraft d, String text) => _request('POST', '/api/ai/draft/complete', body: {'text': text, 'language': d.language});
  Future<Map<String, dynamic>> aiRewrite(KvStoryDraft d, String text, String tone) => _request('POST', '/api/ai/draft/rewrite', body: {'text': text, 'tone': tone, 'language': d.language});
}

class StoryStudioEditor extends StatefulWidget {
  const StoryStudioEditor({super.key, required this.t, required this.language});
  final String Function(String) t;
  final String language;
  @override State<StoryStudioEditor> createState() => _StoryStudioEditorState();
}

class _StoryStudioEditorState extends State<StoryStudioEditor> {
  late final KvStoryDraft draft;
  final title = TextEditingController();
  final summary = TextEditingController();
  final body = TextEditingController();
  Timer? autosaveTimer;
  int selected = 0;
  String stateKey = 'storyDraftLocal';
  bool busy = false;
  bool rightsConfirmed = false;
  bool mediaRightsConfirmed = false;
  Map<String, dynamic>? review;
  final KvStoryApi api = KvStoryApi();

  @override void initState() {
    super.initState();
    draft = KvStoryDraft(localId: 'MOBILE-${DateTime.now().microsecondsSinceEpoch}', language: widget.language, title: '', chapters: [KvStoryChapter(id: 'chapter-1', title: '')]);
    title.addListener(_changed); summary.addListener(_changed); body.addListener(_changed);
  }
  @override void dispose() { autosaveTimer?.cancel(); title.dispose(); summary.dispose(); body.dispose(); super.dispose(); }
  void _changed() {
    draft.title = title.text; draft.summary = summary.text; draft.chapters[selected].body = body.text; draft.updatedAt = DateTime.now(); draft.dirty = true;
    autosaveTimer?.cancel();
    autosaveTimer = Timer(const Duration(seconds: 2), () async {
      if (!mounted || !draft.dirty) return;
      try {
        await api.autosave(draft);
        draft.dirty = false;
        if (mounted) setState(() => stateKey = 'storyAutosavedServer');
      } catch (_) {
        if (mounted) setState(() => stateKey = 'storyAutosavedLocal');
      }
    });
    if (mounted) setState(() {});
  }
  void _addChapter() {
    setState(() {
      draft.chapters.add(KvStoryChapter(id: 'chapter-${draft.chapters.length + 1}', title: ''));
      selected = draft.chapters.length - 1; body.text = draft.chapters[selected].body;
    });
  }
  void _selectChapter(int i) { setState(() { draft.chapters[selected].body = body.text; selected = i; body.text = draft.chapters[i].body; }); }
  Future<void> _serverAction(Future<Map<String, dynamic>> Function() action, String okKey) async {
    setState(() => busy = true);
    try { final r = await action(); if (mounted) setState(() { stateKey = okKey; review = r['review'] is Map ? Map<String,dynamic>.from(r['review'] as Map) : review; draft.dirty = false; }); }
    catch (_) { if (mounted) setState(() => stateKey = 'storySessionRequired'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> _publish() async {
    if(draft.serverContentId==null || !rightsConfirmed || !mediaRightsConfirmed)return;
    await _serverAction(()=>api.publish(draft,rightsConfirmed:rightsConfirmed,mediaRightsConfirmed:mediaRightsConfirmed),'storyPublished');
  }
  Future<void> _ai(bool rewrite) async {
    final source = body.text.trim(); if (source.isEmpty) return;
    setState(() => busy = true);
    try {
      final r = rewrite ? await api.aiRewrite(draft, source, 'dramatic') : await api.aiComplete(draft, source);
      final p = Map<String,dynamic>.from(r['proposal'] as Map);
      if (!mounted) return;
      final proposal = p['text']?.toString() ?? '';
      await showDialog(context: context, builder: (c) => AlertDialog(title: Text(widget.t('storyAiProposal')), content: SingleChildScrollView(child: Text(proposal)), actions: [TextButton(onPressed:()=>Navigator.pop(c), child:Text(widget.t('cancel'))), FilledButton(onPressed:(){body.text=proposal;Navigator.pop(c);},child:Text(widget.t('storyApplyProposal')))]));
    } catch (_) { if (mounted) setState(() => stateKey = 'storySessionRequired'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final t = widget.t;
    return Scaffold(
      appBar: AppBar(title: Text(t('storyStudio')), actions:[IconButton(onPressed:busy?null:()=>_serverAction(()=>api.save(draft),'storySavedServer'),icon:const Icon(Icons.save_outlined))]),
      body: Row(children:[
        SizedBox(width: MediaQuery.of(context).size.width > 700 ? 240 : 92, child: ListView(padding:const EdgeInsets.all(8),children:[
          for(int i=0;i<draft.chapters.length;i++) ListTile(selected:i==selected,leading:const Icon(Icons.article_outlined),title:Text('${t('storyChapter')} ${i+1}'),onTap:()=>_selectChapter(i)),
          OutlinedButton.icon(onPressed:_addChapter,icon:const Icon(Icons.add),label:Text(t('storyAddChapter'))),
        ])),
        const VerticalDivider(width:1),
        Expanded(child: ListView(padding:const EdgeInsets.all(16),children:[
          TextField(controller:title,decoration:InputDecoration(labelText:t('storyTitle'))),const SizedBox(height:10),
          TextField(controller:summary,maxLines:2,decoration:InputDecoration(labelText:t('summary'))),const SizedBox(height:10),
          TextField(controller:body,minLines:14,maxLines:null,decoration:InputDecoration(labelText:t('storyChapterBody'),alignLabelWithHint:true,border:const OutlineInputBorder())),
          const SizedBox(height:10), Wrap(spacing:8,runSpacing:8,children:[
            Chip(label:Text('${t('storyWordCount')}: ${draft.wordCount}')), Chip(label:Text(t(stateKey))),
            OutlinedButton.icon(onPressed:busy?null:()=>_ai(false),icon:const Icon(Icons.auto_awesome),label:Text(t('storyAiContinue'))),
            OutlinedButton.icon(onPressed:busy?null:()=>_ai(true),icon:const Icon(Icons.edit),label:Text(t('storyAiRewrite'))),
            OutlinedButton.icon(onPressed:busy?null:()=>_serverAction(()=>api.autosave(draft),'storyAutosavedServer'),icon:const Icon(Icons.cloud_upload_outlined),label:Text(t('storySyncDraft'))),
            OutlinedButton.icon(onPressed:busy?null:()=>_serverAction(()=>api.review(draft),'storyReviewComplete'),icon:const Icon(Icons.fact_check_outlined),label:Text(t('storyReview'))),
            Checkbox(value:rightsConfirmed,onChanged:busy?null:(v)=>setState(()=>rightsConfirmed=v==true)), Text(t('rights')),
            Checkbox(value:mediaRightsConfirmed,onChanged:busy?null:(v)=>setState(()=>mediaRightsConfirmed=v==true)), Text(t('mediaRights')),
            FilledButton.icon(onPressed:busy||draft.serverContentId==null||!rightsConfirmed||!mediaRightsConfirmed?null:_publish,icon:const Icon(Icons.publish),label:Text(t('publishingReadiness'))),
          ]),
          if(review!=null) Card(child:Padding(padding:const EdgeInsets.all(12),child:Text('${t('storyReview')}: ${review!['decision'] ?? ''}'))),
        ])),
      ]),
    );
  }
}
