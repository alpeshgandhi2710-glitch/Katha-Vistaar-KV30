# KV30 Native Host Contract

The Flutter source owns the permission policy and capability contract. Native Android/iOS hosts must bind channel `kv30/native_permissions`.

## Methods
- `request({permission})` -> boolean. Request only the named runtime permission and return current granted state.
- `status({permission})` -> `granted|denied|permanentlyDenied|restricted|unavailable`.

## Required behavior
- Never request all permissions at startup.
- Microphone is requested only when FM recording starts.
- Camera/media/location/Bluetooth/notifications are requested only at feature use.
- Denied permissions disable only the dependent capability and must not prevent normal reading/browsing.
- Production and development use separate application IDs, data stores and secrets.


## FM execution channel
The host also binds `kv30/native_fm` with these methods:
- `startRecording({sampleRate, channels})` -> bool
- `pauseRecording()` -> bool
- `resumeRecording()` -> bool
- `stopRecording()` -> `{durationMs, sampleRate, channels, waveform, localPath}` or null. Native hosts may also provide `filePath` as a compatibility alias; Flutter accepts both, but `localPath` is the governed key.
- `renderMix({projectId, outputFormat})` -> `{localPath, durationMs, sampleRate}` or null. This native render result is local-only; backend `/api/media/audio/mix` remains the authoritative governed render/publish path.

The host must reject recording without an authorized microphone state, stop cleanly on lifecycle termination, and never expose a local file path as a remote publish URL. The backend remains the authority for publishing and rights.
