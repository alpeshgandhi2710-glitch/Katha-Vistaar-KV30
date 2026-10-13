import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'story_studio.dart';
import 'mobile_tools.dart';
import 'native_capabilities.dart';

const kvPurple = Color(0xFF4800B2);
const kvBg = Color(0xFFFCF9F8);
final ValueNotifier<Locale> kvLocaleNotifier = ValueNotifier<Locale>(const Locale('en'));

List<Locale> supportedLocales = const [Locale('en')];

Future<List<Locale>> loadSupportedLocales() async {
  try {
    final raw = await rootBundle.loadString('assets/locales/registry.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final rows = (data['languages'] as List).cast<Map>();
    return rows.map((r) => Locale(String(r['code']))).toList();
  } catch (_) {
    return const [Locale('en')];
  }
}

class KvStrings {
  final String code;
  final Map<String, dynamic> values;
  final Map<String, dynamic> englishValues;
  const KvStrings(this.code, this.values, this.englishValues);
  String t(String key) {
    final selected = values[key]?.toString().trim() ?? '';
    if (selected.isNotEmpty && selected!='[$key]') return selected;
    final english = englishValues[key]?.toString().trim() ?? '';
    if (english.isNotEmpty && english!='[$key]') return english;
    return '[$key]';
  }
}

class KvLocalizations {
  static Future<KvStrings> load(Locale locale) async {
    final code = supportedLocales.any((l) => l.languageCode == locale.languageCode)
        ? locale.languageCode
        : 'en';
    try {
      final raw = await rootBundle.loadString('assets/locales/$code.json');
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final englishRaw = await rootBundle.loadString('assets/locales/en.json');
      final englishData = jsonDecode(englishRaw) as Map<String, dynamic>;
      return KvStrings(code, Map<String, dynamic>.from(data['translations'] as Map),
          Map<String, dynamic>.from(englishData['translations'] as Map));
    } catch (_) {
      final raw = await rootBundle.loadString('assets/locales/en.json');
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final en = Map<String, dynamic>.from(data['translations'] as Map);
      return KvStrings('en', en, en);
    }
  }

  static KvStrings of(BuildContext c) => Localizations.of<KvStrings>(c, KvStrings)!;
}

class KvDelegate extends LocalizationsDelegate<KvStrings> {
  const KvDelegate();
  @override bool isSupported(Locale l) => supportedLocales.any((x) => x.languageCode == l.languageCode);
  @override Future<KvStrings> load(Locale l) => KvLocalizations.load(l);
  @override bool shouldReload(KvDelegate old) => false;
}

void main() => runApp(const KathaVistaarApp());

class KathaVistaarApp extends StatefulWidget {
  const KathaVistaarApp({super.key});
  @override State<KathaVistaarApp> createState() => _KathaVistaarAppState();
}

class _KathaVistaarAppState extends State<KathaVistaarApp> {
  Locale locale = const Locale('en');
  int tab = 0;
  @override void initState() {
    super.initState();
    kvLocaleNotifier.addListener(_localeChanged);
    kvSessionNotifier.addListener(_sessionChanged);
    loadSupportedLocales().then((v) { if (mounted) setState(() => supportedLocales = v); });
  }
  void _sessionChanged() { if (mounted) setState(() {}); }
  void _localeChanged() {
    if (mounted) setState(() => locale = kvLocaleNotifier.value);
  }
  @override void dispose() {
    kvLocaleNotifier.removeListener(_localeChanged);
    kvSessionNotifier.removeListener(_sessionChanged);
    super.dispose();
  }

  @override Widget build(BuildContext c) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Katha Vistaar',
    locale: locale,
    supportedLocales: supportedLocales,
    localizationsDelegates: const [KvDelegate(), DefaultMaterialLocalizations.delegate, DefaultWidgetsLocalizations.delegate],
    theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: kvPurple), scaffoldBackgroundColor: kvBg),
    home: Builder(builder: (context) {
      final s = KvLocalizations.of(context);
      if (!KvMobileSession.authenticated) return const LoginScreen();
      final pages = [const HomeScreen(), const DiscoverScreen(), const CreateScreen(), const AlertsScreen(), const ProfileScreen()];
      return Scaffold(
        appBar: AppBar(
          title: Text(s.t('kathaVistaar')),
          backgroundColor: Colors.white,
          elevation: 0,
          actions: [IconButton(onPressed: () => showDialog(context: context, builder: (_) => LanguageDialog(onSelected: (l) { setState(() => locale = l); Navigator.pop(context); })), icon: const Icon(Icons.language))],
        ),
        body: SafeArea(child: pages[tab]),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (i) => setState(() => tab = i),
          destinations: [
            NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: s.t('kathaVistaar')),
            NavigationDestination(icon: const Icon(Icons.explore_outlined), selectedIcon: const Icon(Icons.explore), label: s.t('discover')),
            NavigationDestination(icon: const Icon(Icons.add_circle_outline), selectedIcon: const Icon(Icons.add_circle), label: s.t('write')),
            NavigationDestination(icon: const Icon(Icons.notifications_none), selectedIcon: const Icon(Icons.notifications), label: s.t('notifications')),
            NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: s.t('account')),
          ],
        ),
      );
    }),
  );
}


