# AI CLI in Raycast — development handoff (2026-10-21)

## Start here

Repository: https://github.com/bbfss/raycast-extensions

Branch: `feat/ai-in-raycast-multi-cli`

Extension directory: `extensions/ask-codex-raycast`

**Do not reopen withdrawn Store PRs or submit a new Store application.** The user explicitly reaffirmed this constraint. Previous PRs #31456 and #32387 are closed, not publication evidence.

The extension is **AI CLI in Raycast**, a suite of eight independent native commands: the **AI CLI in Raycast** launcher (`cli-hub`), **Codex in Raycast** (`index`), **Antigravity in Raycast**, **Qoder in Raycast**, **Qoder CN in Raycast**, **WorkBuddy in Raycast**, **Gemini in Raycast**, and **CLI Settings** (`cli-settings`). Each has Raycast's native enabled checkbox in Settings → Extensions → AI CLI in Raycast. Manifest and launcher now use `chat-icon.png`; see [BRANDING.md](BRANDING.md). Preserve the original extension ID `ask-codex-raycast` and Codex command ID `index` so installed data and deep links continue to work.

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
- Chat is now a native same-page prototype: `List` with `filtering=false`, `throttle=false`, controlled `searchText`, one conversation row and `List.Item.Detail`. The top input stays visible while replies stream, and its primary Enter action sends the current draft. Native List supplies a split layout, so this is not a full-width custom chat application. The user explicitly accepted continuously typing in a single line; no Shift+Enter behavior is promised. The former composer and its standalone tests were removed.
- Latest question-and-answer groups come first, with each question before its answer. User text uses quote blocks and there are no avatars. Stop Response is an explicit Actions item, configured with Cmd/Ctrl+period, never the default Enter action. Busy state and steering capability are separate: Codex may steer; other CLIs allow drafting and require a manual send after completion or stop. There is no automatic queue.
- Draft revisions protect newer edits, identical retyping and explicit clearing from older acknowledgements. The parent draft remains until acknowledgement. Draft restoration updates the synchronous ref before connecting, so a fast connection cannot overwrite restored text before React renders it. Existing or pasted multiline drafts are shown literally and completely in the same detail pane, preserved against single-line normalization, and sent intact. Clear Draft is required before replacing such a draft. No editor/preview navigation is used. Native Esc may clear a non-empty single-line search field before returning.
- Two-stage setup uses native Forms: with detection enabled, the first mount automatically checks connection/catalog without sending an inference prompt; the next form requires an explicit valid model and supported effort choice. A saved valid choice is preserved. Manual mode retains an explicit check action. Deferred startup and unmount guards prevent duplicate development mount launches and work after leaving setup. CLI Default is an explicit option where no reliable catalog exists.

## Validation on Windows

Raycast 2.8.2; Node 24.21.0. Final build, standalone TypeScript, lint and **159 tests passed**. Tests execute production code, including real Node fixture subprocesses, cancellation/process cleanup, persisted mapping races, invalid identity, exit-zero failures, command routing, disabled launch errors, draft races, installation detection, localization and automatic-setup mount cleanup. This includes 29 focused native-chat callback, renderer and localization checks for the same-page implementation.

Latest native Windows evidence: actual key-down/key-up injection sent `只回复同页发送成功` from the persistent input, cleared that input after acknowledgement, and received `同页发送成功` on the same page. Stop Response reached Stopped through its Actions menu. The configured stop shortcut has not been independently verified by keyboard automation. Additional native draft acceptance remains in progress.

The following provider and launcher evidence predates the same-page input and remains useful backend evidence; it is not a complete acceptance result for the new prototype.

| Provider | Real adapter test | Native Raycast test |
| --- | --- | --- |
| Codex (`gpt-6.1-sol`, low) | Remember → close/recreate → exact resume → cancel → continue passed | Setup, send, switch away/back, correct remembered word, Stop Response and Stopped state passed |
| Antigravity 1.2.16 (`gemini-3.8-flash-high`) | Remember → close/recreate → exact resume → cancel → continue passed again after lifecycle changes | Setup, send, isolated history, switch away/back, correct remembered word, Stop Response and no remaining agy process passed |
| Qoder CN 1.1.74 (`Fast`) | Actual inference, restart/resume, cancel/continue passed; a separate direct probe canceled at first text delta and then recovered the original word | Independent command, connection/model setup and response passed |
| Qoder international | Not installed/independently tested here | Entry and routing available; do not claim native inference |
| WorkBuddy AI embedded CLI | Launch/version/model help work; actual result is authentication-required even with process exit 0 | Custom local CLI path configured; latest Chinese hub launch automatically reached model selection. This does not verify sign-in; authenticated inference remains blocked |
| Gemini CLI 0.65.0 | Isolated workspace-local package launches; account returns `UNSUPPORTED_CLIENT`, recommending Antigravity. Also requires explicit workspace trust in this test directory | Local entrypoint path configured; inference/resume not verified |

