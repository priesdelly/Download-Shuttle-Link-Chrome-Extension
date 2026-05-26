# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory skills

- Always apply `andrej-karpathy-skills:karpathy-guidelines` when writing, reviewing, or refactoring code in this repo (minimal code, surgical changes, no speculative abstractions, explicit assumptions).

## Project

Chrome/Edge MV3 extension (vanilla JS, no build, no deps) that intercepts downloads of supported file types and hands them off to the macOS Download Shuttle app via the `downloadshuttle://add/<encoded-json-array>` protocol.

## Develop / Test

- Load unpacked: `chrome://extensions/` → Developer mode → "Load unpacked" → select the `src/` folder (manifest lives in `src/`).
- After edits: reload the extension from `chrome://extensions/` (no build step; MV3 service workers do not hot-reload file edits).
- Background logs: `chrome://extensions/` → "service worker" link.
- Popup logs: right-click the popup → Inspect.
- Pack for store: `./pack.sh` (zips `src/` into `dist/`).

## Architecture

Three coordinated scripts, each in a different Chrome extension context — they cannot share memory and must communicate via messages or storage.

- [src/background.js](src/background.js) — service worker. Two-stage download interception:
  1. `chrome.downloads.onCreated`: sync gates (state, macOS, extension/MIME match), then `chrome.downloads.pause()` immediately + track in `heldDownloads` Map + kick off async `decideDownload`.
  2. `chrome.downloads.onDeterminingFilename`: if the download is still being decided, stash the `suggest` callback and `return true` to defer Chrome's native "Save As" dialog.
  3. `decideDownload`: awaits re-entry guard, Alt-key check; then either cancels+erases (intercept → open popup) or calls stashed `suggest()` + `resume()` (release).
- [src/content.js](src/content.js) — runs on `<all_urls>` at `document_start`. Tracks Alt-key state and replies to `checkAltKey` messages. Must guard `chrome.runtime?.id` (context invalidates on extension reload).
- [src/popup.js](src/popup.js) + [src/popup.html](src/popup.html) — reads `pendingDownload` from `chrome.storage.session`, expires after 5 min. Offers two paths: a real `<a href="downloadshuttle://...">` user click (browsers forbid extensions from triggering custom protocols programmatically) or a `browserDownload` message back to background.

### Cross-cutting invariants

- **macOS-only.** `isMacOS` is cached after a `getPlatformInfo()` warm-up at module load. On non-macOS the extension stays fully passive (no interception, no popup).
- **Pause-then-decide.** Always pause in `onCreated` before any async work. Cancelling later against a paused download is reliable; cancelling against a download whose state has moved on is not.
- **Defer dialog via `onDeterminingFilename`.** Returning `true` + stashing `suggest` is what suppresses the native "Save As" dialog. On intercept, never call the stashed `suggest` — `cancel` kills the download. On release, call stashed `suggest()` THEN `resume()`.
- **Session storage for re-entry guard.** `BROWSER_URL_KEY` stores URLs (not IDs) in `chrome.storage.session` so the guard survives service-worker restart and is in place before `chrome.downloads.download` fires `onCreated`. Don't move to `local` (would persist across browser restart) or to an in-memory Set (would lose on suspend).
- **`consumeLastError` everywhere.** Every `chrome.downloads.*` callback must read `chrome.runtime.lastError` (the `consumeLastError` helper does this) to prevent "Unchecked runtime.lastError" warnings on benign races.
- **Alt-only modifier.** Bypass interception only when `event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey` — Cmd/Shift conflict with browser link defaults on macOS.
- **Adding file types:** extend `FILE_EXTENSIONS` (pathname match — `.url` not `.finalUrl`, ignores query strings) and/or `MIME_TYPES` in [src/background.js](src/background.js). Either match triggers interception.

## Reference docs in repo

- [README.md](README.md) — user-facing usage and supported file types.
- [DEVELOPMENT.md](DEVELOPMENT.md) — deeper notes on design decisions.
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — per-version changelog. Bump `src/manifest.json` `version` and append a new top entry for each release.