class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState()=>_LoginScreenState();
}
class _LoginScreenState extends State<LoginScreen> {
  final identifier=TextEditingController();
  final password=TextEditingController();
  bool busy=false; String statusKey='login';
  @override void dispose(){identifier.dispose();password.dispose();super.dispose();}
  Future<void> _login() async {
    final apiBase=const String.fromEnvironment('KV_API_BASE_URL',defaultValue:'');
    if(apiBase.trim().isEmpty){setState(()=>statusKey='login_unavailable');return;}
    if(identifier.text.trim().isEmpty||password.text.isEmpty){setState(()=>statusKey='loginRequired');return;}
    setState(()=>busy=true);
    try {
      await KvMobileSession.login(apiBaseUrl:apiBase,identifier:identifier.text.trim(),password:password.text);
      if(mounted)setState(()=>statusKey='login');
    } catch (_) { if(mounted)setState(()=>statusKey='login_failed'); }
    finally { if(mounted)setState(()=>busy=false); }
  }
  @override Widget build(BuildContext c){
    final s=KvLocalizations.of(c);
    return Scaffold(body:SafeArea(child:Center(child:ConstrainedBox(constraints:BoxConstraints(maxWidth:480),child:Padding(padding:const EdgeInsets.all(24),child:ListView(shrinkWrap:true,children:[
      Text(s.t('kathaVistaar'),style:const TextStyle(fontSize:30,fontWeight:FontWeight.w800)),const SizedBox(height:24),
      TextField(controller:identifier,decoration:InputDecoration(labelText:s.t('username'),border:const OutlineInputBorder())),const SizedBox(height:12),
      TextField(controller:password,obscureText:true,decoration:InputDecoration(labelText:s.t('password'),border:const OutlineInputBorder())),const SizedBox(height:16),
      FilledButton(onPressed:busy?null:_login,child:Text(s.t('login'))),const SizedBox(height:8),TextButton.icon(onPressed:()=>_open(c,const HelpScreen()),icon:const Icon(Icons.help_outline),label:Text(s.t('help'))),const SizedBox(height:12),Text(s.t(statusKey),textAlign:TextAlign.center)
    ]))))));
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override Widget build(BuildContext c) {
    final s = KvLocalizations.of(c);
    return ListView(padding: const EdgeInsets.all(16), children: [
      _Hero(s.t('welcome'), s.t('intro')),
      const SizedBox(height: 20),
      SectionTitle(s.t('continueReading')),
      FeatureCard(icon: Icons.menu_book, title: s.t('reader'), subtitle: s.t('yourLibrary'), onTap: () => _open(c, const ReaderHubScreen())),
      SectionTitle(s.t('category')),
      _formatGrid(c, s),
      SectionTitle(s.t('popular')),
      FeatureCard(icon: Icons.auto_awesome, title: s.t('discover'), subtitle: s.t('findYourNextStory'), onTap: () => _open(c, const DiscoverScreen())),
      FeatureCard(icon: Icons.account_balance_wallet_outlined, title: s.t('coinCenter'), subtitle: s.t('purchaseCoinsSafely'), onTap: () => _open(c, const PaymentScreen())),
    ]);
  }
}

Widget _formatGrid(BuildContext c, KvStrings s) => GridView.count(
  crossAxisCount: MediaQuery.of(c).size.width > 600 ? 4 : 2,
  shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.45,
  children: [
    _formatTile(c, Icons.menu_book, s.t('stories'), const StoryStudioScreen()),
    _formatTile(c, Icons.auto_awesome, s.t('comic'), const ComicStudioScreen()),
    _formatTile(c, Icons.headphones, s.t('audio'), const AudioStudioScreen()),
    _formatTile(c, Icons.movie, s.t('reel'), const ReelStudioScreen()),
  ],
);
Widget _formatTile(BuildContext c, IconData icon, String title, Widget page) => Card(
  child: InkWell(borderRadius: BorderRadius.circular(12), onTap: () => _open(c, page), child: Padding(padding: const EdgeInsets.all(12), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(icon, color: kvPurple), const SizedBox(height: 8), Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700))]))),
);

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key});
  @override Widget build(BuildContext c) { final s = KvLocalizations.of(c); return ListView(padding: const EdgeInsets.all(16), children: [Text(s.t('discover'), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), const SizedBox(height: 12), TextField(decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.t('search'), filled: true, fillColor: Colors.white, border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(14)), borderSide: BorderSide.none))), const SizedBox(height: 18), FeatureCard(icon: Icons.auto_awesome, title: s.t('stories'), subtitle: s.t('findYourNextStory'), onTap: () => _open(c, const ReaderHubScreen())), FeatureCard(icon: Icons.groups_outlined, title: s.t('followAuthor'), subtitle: s.t('profile'), onTap: () => _open(c, const ProfileScreen()))]); }
}

class CreateScreen extends StatelessWidget {
  const CreateScreen({super.key});
  @override Widget build(BuildContext c) { final s = KvLocalizations.of(c); return ListView(padding: const EdgeInsets.all(16), children: [Text(s.t('write'), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), const SizedBox(height: 8), Text(s.t('studioBuildPreview')), const SizedBox(height: 16), FeatureCard(icon: Icons.edit_note, title: s.t('storyStudio'), subtitle: s.t('aiWriter'), onTap: () => _open(c, const StoryStudioScreen())), FeatureCard(icon: Icons.auto_awesome, title: s.t('comicStudio'), subtitle: s.t('comicAiPanels'), onTap: () => _open(c, const ComicStudioScreen())), FeatureCard(icon: Icons.mic, title: s.t('fmStudio'), subtitle: s.t('audioAiPacing'), onTap: () => _open(c, const AudioStudioScreen())), FeatureCard(icon: Icons.movie_creation_outlined, title: s.t('reelStudio'), subtitle: s.t('aiStoryboard'), onTap: () => _open(c, const ReelStudioScreen())), FeatureCard(icon: Icons.account_balance_wallet_outlined, title: s.t('subscriptionBilling'), subtitle: s.t('internalPayment'), onTap: () => _open(c, const PaymentScreen()))]); }
}

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});
  @override Widget build(BuildContext c) { final s = KvLocalizations.of(c); return ListView(padding: const EdgeInsets.all(16), children: [Text(s.t('notifications'), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), const SizedBox(height: 12), FeatureCard(icon: Icons.support_agent, title: s.t('help'), subtitle: s.t('supportHistory'), onTap: () => _open(c, const HelpScreen())), FeatureCard(icon: Icons.settings_outlined, title: s.t('saveNotificationSettings'), subtitle: s.t('notificationDeliveryHelp'), onTap: () => _open(c, const SettingsScreen()))]); }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override State<ProfileScreen> createState()=>_ProfileScreenState();
}
class _ProfileScreenState extends State<ProfileScreen> {
  final api=KvAccountApi(); bool loading=true; String? error; Map<String,dynamic>? profile;
  @override void initState(){super.initState();_load();}
  Future<void> _load() async {try{final r=await api.profile();if(mounted)setState(()=>profile=Map<String,dynamic>.from(r['profile'] as Map));}catch(e){if(mounted)setState(()=>error=e.toString());}finally{if(mounted)setState(()=>loading=false);}}
  @override Widget build(BuildContext c) { final s=KvLocalizations.of(c); final p=profile??const <String,dynamic>{}; final followers=Number.tryParse('${p['followers']??0}')?.toInt()??0; final following=Number.tryParse('${p['following']??0}')?.toInt()??0; return ListView(padding:const EdgeInsets.all(16),children:[const CircleAvatar(radius:42,backgroundColor:Color(0xFFE8DDFF),child:Icon(Icons.person,size:42,color:kvPurple)),const SizedBox(height:12),Center(child:Text('${p['profileName']??p['username']??s.t('profileAccount')}',style:const TextStyle(fontSize:22,fontWeight:FontWeight.w800))),const SizedBox(height:8),Center(child:Text('${s.t('followers')}: $followers  •  ${s.t('following')}: $following')),if(error!=null) Padding(padding:const EdgeInsets.only(top:8),child:Text(error!)),const SizedBox(height:16),FeatureCard(icon:Icons.library_books_outlined,title:s.t('library'),subtitle:s.t('yourLibrary'),onTap:()=>_open(c,const ReaderHubScreen())),FeatureCard(icon:Icons.monetization_on_outlined,title:s.t('coins'),subtitle:s.t('coinBalance'),onTap:()=>_open(c,const PaymentScreen())),FeatureCard(icon:Icons.settings_outlined,title:s.t('settings'),subtitle:s.t('profileSettings'),onTap:()=>_open(c,const SettingsScreen())),FeatureCard(icon:Icons.help_outline,title:s.t('help'),subtitle:s.t('supportHistory'),onTap:()=>_open(c,const HelpScreen())),FeatureCard(icon:Icons.sync,title:s.t('profileAccount'),subtitle:s.t('profileAccount'),onTap:loading?null:_load),if((p['role']=='admin'||p['role']=='master_admin')) FeatureCard(icon:Icons.admin_panel_settings,title:s.t('adminRole'),subtitle:s.t('delegatedRightsStatus'),onTap:()=>_open(c,const AdminDashboardScreen())),FeatureCard(icon:Icons.forum_outlined,title:s.t('messages'),subtitle:s.t('supportHistory'),onTap:()=>_open(c,const SocialSyncScreen())),FeatureCard(icon:Icons.logout,title:s.t('logout'),subtitle:s.t('loginAgainAfterReset'),onTap:()=>KvMobileSession.logout())]); }
}

