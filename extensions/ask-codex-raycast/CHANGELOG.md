# Changelog

## [Development Refactor] - 2026-10-21

- Rename the extension AI in Raycast and introduce a shared local CLI provider contract.
- Add Antigravity CLI conversations alongside Codex, with explicit session resume, streamed output and cancellation.
- Isolate setup, models, drafts and recent conversations by provider while preserving installed Codex data.
- Add a native Provider menu to the main Actions panel and floating composer.
- Expose supported capabilities honestly: Antigravity has model variants and no in-progress steering in this interface.
- Preserve full-width Markdown/math, Enter-based input, recent chats, and safeguards for drafts and late acknowledgements.
- Withdraw the previous Store application; continue this version as a development build.
