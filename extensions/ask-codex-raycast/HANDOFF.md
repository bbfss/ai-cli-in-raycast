# AI CLI in Raycast — development handoff (2026-10-21)

## Start here

Repository: https://github.com/bbfss/raycast-extensions

Branch: `feat/ai-in-raycast-multi-cli`

Extension directory: `extensions/ask-codex-raycast`

**Do not reopen withdrawn Store PRs or submit a new Store application.** The user explicitly reaffirmed this constraint. Previous PRs #31456 and #32387 are closed, not publication evidence.

The extension is **AI CLI in Raycast**, a suite of eight independent native commands: the **AI CLI in Raycast** launcher (`cli-hub`), **Codex in Raycast** (`index`), **Antigravity in Raycast**, **Qoder in Raycast**, **Qoder CN in Raycast**, **WorkBuddy in Raycast**, **Gemini in Raycast**, and **CLI Settings** (`cli-settings`). Each has Raycast's native enabled checkbox in Settings → Extensions → AI CLI in Raycast. Asset provenance and command branding are maintained in [BRANDING.md](BRANDING.md). Preserve the original extension ID `ask-codex-raycast` and Codex command ID `index` so installed data and deep links continue to work.

## Implemented

- `command-routing.ts` maps each command to a provider. An old active-provider preference cannot redirect a named command. Cross-CLI switching saves the current state and uses Raycast `launchCommand`, which respects native command disablement; prompts and conversation data are not forwarded.
- `provider.ts`: shared ChatClient contract and capabilities. Codex retains its app-server implementation; only Codex exposes steering and effort choices.
- `provider-antigravity.ts`: native `agy`, live model discovery, explicit conversation mapping, stream parsing, bounded output, timeout and process-tree cancellation. Completion waits for process close and mapping persistence. Unexpected resumed IDs fail without overwriting saved mappings.
- `provider-cli.ts`: Qoder, Qoder CN, WorkBuddy and Gemini subprocess lifecycle, bounded mapping persistence, exact resume, cancellation, overlap protection, and explicit terminal success. Process exit 0 alone is insufficient.
- `cli-protocols.ts`: separate Gemini vs Qoder/WorkBuddy event schemas. Ignore reasoning, tool payloads and nested subagent sessions. Never implicitly resume the globally latest session.
- `cli-executable.ts`: native/known npm Node entrypoint discovery without shell prompt interpolation. Handles Windows extensionless npm dispatchers as well as `.cmd` wrappers. Custom WorkBuddy bundles use a process-only bundle selector. Node must be available on PATH.
- `executable.ts`: preserve all environment settings while handling mixed-case Windows `Path`/`AppData` keys without duplicate PATH entries. Antigravity auto-detection includes its standard LocalAppData install.
- `session-storage.ts`: history/drafts/model/setup isolated by provider, original Codex keys preserved. Mapping keys retain the original AGY format.
- `cli-hub.tsx` launches independent CLI commands without forwarding prompts or sessions. `cli-settings.tsx` uses a native List and Metadata inspector for discovered paths and status. Detection results mean file discovery, not authenticated inference.
- Automatic detection defaults to true. Explicit per-CLI paths take priority, including reporting a bad configured path instead of falling back. With detection off, every CLI needs an explicit path. The setting is respected by both discovery screens and chat client creation.
- Opening CLI Settings from chat waits for conversation, draft, and model saves; a running reply must be stopped first. Failed saves or unmounts do not launch a different command.
- `i18n.ts` provides English, simplified Chinese and traditional Chinese, with English fallback and literal placeholder substitution. The user's explicit localization request supersedes the earlier US-English-only development guidance. Static Raycast command/preference metadata stays English; model IDs, diagnostics, prompts and AI responses are not translated.
- The user's latest instruction rejects flattened List-row chat and editor-page navigation. Chat is restored to a full-width native `Detail` with Markdown code blocks, lists and formulas. `message-composer.tsx` uses an `ActionPanel.Submenu` input popover above the bottom-right action bar: Enter opens it, typing followed by Enter sends, and the conversation remains visible without a navigation push.
- Latest question-and-answer groups come first, each question before its answer; earlier exchanges remain below. Replies render Markdown directly rather than becoming List rows. Stored and copied content stays unchanged. Stop Response is an explicit action, never the default Enter action. Codex supports steering; other CLIs permit drafting but require manual send after completion or stop.
- Exchanges have fixed numbered headings, quoted user questions and separate provider reply headings. Only the extension inserts inter-exchange horizontal rules. Assistant-authored thematic breaks are removed by the display-only stripMessageDividers helper; fenced/indented code, math and setext headings are preserved. Stored transcripts and clipboard text stay raw.
- Provider logos sit inline beside the provider name. `chat-text.ts` wraps the 18px Markdown image in standard `<sub>` markup to align its vertical center with the text. This was verified in the native Windows view; do not replace it with unverified CSS or a separate image block.
- Draft revision, mounted and pending guards protect newer edits from late acknowledgements and duplicate sends. The parent draft remains until acknowledgement; failed sends preserve it and Clear Draft explicitly discards it. Saved drafts are exposed under a distinct Send Saved Draft action with a short preview, not silently substituted for empty ordinary input. Copy Draft to Continue Editing copies saved text for pasting into the native input. The submenu search is uncontrolled: public APIs cannot refill it programmatically. Do not claim persistent multiline input or Shift+Enter editing; an existing multiline saved draft can be sent intact through its explicit action.
- Two-stage setup uses native Forms: with detection enabled, the first mount automatically checks connection/catalog without sending an inference prompt; the next form requires an explicit valid model and supported effort choice. A saved valid choice is preserved. Manual mode retains an explicit check action. Deferred startup and unmount guards prevent duplicate development mount launches and work after leaving setup. CLI Default is an explicit option where no reliable catalog exists.

