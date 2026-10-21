# AI CLI in Raycast assets

The extension, suite launcher, and settings command use `assets/chat-icon.png`. Its editable source,
`assets/chat-icon.svg`, is a minimal black-and-white single speech bubble made
from two shapes. The shared icon identifies the suite. Each CLI command,
launcher row, settings row and provider menu uses its corresponding provider
logo. Qoder and Qoder CN share the same official brand asset and retain
distinct command names.

Native Antigravity model `gemini-3.8-flash-high` generated two SVG proposals on
2026-10-21. Proposal A was selected, and Resvg mechanically rendered its SVG
unchanged to PNG. Resvg is an authoring tool, not an extension dependency.
The earlier suite, command and CLI avatar assets are retained as legacy files;
they are not the active manifest/launcher branding. The generic human glyph
`assets/user-avatar.svg` is active beside user-message role labels.

The attempted Magpie Gemini route returned HTTP 402. The successful SVG work
used native Antigravity; it was not a Magpie image-generation request. Two
separate Gemini web image attempts had a baked checkerboard background and
were not adopted. No provider or Raycast logo was traced into the new icon.
Opus 5.5 and Haiku attempts returned no design content because of funding and
quota-cooldown failures respectively; neither contributed to the delivered icon.

This is development branding. Store publication remains withdrawn; review
branding, screenshots, and current Store requirements before any future
user-authorized application.

## Provider logos (verified 2026-10-21)

These identify the installed CLI providers; no provider logo was generated or
redrawn by an AI. All five PNGs use a transparent 512 × 512 canvas. Resvg only
scaled the existing raster asset proportionally with a small transparent margin;
the brand shape and colors are preserved. A contact sheet was inspected at
32 pixels on light and dark backgrounds. Qoder CN intentionally uses Qoder's
same brand logo rather than an invented regional variation.

| Asset                             | Source and verification                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/provider-codex.png`       | Reused the purple Codex terminal mark from this repository's [Codex extension asset](https://github.com/bbfss/raycast-extensions/blob/6c80947be4c5cedeaea27fd3e004c4def1e81987/extensions/codex/assets/extension-icon.png). That community extension declares MIT in its manifest. This is a reused product identifier, not a claim that the extension is published by OpenAI. Original PNG SHA-256: `25195ae390c77263fb205d53edf44fc01fbd1a64a42f78ce094a05b4b42df107`. |
| `assets/provider-antigravity.png` | Downloaded [Antigravity's official PNG](https://antigravity.google/assets/image/antigravity-logo.png), linked as an icon by [its official site](https://antigravity.google). The existing sibling extension's PNG showed visible raster artifacts and was not adopted. Original SHA-256: `193ba1805de11c23cd0c7a1df92aa0a886708e57350f6f7766100afe5befed73`.                                                                                                             |
| `assets/provider-qoder.png`       | [Official PNG on Alibaba's CDN](https://img.alicdn.com/imgextra/i4/O1CN01QkSxiCocd3D0prc8_!!6000000008124-2-tps-412-412.png), explicitly linked by both [qoder.com](https://qoder.com) and [qoder.cn](https://qoder.cn) as their favicon and Apple touch icon. Both sites returned the same URL. Original SHA-256: `2276f0f8e6240959e70b83ebc48ec1dac1c0180e24528794f9a52b7386026f3d`.                                                                                   |
| `assets/provider-workbuddy.png`   | Read the existing official WorkBuddy AI 5.8.4 application's `resources/app.asar.unpacked/resources/icon.png` from this computer's installation. No account data or credentials were read. Original SHA-256: `3c2bc7d338c9eacc027af2b27693056b7cbea3a6c0a09225cf87020afe57fd7b`.                                                                                                                                                                                          |
| `assets/provider-gemini.png`      | [Gemini CLI's official icon](https://geminicli.com/icon.png), linked as the shortcut icon by [geminicli.com](https://geminicli.com). Its terminal mark also matches the sibling Gemini CLI extension's existing asset. Original SHA-256: `351e9f5b1bf863d738cd7be4ed040a625a1419450ae7fc490143e4042b7c2438`.                                                                                                                                                             |

The provider filenames are exported by `PROVIDER_ICONS` / `providerIcon` in
`src/provider.ts`, so chat headings or message avatars can use the same assets.
The suite's Gemini-generated single-bubble logo remains distinct from these
provider identifiers. Store publication remains withdrawn.

## Human message avatar

`assets/user-avatar.svg` is the existing generic head-and-shoulders glyph from
this project. It identifies the human speaker beside “You” in the transcript,
rather than a provider or send button. It uses the same 18px inline `<sub>`
alignment as the AI headings. It is not a personal photo or generated brand mark.
