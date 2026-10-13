import Flutter
import UIKit
import AVFoundation
import Photos
import CoreLocation

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let permissionChannelName = "kv30/native_permissions"
  private let fmChannelName = "kv30/native_fm"
  private var recorder: AVAudioRecorder?
  private var lastFile: URL?
  private var startedAt: Date?
  // AVAudioRecorder has no public isPaused property; track pause state explicitly.
  private var recordingPaused = false
  private var recordingChannels = 1
  private var recordingSampleRate = 48000.0

  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    guard let controller = window?.rootViewController as? FlutterViewController else { return super.application(application, didFinishLaunchingWithOptions: launchOptions) }
    let permission = FlutterMethodChannel(name: permissionChannelName, binaryMessenger: controller.binaryMessenger)
    permission.setMethodCallHandler { [weak self] call, result in self?.handlePermission(call, result: result) }
    let fm = FlutterMethodChannel(name: fmChannelName, binaryMessenger: controller.binaryMessenger)
    fm.setMethodCallHandler { [weak self] call, result in self?.handleFM(call, result: result) }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func handlePermission(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let permission = (call.arguments as? [String: Any])?["permission"] as? String ?? ""
    if call.method == "status" { result(permissionStatus(permission)); return }
    guard call.method == "request" else { result(FlutterMethodNotImplemented); return }
    switch permission {
    case "microphone": AVAudioSession.sharedInstance().requestRecordPermission { result($0) }
    case "camera":
      AVCaptureDevice.requestAccess(for: .video) { result($0) }
    case "photos":
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in result(status == .authorized) }
    default: result(false)
    }
  }

  private func permissionStatus(_ permission: String) -> String {
    switch permission {
    case "microphone": return AVAudioSession.sharedInstance().recordPermission == .granted ? "granted" : "denied"
    case "camera":
      if #available(iOS 17.0, *) { return AVCaptureDevice.authorizationStatus(for: .video) == .authorized ? "granted" : "denied" }
      return AVCaptureDevice.authorizationStatus(for: .video) == .authorized ? "granted" : "denied"
    case "photos": return PHPhotoLibrary.authorizationStatus(for: .readWrite) == .authorized ? "granted" : "denied"
    default: return "unavailable"
    }
  }

  private func handleFM(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "startRecording": startRecording(call, result: result)
    case "pauseRecording":
      guard let r = recorder, r.isRecording, !recordingPaused else { result(false); return }
      r.pause(); recordingPaused = true; result(true)
    case "resumeRecording":
      guard let r = recorder, recordingPaused else { result(false); return }
      let resumed = r.record()
      if resumed { recordingPaused = false }
      result(resumed)
    case "stopRecording": result(stopRecording())
    case "renderMix":
      // Rendering/mixing is server-authoritative. A local recording path is only an upload input.
      result(FlutterError(code: "server_render_required", message: "Upload recorded assets and request the canonical server audio mix.", details: nil))
    default: result(FlutterMethodNotImplemented)
    }
  }

  private func startRecording(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard AVAudioSession.sharedInstance().recordPermission == .granted else { result(false); return }
    let args = call.arguments as? [String: Any] ?? [:]
    let requestedRate = args["sampleRate"] as? Int ?? 48000
    let rate = Double(min(96000, max(8000, requestedRate)))
    let requestedChannels = args["channels"] as? Int ?? 1
    let channels = requestedChannels == 2 ? 2 : 1
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.record, mode: .default, options: [])
      try session.setActive(true)
      let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
      let recordingDirectory = caches.appendingPathComponent("kv30-recordings", isDirectory: true)
      try FileManager.default.createDirectory(at: recordingDirectory, withIntermediateDirectories: true)
      let url = recordingDirectory.appendingPathComponent("kv30-fm-\(UUID().uuidString).caf")
      let nextRecorder = try AVAudioRecorder(url: url, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: rate, AVNumberOfChannelsKey: channels, AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue])
      nextRecorder.prepareToRecord()
      guard nextRecorder.record() else { result(false); return }
      recorder = nextRecorder
      recordingPaused = false
      recordingChannels = channels
      recordingSampleRate = rate
      startedAt = Date()
      lastFile = url
      result(nextRecorder.isRecording)
    } catch { result(false) }
  }

  private func stopRecording() -> [String: Any]? {
    guard let r = recorder, r.isRecording || recordingPaused else { return nil }
    let durationMs = Int(max(0, r.currentTime) * 1000)
    r.stop(); recorder = nil; recordingPaused = false
    guard let url = lastFile, FileManager.default.fileExists(atPath: url.path) else { return nil }
    return ["durationMs": durationMs, "sampleRate": Int(recordingSampleRate), "channels": recordingChannels, "localPath": url.path, "mimeType": "audio/x-caf"]
  }

  override func applicationWillTerminate(_ application: UIApplication) {
    recorder?.stop(); recorder = nil; recordingPaused = false
    super.applicationWillTerminate(application)
  }
}
