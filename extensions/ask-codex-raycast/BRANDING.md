# AI CLI in Raycast assets

The manifest and CLI launcher use `assets/chat-icon.png`. Its editable source,
`assets/chat-icon.svg`, is a minimal black-and-white single speech bubble made
from two shapes. The shared icon identifies the suite; command names identify
each CLI. Conversations no longer render avatars.

Native Antigravity model `gemini-3.8-flash-high` generated two SVG proposals on
2026-10-21. Proposal A was selected, and Resvg mechanically rendered its SVG
unchanged to PNG. Resvg is an authoring tool, not an extension dependency.
The earlier suite, command and avatar assets are retained as legacy files;
they are not the active manifest/launcher branding.

The attempted Magpie Gemini route returned HTTP 402. The successful SVG work
used native Antigravity; it was not a Magpie image-generation request. Two
separate Gemini web image attempts had a baked checkerboard background and
were not adopted. No provider or Raycast logo was traced into the new icon.
Opus 5.5 and Haiku attempts returned no design content because of funding and
quota-cooldown failures respectively; neither contributed to the delivered icon.

This is development branding. Store publication remains withdrawn; review
branding, screenshots, and current Store requirements before any future
user-authorized application.
