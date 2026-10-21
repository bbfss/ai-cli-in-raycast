# AI in Raycast — development handoff (2026-10-21)

## Start here

Continue developing **AI in Raycast**, a native Raycast chat surface for installed AI CLIs. The human asked to withdraw the old Store application and broaden the extension beyond Codex. Do not reopen the withdrawn application or submit a new Store PR unless asked.

Repository: https://github.com/bbfss/raycast-extensions
Branch: `feat/ai-in-raycast-multi-cli`
Extension directory: `extensions/ask-codex-raycast`
The package's internal name remains `ask-codex-raycast` to retain existing Raycast data. Its visible name is **AI in Raycast**.

Old application https://github.com/raycast/extensions/pull/31456 was confirmed **closed, not merged**, on 2026-10-21. Previous integration PR #32387 is also closed. The new development branch is separate from the old PR head.

## Implemented

- `provider.ts`: common ChatClient contract and explicit capabilities; Codex retains its app-server bridge.
- `provider-antigravity.ts`: installed `agy` executable, stream-json lifecycle, model discovery, stable local thread IDs mapped to explicit remote conversation IDs. No implicit `--continue` of a globally recent session.
- `session-storage.ts`: separate history, drafts, setup, and model keys per CLI. Codex retains all original keys.
- `provider-menu.tsx`: Gemini-assisted native Provider menu, Cmd/Ctrl+P, reselecting the current provider is a no-op.
- Root provider switching remounts setup/chat after saving the old conversation. Active replies must stop before switching.
- Setup checks the chosen local CLI and requires an available model. The native composer/Actions order includes Provider, Model, supported Effort Level, and New Chat.
- The UI remains a full-width Detail with a floating Enter-to-compose/Enter-to-send input; no left placeholder row, no separate app. Native Markdown/math and saved drafts are preserved.
- Antigravity has no in-progress steering here, and no separate effort picker; choose its model variants. Its `--sandbox --mode plan` is not represented as identical to Codex's sandbox guarantees.

## Verified and limitations

At handoff, build, TypeScript, lint and **43 tests** passed in the Mac development workspace. Tests cover provider storage isolation, session mapping/resume, model parsing, draft acknowledgement races, setup migration, Markdown and Codex protocol behavior.

A real Antigravity adapter smoke run completed two turns: remember a test word, then recover it using the explicit conversation ID. This did not change global CLI configuration. Windows native UI and the final combined provider switch UI have not been manually verified. Test the exact commit you pull if there are later changes.

Antigravity requires its native executable on Windows; `.cmd/.bat/.ps1` wrappers are intentionally rejected. Install/sign in on that computer independently. Local Raycast storage and CLI sign-ins do not transfer with Git. Never copy auth/token stores into the repository.

## Requested collaboration and Magpie research

The human explicitly requested Gemini for front-end assistance and Magpie's **国模之光** for part of the backend work. Both were actually called:

- Gemini via installed `agy`, `gemini-3.8-flash-high`, isolated sandbox/new project, produced provider-menu recommendations. Only task constraints were supplied, not private chat history or credentials.
- Magpie local `models codex` and `group never-stuck` identified `group/never-stuck` as **国模之光**. The actual call returned `deepseek-v4.1-flash-free`. Its feedback highlighted durable session IDs, bounded streaming output, cancellation of process trees, and interactive approval handling. The result was truncated, so do not claim a complete independent review.

The authoritative repository is https://github.com/yetone/magpie (confirmed from the installed binary and public GitHub README). Its README describes a local gateway for OpenAI Chat/Responses, Anthropic Messages and Gemini, with separate agents/providers. The source tree includes `internal/gateway/chat.go` and `internal/sessions/calls_agy.go`; their implementations have **not yet been inspected in depth**. The current adapter is based on installed CLI help and actual stream-json traces, not copied Magpie code. Continue that source comparison next; do not recreate authentication from browser cookies or expose credentials.

Mac-only collaboration request/response artifacts were saved outside this repository under the original task workspace `output/ai-in-raycast-2026-10-21` and possibly the backend research output. They are not required to build and should not be blindly published. Their relevant conclusions are summarized above.

## Next steps

1. Install dependencies and run build, types, tests, and lint on the receiving computer.
2. Verify provider switching, setup, model selection, Enter composer, cancellation and restart/resume in real Raycast; verify no cross-provider conversation leakage.
3. Read the Magpie gateway/session implementations and complete the reference comparison and improve the adapter contract only where evidence supports it.
4. Review Antigravity authentication-check limits: listing models is not proof of inference entitlement or a live credential check.
5. Update screenshots/branding before any new Store submission. Existing metadata screenshot shows the earlier Codex branding and is not evidence of the multi-provider UI.

## Product constraints

Keep the native window and compact full-width Markdown UI. Keep history behind an explicit action, do not use prompt text as history search. Effort selection is a native list: select Effort Level, Enter, choose a supported value, Enter. Raycast's public menu API has no hover callbacks or draggable slider.

The Raycast repository `.github/copilot-instructions.md` requires US-English UI and avoids custom localization. The earlier ten-language implementation was removed in commit a6fed0ab after verified review feedback; it remains in Git history. Model responses may be in Chinese or the user's requested language.

## Commands (extension directory)

```sh
npm ci
npm run build
npx tsc --noEmit
npm test
npm run lint
npm run dev
```

Do not infer Store publication from successful CI or bot review. The previous application was deliberately withdrawn.
