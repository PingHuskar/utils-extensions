# Repo QR

A browser extension that shows a QR code above a GitHub repository's About
section. The code opens the website listed in About. Repositories without a
website do not show a code. QR codes are generated locally; browsing data is
not sent to a QR-code service.

## Install

1. In Chrome, Edge, or another Chromium browser, open the extensions page
   (`chrome://extensions` in Chrome, `edge://extensions` in Edge).
2. Enable **Developer mode** and select **Load unpacked**.
3. Select this folder, then open or refresh a repository page. After an update,
   reload the extension on the extensions page and refresh GitHub.

The extension runs on GitHub so it can also handle GitHub's in-page navigation,
but it displays the QR code only on repository main pages.

## Development

The bundled QR generator is included, so installation does not require Node.js.
To rebuild it or run the tests, install Node.js and run:

```text
npm install
npm run build
npm test
```

The bundled generator uses `qrcode` and `dijkstrajs`; their licenses are in
`third-party-licenses.txt`.
