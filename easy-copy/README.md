# Easy Copy

A Chrome extension (Manifest V3) that lets you select, right-click and copy text on sites that try to block it.

## Features

- **Re-enables selection and right-click.** Overrides CSS `user-select: none` and stops page scripts from cancelling the `copy`, `cut`, `contextmenu`, `selectstart` and `dragstart` events.
- **Floating Copy button.** Select any text and a small "Copy" button appears above the selection.
- **Per-paragraph copy icon.** Hover over a paragraph, list item, heading, quote, code block, table cell or caption and a ⧉ icon appears beside it. Click it to copy the whole block.
- **Per-site toggle.** Use the toolbar popup to turn Easy Copy off for a site where it gets in the way. The setting is remembered.
- **Clipboard fallback.** If the async Clipboard API isn't available on a page, it falls back to `document.execCommand("copy")`.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this `easy-copy` folder.
4. Pin **Easy Copy** to the toolbar if you want quick access to the toggle.

## Usage

- **Copy a selection:** highlight text, then click the **Copy** button that appears, or use the normal shortcut or right-click menu.
- **Copy a paragraph:** hover over it and click the ⧉ icon to its right.
- **Disable on a site:** click the Easy Copy toolbar icon and untick **Enable on this site**. It applies right away, with no reload needed.

A "Copied!" toast confirms each copy.

## Project structure

| File             | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `manifest.json`  | Extension manifest (MV3), permissions and content script registration |
| `content.js`     | Unblocks events, forces text selection, builds the Copy buttons and toast |
| `content.css`    | Styles for the Copy button, paragraph icon and toast                 |
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

Use Easy Copy for personal use such as quoting, note-taking and translation. Respect the copyright and terms of the sites you visit.

## Version

1.0.0
