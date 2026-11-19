<p align="center"><img src="logo.png" width="120" alt="Repo Party logo"></p>

# Repo Party

A browser extension that makes GitHub's empty-repository **Quick setup** page more fun.

## What it does

- Adds a gradient-bordered banner with a random cheerful message and a bobbing 🚀.
- Click the rocket for a launch animation and confetti; click **Party** for more confetti.
- Click any command line in the setup blocks to copy just that line, with a confetti pop and toast.
- The existing copy buttons (clone URL and command blocks) also trigger confetti and a toast.
- Celebrates once per repository per tab session when the page loads.
- Honors `prefers-reduced-motion` (no confetti or animation).

It only acts on pages that contain the "Quick setup" section, so normal repositories are untouched.

## Install

1. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Create a new empty repository on GitHub, or open one, and refresh.

No permissions are requested beyond running on `https://github.com/*`. Nothing is stored or sent anywhere.
