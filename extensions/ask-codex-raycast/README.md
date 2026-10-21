# AI in Raycast

One **AI in Raycast** extension, with six independent commands:

- **Codex in Raycast**
- **Antigravity in Raycast**
- **Qoder in Raycast**
- **Qoder CN in Raycast**
- **WorkBuddy in Raycast**
- **Gemini in Raycast**

Each command opens its own CLI directly and restores its own conversations, drafts, model choice, and setup record.

## Use and enable individual CLIs

1. Open **Raycast Settings → Extensions → AI in Raycast**. Use Raycast's native **Enabled** checkbox on each command to show or hide that CLI. Disabled commands cannot be launched from the in-chat Switch CLI menu either.
2. Install and sign in to the CLI through its own terminal interface. Search for its command, such as **Codex in Raycast**, and complete the two-step connection/model setup.
3. Press **Enter** to open the floating composer, type, then press **Enter** to send. The full-width Markdown conversation stays on the same page.
4. **Cmd/Ctrl+P** switches CLI commands; **Cmd/Ctrl+M** opens models. Effort Level appears only where supported. Stop a running reply before switching.

Command enablement controls Raycast entry points; it does not uninstall a CLI or erase its saved chats. Existing Codex extension and command IDs are retained. Changing providers saves the current draft and launches the other command without passing your prompt or conversation to it.

## Providers and limitations

| Additional CLI | Model choices | Resume | Local Windows evidence (2026-10-21) |
| --- | --- | --- | --- |
| Qoder / Qoder CN | Live `--list-models`, plus CLI Default | Exact session ID | Qoder CN 1.1.74: inference, restart/resume, cancel/continue passed; international build untested |
| WorkBuddy | Model aliases from installed `--help`, plus CLI Default | Exact session ID | Embedded WorkBuddy AI CLI starts but requires its own login; inference/resume unverified |
| Gemini CLI | CLI Default; no invented catalog | Exact session UUID | 0.65.0 starts; the local account returned `UNSUPPORTED_CLIENT`, so inference/resume unverified |

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

Optional preferences specify executable paths and the working directory. npm CLIs are resolved to known Node entrypoints and require Node.js on PATH. Windows `.cmd`/extensionless npm shims never interpolate prompts. For custom WorkBuddy installations, set WorkBuddy CLI Path to `resources/app.asar.unpacked/cli/bin/codebuddy`; the embedded launch selects its WorkBuddy bundle. A separate CodeBuddy CLI is not automatically treated as WorkBuddy. A `.js` entrypoint can also be selected for Gemini or Qoder. The extension does not install CLIs itself. Codex Web Search and Codex Sandbox Mode apply to Codex only. Antigravity requires a native executable on Windows; shell wrappers are not executed.

Raycast's native full-width Detail has no permanent input field. The floating composer keeps native Markdown/code/math rendering and preserves drafts. An earlier send acknowledgement cannot clear newer input. Saved drafts can be sent directly or copied/pasted to edit because the native submenu input cannot be programmatically refilled.

## Architecture

`provider.ts` defines the common chat contract and capabilities. Codex retains its app-server implementation. `provider-antigravity.ts` adapts Antigravity events. `provider-cli.ts` manages bounded subprocess lifetime and durable mappings for the other CLIs; `cli-protocols.ts` handles vendor events and `cli-executable.ts` resolves native/Node entrypoints. `command-routing.ts` maps independent commands to providers; switching uses Raycast launchCommand and respects disabled commands. `session-storage.ts` scopes persisted state by provider; Codex keeps its legacy keys. No CLI implicitly resumes its globally most recent conversation.

The provider/agent separation described by [Magpie](https://github.com/yetone/magpie) is a design reference. The current Antigravity adapter was implemented against the installed CLI protocol and real stream-json traces; the pinned source comparison and real protocol evidence are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md).

The display name is AI in Raycast. The internal extension ID remains `ask-codex-raycast` to preserve existing local data. The earlier Store application was withdrawn; this refactor is a development version, not a new Store listing.

The UI follows Raycast's US-English interface convention. Conversation content can use any language requested by the user. See [HANDOFF.md](HANDOFF.md) for Windows UI checks and remaining limitations. Subprocess regression tests are separate from native keyboard validation.
