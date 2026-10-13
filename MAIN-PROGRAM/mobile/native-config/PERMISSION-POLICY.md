# KV30 Native Permission Policy

## Automatic / no user prompt
- Internet/network access: enabled by application requirement.
- Secure app-local storage: enabled by application requirement.

## User approval at feature use
Notifications, camera, microphone, photo/media access, file/document access, location, nearby Bluetooth devices, contacts, calendar, phone/SMS, and biometric authentication are OFF until the user invokes the feature and the OS requires authorization.

## FM/Audio
Microphone is requested only when the user starts recording. Denial leaves playback/edit/publish features available where possible; recording is disabled with a localized explanation.

## Privacy rule
Never request a broad permission set during first launch. Request the minimum permission at the moment of need. Permission state is never treated as proof of ownership or publishing rights.