class AdminDashboardScreen extends StatefulWidget { const AdminDashboardScreen({super.key}); @override State<AdminDashboardScreen> createState()=>_AdminDashboardScreenState(); }
class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final api=KvAdminApi(); bool busy=true; String? error; Map<String,dynamic> profile={}; Map<String,dynamic> dashboard={};
  @override void initState(){super.initState();_load();}
  Future<void> _load() async {try{final r=await Future.wait([api.profile(),api.dashboard()]);if(!mounted)return;setState((){profile=Map<String,dynamic>.from(r[0]['profile'] as Map? ?? const {});dashboard=Map<String,dynamic>.from(r[1]);error=null;});}catch(e){if(mounted)setState(()=>error=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);final summary=Map<String,dynamic>.from(dashboard['summary'] as Map? ?? const {});final rights=List<dynamic>.from(dashboard['rights'] as List? ?? const []);return _StudioScaffold(title:s.t('adminRole'),children:[Card(child:ListTile(leading:const Icon(Icons.admin_panel_settings),title:Text('${profile['name']??profile['username']??s.t('adminRole')}'),subtitle:Text('${s.t('adminRole')}: ${profile['role']??'admin'}'))),Card(child:ListTile(title:Text(s.t('adminUsers')),trailing:Text('${summary['users']??0}'))),Card(child:ListTile(title:Text(s.t('adminContent')),trailing:Text('${summary['content']??0}'))),Text(s.t('delegatedRightsStatus'),style:const TextStyle(fontWeight:FontWeight.w800)),const SizedBox(height:8),for(final r in rights)ListTile(leading:const Icon(Icons.verified_user_outlined),title:Text('${r is Map ? (r['permission']??'') : r}')),if(error!=null)Text(error!),OutlinedButton.icon(onPressed:busy?null:_load,icon:const Icon(Icons.sync),label:Text(s.t('preview')))]);}
}

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});
  @override State<HelpScreen> createState()=>_HelpScreenState();
}
class _HelpScreenState extends State<HelpScreen> {
  final identifier=TextEditingController(), problem=TextEditingController(), ticketNumber=TextEditingController(), comment=TextEditingController();
  bool busy=false; String result='';
  @override void dispose(){identifier.dispose();problem.dispose();ticketNumber.dispose();comment.dispose();super.dispose();}
  Future<void> _create() async {
    final s=KvLocalizations.of(context); if(problem.text.trim().length<5){setState(()=>result=s.t('supportProblem'));return;}
    if(!KvMobileSession.authenticated&&identifier.text.trim().isEmpty){setState(()=>result=s.t('ui_registered_email_mobile'));return;}
    setState(()=>busy=true);
    try{final api=KvHelpApi();final r=KvMobileSession.authenticated?await api.authenticatedCreate(problem.text.trim()):await api.publicCreate(identifier.text.trim(),problem.text.trim(),s.code);final t=Map<String,dynamic>.from(r['ticket'] as Map);ticketNumber.text='${t['id']??''}';if(!KvMobileSession.authenticated){}setState(()=>result='${t['id']??''} · ${t['status']??''}');}catch(e){setState(()=>result=e.toString());}finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void> _track() async {setState(()=>busy=true);try{final r=await KvHelpApi().track(ticketNumber.text.trim(),identifier.text.trim());final t=Map<String,dynamic>.from(r['ticket'] as Map);setState(()=>result='${t['id']??''} · ${t['status']??''} · ${t['problem']??''}');}catch(e){setState(()=>result=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _comment() async {setState(()=>busy=true);try{final api=KvHelpApi();final r=KvMobileSession.authenticated?await api.authenticatedComment(ticketNumber.text.trim(),comment.text.trim()):await api.publicComment(ticketNumber.text.trim(),identifier.text.trim(),comment.text.trim());final t=Map<String,dynamic>.from(r['ticket'] as Map);comment.clear();setState(()=>result='${t['id']??''} · ${safelyCount(t['comments'])} comments');}catch(e){setState(()=>result=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
  int safelyCount(dynamic v)=>v is List?v.length:0;
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);final authed=KvMobileSession.authenticated;return _StudioScaffold(title:s.t('help'),children:[StudioHeader(s.t('help'),s.t('supportThreeLayers')),if(!authed)Text(s.t('ui_public_help_covers_account_creation_otp_verification_failure_otp_not_r')),if(!authed)TextField(controller:identifier,decoration:InputDecoration(labelText:s.t('ui_registered_email_mobile'),border:const OutlineInputBorder())),const SizedBox(height:10),TextField(controller:problem,maxLines:5,decoration:InputDecoration(labelText:s.t('supportProblem'),border:const OutlineInputBorder())),const SizedBox(height:10),FilledButton.icon(onPressed:busy?null:_create,icon:const Icon(Icons.support_agent),label:Text(s.t('supportCreate'))),const SizedBox(height:18),TextField(controller:ticketNumber,decoration:InputDecoration(labelText:s.t('ui_track_ticket_number'),border:const OutlineInputBorder())),if(!authed)Padding(padding:const EdgeInsets.only(top:10),child:TextField(controller:identifier,decoration:InputDecoration(labelText:s.t('ui_registered_email_mobile'),border:const OutlineInputBorder()))),const SizedBox(height:10),OutlinedButton(onPressed:busy?null:_track,child:Text(s.t('ui_track_ticket'))),const SizedBox(height:10),TextField(controller:comment,maxLines:4,decoration:InputDecoration(labelText:s.t('comment'),border:const OutlineInputBorder())),const SizedBox(height:10),OutlinedButton(onPressed:busy?null:_comment,child:Text(s.t('comment'))),if(result.isNotEmpty)Padding(padding:const EdgeInsets.only(top:12),child:Text(result)),]);}
}

class SocialSyncScreen extends StatefulWidget { const SocialSyncScreen({super.key}); @override State<SocialSyncScreen> createState()=>_SocialSyncScreenState(); }
class _SocialSyncScreenState extends State<SocialSyncScreen> {
  final api=KvSocialApi(); bool busy=true; String? error; Map<String,dynamic> profile={}; List<dynamic> messages=[]; Map<String,dynamic> subscriptions={};
  @override void initState(){super.initState();_load();}
  Future<void> _load() async {try{final r=await Future.wait([api.profile(),api.messages(),api.subscriptions()]);if(!mounted)return;setState((){profile=Map<String,dynamic>.from(r[0]['profile'] as Map? ?? const {});messages=List<dynamic>.from(r[1]['messages'] as List? ?? const []);subscriptions=Map<String,dynamic>.from(r[2]['subscriptions'] as Map? ?? const {});error=null;});}catch(e){if(mounted)setState(()=>error=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);final active=subscriptions.entries.where((e)=>e.value==true).map((e)=>e.key).join(', ');return _StudioScaffold(title:s.t('messages'),children:[Card(child:ListTile(leading:const Icon(Icons.groups),title:Text(s.t('followers') + ': ' + '${profile['followers']??0}'),subtitle:Text(s.t('following') + ': ' + '${profile['following']??0}'))),Card(child:ListTile(leading:const Icon(Icons.card_membership),title:Text(s.t('subscriptionBilling')),subtitle:Text(active.isEmpty?s.t('loginRequiredForPayment'):active))),Card(child:ListTile(leading:const Icon(Icons.forum),title:Text(s.t('messages')),subtitle:Text(messages.length.toString()))),for(final m in messages.take(20))ListTile(title:Text((m['body']??'').toString()),subtitle:Text((m['from']??'').toString() + ' → ' + (m['to']??'').toString())),if(error!=null)Text(error!),OutlinedButton.icon(onPressed:busy?null:_load,icon:const Icon(Icons.sync),label:Text(s.t('preview')))]);}
}

class ReaderHubScreen extends StatelessWidget { const ReaderHubScreen({super.key}); @override Widget build(BuildContext c) { final s=KvLocalizations.of(c); return _StudioScaffold(title:s.t('reader'), children:[FeatureCard(icon:Icons.menu_book,title:s.t('storyNovel'),subtitle:s.t('readStory'),onTap:()=>_open(c,const ReaderDetailScreen(format:'story'))),FeatureCard(icon:Icons.auto_awesome,title:s.t('comicReader'),subtitle:s.t('readComic'),onTap:()=>_open(c,const ReaderDetailScreen(format:'comic'))),FeatureCard(icon:Icons.headphones,title:s.t('audioReader'),subtitle:s.t('audio'),onTap:()=>_open(c,const ReaderDetailScreen(format:'audio'))),FeatureCard(icon:Icons.movie,title:s.t('reelReader'),subtitle:s.t('reel'),onTap:()=>_open(c,const ReaderDetailScreen(format:'reel')))]); } }

class ReaderDetailScreen extends StatefulWidget { final String format; const ReaderDetailScreen({super.key,required this.format}); @override State<ReaderDetailScreen> createState()=>_ReaderDetailScreenState(); }
class _ReaderDetailScreenState extends State<ReaderDetailScreen> { double progress=0.0; bool bookmarked=false; bool syncing=false; final api=KvReaderApi();
  @override void initState(){super.initState();_load();}
  Future<void> _load() async {try{final r=await api.state(format:widget.format);final st=Map<String,dynamic>.from(r['state'] as Map? ?? const {});if(mounted)setState((){progress=(double.tryParse('${st['progress']??0}')??0).clamp(0.0,1.0);bookmarked=st['bookmarked']==true;});}catch(_){} }
  Future<void> _save() async {setState(()=>syncing=true);try{await api.save(format:widget.format,progress:progress,bookmarked:bookmarked);}catch(_){}finally{if(mounted)setState(()=>syncing=false);}}
  @override Widget build(BuildContext c) { final s=KvLocalizations.of(c); final title=s.t(widget.format=='story'?'storyNovel':widget.format=='comic'?'comicReader':widget.format=='audio'?'audioReader':'reelReader'); return Scaffold(appBar:AppBar(title:Text(title),actions:[IconButton(onPressed:syncing?null:(){setState(()=>bookmarked=!bookmarked);_save();},icon:Icon(bookmarked?Icons.bookmark:Icons.bookmark_border))]),body:ListView(padding:const EdgeInsets.all(16),children:[Card(child:Padding(padding:const EdgeInsets.all(18),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:24,fontWeight:FontWeight.w800)),const SizedBox(height:12),Text(s.t('continueReading')),const SizedBox(height:8),LinearProgressIndicator(value:progress),const SizedBox(height:8),Text((progress*100).round().toString() + '%'),const SizedBox(height:16),FilledButton.icon(onPressed:syncing?null:(){setState(()=>progress=(progress+0.1).clamp(0.0,1.0));_save();},icon:const Icon(Icons.play_arrow),label:Text(s.t('continueReading'))),const SizedBox(height:8),OutlinedButton.icon(onPressed:syncing?null:(){setState(()=>progress=0.0);_save();},icon:const Icon(Icons.restart_alt),label:Text(s.t('reader')))])))]); } }

class StoryStudioScreen extends StatelessWidget { const StoryStudioScreen({super.key}); @override Widget build(BuildContext c) { final s=KvLocalizations.of(c); return StoryStudioEditor(t:s.t, language:s.code); } }
class ComicStudioScreen extends StatefulWidget {
  const ComicStudioScreen({super.key});
  @override State<ComicStudioScreen> createState() => _ComicStudioScreenState();
}

class _ComicStudioScreenState extends State<ComicStudioScreen> {
  final title=TextEditingController(text:'');
  final character=TextEditingController();
  final dialogue=TextEditingController();
  final background=TextEditingController();
  final prompt=TextEditingController();
  final api=KvComicApi();
  final List<KvComicPanel> panels=[];
  String? projectId;
  bool busy=false;
  String stateKey='storyDraftLocal';
  int selected=1;
  @override void dispose(){title.dispose();character.dispose();dialogue.dispose();background.dispose();prompt.dispose();super.dispose();}
  Future<void> _ensureProject(KvStrings s) async {
    if(projectId!=null) return;
    final value=title.text.trim().isEmpty?s.t('comicStudio'):title.text.trim();
    projectId=await api.createProject(value,s.code);
  }
  void _load(KvComicPanel p){selected=p.panelNumber;character.text=p.character;dialogue.text=p.dialogue;background.text=p.background;}
  Future<void> _save(KvStrings s) async {
    setState(()=>busy=true);
    try{
      await _ensureProject(s);
      final saved=await api.savePanel(projectId!,KvComicPanel(panelNumber:selected,character:character.text,dialogue:dialogue.text,background:background.text));
      final i=panels.indexWhere((x)=>x.panelNumber==saved.panelNumber);
      if(i>=0) panels[i]=saved; else panels.add(saved);
      panels.sort((a,b)=>a.panelNumber.compareTo(b.panelNumber));
      if(mounted)setState(()=>stateKey='storySavedServer');
    }catch(_){if(mounted)setState(()=>stateKey='storySessionRequired');}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void> _ai(KvStrings s) async {
    final text=prompt.text.trim(); if(text.isEmpty)return;
    setState(()=>busy=true);
    try{
      final r=await api.aiPlan(text,s.code);
      final list=(r['panels'] as List? ?? const []);
      if(!mounted)return;
      await showDialog(context:context,builder:(c)=>AlertDialog(title:Text(s.t('comicAiPanels')),content:SizedBox(width:520,child:ListView(shrinkWrap:true,children:[for(final item in list) Text('${item is Map ? (item['panel']??item['scene']??'') : item}') ])),actions:[TextButton(onPressed:()=>Navigator.pop(c),child:Text(s.t('cancel')))]));
    }catch(_){if(mounted)setState(()=>stateKey='storySessionRequired');}
    finally{if(mounted)setState(()=>busy=false);}
  }
  @override Widget build(BuildContext c){
    final s=KvLocalizations.of(c);
    return Scaffold(appBar:AppBar(title:Text(s.t('comicStudio')),actions:[IconButton(onPressed:busy?null:()=>_save(s),icon:const Icon(Icons.save_outlined))]),body:ListView(padding:const EdgeInsets.all(16),children:[
      TextField(controller:title,decoration:InputDecoration(labelText:s.t('storyTitle'))),const SizedBox(height:10),
      TextField(controller:prompt,maxLines:3,decoration:InputDecoration(labelText:s.t('storyboard'),hintText:s.t('comicAiPanels'))),const SizedBox(height:8),
      FilledButton.icon(onPressed:busy?null:()=>_ai(s),icon:const Icon(Icons.auto_awesome),label:Text(s.t('comicAiPanels'))),const SizedBox(height:16),
      Wrap(spacing:8,children:[for(int i=1;i<=(panels.length+1);i++)ChoiceChip(label:Text(i.toString()),selected:selected==i,onSelected:(_){setState(()=>selected=i);final found=panels.where((p)=>p.panelNumber==i).toList();if(found.isNotEmpty)_load(found.first);})]),const SizedBox(height:12),
      TextField(controller:character,decoration:InputDecoration(labelText:s.t('character'))),const SizedBox(height:10),
      TextField(controller:dialogue,maxLines:3,decoration:InputDecoration(labelText:s.t('dialogue'))),const SizedBox(height:10),
      TextField(controller:background,maxLines:2,decoration:InputDecoration(labelText:s.t('background'))),const SizedBox(height:12),
      FilledButton.icon(onPressed:busy?null:()=>_save(s),icon:const Icon(Icons.save),label:Text(s.t('save'))),const SizedBox(height:8),
      Chip(label:Text(s.t(stateKey))),const SizedBox(height:12),
      if(panels.isNotEmpty) ...[Text(s.t('storyboard'),style:const TextStyle(fontWeight:FontWeight.w800)),for(final p in panels)ListTile(selected:p.panelNumber==selected,title:Text('${s.t('storyChapter')} ${p.panelNumber}'),subtitle:Text(p.dialogue.isEmpty?p.character:p.dialogue),onTap:()=>setState(()=>_load(p)))],
      const SizedBox(height:12),PublishCard(s,onPublish: projectId==null?null:(r,m)=>api.publishProject('comic',projectId!,rightsConfirmed:r,mediaRightsConfirmed:m)),
    ]));
  }
}

class AudioStudioScreen extends StatefulWidget { const AudioStudioScreen({super.key}); @override State<AudioStudioScreen> createState()=>_AudioStudioScreenState(); }
class _AudioStudioScreenState extends State<AudioStudioScreen> {
  final title=TextEditingController(); final script=TextEditingController(); final api=KvAudioApi(); String? projectId; int segmentNumber=1; bool saving=false; bool recording=false; String statusKey='save'; List<KvAudioSegment> segments=[];
  @override void dispose(){title.dispose();script.dispose();super.dispose();}
  Future<void> _load(KvStrings s) async { if(projectId==null)return; setState(()=>saving=true); try{final rows=await api.loadSegments(projectId!);if(mounted)setState(()=>segments=rows);}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>saving=false);}}
  Future<void> _save(KvStrings s) async { setState(()=>saving=true); try { projectId ??= await api.createProject(title.text.trim().isEmpty?s.t('fmStudio'):title.text.trim(),s.code); final saved=await api.saveSegment(projectId!,KvAudioSegment(segmentNumber:segmentNumber,title:title.text.trim().isEmpty?s.t('narration'):title.text.trim(),script:script.text)); if(mounted)setState(()=>segments=[...segments.where((x)=>x.segmentNumber!=saved.segmentNumber),saved]..sort((a,b)=>a.segmentNumber.compareTo(b.segmentNumber))); } catch(e){ if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString()))); } finally { if(mounted)setState(()=>saving=false); } }
  Future<void> _record(KvStrings s) async {
    if (recording) return;
    final allowed = await KvNativePermissionGateway.request(KvPermission.microphone);
    if (!allowed && mounted) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('microphone')))); return; }
    projectId ??= await api.createProject(title.text.trim().isEmpty?s.t('fmStudio'):title.text.trim(),s.code);
    final started = await KvNativeFmGateway.startRecording();
    if (mounted) setState(() { recording=started; statusKey=started ? 'recording' : 'audio'; });
    if (!started && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('audio'))));
  }
  Future<void> _pauseRecording(KvStrings s) async {
    if (!recording) return;
    final ok=await KvNativeFmGateway.pauseRecording();
    if (ok && mounted) setState(()=>statusKey='audio');
  }
  Future<void> _resumeRecording(KvStrings s) async {
    if (!recording) return;
    final ok=await KvNativeFmGateway.resumeRecording();
    if (ok && mounted) setState(()=>statusKey='recording');
  }
  Future<void> _renderMix(KvStrings s) async {
    final ids=segments.map((x)=>x.audioAssetId).whereType<String>().where((x)=>x.isNotEmpty).toList();
    if(ids.isEmpty){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('audio'))));return;}
    setState(()=>saving=true);
    try {
      final r=await api.renderMix(ids);
      if(mounted)showDialog(context:context,builder:(_)=>AlertDialog(title:Text(s.t('renderMix')),content:Text('${r['asset']??''}'),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:Text(s.t('cancel')))]));
    } catch(e) { if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString()))); }
    finally { if(mounted)setState(()=>saving=false); }
  }
  Future<void> _stopRecording(KvStrings s) async {
    if (!recording) return;
    setState(()=>saving=true);
    try {
      final result = await KvNativeFmGateway.stopRecording();
      if (result==null) throw StateError('native_recording_stop_unavailable');
      String? assetId=result['assetId']?.toString();
      final localPath=(result['localPath']??result['filePath'])?.toString();
      if ((assetId==null||assetId.isEmpty) && localPath!=null && localPath.isNotEmpty) assetId=await api.uploadRecordedFile(localPath,mimeType:result['mimeType']?.toString()??'audio/wav');
      if (assetId!=null && assetId.isNotEmpty && projectId!=null) {
        final saved=await api.saveSegment(projectId!,KvAudioSegment(segmentNumber:segmentNumber,title:title.text.trim().isEmpty?s.t('narration'):title.text.trim(),script:script.text,audioAssetId:assetId));
        if(mounted)setState(()=>segments=[...segments.where((x)=>x.segmentNumber!=saved.segmentNumber),saved]..sort((a,b)=>a.segmentNumber.compareTo(b.segmentNumber)));
      }
      if(mounted)setState(()=>statusKey='save');
    } catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString()))); }
    finally { if(mounted)setState(()=>{recording=false;saving=false;}); }
  }
  @override Widget build(BuildContext c){ final s=KvLocalizations.of(c); return _StudioScaffold(title:s.t('fmStudio'),children:[StudioHeader(s.t('audio'),s.t('audioSmartDescription')),
    Container(height:96,decoration:BoxDecoration(borderRadius:BorderRadius.circular(12),border:Border.all()),child:CustomPaint(painter:KvWaveformPainter(const [0.05,0.18,0.32,0.22,0.48,0.72,0.54,0.31,0.62,0.41,0.19,0.37,0.66,0.83,0.58,0.27,0.12]))),
    const SizedBox(height:12),TextField(controller:title,decoration:InputDecoration(labelText:s.t('narration'),border:const OutlineInputBorder())),const SizedBox(height:12),TextField(controller:script,maxLines:8,decoration:InputDecoration(labelText:s.t('narration'),border:const OutlineInputBorder())),const SizedBox(height:12),Wrap(spacing:8,runSpacing:8,children:[FilledButton.icon(onPressed:saving?null:()=>_record(s),icon:const Icon(Icons.mic),label:Text(s.t('microphone'))),OutlinedButton.icon(onPressed:!recording||saving?null:()=>_pauseRecording(s),icon:const Icon(Icons.pause),label:Text(s.t('audio'))),OutlinedButton.icon(onPressed:!recording||saving?null:()=>_resumeRecording(s),icon:const Icon(Icons.play_arrow),label:Text(s.t('audio'))),FilledButton.icon(onPressed:!recording||saving?null:()=>_stopRecording(s),icon:const Icon(Icons.stop),label:Text(s.t('save'))),FilledButton.icon(onPressed:saving?null:()=>_save(s),icon:const Icon(Icons.save_outlined),label:Text(s.t('save'))),OutlinedButton.icon(onPressed:projectId==null||saving?null:()=>_load(s),icon:const Icon(Icons.refresh),label:Text(s.t('preview'))),OutlinedButton.icon(onPressed:projectId==null||saving?null:()=>_renderMix(s),icon:const Icon(Icons.library_music),label:Text(s.t('renderMix'))),OutlinedButton.icon(onPressed:projectId==null||saving?null:()=>setState(()=>segmentNumber++),icon:const Icon(Icons.add),label:Text(s.t('save')))]),const SizedBox(height:16),if(segments.isNotEmpty)...[Text(s.t('timeline'),style:const TextStyle(fontWeight:FontWeight.w800)),for(final seg in segments)ListTile(title:Text(seg.title),subtitle:Text(seg.script))],const SizedBox(height:8),PublishCard(s,onPublish: projectId==null?null:(r,m)=>api.publishProject(projectId!,rightsConfirmed:r,mediaRightsConfirmed:m))]); }
}
class KvWaveformPainter extends CustomPainter {
  final List<double> samples;
  const KvWaveformPainter(this.samples);
  @override void paint(Canvas canvas, Size size) {
    final paint=Paint()..style=PaintingStyle.stroke..strokeWidth=2;
    final mid=size.height/2;
    if(samples.isEmpty)return;
    final dx=size.width/(samples.length-1);
    final path=Path()..moveTo(0,mid);
    for(var i=0;i<samples.length;i++){ final amp=samples[i].clamp(0.0,1.0)*mid*0.9; path.lineTo(i*dx,mid-amp); }
    for(var i=samples.length-1;i>=0;i--){ final amp=samples[i].clamp(0.0,1.0)*mid*0.9; path.lineTo(i*dx,mid+amp); }
    path.close(); canvas.drawPath(path,paint);
  }
  @override bool shouldRepaint(covariant KvWaveformPainter oldDelegate)=>oldDelegate.samples!=samples;
}