## Validation on Windows

Raycast 2.8.2; Node 24.21.0. Build, standalone TypeScript, lint and **177 tests passed** for the restored Detail/Submenu implementation. The interim same-page List prototype was rejected by the user; it is not the current UI.

Current native Windows acceptance read back Markdown body text, code blocks, the bottom-right input popover and provider logos. The user sent `测试下你的使用情况` and received a complete reply. The user explicitly accepted the restored Markdown/popover design with `很不错`, then requested only vertical alignment of the logo and provider name.

That alignment is fixed and visually checked. At the measured native display scale, the previous image was 33×33 with center y=526.5 versus the 25px-high text center y=535.5, a 9px difference. With the 18px inline image inside `<sub>`, UI Automation measured the image at 27×28 with center y=525 and text center y=525.5, a 0.5px difference. The screenshot also showed the intended alignment. These are native display bounds, not SVG canvas dimensions.

This final UI round did not rerun every provider backend. Preserve the earlier inference/resume/cancel evidence and account limitations below; do not turn it into a fresh all-provider acceptance claim.

The following provider and launcher evidence predates the restored input and remains useful backend evidence; it is not complete acceptance for the current interaction.

| Provider                                     | Real adapter test                                                                                                                                                        | Native Raycast test                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Codex (`gpt-6.1-sol`, low)                   | Remember → close/recreate → exact resume → cancel → continue passed                                                                                                      | Setup, send, switch away/back, correct remembered word, Stop Response and Stopped state passed                                                                           |
| Antigravity 1.2.16 (`gemini-3.8-flash-high`) | Remember → close/recreate → exact resume → cancel → continue passed again after lifecycle changes                                                                        | Setup, send, isolated history, switch away/back, correct remembered word, Stop Response and no remaining agy process passed                                              |
| Qoder CN 1.1.74 (`Fast`)                     | Actual inference, restart/resume, cancel/continue passed; a separate direct probe canceled at first text delta and then recovered the original word                      | Independent command, connection/model setup and response passed                                                                                                          |
| Qoder international                          | Not installed/independently tested here                                                                                                                                  | Entry and routing available; do not claim native inference                                                                                                               |
| WorkBuddy AI embedded CLI                    | Launch/version/model help work; actual result is authentication-required even with process exit 0                                                                        | Custom local CLI path configured; latest Chinese hub launch automatically reached model selection. This does not verify sign-in; authenticated inference remains blocked |
| Gemini CLI 0.65.0                            | Isolated workspace-local package launches; account returns `UNSUPPORTED_CLIENT`, recommending Antigravity. Also requires explicit workspace trust in this test directory | Local entrypoint path configured; inference/resume not verified                                                                                                          |

Native Settings previously verified all six independent CLI checkboxes. Temporarily disabled Qoder: attempting to switch from Qoder CN produced `No enabled command`, and the original conversation stayed intact. Re-enabled Qoder afterward. The suite now has the launcher and settings commands as well. WorkBuddy's custom installation path and Gemini's workspace-local Node entrypoint were saved through native preferences, not database edits. The latest native check displayed the Chinese hub and all six discovery states, then launched WorkBuddy from the hub into automatic setup and model selection.

Native auto-detection was also toggled off: four CLIs without explicit paths displayed Path Required; WorkBuddy and Gemini retained their configured-path results. Detection was restored to enabled and the launcher returned to five Found results and international Qoder Not Found. Simplified Chinese remains selected. Canceling a detection scan suppresses stale UI results; bounded operating-system lookups may still finish after cancellation.

