# KV30 Desktop Application

This is the governed Electron desktop shell for the same Website-first application and backend source of truth.

- No separate desktop business logic is authoritative.
- `KV30_DESKTOP_URL` selects the governed web origin; development defaults to `http://localhost:8787/`.
- Renderer uses context isolation, sandboxing, no Node integration and web security.
- Permission prompts are allowlisted and not blanket-approved.
- Production deployment must point to the governed production origin; secrets are not stored in this shell.
