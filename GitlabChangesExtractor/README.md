# GitLab Changes Extractor

A Chrome extension that quickly extracts and copies file names from GitLab pull request changes, with built-in history tracking.

## Features

✨ **Core Features:**
- 🚀 One-click extraction of file names from GitLab Changes tab
- 📋 Automatic clipboard copy of extracted file list
- 📊 Displays count of extracted files and warns about paginated results
- 🔄 Removes organization-specific dotted namespace prefixes automatically

📜 **History Tracking:**
- 💾 Stores up to 50 most recent copies
- 🔗 Saves URL and extraction timestamp with each copy
- 🚫 Prevents duplicate entries (same URL + same items)
- 📋 Copy any item from history with one click
- 🗑️ Delete individual history items or clear all
- 📥 Export history as JSON for backup/sharing

## Installation

### Method 1: Manual Installation
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the extension folder
6. The extension icon should appear in your toolbar

### Method 2: Package as .crx
1. Go to `chrome://extensions/`
2. Click the overflow menu → **Pack extension**
3. Select this folder as the root directory
4. Share the generated `.crx` file for installation

## Usage

### Basic Extraction
1. Navigate to a GitLab merge request page
2. Click the **"Changes"** tab to view file modifications
3. Click the extension icon in your toolbar
4. Click **"Extract & Copy"** button
5. The file list is automatically copied to your clipboard
6. Paste anywhere with `Ctrl+V` (or `Cmd+V` on Mac)

### Managing History
1. Click the extension icon
2. Click **"View History"** button
3. In the history page, you can:
   - **Copy**: Click the 📋 button to copy any previous extraction
   - **Delete**: Click the 🗑️ button to remove an item
   - **Clear All**: Remove all history entries (with confirmation)
   - **Export**: Download your history as a JSON file

### History Features
- **Automatic Deduplication**: Same URL + same items won't create duplicate entries
- **Smart Updates**: Re-copying same items updates the timestamp (moves to top)
- **Persistence**: History is stored locally in Chrome and persists across sessions
- **Export/Backup**: Export history as JSON with date-stamped filename

## What Gets Extracted

The extension looks for GitLab file names in the Changes tab and extracts:
- File paths and names from modified files
- Removes dotted namespace prefixes from extracted paths

## Warnings

⚠️ If the GitLab page has paginated results (multiple pages of changes):
- The extension shows a warning: "X more files on next page(s)"
- You'll need to navigate to the next page and extract again
- History tracking prevents you from accidentally storing duplicates

## File Structure

```
gitlabfilechangesextractor/
├── manifest.json       # Chrome extension configuration
├── popup.html          # Popup UI for extraction
├── popup.js            # Extraction logic & history saving
├── content_script.js   # (Placeholder, not used)
├── history.html        # History viewer page
├── history.js          # History management logic
└── README.md           # This file
```

## Permissions

The extension requests these Chrome permissions:

| Permission | Purpose |
|-----------|---------|
| `activeTab` | Access the current tab to extract file names |
| `scripting` | Execute content scripts on GitLab pages |
| `clipboardWrite` | Copy extracted text to clipboard |
| `storage` | Store copy history locally |

## Technical Details

### Data Storage
- History is stored in `chrome.storage.local`
- Maximum 50 entries retained automatically
- No data is sent to external servers

### Duplicate Detection
- Compares both URL and extracted text content
- Exact match required for deduplication
- Removing prefix characters counts as different content

### Browser Compatibility
- Chrome 88+ (uses Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

## Troubleshooting

### Files not extracting?
- Verify you're on a GitLab page with a Changes tab
- Check that the file list is visible (not collapsed)
- Try refreshing the page and extracting again

### History not saving?
- Check that storage permission is enabled in Chrome
- Clear browser cache and reload the extension
- Try exporting history to verify data exists

### Keyboard shortcut?
- Currently uses only the popup button
- You can add keyboard shortcuts in `chrome://extensions/` → "Keyboard shortcuts"

## Future Enhancements

Potential improvements:
- Keyboard shortcut for quick extraction
- Custom prefix removal patterns
- Search/filter in history
- Sync history across devices

## Support

For issues or feature requests, check:
1. GitLab project repository
2. Chrome extension settings and permissions

---

**Version:** 1.1  
**Last Updated:** March 2026
