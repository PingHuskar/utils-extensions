<p align="center"><img src="logo.png" width="120" alt="utils-extensions logo"></p>

# utils-extensions

A collection of small Chromium (Manifest V3) browser extensions for everyday utility tasks. Each extension lives in its own folder and can be loaded independently.

| Extension | What it does |
| --- | --- |
| [easy-copy](easy-copy/) | Re-enables text selection, right-click and copy on sites that block them, with a floating Copy button and per-paragraph copy icons. |
| [CopyHeader](CopyHeader/) | Stores key-value variables, copies them with one click, and keeps a copy history. Also runs saved CSS selectors against the current page and copies the result. |
| [RepoQR](RepoQR/) | Shows a locally generated QR code above a GitHub repository's About section that points to the repo's website. |
| [orange-filter-extension](orange-filter-extension/) | Overlays a translucent orange tint on every page. Manifest V2; the popup toggle is not wired up yet. |

## Install (any extension)

1. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge, or another Chromium browser).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the extension's folder (e.g. `easy-copy`).
4. After changing the code, click the reload icon on the extension's card.

No build step is needed to load them. RepoQR has an optional one for rebuilding its bundled QR generator (see its README).

## Extensions

### easy-copy

- Overrides `user-select: none` and stops pages from cancelling `copy`, `cut`, `contextmenu`, `selectstart` and `dragstart`.
- Floating **Copy** button on text selection; ⧉ icon on hover for paragraphs, list items, headings, quotes, code blocks, table cells and captions.
- Per-site on/off toggle from the toolbar popup.
- Permissions: `storage`, and access to all sites so it can run on any page.

See [easy-copy/README.md](easy-copy/README.md).

### CopyHeader

- **Variables** tab: add, search and copy name/value pairs.
- **History** tab: the last 50 copies.
- **Query** tab: run a CSS selector on the active page, read a property (`textContent`, `value`, `innerHTML`, `href`, `src`, `outerHTML`, or any attribute), copy the result, and save selectors for reuse.
- Data is stored locally with `chrome.storage.local`.
- Permissions: `storage`, `clipboardWrite`, `activeTab`, `scripting`.

### RepoQR

- Adds a QR code on GitHub repository main pages when the About section lists a website.
- QR codes are generated in the browser; no browsing data goes to a QR service.
- Runs only on `https://github.com/*`.
- Optional development: `npm install`, `npm run build`, `npm test`.

See [RepoQR/README.md](RepoQR/README.md).

## Repository layout

```text
utils-extensions/
├── easy-copy/    # copy-unblocker extension
├── CopyHeader/   # variable manager + selector query
├── RepoQR/       # GitHub repo QR code
└── orange-filter-extension/   # orange page tint (MV2)
```