class ReelStudioScreen extends StatefulWidget { const ReelStudioScreen({super.key}); @override State<ReelStudioScreen> createState()=>_ReelStudioScreenState(); }
class _ReelStudioScreenState extends State<ReelStudioScreen> {
  final api=KvReelApi(); final title=TextEditingController(); final prompt=TextEditingController(); final asset=TextEditingController(); final caption=TextEditingController(); final duration=TextEditingController(text:'5');
  String? projectId; List<KvReelClip> clips=[]; bool busy=false; String statusKey='save'; int fps=30; String resolution='720x1280';
  @override void dispose(){title.dispose();prompt.dispose();asset.dispose();caption.dispose();duration.dispose();super.dispose();}
  Future<void> _create(KvStrings s) async { if(projectId!=null)return; setState(()=>busy=true); try{projectId=await api.createProject(title.text.trim().isEmpty?s.t('reelStudio'):title.text.trim(),s.code); if(mounted)setState(()=>statusKey='save');}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _load(KvStrings s) async { if(projectId==null)return; setState(()=>busy=true); try{final rows=await api.loadClips(projectId!);if(mounted)setState(()=>clips=rows);}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _saveClip(KvStrings s) async { if(asset.text.trim().isEmpty){ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('videoUploadHint'))));return;} await _create(s); setState(()=>busy=true); try{final c=await api.saveClip(projectId!,KvReelClip(assetId:asset.text.trim(),duration:double.tryParse(duration.text)||5,caption:caption.text.trim(),scene:prompt.text.trim(),order:clips.length+1));if(mounted)setState(()=>clips=[...clips,c]);}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _ai(KvStrings s) async {if(prompt.text.trim().length<3){ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('storyboard'))));return;}setState(()=>busy=true);try{final r=await api.storyboard(prompt.text.trim(),s.code);final scenes=(r['scenes'] as List? ?? const[]);if(mounted)showDialog(context:context,builder:(_)=>AlertDialog(title:Text(s.t('aiReel')),content:SizedBox(width:420,height:320,child:ListView(children:[for(final x in scenes)ListTile(title:Text('${x['scene']??''}'),subtitle:Text('${x['visual']??''}'))])),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:Text(s.t('cancel')))]));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _render(KvStrings s) async {if(clips.isEmpty){ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('addClipPrompt'))));return;}setState(()=>busy=true);try{final r=await api.render(clips,fps:fps,resolution:resolution);if(mounted)showDialog(context:context,builder:(_)=>AlertDialog(title:Text(s.t('renderMix')),content:Text('${r['asset']??r['renderProfile']??''}'),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:Text(s.t('cancel')))]));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);return _StudioScaffold(title:s.t('reelStudio'),children:[StudioHeader(s.t('aiReel'),s.t('reelSmartDescription')),TextField(controller:title,decoration:InputDecoration(labelText:s.t('storyTitle'),border:const OutlineInputBorder())),const SizedBox(height:10),TextField(controller:prompt,maxLines:3,decoration:InputDecoration(labelText:s.t('storyboard'),hintText:s.t('videoUploadHint'),border:const OutlineInputBorder())),const SizedBox(height:10),Row(children:[Expanded(child:TextField(controller:asset,decoration:InputDecoration(labelText:s.t('videoUploadHint'),border:const OutlineInputBorder()))),const SizedBox(width:8),SizedBox(width:110,child:TextField(controller:duration,keyboardType:TextInputType.number,decoration:InputDecoration(labelText:s.t('duration'),border:const OutlineInputBorder()))) ]),const SizedBox(height:10),TextField(controller:caption,decoration:InputDecoration(labelText:s.t('captions'),border:const OutlineInputBorder())),const SizedBox(height:12),Wrap(spacing:8,runSpacing:8,children:[FilledButton.icon(onPressed:busy?null:()=>_saveClip(s),icon:const Icon(Icons.add_to_photos),label:Text(s.t('save'))),OutlinedButton.icon(onPressed:busy?null:()=>_ai(s),icon:const Icon(Icons.auto_awesome),label:Text(s.t('aiReel'))),OutlinedButton.icon(onPressed:busy?null:()=>_load(s),icon:const Icon(Icons.refresh),label:Text(s.t('preview'))),FilledButton.icon(onPressed:busy?null:()=>_render(s),icon:const Icon(Icons.movie_filter),label:Text(s.t('renderMix')))]),const SizedBox(height:14),Text('${s.t('timeline')}: ${clips.length}',style:const TextStyle(fontWeight:FontWeight.w800)),for(final clip in clips)ListTile(title:Text(s.t('reelClip')),subtitle:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(clip.scene.isEmpty?clip.assetId:clip.scene),Text(clip.caption),Text(clip.duration.toStringAsFixed(1))])),const SizedBox(height:12),PublishCard(s,onPublish: projectId==null?null:(r,m)=>api.publishProject('reel',projectId!,rightsConfirmed:r,mediaRightsConfirmed:m))]); }
}

