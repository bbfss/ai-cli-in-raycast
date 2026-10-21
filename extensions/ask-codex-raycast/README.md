# AI CLI in Raycast

One **AI CLI in Raycast** extension, with eight native Raycast commands:

- **AI CLI in Raycast** — a searchable launcher for all six CLIs
- **Codex in Raycast**
- **Antigravity in Raycast**
- **Qoder in Raycast**
- **Qoder CN in Raycast**
- **WorkBuddy in Raycast**
- **Gemini in Raycast**
- **CLI Settings** — installation detection and preferences

Each CLI command opens that CLI directly and restores its own conversations, drafts, model choice, and setup record. The launcher and settings screen do not share conversation content between CLIs. All eight commands use the minimal black-and-white speech bubble in `chat-icon.png`.

## Use and enable individual CLIs

1. Open **Raycast Settings → Extensions → AI CLI in Raycast**. Use Raycast's native **Enabled** checkbox on each command to show or hide it. Disabled CLI commands cannot be launched from the suite launcher or in-chat Switch CLI menu either.
2. Install and sign in to the CLI through its own terminal interface. Open **AI CLI in Raycast** to choose a CLI, or launch a command such as **Codex in Raycast** directly. With automatic detection enabled, first-time setup checks the local connection and model catalog automatically, then asks you to choose a model. These checks send no inference prompt. Manual detection mode keeps an explicit connection-check action.
3. Type in the input at the top and press **Enter** to send. Input and replies stay on the same page. This native prototype uses a single-line search field; it does not provide Shift+Enter line breaks.
4. **Cmd/Ctrl+P** switches CLI commands; **Cmd/Ctrl+M** opens models. Effort Level appears only where supported. Stop a running reply before switching.

Command enablement controls Raycast entry points; it does not uninstall a CLI or erase its saved chats. Existing Codex extension and command IDs are retained. Changing providers saves the current draft and launches the other command without passing your prompt or conversation to it.

## Settings and detection

Open **CLI Settings** to see the six installation states and detected paths. Settings uses a native List and metadata inspector; setup uses native Forms. Chat uses a full-width native List: the input stays at the top, with questions, streaming replies and earlier exchanges below. Markdown reading remains available through View Full Conversation.

| Preference                      | Behavior                                                                    |
| ------------------------------- | --------------------------------------------------------------------------- |
| Interface Language              | English, 简体中文, or 繁體中文; English is the default                      |
| Automatic CLI Detection         | Enabled by default; searches supported standard installation paths          |
| Per-CLI Path                    | An explicit path always takes priority; leave empty for automatic discovery |
| Working Directory               | Optional directory used by the CLI                                          |
| Codex Web Search / Sandbox Mode | Codex-specific controls                                                     |

When automatic detection is disabled, enter an explicit path for each CLI you use. A failed custom path is reported rather than silently replaced by an automatically found installation. Detection discovers local files; **Found** does not mean signed in, entitled to a model, or able to send a prompt. Use **Detect CLIs Again** after installing a CLI or changing paths.

Extension-controlled UI follows the selected language. Raycast's static command and preference metadata remains English. Language selection does not translate model IDs, CLI diagnostics, saved prompts, or AI responses, and it does not change the language an AI must answer in.

## Providers and limitations

| Additional CLI   | Model choices                                           | Resume             | Local Windows evidence (2026-10-21)                                                              |
| ---------------- | ------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| Qoder / Qoder CN | Live `--list-models`, plus CLI Default                  | Exact session ID   | Qoder CN 1.1.74: inference, restart/resume, cancel/continue passed; international build untested |
| WorkBuddy        | Model aliases from installed `--help`, plus CLI Default | Exact session ID   | Embedded WorkBuddy AI CLI starts but requires its own login; inference/resume unverified         |
| Gemini CLI       | CLI Default; no invented catalog                        | Exact session UUID | 0.65.0 starts; the local account returned `UNSUPPORTED_CLIENT`, so inference/resume unverified   |

These additional CLIs do not expose steering or effort controls here. Qoder and WorkBuddy receive no-tools, strict-empty-MCP, hooks-disabled and noninteractive permission flags. Qoder CN's actual trace confirmed empty tools/MCP. WorkBuddy's init still advertised tools; effective restriction remains unverified pending CLI login. Gemini uses default approval mode and existing configuration, with extensions disabled; it is not represented as a no-tools or Codex-equivalent sandbox. Complete any workspace trust requirement in the CLI itself.

