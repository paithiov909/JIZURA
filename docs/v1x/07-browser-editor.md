# 07 — Browser editor and export

**Depends on:** tasks 04, 05 and 06. Preserve the `codex/webmcp` behavior, not the older `main` UI.

## Work

Move the editor UI, styles and browser services to the Vite entry points. Retain simple/advanced/mobile modes, lyrics and timing, cut editing, history, styles, fonts, audio, preview, persistence, JSON import/export, AE-plan export, and MP4/PNG output variants. Produce the Pages site and the tested offline distribution from the same source. Keep the current route and local-file behavior established in task 02.

Expose a typed editor application API for task 08. Do not bind WebMCP directly to DOM implementation details if an existing UI operation can be called through the same application path.

## Deliverable and acceptance

- Browser interaction checks cover a representative project from input through preview, save/load and every export family.
- Output file contents and naming remain compatible where task 01 defines them; supported degradation for codecs/fonts stays visible to users.
- Hosted and offline startup both work. Task 08 can call editor operations without duplicating mutation logic.

**Handoff to:** tasks 08 and 10.