class PaymentScreen extends StatefulWidget { const PaymentScreen({super.key}); @override State<PaymentScreen> createState()=>_PaymentScreenState(); }
class _PaymentScreenState extends State<PaymentScreen> {
  final api=KvAccountApi(); bool busy=true; String? error; int coins=0; Map<String,dynamic> subscriptions={}; List<dynamic> plans=[];
  @override void initState(){super.initState();_load();}
  Future<void> _load() async { try { final results=await Future.wait([api.coins(),api.subscriptions(),api.catalog()]); if(!mounted)return; final policy=Map<String,dynamic>.from(results[2]['policy'] as Map? ?? const {}); setState(() { coins=int.tryParse('${results[0]['coins']??0}')??0; subscriptions=Map<String,dynamic>.from(results[1]['subscriptions'] as Map? ?? const {}); plans=List<dynamic>.from(policy['subscriptions'] as List? ?? const []); error=null; }); } catch(e){if(mounted)setState(()=>error=e.toString());} finally {if(mounted)setState(()=>busy=false);} }
  Future<String?> _paymentToken(String action,String reference,double amount,KvStrings s) async { final start=await api.startPaymentOtp(action,reference,amount); final token=String(start['paymentToken']??''); if(token.isEmpty)return null; if(start['demoOtp']!=null)return token; if(!mounted)return null; final controller=TextEditingController(); final otp=await showDialog<String>(context:context,builder:(ctx)=>AlertDialog(title:Text(s.t('subscriptionBilling')),content:TextField(controller:controller,keyboardType:TextInputType.number,decoration:InputDecoration(labelText:s.t('otp'))),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:Text(s.t('cancel'))),FilledButton(onPressed:()=>Navigator.pop(ctx,controller.text.trim()),child:Text(s.t('save')))])); controller.dispose(); if(otp==null||otp.isEmpty)return null; await api.verifyPaymentOtp(token,otp); return token; }
  Future<void> _purchase(Map<String,dynamic> plan, KvStrings s) async { final id=String(plan['id']??''); if(id.isEmpty)return; setState(()=>busy=true); try { final amount=(double.tryParse('${plan['price']??0}')??0); final token=amount>0?await _paymentToken('subscription',id,amount,s):null; if(amount>0&&token==null)throw StateError('payment_verification_required'); final r=await api.purchaseSubscription(id,paymentToken:token); if(mounted){ ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(r['ok']==true?s.t('save'):s.t('loginRequiredForPayment')))); await _load(); } } catch(e){ if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString()))); } finally { if(mounted)setState(()=>busy=false); } }
  Future<void> _buyCoins(int coins,double amount,KvStrings s) async { setState(()=>busy=true); try { final token=await _paymentToken('coin_purchase',coins.toString(),amount,s); if(token==null)throw StateError('payment_verification_required'); final r=await api.purchaseCoins(coins,paymentToken:token); if(mounted){ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(r['ok']==true?s.t('save'):s.t('loginRequiredForPayment'))));await _load();}}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);return _StudioScaffold(title:s.t('accountPayments'),children:[
    Card(child:ListTile(leading:const Icon(Icons.monetization_on),title:Text(s.t('coinCenter')),subtitle:Text(coins.toString()),trailing:IconButton(onPressed:busy?null:_load,icon:const Icon(Icons.refresh)))),
    Card(child:ListTile(leading:const Icon(Icons.card_membership),title:Text(s.t('subscriptionBilling')),subtitle:Text(subscriptions.entries.where((e)=>e.value==true).map((e)=>e.key).join(', ')))),
    if(error!=null) Text(error!,style:const TextStyle(fontWeight:FontWeight.w600)),
    for(final p in plans) Card(child:ListTile(title:Text('${p['label']??p['id']??''}'),subtitle:Text('₹${p['price']??0} · ${p['durationDays']??0}'),trailing:FilledButton(onPressed:busy?null:()=>_purchase(Map<String,dynamic>.from(p as Map),s),child:Text(s.t('subscriptionBilling'))))),
    const SizedBox(height:8), Text(s.t('loginRequiredForPayment')), const SizedBox(height:12),
    OutlinedButton.icon(onPressed:busy?null:_load,icon:const Icon(Icons.sync),label:Text(s.t('preview'))),
  ]);}
}
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override State<SettingsScreen> createState()=>_SettingsScreenState();
}
class _SettingsScreenState extends State<SettingsScreen> {
  final account=KvAccountApi();
  final name=TextEditingController();
  final location=TextEditingController();
  bool inApp=true, web=true, email=true, comment=true, follow=true, author=true, busy=false;
  @override void initState(){super.initState();_load();}
  @override void dispose(){name.dispose();location.dispose();super.dispose();}
  Future<void> _load() async {
    try{
      final r=await Future.wait([account.profile(),account.notificationPreferences()]);
      final p=Map<String,dynamic>.from(r[0]['profile'] as Map? ?? const {});
      final n=Map<String,dynamic>.from(r[1]['preferences'] as Map? ?? const {});
      final ch=Map<String,dynamic>.from(n['channels'] as Map? ?? const {});
      final cats=Map<String,dynamic>.from(n['notifications'] as Map? ?? const {});
      if(!mounted)return;
      setState((){name.text=String(p['name']??'');location.text=String(p['location']??'');inApp=ch['in_app']!=false;web=ch['web']!=false;email=ch['email']!=false;comment=cats['comment']!=false;follow=cats['follow']!=false;author=cats['author']!=false;});
    }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}
  }
  Future<void> _saveProfile(KvStrings s) async {setState(()=>busy=true);try{await account.updateProfile({'name':name.text.trim(),'location':location.text.trim()});if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('save'))));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _saveNotifications(KvStrings s) async {setState(()=>busy=true);try{await account.updateNotificationPreferences({'channels':{'in_app':inApp,'web':web,'email':email},'notifications':{'comment':comment,'follow':follow,'author':author}});if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(s.t('save'))));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _help(KvStrings s) async {final c=TextEditingController();try{final q=await showDialog<String>(context:context,builder:(ctx)=>AlertDialog(title:Text(s.t('help')),content:TextField(controller:c,maxLines:5,decoration:InputDecoration(labelText:s.t('supportThreeLayers'))),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:Text(s.t('cancel'))),FilledButton(onPressed:()=>Navigator.pop(ctx,c.text.trim()),child:Text(s.t('save')))]));if(q==null||q.length<3)return;setState(()=>busy=true);final r=await KvHelpApi().authenticatedAi(q,s.code);if(mounted)showDialog(context:context,builder:(_)=>AlertDialog(title:Text(s.t('help')),content:SizedBox(width:420,child:SingleChildScrollView(child:Text(String(r['answer']??r['message']??r['messageKey']??'')))),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:Text(s.t('cancel')))]));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{c.dispose();if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c){final s=KvLocalizations.of(c);return _StudioScaffold(title:s.t('settings'),children:[
    FeatureCard(icon:Icons.language,title:s.t('selectLanguage'),subtitle:s.t('language'),onTap:()=>showDialog(context:c,builder:(_)=>LanguageDialog(onSelected:(l){kvLocaleNotifier.value=l;Navigator.pop(c);})) ),
    Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(s.t('profileSettings'),style:const TextStyle(fontSize:18,fontWeight:FontWeight.w700)),const SizedBox(height:12),TextField(controller:name,decoration:InputDecoration(labelText:s.t('name'),border:const OutlineInputBorder())),const SizedBox(height:10),TextField(controller:location,decoration:InputDecoration(labelText:s.t('location'),border:const OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>_saveProfile(s),child:Text(s.t('saveProfile')))]))),
    Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(s.t('notificationPreferences'),style:const TextStyle(fontSize:18,fontWeight:FontWeight.w700)),SwitchListTile(value:inApp,onChanged:busy?null:(v)=>setState(()=>inApp=v),title:Text(s.t('notifications')),contentPadding:EdgeInsets.zero),SwitchListTile(value:web,onChanged:busy?null:(v)=>setState(()=>web=v),title:Text(s.t('webNotification')),contentPadding:EdgeInsets.zero),SwitchListTile(value:email,onChanged:busy?null:(v)=>setState(()=>email=v),title:Text(s.t('email')),contentPadding:EdgeInsets.zero),SwitchListTile(value:comment,onChanged:busy?null:(v)=>setState(()=>comment=v),title:Text(s.t('comment')),contentPadding:EdgeInsets.zero),SwitchListTile(value:follow,onChanged:busy?null:(v)=>setState(()=>follow=v),title:Text(s.t('follows')),contentPadding:EdgeInsets.zero),SwitchListTile(value:author,onChanged:busy?null:(v)=>setState(()=>author=v),title:Text(s.t('creator')),contentPadding:EdgeInsets.zero),FilledButton(onPressed:busy?null:()=>_saveNotifications(s),child:Text(s.t('save')))]))),
    FeatureCard(icon:Icons.help,title:s.t('help'),subtitle:s.t('supportThreeLayers'),onTap:busy?null:()=>_help(s))
  ]);}
}

