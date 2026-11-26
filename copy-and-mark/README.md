<p align="center"><img src="logo.png" width="120" alt="Copy & Mark logo"></p>

# Copy & Mark

A Chrome extension (Manifest V3) that lets you select, right-click and copy text on sites that try to block it.

## Features

- **Re-enables selection and right-click.** Overrides CSS `user-select: none` and stops page scripts from cancelling the `copy`, `cut`, `contextmenu`, `selectstart` and `dragstart` events.
- **Floating Copy button.** Select any text and a small "Copy" button appears above the selection.
- **Per-paragraph copy icon.** Hover over a paragraph, list item, heading, quote, code block, table cell or caption and a ⧉ icon appears beside it. Click it to copy the whole block. The block is outlined with a dashed blue border so you can see exactly what will be copied (it's an overlay, so the page's own styles are untouched).
- **Pick mode (`Alt+H`).** Outline any element on the page (`div`, card, image, section…), mark it Pass / Fail / Check later / Not sure with a number and note, and copy a PNG screenshot or a text report, so there's no need for the Snipping Tool.
- **Per-site toggle.** Use the toolbar popup to turn Copy & Mark off for a site where it gets in the way. The setting is remembered.
- **Clipboard fallback.** If the async Clipboard API isn't available on a page, it falls back to `document.execCommand("copy")`.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this `copy-and-mark` folder.
4. Pin **Copy & Mark** to the toolbar if you want quick access to the toggle.

## Usage

- **Copy a selection:** highlight text, then click the **Copy** button that appears, or use the normal shortcut or right-click menu.
- **Copy a paragraph:** hover over it and click the ⧉ icon to its right.
- **Pick mode:** press `Alt+H`. Hover to outline an element, then:
  - **Click** to pin a numbered border on it using the last-used status (click again to remove it).
  - **`P` / `F` / `L` / `N`** set the status of the hovered element: green **Pass**, red **Fail**, amber **Check later**, purple **Not sure**. This also pins it if it isn't pinned yet.
  - **`E`** opens a small editor to change the pin's number and add a note. `Enter` saves, `Shift+Enter` adds a newline, `Esc` cancels. Pins are numbered automatically (1, 2, 3…) and the label shows `#number STATUS · note`.
  - **`Delete`** removes the hovered pin.
  - **`R`** copies a text report of all pins (`#1 [FAIL] div.card "…" - note`) with the page title and URL.
  - **`S`** copies a screenshot of the hovered element, label and border included, then paste it anywhere. The copy happens about 0.3s after the press, in case a second press follows.
  - **`S` `S`** (double-press) copies a screenshot of the whole visible screen, with all pinned labels and borders but without the hover outline.
  - **`Esc`** or `Alt+H` to exit. `Alt+Shift+H` clears all pins.
  - The element must be visible in the viewport to be screenshotted.
- **Screenshot stamp:** every screenshot gets `name · YYYY-MM-DD HH:MM:SS` in its bottom-right corner. Set the name in the toolbar popup (**Your name**); leave it empty to stamp only the date and time.
- **Disable on a site:** click the Copy & Mark toolbar icon and untick **Enable on this site**. It applies right away, with no reload needed.

A "Copied!" toast confirms each copy.

## Project structure

| File             | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `manifest.json`  | Extension manifest (MV3), permissions and content script registration |
| `content.js`     | Unblocks events, forces text selection, builds the Copy buttons and toast |
| `content.css`    | Styles for the Copy button, paragraph icon and toast                 |
| `background.js`  | Service worker that captures the visible tab for element screenshots |
| `popup.html`     | Toolbar popup markup                                                 |
| `popup.js`       | Reads and writes the per-site enable setting                         |

## Permissions

- `storage`: remembers which sites you've disabled (`chrome.storage.local`, key `disabledSites`).
- `host_permissions: <all_urls>`: runs the content script on every page so copying works wherever you need it.

No data leaves your browser, and the extension makes no network requests.

## Limitations

- Only runs in the top frame (`all_frames` is `false`), so content inside iframes isn't unlocked.
- Doesn't run on pages Chrome restricts, such as `chrome://` pages and the Chrome Web Store.
- Text rendered as images or inside `<canvas>` can't be copied.
- Sites that detect and re-block selection in unusual ways may still resist.

## Responsible use

Use Copy & Mark for personal use such as quoting, note-taking and translation. Respect the copyright and terms of the sites you visit.

## Version

1.0.0
