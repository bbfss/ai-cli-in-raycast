# AI in Raycast

Chat with your installed AI CLIs from one native Raycast window. Choose **Codex CLI** or **Antigravity CLI** in the Provider menu. Each has its own conversations, drafts, model choice, and setup record.

## Use

1. Install and sign in to the CLI you want to use through its own terminal interface.
2. Open **AI in Raycast** and choose a provider. Complete its connection check and choose an available model.
3. Press **Enter** to open the floating composer, type, and press **Enter** to send. The full-width Markdown conversation remains on the same page.
4. Use **Provider → Model → Effort Level → New Chat** below message entry, or inside the composer. **Cmd/Ctrl+P** opens providers and **Cmd/Ctrl+M** opens models. Each picker uses native Enter navigation.

Switching providers restores that provider's last conversation. Stop a running response before switching. New Chat creates a fresh session in the selected CLI; recent chats are scoped to that CLI. Existing Codex sessions and storage keys are retained.

## Providers and limitations

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

Optional preferences specify executable paths and the working directory. Codex Web Search and Codex Sandbox Mode apply to Codex only. Antigravity requires a native executable on Windows; shell wrappers are not executed.

Raycast's native full-width Detail has no permanent input field. The floating composer keeps native Markdown/code/math rendering and preserves drafts. An earlier send acknowledgement cannot clear newer input. Saved drafts can be sent directly or copied/pasted to edit because the native submenu input cannot be programmatically refilled.

## Architecture

`provider.ts` defines the common chat contract and capabilities. Codex retains its app-server implementation. `provider-antigravity.ts` adapts Antigravity events into the same lifecycle. `session-storage.ts` scopes persisted state by provider; Codex keeps its legacy keys. No CLI implicitly resumes its globally most recent conversation.

The provider/agent separation described by [Magpie](https://github.com/yetone/magpie) is a design reference. The current Antigravity adapter was implemented against the installed CLI protocol and real stream-json traces; deeper comparison with Magpie's gateway/session code is tracked in HANDOFF.md.

The display name is AI in Raycast. The internal extension ID remains `ask-codex-raycast` to preserve existing local data. The earlier Store application was withdrawn; this refactor is a development version, not a new Store listing.

The UI follows Raycast's US-English interface convention. Conversation content can use any language requested by the user. Windows UI has not been manually verified.