class _StudioScaffold extends StatelessWidget { final String title; final List<Widget> children; const _StudioScaffold({required this.title,required this.children}); @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:Text(title)),body:ListView(padding:const EdgeInsets.all(16),children:children)); }
class StudioHeader extends StatelessWidget { final String title,subtitle; const StudioHeader(this.title,this.subtitle,{super.key}); @override Widget build(BuildContext c)=>Container(margin:const EdgeInsets.only(bottom:16),padding:const EdgeInsets.all(18),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(18)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:24,fontWeight:FontWeight.w800)),const SizedBox(height:6),Text(subtitle)])); }
class PublishCard extends StatefulWidget {
  final KvStrings s;
  final Future<Map<String,dynamic>> Function(bool rightsConfirmed,bool mediaRightsConfirmed)? onPublish;
  const PublishCard(this.s,{super.key,this.onPublish});
  @override State<PublishCard> createState()=>_PublishCardState();
}
class _PublishCardState extends State<PublishCard> {
  bool busy=false, rights=false, mediaRights=false;
  @override Widget build(BuildContext c){final s=widget.s;final ready=rights&&mediaRights;return Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text(s.t('publishingReadiness'),style:const TextStyle(fontWeight:FontWeight.w800)),const SizedBox(height:8),Text(s.t('studioAdvisoryNote')),
    CheckboxListTile(contentPadding:EdgeInsets.zero,value:rights,onChanged:busy?null:(v)=>setState(()=>rights=v==true),title:Text(s.t('rights'))),
    CheckboxListTile(contentPadding:EdgeInsets.zero,value:mediaRights,onChanged:busy?null:(v)=>setState(()=>mediaRights=v==true),title:Text(s.t('mediaRights'))),
    const SizedBox(height:8),
    FilledButton.icon(onPressed:busy||!ready?null:() async {if(widget.onPublish==null)return;setState(()=>busy=true);try{final r=await widget.onPublish!(rights,mediaRights);if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(r['ok']==true?s.t('save'):(r['error']??s.t('publishingReadiness')).toString())));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}finally{if(mounted)setState(()=>busy=false);}},icon:Icon(busy?Icons.hourglass_top:Icons.publish),label:Text(s.t('publishingReadiness')))
  ])));}
}
class FeatureCard extends StatelessWidget { final IconData icon; final String title,subtitle; final VoidCallback onTap; const FeatureCard({super.key,required this.icon,required this.title,required this.subtitle,required this.onTap}); @override Widget build(BuildContext c)=>Card(margin:const EdgeInsets.only(bottom:10),elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16),side:const BorderSide(color:Color(0xFFE0D9E5))),child:ListTile(leading:CircleAvatar(backgroundColor:const Color(0xFFE8DDFF),child:Icon(icon,color:kvPurple)),title:Text(title,style:const TextStyle(fontWeight:FontWeight.w700)),subtitle:Text(subtitle),trailing:const Icon(Icons.chevron_right),onTap:onTap)); }
class _Hero extends StatelessWidget { final String title,subtitle; const _Hero(this.title,this.subtitle); @override Widget build(BuildContext c)=>Container(padding:const EdgeInsets.all(22),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(20),border:Border.all(color:const Color(0xFFCBC3D9))),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:28,fontWeight:FontWeight.w800)),const SizedBox(height:8),Text(subtitle)])); }
class SectionTitle extends StatelessWidget { final String title; const SectionTitle(this.title,{super.key}); @override Widget build(BuildContext c)=>Padding(padding:const EdgeInsets.only(top:16,bottom:10),child:Text(title,style:const TextStyle(fontSize:19,fontWeight:FontWeight.w700))); }
class LanguageDialog extends StatelessWidget { final void Function(Locale) onSelected; const LanguageDialog({super.key,required this.onSelected}); @override Widget build(BuildContext c){final s=KvLocalizations.of(c);return AlertDialog(title:Text(s.t('selectLanguage')),content:SizedBox(width:420,height:420,child:ListView(children:supportedLocales.map((l)=>ListTile(title:Text(l.languageCode.toUpperCase()),onTap:()=>onSelected(l))).toList())),actions:[TextButton(onPressed:()=>Navigator.pop(c),child:Text(s.t('cancel')))]);}}
void _open(BuildContext c, Widget page)=>Navigator.of(c).push(MaterialPageRoute(builder:(_)=>page));