| Feature                         | Codex CLI                                                  | Antigravity CLI (`agy`)                                     |
| ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Bridge                          | Local app-server over stdio                                | Local stream-json subprocess                                |
| Resume                          | Explicit thread ID                                         | Explicit conversation ID, persisted per local thread        |
| Model discovery                 | app-server model/list                                      | agy models                                                  |
| Streaming and stop              | Yes                                                        | Yes                                                         |
| Add instructions during a reply | Supported                                                  | Wait or stop before sending another message                 |
| Effort selection                | Supported levels from CLI                                  | Choose the CLI model variant; separate effort picker hidden |
| Permissions                     | Selected Codex sandbox, no automatic interactive approvals | agy sandbox + plan mode; its guarantees differ from Codex   |

The extension uses existing local CLI authentication. It does not import browser cookies, copy credentials, change global CLI configuration, or expose a network listener. A connection/catalog check does not prove inference entitlement, provider credential validity, quota, or network availability for the next message.

npm CLIs are resolved to known Node entrypoints and require Node.js on PATH. Windows `.cmd`/extensionless npm shims never interpolate prompts. For custom WorkBuddy installations, set WorkBuddy CLI Path to `resources/app.asar.unpacked/cli/bin/codebuddy`; the embedded launch selects its WorkBuddy bundle. A separate CodeBuddy CLI is not automatically treated as WorkBuddy. A `.js` entrypoint can also be selected for Gemini or Qoder. The extension does not install CLIs itself. Antigravity requires a native executable on Windows; shell wrappers are not executed.

Questions and replies appear as full-width text rows below the persistent input. The latest question-and-answer group appears first, with the question above its answer and earlier exchanges below. Long paragraphs are split into readable rows; stored and copied message text is unchanged. View Full Conversation provides optional Markdown reading. **Stop Response** is available in Actions during a reply; Enter never stops a reply. Codex can accept additional instructions while responding. Other CLIs let you keep writing a draft, then send it manually after the reply finishes or is stopped; drafts are not automatically queued.

A successful send acknowledgement clears the submitted input only if it has not since been edited. Later typing, identical retyping and explicit clearing are protected from an older acknowledgement. Failed sends keep the draft. **Clear Draft** explicitly discards it; Esc follows Raycast's search-field behavior and may clear single-line text before returning.

Older or pasted multiline drafts are displayed in full as literal text on the same page and sent unchanged. Since the native search field cannot safely edit them, normalization callbacks are ignored until you send the draft or use Clear Draft to replace it. No separate editor or preview page is opened.

## Architecture

`provider.ts` defines the common chat contract and capabilities. Codex retains its app-server implementation. `provider-antigravity.ts` adapts Antigravity events. `provider-cli.ts` manages bounded subprocess lifetime and durable mappings for the other CLIs; `cli-protocols.ts` handles vendor events and `cli-executable.ts` resolves native/Node entrypoints. `cli-detection.ts` supplies installation discovery to the launcher and settings screen. `command-routing.ts` maps independent commands to providers; switching uses Raycast launchCommand and respects disabled commands. `session-storage.ts` scopes persisted state by provider; Codex keeps its legacy keys. `i18n.ts` translates interface copy with an English fallback. No CLI implicitly resumes its globally most recent conversation.

The provider/agent separation described by [Magpie](https://github.com/yetone/magpie) is a design reference. The current Antigravity adapter was implemented against the installed CLI protocol and real stream-json traces; the pinned source comparison and real protocol evidence are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md).

## Verification and development status

Build, standalone TypeScript, lint and **163 tests passed** for the same-page prototype. Tests include pending-send edits, multiline draft preservation and explicit stop behavior. Windows keyboard injection verified Enter sending from the persistent input and a reply on the same page; Stop Response was also verified through Actions. Further native draft checks and a fresh macOS run remain outstanding.

Earlier native Raycast checks showed the Chinese launcher with six detection states; opening WorkBuddy automatically reached model selection. This demonstrates discovery and onboarding, not successful WorkBuddy authentication.

Codex, Antigravity and Qoder CN have real inference/resume/cancel evidence. WorkBuddy still needs native CLI login, Gemini CLI is blocked by account compatibility, and international Qoder remains untested locally. See [HANDOFF.md](HANDOFF.md) for the evidence and limits.

The internal extension ID remains `ask-codex-raycast` to preserve existing local data. This is a development version. The previous Store applications remain withdrawn: **do not reopen them or submit a new application**. Any future user-authorized publication would first require a fresh review of Store policies, including localization and branding.
