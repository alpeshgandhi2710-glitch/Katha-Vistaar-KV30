import 'dart:math' as math;
import 'package:flutter/services.dart';

enum KvPermission { notifications, camera, microphone, photos, files, location, nearbyDevices, contacts, calendar, phone, sms, biometric }

enum KvPermissionMode { automatic, userApproval }

class KvPermissionPolicy {
  static const Map<KvPermission, KvPermissionMode> mode = {
    KvPermission.notifications: KvPermissionMode.userApproval,
    KvPermission.camera: KvPermissionMode.userApproval,
    KvPermission.microphone: KvPermissionMode.userApproval,
    KvPermission.photos: KvPermissionMode.userApproval,
    KvPermission.files: KvPermissionMode.userApproval,
    KvPermission.location: KvPermissionMode.userApproval,
    KvPermission.nearbyDevices: KvPermissionMode.userApproval,
    KvPermission.contacts: KvPermissionMode.userApproval,
    KvPermission.calendar: KvPermissionMode.userApproval,
    KvPermission.phone: KvPermissionMode.userApproval,
    KvPermission.sms: KvPermissionMode.userApproval,
    KvPermission.biometric: KvPermissionMode.userApproval,
  };
  static const bool internetRequired = true;
  static const bool secureAppStorageRequired = true;
  static bool requiresApproval(KvPermission permission) => mode[permission] == KvPermissionMode.userApproval;
}

class KvPermissionRequest {
  const KvPermissionRequest(this.permission, this.reasonKey);
  final KvPermission permission;
  final String reasonKey;
}

class KvFmWaveform {
  const KvFmWaveform({required this.samples, required this.durationMs, required this.sampleRate});
  final List<double> samples;
  final int durationMs;
  final int sampleRate;

  List<double> get normalized => samples.map((v) => v.clamp(-1.0, 1.0).toDouble()).toList(growable: false);
}

class KvFmRecorderState {
  const KvFmRecorderState({this.recording = false, this.paused = false, this.positionMs = 0, this.take = 1});
  final bool recording;
  final bool paused;
  final int positionMs;
  final int take;

  KvFmRecorderState copyWith({bool? recording, bool? paused, int? positionMs, int? take}) => KvFmRecorderState(
    recording: recording ?? this.recording,
    paused: paused ?? this.paused,
    positionMs: positionMs ?? this.positionMs,
    take: take ?? this.take,
  );
}

class KvFmRecorderController {
  KvFmRecorderState state = const KvFmRecorderState();
  final List<KvFmWaveform> takes = [];

  void start() { state = state.copyWith(recording: true, paused: false); }
  void pause() { if (state.recording) state = state.copyWith(paused: true); }
  void resume() { if (state.recording) state = state.copyWith(paused: false); }
  KvFmWaveform stop({List<double> samples = const [], int durationMs = 0, int sampleRate = 48000}) {
    final waveform = KvFmWaveform(samples: samples, durationMs: math.max(0, durationMs), sampleRate: sampleRate);
    takes.add(waveform);
    state = state.copyWith(recording: false, paused: false, positionMs: 0, take: state.take + 1);
    return waveform;
  }

  KvFmWaveform trim(KvFmWaveform source, int startMs, int endMs) {
    final start = startMs.clamp(0, source.durationMs);
    final end = endMs.clamp(start, source.durationMs);
    if (source.samples.isEmpty || source.durationMs == 0) return KvFmWaveform(samples: const [], durationMs: end - start, sampleRate: source.sampleRate);
    final a = ((start / source.durationMs) * source.samples.length).floor().clamp(0, source.samples.length);
    final b = ((end / source.durationMs) * source.samples.length).ceil().clamp(a, source.samples.length);
    return KvFmWaveform(samples: List<double>.from(source.samples.sublist(a, b)), durationMs: end - start, sampleRate: source.sampleRate);
  }
}


/// Cross-platform native bridge contract. The real Android/iOS host implements
/// these channels; when the host is unavailable (web/test), callers receive a
/// deterministic `unavailable` result instead of crashing the app.
class KvNativePermissionGateway {
  static const String channelName = 'kv30/native_permissions';
  static const MethodChannel _channel = MethodChannel(channelName);

  static Future<bool> request(KvPermission permission) async {
    try {
      final result = await _channel.invokeMethod<bool>('request', {'permission': permission.name});
      return result == true;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  static Future<String> status(KvPermission permission) async {
    try {
      final result = await _channel.invokeMethod<String>('status', {'permission': permission.name});
      return result ?? 'unavailable';
    } on MissingPluginException {
      return 'unavailable';
    } on PlatformException {
      return 'unavailable';
    }
  }
}


/// Native FM/audio execution bridge. The host owns the actual microphone,
/// encoder and renderer; Flutter owns state, permissions and UI contracts.
class KvNativeFmGateway {
  static const String channelName = 'kv30/native_fm';
  static const MethodChannel _channel = MethodChannel(channelName);

  static Future<bool> startRecording({int sampleRate = 48000, int channels = 1}) async {
    try {
      final result = await _channel.invokeMethod<bool>('startRecording', {
        'sampleRate': sampleRate,
        'channels': channels,
      });
      return result == true;
    } on MissingPluginException { return false; }
      on PlatformException { return false; }
  }

  static Future<bool> pauseRecording() async {
    try { return (await _channel.invokeMethod<bool>('pauseRecording')) == true; }
    on MissingPluginException { return false; }
    on PlatformException { return false; }
  }

  static Future<bool> resumeRecording() async {
    try { return (await _channel.invokeMethod<bool>('resumeRecording')) == true; }
    on MissingPluginException { return false; }
    on PlatformException { return false; }
  }

  static Future<Map<String, dynamic>?> stopRecording() async {
    try {
      final result = await _channel.invokeMethod<dynamic>('stopRecording');
      if (result is Map) return Map<String, dynamic>.from(result);
      return null;
    } on MissingPluginException { return null; }
      on PlatformException { return null; }
  }

  static Future<Map<String, dynamic>?> renderMix({required String projectId, required String outputFormat}) async {
    try {
      final result = await _channel.invokeMethod<dynamic>('renderMix', {
        'projectId': projectId,
        'outputFormat': outputFormat,
      });
      if (result is Map) return Map<String, dynamic>.from(result);
      return null;
    } on MissingPluginException { return null; }
      on PlatformException { return null; }
  }
}
