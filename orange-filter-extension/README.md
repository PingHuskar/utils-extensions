<p align="center"><img src="logo.png" width="120" alt="Orange Filter logo"></p>

# Orange Filter

A small Chrome extension that lays a translucent orange tint (`#FE6B13` at 70% opacity) over every page you visit.

It uses Manifest V2, which current Chrome no longer loads. Use it in a browser that still supports MV2, or migrate the manifest to MV3 first (see Known issues).

## How it works

`content_script.js` runs on all URLs. When the page loads, it appends a fixed, full-viewport `<div>` (class `moveforward`) with a very high `z-index`. The div has `pointer-events: none`, so you can still click, scroll and select text through it.

## Install (unpacked)

1. Open `chrome://extensions` in a Chromium browser that supports Manifest V2.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this `orange-filter-extension` folder.
4. Reload any open tabs. The filter appears on every page.

## Customize

Edit `content_script.js`:

- `color`: the tint colour (default `#FE6B13`).
- `filterDiv.style.opacity`: the strength of the tint (default `0.7`).

Reload the extension after changing either one.

## Known issues

- **The toolbar toggle does nothing.** The popup sends a `toggleFilter` message to the page, but the content script has no `chrome.runtime.onMessage` listener, so it ignores it. The filter is always on.
- **Reloading is the only way to remove the filter.** Disable the extension or remove it, then reload the tab.
- **Manifest V2 is deprecated.** Chrome has stopped loading MV2 extensions. Moving to MV3 means `manifest_version: 3`, `action` instead of `browser_action`, and `host_permissions` for the match pattern.
- The script runs at the default `document_idle` and appends to `document.body`, so it may not apply on pages without a `<body>`, such as some XML or PDF views.

## Project structure

| File                | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `manifest.json`     | Extension manifest (MV2), permissions and content script   |
| `content_script.js` | Creates the orange overlay on every page                   |
| `popup.html`        | Toolbar popup markup                                       |
| `popup.js`          | Sends the (currently unhandled) toggle message             |

## Permissions

- `activeTab`: lets the popup message the current tab.
- Content script match `<all_urls>`: the overlay is injected on every site.