Native Settings previously verified all six independent CLI checkboxes. Temporarily disabled Qoder: attempting to switch from Qoder CN produced `No enabled command`, and the original conversation stayed intact. Re-enabled Qoder afterward. The suite now has the launcher and settings commands as well. WorkBuddy's custom installation path and Gemini's workspace-local Node entrypoint were saved through native preferences, not database edits. The latest native check displayed the Chinese hub and all six discovery states, then launched WorkBuddy from the hub into automatic setup and model selection.

Native auto-detection was also toggled off: four CLIs without explicit paths displayed Path Required; WorkBuddy and Gemini retained their configured-path results. Detection was restored to enabled and the launcher returned to five Found results and international Qoder Not Found. Simplified Chinese remains selected. Canceling a detection scan suppresses stale UI results; bounded operating-system lookups may still finish after cancellation.

**Keyboard limitation:** Earlier submenu and multi-page editor experiments are superseded. Keep the latest same-page Enter and menu-stop evidence separate from those results. Do not claim Shift+Enter line breaks, a verified stop shortcut, or macOS keyboard acceptance.

No Windows or macOS Store submission was made. Previous macOS baseline had 43 tests; the expanded suite needs a fresh macOS run. The development branding and command icons have been replaced, but no future Store policy or publication review is implied by these local changes.

## Permissions and authentication boundaries

Qoder CN received no-tools, strict-empty-MCP, hooks-disabled, `dont_ask` flags; its actual init confirmed empty tools and MCP. WorkBuddy receives its supported `dontAsk` equivalent, but init still advertised tools; effective restriction is unverified because authentication failed. Gemini uses default approval mode and existing CLI configuration with extensions disabled; it is not advertised as equivalent to Codex's sandbox. Antigravity plan+sandbox also has its own semantics.

The extension never copies credentials or browser cookies, changes global CLI configuration, or automatically authorizes interactive approvals. Local session transcripts created by the CLIs are expected. Git transfers source, not Raycast LocalStorage or authentication. Native WorkBuddy login and Gemini account eligibility cannot be fixed by importing Magpie/desktop tokens.

## Collaboration and Magpie research

The user explicitly requested Magpie 国模之光 and Gemini Flash 3.8 assistance.

- Magpie `group/never-stuck` completed a real backend review this round. It emphasized durable identity before success, close/cancel cleanup, and catalog-vs-auth distinction. The requested routing group is recorded; do not infer which underlying model answered from the group name.
- Subsequent usability reviews recorded actual Magpie routes `workbuddy-ai/deepseek-v4.1-flash` for 国模之光 and `codex/gpt-6.1-sol`, followed by a Codex re-review. They identified overwritten long drafts, hidden draft state, inaccessible stop actions, accidental stop on repeated Enter, Markdown hiding raw prompt text and stale callbacks. Their fixes informed draft preservation, literal multiline display and explicit stop controls; the final same-page input also removes the intermediate editor-navigation path.
- Magpie's `opencode-zen/gemini-3.8-flash` failed with HTTP 402 (insufficient account funds). No top-up or account change was attempted.
- Native Antigravity `gemini-3.8-flash-high` completed real UI reviews and produced two new SVG logo proposals. Proposal A was adopted: a black-and-white single speech bubble using two shapes. Resvg rendered the SVG unchanged to `chat-icon.png`. This replaces the earlier terminal-chevron suite icon in active usage. Do not claim these successful Gemini calls used Magpie or produced a raster image directly.
- Claude attempts supplied a minimal design brief without prescribed art direction. The Opus 5.5 request through OpenCode Zen returned HTTP 402 for insufficient funds; the Haiku request was rejected by Magpie's same-source quota cooldown before reaching upstream. Neither returned design content, so no Claude contribution is claimed. Magpie's available catalog offered no image-output route; two browser Gemini image attempts contained a visible checkerboard background and were not adopted. The delivered logo comes from the Gemini-authored SVG.
- Read Magpie source at `ba319a7587923fc7a4ea3859658244d591261a59`; detailed evidence and pinned links are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md). Its AGY usage-log reader is not a live chat adapter. Gateway cancellation propagates into retry waits; requested route and actual model/account identity are distinct. No Magpie authentication implementation was copied.
- Gemini schema was cross-checked against official google-gemini/gemini-cli source at `c1740d29301a73a47dc3501c1aecc7eb00c0ee58` (`docs/cli/headless.md`, output event types, config flags, exact UUID resume).

## Next steps

1. Resolve WorkBuddy native CLI sign-in and Gemini account eligibility through their supported user flows, then run real inference/resume/cancel tests. International Qoder also needs its own installed/signed-in test.
2. Finish same-page native draft acceptance, including pending-send edits, old multiline drafts and Esc behavior; verify a fresh macOS build. Do not add a multi-page editor or claim native Shift+Enter support without a new user request and verified API support.
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
