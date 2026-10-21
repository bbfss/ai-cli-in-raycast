# AI in Raycast — development handoff (2026-10-21)

## Start here

Repository: https://github.com/bbfss/raycast-extensions

Branch: `feat/ai-in-raycast-multi-cli`

Extension directory: `extensions/ask-codex-raycast`

**Do not reopen withdrawn Store PRs or submit a new Store application.** The user explicitly reaffirmed this constraint. Previous PRs #31456 and #32387 are closed, not publication evidence.

The latest user correction is a **suite of independent commands**, not only one chat command with a provider dropdown. The extension is **AI in Raycast**; its six root commands are **Codex in Raycast**, **Antigravity in Raycast**, **Qoder in Raycast**, **Qoder CN in Raycast**, **WorkBuddy in Raycast**, and **Gemini in Raycast**. Each command can be enabled/disabled with Raycast's native checkbox in Settings → Extensions → AI in Raycast. The original extension ID `ask-codex-raycast` and Codex command ID `index` are preserved.

## Implemented

- `command-routing.ts` maps each command to a provider. An old active-provider preference cannot redirect a named command. Cross-CLI switching saves the current state and uses Raycast `launchCommand`, which respects native command disablement; prompts and conversation data are not forwarded.
- `provider.ts`: shared ChatClient contract and capabilities. Codex retains its app-server implementation; only Codex exposes steering and effort choices.
- `provider-antigravity.ts`: native `agy`, live model discovery, explicit conversation mapping, stream parsing, bounded output, timeout and process-tree cancellation. Completion waits for process close and mapping persistence. Unexpected resumed IDs fail without overwriting saved mappings.
- `provider-cli.ts`: Qoder, Qoder CN, WorkBuddy and Gemini subprocess lifecycle, bounded mapping persistence, exact resume, cancellation, overlap protection, and explicit terminal success. Process exit 0 alone is insufficient.
- `cli-protocols.ts`: separate Gemini vs Qoder/WorkBuddy event schemas. Ignore reasoning, tool payloads and nested subagent sessions. Never implicitly resume the globally latest session.
- `cli-executable.ts`: native/known npm Node entrypoint discovery without shell prompt interpolation. Handles Windows extensionless npm dispatchers as well as `.cmd` wrappers. Custom WorkBuddy bundles use a process-only bundle selector. Node must be available on PATH.
- `executable.ts`: preserve all environment settings while handling mixed-case Windows `Path`/`AppData` keys without duplicate PATH entries. Antigravity auto-detection includes its standard LocalAppData install.
- `session-storage.ts`: history/drafts/model/setup isolated by provider, original Codex keys preserved. Mapping keys retain the original AGY format.
- Native full-width Detail and floating Enter composer remain. Gemini Flash design input informed provider-specific page titles, calm empty states and concise two-step setup. Setup distinguishes executable/catalog availability from authenticated inference. CLI Default is an explicit choice where there is no reliable model catalog.

## Validation on Windows

Raycast 2.8.2; Node 24.21.0. Build, standalone TypeScript, lint and **115 tests passed**. Tests execute production code, including real Node fixture subprocesses, cancellation/process cleanup, persisted mapping races, invalid identity, exit-zero failures, command routing, disabled launch errors and UI callback races.

| Provider | Real adapter test | Native Raycast test |
| --- | --- | --- |
| Codex (`gpt-6.1-sol`, low) | Remember → close/recreate → exact resume → cancel → continue passed | Setup, send, switch away/back, correct remembered word, Stop Response and Stopped state passed |
| Antigravity 1.2.16 (`gemini-3.8-flash-high`) | Remember → close/recreate → exact resume → cancel → continue passed again after lifecycle changes | Setup, send, isolated history, switch away/back, correct remembered word, Stop Response and no remaining agy process passed |
| Qoder CN 1.1.74 (`Fast`) | Actual inference, restart/resume, cancel/continue passed; a separate direct probe canceled at first text delta and then recovered the original word | Independent command, connection/model setup and response passed |
| Qoder international | Not installed/independently tested here | Entry and routing available; do not claim native inference |
| WorkBuddy AI embedded CLI | Launch/version/model help work; actual result is authentication-required even with process exit 0 | Custom local CLI path configured; authenticated inference remains blocked |
| Gemini CLI 0.65.0 | Isolated workspace-local package launches; account returns `UNSUPPORTED_CLIENT`, recommending Antigravity. Also requires explicit workspace trust in this test directory | Local entrypoint path configured; inference/resume not verified |

