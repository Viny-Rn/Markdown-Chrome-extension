# Markdown Studio 📝↓

A minimalist, highly premium, and offline-capable Markdown editor packaged as a Google Chrome Extension. Instead of overriding your default New Tab page, it launches cleanly in a new tab when you click the extension icon on your browser toolbar.

---

## Key Features

* **Multi-View Modes**: Seamlessly toggle between **Editor Focus**, **Live HTML Preview**, and **Split-Screen** layout views.
* **Curated Themes**: Switch instantly between four premium, custom-designed themes:
  * ☀️ **Light**: Warm paper hues for comfortable day writing.
  * 📖 **Sepia**: Soft, low-contrast book tones for a relaxed reading experience.
  * 🌙 **Dark**: Elegant dark slate tones.
  * ⬛ **OLED**: True pitch black for high-contrast screens and battery efficiency.
* **Auto-Save Status**: Tactile, real-time indicator that auto-saves your work locally to `chrome.storage.local` as you type (runs completely offline).
* **Adjustable Typography**: Quickly scale the editor font size up or down with dynamic toolbar controls.
* **Drag & Drop Import**: Drag and drop any `.md` or `.txt` file directly into the editor to import its contents and filename immediately.
* **Rich Markdown Support**: Full CommonMark rendering, including styled tables, responsive images, custom code blocks, inline styling, and accented blockquotes.
* **Pro Exports & Printing**:
  * Save/download documents as raw `.md`.
  * Export structured articles to styled, self-contained `.html` files.
  * Preview and print layout configurations optimized for A4 paper and PDF export.

---

## Installation & Developer Setup

To load this extension in your Chrome browser locally for development:

1. Download or clone this repository to your local machine.
2. Open Google Chrome and navigate to: `chrome://extensions/`
3. Toggle the **Developer mode** switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the root folder of this project (`Markdown-Chrome-extension`).
6. Pin **Markdown Studio** to your Chrome toolbar.
7. Click the icon to open your personal markdown workspace!

---

## Keyboard Shortcuts

Enhance your writing flow with built-in shortcuts:

| Action | Shortcut (Mac / Windows / Linux) |
| :--- | :--- |
| **Save Document (.md)** | `Cmd / Ctrl + S` |
| **Export HTML** | `Cmd / Ctrl + E` |
| **Print / Save to PDF** | `Cmd / Ctrl + P` |
| **Switch to Editor View** | `Cmd / Ctrl + 1` |
| **Switch to Preview View** | `Cmd / Ctrl + 2` |
| **Switch to Split View** | `Cmd / Ctrl + 3` |
| **Toggle Help Panel** | `Cmd / Ctrl + /` |
| **Format Bold** | `Cmd / Ctrl + B` |
| **Format Italic** | `Cmd / Ctrl + I` |
| **Insert Link** | `Cmd / Ctrl + K` |
| **Format Inline Code** | `Cmd / Ctrl + \`` |

---

## File Structure

```bash
Markdown-Chrome-extension/
├── manifest.json      # Extension metadata, permissions, and service worker registration
├── background.js     # Service worker listening for toolbar action click events
├── editor.html       # The main Markdown Studio HTML workspace structure
├── style.css         # Styling system for variable themes, editor, & parsed markdown
├── app.js            # Core application state, event routing, and export handlers
├── lib/
│   └── marked.min.js # Local parser library for Manifest V3 CSP offline safety
└── icons/
    ├── icon16.png    # Extension toolbar icon
    ├── icon48.png    # Extension dashboard icon
    └── icon128.png   # Extension store icon
```

---

## Technical Highlights (Manifest V3)

* **Local Compilation**: Complies with Manifest V3 Content Security Policies by running markdown parsing through local script files, completely avoiding external CDN dependencies.
* **Storage Reliability**: Automatically falls back to `localStorage` if run outside the Chrome Extension sandbox (useful for local browser testing and design iterations).
* **Safe Exports**: Integrates with the `chrome.downloads` API for tab sandboxing compatibility, falling back to standard blob anchor click download actions when run in standard frames.
