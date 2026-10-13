# KV30 Android/iPhone Capability Matrix

| Capability | Source-side status | Device gate |
|---|---|---|
| Network/API/session | PASS | physical network verification |
| Secure app storage | PASS contract | OS keystore/keychain verification |
| Notifications | runtime approval contract | OS prompt/device test |
| Camera | runtime approval contract | camera device test |
| Microphone/FM | runtime approval contract | physical microphone/audio-driver test |
| Photo/media | runtime approval contract | OS picker test |
| Location | OFF until feature use | GPS/device test if feature enabled |
| Nearby Bluetooth | OFF until feature use | Bluetooth hardware test |
| FM waveform | deterministic model/trim contract | physical render-performance test |
| FM recording | state machine | physical audio-driver test |
| Store packaging | checklist/configuration | signing/upload/store test |