Native Settings showed all six independent command checkboxes. Temporarily disabled Qoder: attempting to switch from Qoder CN produced `No enabled command`, and the original conversation stayed intact. Re-enabled Qoder afterward. WorkBuddy's custom installation path and Gemini's workspace-local Node entrypoint were saved through the native preferences UI, not database edits.

**Keyboard limitation:** Windows UI Automation successfully invoked send/saved-draft actions and verified results. Automated SendKeys Enter was unreliable (menu focus/closure); do not claim a complete physical Enter-to-send keyboard acceptance test. No conclusion that this is a product defect has been established. Saved drafts survived these attempts.

No Windows or macOS Store submission was made. Previous macOS baseline had 43 tests; the expanded suite needs a fresh macOS run. Existing Store metadata/brand icons still reflect earlier Codex branding and need review before any future publication.

## Permissions and authentication boundaries

Qoder CN received no-tools, strict-empty-MCP, hooks-disabled, `dont_ask` flags; its actual init confirmed empty tools and MCP. WorkBuddy receives its supported `dontAsk` equivalent, but init still advertised tools; effective restriction is unverified because authentication failed. Gemini uses default approval mode and existing CLI configuration with extensions disabled; it is not advertised as equivalent to Codex's sandbox. Antigravity plan+sandbox also has its own semantics.

The extension never copies credentials or browser cookies, changes global CLI configuration, or automatically authorizes interactive approvals. Local session transcripts created by the CLIs are expected. Git transfers source, not Raycast LocalStorage or authentication. Native WorkBuddy login and Gemini account eligibility cannot be fixed by importing Magpie/desktop tokens.

## Collaboration and Magpie research

The user explicitly requested Magpie 国模之光 and Gemini Flash 3.8 assistance.

- Magpie `group/never-stuck` completed a real backend review this round. It emphasized durable identity before success, close/cancel cleanup, and catalog-vs-auth distinction. The requested routing group is recorded; do not infer which underlying model answered from the group name.
- Magpie's `opencode-zen/gemini-3.8-flash` failed with HTTP 402 (insufficient account funds). No top-up or account change was attempted.
- After the user's visual-design request, native Antigravity `gemini-3.8-flash-high` completed a real UI review. Only selected source/constraints were supplied. Adopted page hierarchy and setup copy; rejected invented shortcuts, namespace changes that would lose old history, and unsupported claims. Do not claim this successful Gemini call used Magpie.
- Read Magpie source at `ba319a7587923fc7a4ea3859658244d591261a59`; detailed evidence and pinned links are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md). Its AGY usage-log reader is not a live chat adapter. Gateway cancellation propagates into retry waits; requested route and actual model/account identity are distinct. No Magpie authentication implementation was copied.
- Gemini schema was cross-checked against official google-gemini/gemini-cli source at `c1740d29301a73a47dc3501c1aecc7eb00c0ee58` (`docs/cli/headless.md`, output event types, config flags, exact UUID resume).

## Next steps

1. Resolve WorkBuddy native CLI sign-in and Gemini account eligibility through their supported user flows, then run real inference/resume/cancel tests. International Qoder also needs its own installed/signed-in test.
2. Finish manual physical Enter keyboard acceptance, especially Windows focus behavior; verify a fresh macOS build.
3. Expand provider catalogs only from installed CLI help/official protocol evidence. Do not invent model IDs or assume a desktop login grants headless access.
4. Before any future user-authorized Store submission, review suite branding/screenshots and current Store requirements. No publication is currently authorized.

## Commands

```sh
npm ci
npm run build
npx tsc --noEmit
npm test
npm run lint
npm run dev
```

Build before standalone types so Raycast generates preference/argument definitions. UI remains US English per upstream repository instructions; responses may use the user's requested language. Test traces, private collaboration responses and screenshots remain outside the repository in the task workspace, with a concise user-facing report under `outputs/`.
