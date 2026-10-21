# AI CLI in Raycast

## [Same-page Input and Minimal Logo] - 2026-10-21

- Keep a native single-line input and Markdown conversation on the same List/detail page; Enter sends without opening another editor.
- Keep drafts until acknowledgement and protect newer edits from late callbacks. Preserve and show old multiline drafts intact; require an explicit Clear Draft before replacing them.
- Put the latest question-and-answer group first, with the question above the answer, without avatars. Make Stop Response an explicit action; Enter never stops. Separate steering from drafting and do not automatically queue sends.
- Adopt Gemini's two-shape black-and-white speech bubble as `chat-icon.svg` and its unchanged Resvg-rendered PNG across the manifest and launcher.
- Pass build, TypeScript, lint and 159 tests; verify Windows Enter sending/reply on the same page and Stop Response through Actions. Further native draft checks remain pending. Keep withdrawn Store applications closed.

## [CLI Launcher, Settings and Localization] - 2026-10-21

Earlier development state; its floating composer and suite icon are superseded above.

- Rename the suite AI CLI in Raycast and add a native launcher and CLI Settings, for eight independently enabled commands including the six CLI chats.
- Add English, simplified Chinese and traditional Chinese interface preferences; retain English static Raycast metadata and preserve original conversation content and CLI diagnostics.
- Add default-on automatic installation detection, explicit-path priority and manual-path mode. Report discovery separately from authentication.
- Use native List/Metadata settings and Form setup. Automatically check the local connection/catalog without inference, then require a valid model choice; guard startup against duplicate development mounts and unmount races.
- Remove onboarding and empty-chat clutter while preserving full-width conversations and the floating composer.
- Apply a Gemini-authored SVG logo, mechanically rendered to `suite-icon.png`, across all eight commands.
- Verify the earlier build, TypeScript, lint and test suite; verify the Chinese launcher and WorkBuddy navigation to model selection without claiming authenticated inference.
- Keep the withdrawn Store applications closed; no new submission.

## [Multi-CLI Suite Development] - 2026-10-21

- Add six independent commands under AI in Raycast, each with native Raycast enable/disable controls and isolated history, drafts and model settings.
- Add Qoder, Qoder CN, WorkBuddy and Gemini adapters with exact native session mappings.
- Fix Windows worker environment and npm entrypoint discovery without shell interpolation.
- Wait for process cleanup and durable session saves; prevent overlapping sends, switches and stale stop labels.
- Refine native setup and empty states with Gemini Flash design input; preserve the full-width chat and floating composer.
- Keep Store publication withdrawn.

## [Development Refactor] - 2026-10-21

- Rename the extension AI in Raycast and introduce a shared local CLI provider contract.
- Add Antigravity CLI conversations alongside Codex, with explicit session resume, streamed output and cancellation.
- Isolate setup, models, drafts and recent conversations by provider while preserving installed Codex data.
- Add a native Provider menu to the main Actions panel and floating composer.
- Expose supported capabilities honestly: Antigravity has model variants and no in-progress steering in this interface.
- Preserve full-width Markdown/math, Enter-based input, recent chats, and safeguards for drafts and late acknowledgements.
- Withdraw the previous Store application; continue this version as a development build.
