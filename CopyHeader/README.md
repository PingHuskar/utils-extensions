# CopyHeader

A Chrome extension (Manifest V3) for storing key-value variables and copying them with one click. It keeps a history of recent copies and can pull values out of the current page with a CSS selector.

## Features

- **Variables.** Add name/value pairs (name up to 100 characters, value up to 1000). Search by name or value, edit a value in place, delete, and copy with one click.
- **History.** Every copy is logged with a relative timestamp. The last 50 entries are kept, newest first, and you can clear them.
- **Query.** Run a CSS selector against the active tab and copy the result.
  - Read `textContent`, `value`, `innerHTML`, `href`, `src`, `outerHTML`, or any attribute by name.
  - Only the first matching element is used.
  - Save selectors with an optional label. Clicking a saved selector loads it into the form and runs it.
  - Copying a query result is also logged in History, using the selector as the name.
- **Clipboard fallback.** If the async Clipboard API is blocked in the popup, it falls back to `document.execCommand("copy")`.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this `CopyHeader` folder.
4. Pin **CopyHeader** to the toolbar for quick access.

## Usage

- **Add a variable:** open the popup, enter a name and a value, then press Enter or click **+ Add Variable**.
- **Copy a variable:** click **Copy** next to it. Use **Edit** to change its value; Enter saves and Esc cancels.
- **Query a page:** go to the **Query** tab and enter a selector such as `label#lblApplID`. Choose a property and click **Run**, then **Copy** to copy the result. Click **+ Save** to keep the selector for later.

Queries do not work on pages where Chrome blocks script injection, such as `chrome://` pages and the Chrome Web Store. Use a regular `http` or `https` page.

## Project structure

| File             | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `manifest.json`  | Extension manifest (MV3), permissions and toolbar popup        |
| `popup.html`     | Popup markup for the Variables, History and Query tabs         |
| `popup.css`      | Popup styles                                                   |
| `popup.js`       | Variable, history and query logic; storage and clipboard       |
| `icons/`         | Toolbar and extension icons (16, 48, 128 px)                   |

## Permissions

- `storage`: saves variables, history and saved selectors in `chrome.storage.local`. Data stays on your device.
- `clipboardWrite`: copies values to the clipboard.
- `activeTab`: lets the Query tab act on the tab you are viewing, when you open the popup.
- `scripting`: runs the selector lookup in the active tab.