**Keyboard limitation:** The current evidence includes the user's own successful send and reply. It is not an independently injected Enter-probe result. Do not reuse earlier List or multi-page editor keyboard evidence, or claim Shift+Enter line breaks, an independently verified stop shortcut, or macOS keyboard acceptance. Additional keyboard automation and draft/cancel scenarios should be recorded individually if run.

No Windows or macOS Store submission was made. Previous macOS baseline had 43 tests; the expanded suite needs a fresh macOS run. The development branding and command icons have been replaced, but no future Store policy or publication review is implied by these local changes.

## Permissions and authentication boundaries

Qoder CN received no-tools, strict-empty-MCP, hooks-disabled, `dont_ask` flags; its actual init confirmed empty tools and MCP. WorkBuddy receives its supported `dontAsk` equivalent, but init still advertised tools; effective restriction is unverified because authentication failed. Gemini uses default approval mode and existing CLI configuration with extensions disabled; it is not advertised as equivalent to Codex's sandbox. Antigravity plan+sandbox also has its own semantics.

The extension never copies credentials or browser cookies, changes global CLI configuration, or automatically authorizes interactive approvals. Local session transcripts created by the CLIs are expected. Git transfers source, not Raycast LocalStorage or authentication. Native WorkBuddy login and Gemini account eligibility cannot be fixed by importing Magpie/desktop tokens.

## Collaboration and Magpie research

The user explicitly requested Magpie 国模之光 and Gemini Flash 3.8 assistance.

- Magpie `group/never-stuck` completed a real backend review this round. It emphasized durable identity before success, close/cancel cleanup, and catalog-vs-auth distinction. The requested routing group is recorded; do not infer which underlying model answered from the group name.
- Subsequent usability reviews recorded actual Magpie routes `workbuddy-ai/deepseek-v4.1-flash` for 国模之光 and `codex/gpt-6.1-sol`, followed by a Codex re-review. They identified overwritten long drafts, hidden draft state, inaccessible stop actions, accidental stop on repeated Enter, Markdown hiding raw prompt text and stale callbacks. These findings inform draft preservation, explicit saved-draft previews, lifecycle guards and separate stop controls. The current floating input has no intermediate editor-navigation path.
- Magpie's `opencode-zen/gemini-3.8-flash` failed with HTTP 402 (insufficient account funds). No top-up or account change was attempted.
- Native Antigravity `gemini-3.8-flash-high` completed real UI reviews and produced two SVG suite-logo proposals. Proposal A, a two-shape black-and-white speech bubble, was rendered unchanged by Resvg. Current asset choices and provider-specific branding are recorded separately in [BRANDING.md](BRANDING.md). Do not claim these successful Gemini calls used Magpie or produced a raster image directly.
- Claude attempts supplied a minimal design brief without prescribed art direction. The Opus 5.5 request through OpenCode Zen returned HTTP 402 for insufficient funds; the Haiku request was rejected by Magpie's same-source quota cooldown before reaching upstream. Neither returned design content, so no Claude contribution is claimed. Magpie's available catalog offered no image-output route; two browser Gemini image attempts contained a visible checkerboard background and were not adopted. Keep those historical attempts separate from the current asset provenance in BRANDING.md.
- Read Magpie source at `ba319a7587923fc7a4ea3859658244d591261a59`; detailed evidence and pinned links are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md). Its AGY usage-log reader is not a live chat adapter. Gateway cancellation propagates into retry waits; requested route and actual model/account identity are distinct. No Magpie authentication implementation was copied.
- Gemini schema was cross-checked against official google-gemini/gemini-cli source at `c1740d29301a73a47dc3501c1aecc7eb00c0ee58` (`docs/cli/headless.md`, output event types, config flags, exact UUID resume).

## Next steps

1. Resolve WorkBuddy native CLI sign-in and Gemini account eligibility through their supported user flows, then run real inference/resume/cancel tests. International Qoder also needs its own installed/signed-in test.
2. Run a fresh macOS build and native acceptance. Extend Windows keyboard/draft/cancel coverage where needed, recording each actual result separately from the accepted Markdown/popover design and automated suite. Do not reintroduce List-row chat or a multi-page editor; do not claim native Shift+Enter support without verified API support.
3. Expand provider catalogs only from installed CLI help/official protocol evidence. Do not invent model IDs or assume a desktop login grants headless access.
4. Before any future user-authorized Store submission, review current policies, localized UI, branding and screenshots. No publication is currently authorized; do not reopen the withdrawn applications.

## Commands

```sh
npm ci
npm run build
npx tsc --noEmit
npm test
npm run lint
npm run dev
```

Build before standalone types so Raycast generates preference/argument definitions. Localized extension UI was explicitly requested by the user; host metadata remains English and future Store compatibility has not been asserted. Test traces, private collaboration responses and screenshots remain outside the repository in the task workspace, with user-facing reports and logo deliverables under `outputs/`.
