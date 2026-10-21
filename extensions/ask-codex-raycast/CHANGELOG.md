# AI CLI in Raycast

## [Clear Exchange Boundaries] - 2026-10-21

- Keep the user-preferred simple exchange dividers, question quotes and aligned provider headings; omit round numbers and extra reply labels.
- Reserve horizontal rules for real exchange boundaries; keep assistant-authored rules in stored/copied text while hiding them in the displayed reply.

## [Full-width Markdown and Floating Input] - 2026-10-21

- Restore full-width native Detail conversations with Markdown code blocks, lists and formulas; remove the flattened List-row chat prototype.
- Open a bottom-right native ActionPanel.Submenu input with Enter and send with Enter, while keeping the conversation visible without editor-page navigation.
- Preserve drafts with revision, pending-send and mounted guards. Offer an explicit Send Saved Draft with preview, Copy Draft to Continue Editing and Clear Draft. Do not send hidden saved text under the ordinary empty-input action.
- Keep the latest question-and-answer group first, with each question above its answer. Keep Stop Response separate from sending; only supported CLIs accept instructions during a reply. Do not automatically queue drafts.
- Vertically align the inline provider logo with its name using an 18px Markdown image inside `<sub>`; native Windows center measurements improved from a 9px difference to 0.5px.
- Document the native uncontrolled search-input boundary: no programmatic draft refill or promised persistent multiline/Shift+Enter editing. Maintain asset provenance separately in BRANDING.md.
- Pass build, TypeScript, lint and 172 tests. Verify native Windows Markdown body/code blocks, provider logos, the floating input and the user's successful message/reply. This round did not retest every provider backend or independently validate macOS. Keep withdrawn Store applications closed.

## [CLI Launcher, Settings and Localization] - 2026-10-21

Earlier development state; current input behavior and asset documentation are described above.

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
