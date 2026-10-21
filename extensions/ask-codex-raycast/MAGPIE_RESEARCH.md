# Magpie comparison and local CLI evidence

Verified on 2026-10-21 (Asia/Taipei). Recorded by Codex. This is implementation research, not a Store submission or a claim that every provider passed native Raycast testing.

## Source snapshot

Authoritative repository: [yetone/magpie](https://github.com/yetone/magpie). The inspected checkout is pinned to [`ba319a7587923fc7a4ea3859658244d591261a59`](https://github.com/yetone/magpie/tree/ba319a7587923fc7a4ea3859658244d591261a59). Conclusions below refer to that revision; installed CLI behavior can change independently.

### Gateway translation and session accounting serve different purposes

- [`internal/gateway/chat.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/gateway/chat.go) translates Chat Completions requests into Magpie's common request representation. It preserves system/developer instructions, tool identities, tool results, supported media, reasoning fields, and Gemini thought signatures. Its streaming decoder distinguishes text, thinking, tool starts/arguments, stop reasons, usage, and explicit errors. It also locks to the first readable choice index so multiple candidate responses cannot be interleaved.
- The extension is a native CLI client, so copying that HTTP decoder would not implement a CLI adapter. The useful shared design is a normalized event contract with provider-specific parsing, explicit failures, stable identities, and no mixing of reasoning/tool payloads into the answer text.
- [`internal/sessions/calls_agy.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/sessions/calls_agy.go) is an accounting reader, not AGY's live transport. It scans conversation transcript JSONL, accepts model steps with complete token counts, deduplicates repeated step indexes, and retains unknown model/account identity rather than guessing from current settings. Older transcripts without token fields are omitted instead of counted as zero.
- [`internal/sessions/calls_workbuddy.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/sessions/calls_workbuddy.go) reads usage from WorkBuddy/CodeBuddy transcript items and avoids double-counting calls already recorded by Magpie's gateway. A current model catalog is not historical proof of the provider or account that handled a prior reply.

### Exact sessions and product identities

- [`internal/sessions/qoder.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/sessions/qoder.go) distinguishes Qoder and Qoder CN data roots and documents exact `--resume <id>`. Main session and subagent transcript identities are separate. The extension should only resume the ID durably mapped to its own selected provider and local thread.
- [`internal/gateway/workbuddy_session_test.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/gateway/workbuddy_session_test.go) specifically prevents per-turn, per-message, and parent-conversation IDs from becoming the current session. Its WorkBuddy session header is `X-Conversation-ID`. The equivalent CLI evidence is the outer `session_id`, excluding events with a `parent_tool_use_id`.
- [`internal/agent/workbuddy.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/agent/workbuddy.go) distinguishes WorkBuddy (`.workbuddy`) from international WorkBuddy AI (`.workbuddy-ai`). Their identities and configuration roots must not be conflated. The local installation examined in this task is WorkBuddy AI.
- The pinned [`internal/sessions/workbuddy.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/sessions/workbuddy.go) describes desktop transcript discovery and says there is no terminal resume route. That statement does not establish the capabilities of this machine's newer embedded CLI: its installed help advertises `--resume`, and its stream has a session ID. Actual authenticated resume still requires verification.

### Magpie routing is not a CLI or model identity

- [`internal/provider/group.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/provider/group.go) serves routing groups as `group/<id>` and can route among several models/accounts. A group's requested ID must be kept distinct from the model that actually answered.
- The earlier handoff records **国模之光** as the local group `group/never-stuck` and a prior actual response from `deepseek-v4.1-flash-free`. That is historical task evidence, not a guarantee of the next selected model. Do not hard-code a group name as a vendor/model or infer a model solely from its UI label.
- [`internal/agent/agy.go`](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/agent/agy.go) wires AGY custom models through a Gemini-compatible gateway and launch environment. It also manages AGY settings. This extension's native adapter does not need to reproduce those configuration mutations or read credentials; existing CLI sign-in remains owned by the installed CLI.
- Gemini thinking levels are model-specific in Magpie's gateway code. A Gemini label or routing-group label does not justify exposing every effort level. Discover supported values or omit the picker.

## Installed CLI evidence

Only installed help/code and isolated synthetic prompts were used. No personal conversations, auth stores, passwords, or tokens were copied into the repository. Ordinary CLI-owned test transcripts can be written to the CLI's own session storage; no user-level settings were edited.

### Qoder CN

- Installed npm package: `@qodercn-ai/qoderclicn`, version **1.1.74**. Run the package's `bundle/qoderclicn.js` with an installed Node executable. On Windows, the discovered `qodercn.cmd` is a dispatcher; invoke the JavaScript entry directly without a shell so prompt text stays literal.
- `--list-models` returned a `MODEL` header followed by the available identifiers, including `Auto`, `Fast`, and current Qwen/DeepSeek/GLM/Kimi/MiniMax entries. Model discovery is not itself an authenticated inference test.
- Current help also exposes `--reasoning-effort`, `--thinking`, and `--thinking-budget`. Installed source has per-model `efforts/defaultEffort` filtering, but `--list-models` prints names without those fields. Global flag acceptance is insufficient to invent per-model levels; the extension currently leaves these effort choices to the CLI.
- Safe chat flags tested: `--tools "" --permission-mode dont_ask --strict-mcp-config --mcp-config '{"mcpServers":{}}' --setting-sources "" --settings '{"disableAllHooks":true}' --output-format stream-json --include-partial-messages`, followed by optional `--model <id>`, optional exact `--resume <id>`, and `--print -- <prompt>`. Quotes in this paragraph describe argument boundaries; production passes a native argument array.
- The actual `init` event reported empty `tools` and `mcp_servers`. Builtin tools, external MCP tools, and hooks were disabled for the probe. No permission bypass or approval automation was used.
- A first `Fast` turn remembered a synthetic test word. A fresh process with the exact returned session ID recovered that word. Both completed successfully.
- A third turn was stopped at its first text delta by terminating its Windows process tree. The process exited; a subsequent fresh process resumed the same session and recovered the original word. This verifies local CLI cancellation plus continued persistence, not native Raycast's Cancel action.
- Qoder international uses the same protocol family in Magpie's source; an installed international build was not independently inferred against in this task.

### Qoder/WorkBuddy event contract

Observed stream envelopes use:

```text
{ type: "system", subtype: "init", session_id: "..." }
{ type: "stream_event", session_id: "...",
  event: { type: "content_block_delta",
           delta: { type: "text_delta", text: "..." } } }
{ type: "assistant", session_id: "...",
  message: { id: "...", content: [{ type: "text", text: "..." }] } }
{ type: "result", subtype: "success", is_error: false,
  session_id: "...", result: "...", permission_denials: [] }
```

Only `text_delta` is answer text. Thinking, tool input, and nested subagent events must not be rendered as assistant output. Assistant `text` and terminal `result` are snapshots, not additional deltas. A terminal failure or nonempty `permission_denials` must not become success just because the executable exits with code zero.

### WorkBuddy AI

- The installed desktop distribution bundles `cli/bin/codebuddy` and `cli/dist/codebuddy-lite-wb.mjs` under its `resources/app.asar.unpacked` directory. The launch works with Node and child-process environment `CODEBUDDY_FORCE_LITE_WB_BUNDLE=1`; omitting that environment selects an absent full/headless bundle in this particular installation.
- Installed package metadata identifies CodeBuddy CLI **2.161.0**; the bundled product identifies WorkBuddy AI **5.8.4**. Installed help supports print/stream JSON, partial messages, explicit resume, disabling tools, strict MCP configuration, and process-only permission modes.
- The same flags as Qoder apply, with permission mode spelled `dontAsk`. Installed `--help` advertises current product model IDs `fast-model`, `balanced-model`, `primary-model`, and `deep-model`; no `--list-models` option was advertised. Help also advertises `--effort`, but those aliases do not list their supported effort sets.
- The current implementation reads only the selected embedded bundle's static `cli/product.json`, with a 1 MiB limit and real-path containment check. It projects chat model identifiers, labels, and explicit `reasoning.supportedEfforts/defaultEffort` metadata, excluding media models and other fields. It does not read account configuration or credentials. Exact IDs are merged with the help aliases; no alias-to-model mapping is guessed. Reading failure falls back to help-only discovery.
- This installed bundle produced 23 catalog choices; 12 exact model IDs have explicit effort lists. For example, `hy3` advertises low/high while `gpt-6-astra` advertises low/medium/high/xhigh/max. These values are exposed only when this CLI's help includes the effort flag, validated per exact model, and passed as literal `--effort` argv. Refreshed/invalid selections are rejected before starting a process. Catalog entries do not establish account entitlement or successful inference.
- The harmless first inference returned `subtype: "error_during_execution"`, `is_error: true`, and an authentication-required message, while the executable exited **0**. The adapter must report the authentication failure. Desktop installation, catalog availability, and a running desktop app are insufficient evidence that the embedded CLI is authenticated.
- The `init` event advertised built-in tool inventory despite `--tools ""`. Because inference stopped at authentication, effective tool suppression was not demonstrated. Keep this limitation explicit; do not claim this is equivalent to Codex's read-only sandbox. Do not work around the blocker by copying desktop auth tokens.
- Authenticated WorkBuddy AI response, exact resumed response, and cancellation/resume remain unverified on this computer.

### Antigravity model and effort catalog update

Installed AGY **1.4.4** advertises `--effort` with global input values, but `agy models` returns model IDs/labels without per-model effort sets, and `models --json` is rejected. The Flash low/medium/high entries are separate model IDs returned by the CLI. Keep those variants intact rather than interpreting their suffixes as a shared effort picker. This updates older help-based capability assumptions without changing the earlier inference/resume evidence's recorded CLI version.

## Implementation consequences and remaining checks

1. Maintain separate provider keys, thread histories, drafts, model selections, and durable native session mappings.
2. Launch native executables or Node entry files with argument arrays. Never concatenate the user's prompt into a command string, and place positional prompts after `--` where the CLI supports it.
3. Require explicit terminal success plus a valid session identity; persist the mapping before announcing completion. Reject an unexpected ID during resume.
4. Stop the process tree and await its close before allowing provider switch or a new turn. Keep CLI errors distinct from cancellation and transport timeout.
5. Keep setup wording honest: installed/model-list-ready is not signed-in/inference-ready. WorkBuddy AI is currently blocked by authentication; do not overwrite global sign-in/configuration to make a test pass.
6. Native Raycast provider switching, composer behavior, per-provider restoration, and UI cancellation must still be checked separately against the final built extension. CLI smoke tests do not prove those UI behaviors.

The protocol unit tests added with this research cover literal argv, exact resume, provider-specific permission spelling, reasoning/subagent filtering, terminal errors, permission denials, and model-list parsing. Test traces and cancellation summaries stay outside the repository in the task workspace's `work/cli-probes` directory. Publication remains withdrawn; this work does not authorize a new Store submission.

## Final suite integration and review

The user clarified that AI in Raycast packages six independent root commands, each controlled by Raycast's native command enablement. Cross-command navigation uses `launchCommand` so disabled commands cannot be silently entered through the provider menu. Local Windows testing confirmed this behavior, then restored the temporary checkbox change.

A second real Magpie `group/never-stuck` review prompted preservation of optional Gemini event session IDs beyond init, a regression against conflicting terminal IDs, and repeated/escalated cleanup of detached Unix groups when the leader exits. Early mapping persistence was intentionally retained: cancellation must remain resumable, and a later conflicting ID is rejected without overwriting the first or saved mapping. Catalog command failures remain explicit; CLI Default applies when the supported catalog has no entries, not as a claim that a failing executable is usable.

Gemini Flash 3.8 completed UI design advice through native Antigravity after the Magpie route returned HTTP 402. Implemented provider-specific titles, simpler onboarding and calm native Markdown empty states. Suggested unsupported shortcuts and new namespaces that would lose installed data were rejected. This was not a successful Gemini-through-Magpie call.

See HANDOFF.md for the final native UI and subprocess verification matrix; this supersedes the earlier pending-UI list above. Remaining limitations include WorkBuddy CLI sign-in, Gemini CLI account eligibility, international Qoder validation, physical Enter key acceptance, and fresh macOS testing.
