/* ── Markdown Studio — app.js ─────────────────────────────────────────── */

// ── State ───────────────────────────────────────────────────────────────
let currentMode = 'editor'; // 'editor' | 'preview' | 'split' | 'help'
let currentTheme = 'light';
let currentFontSize = 14;
let saveTimeout = null;

// ── DOM refs ────────────────────────────────────────────────────────────
const editor         = document.getElementById('editor');
const workspace      = document.getElementById('workspace');
const editorPane     = document.getElementById('editor-pane');
const previewPane    = document.getElementById('preview-pane');
const helpPane       = document.getElementById('help-pane');
const previewContent = document.getElementById('preview-content');
const wordCountEl    = document.getElementById('word-count');
const filenameInput  = document.getElementById('filename-input');
const printOverlay   = document.getElementById('print-overlay');
const printFrame     = document.getElementById('print-frame');
const fontSizeVal    = document.getElementById('font-size-val');
const btnFontDec     = document.getElementById('btn-font-dec');
const btnFontInc     = document.getElementById('btn-font-inc');
const themeSelect    = document.getElementById('theme-select');
const printConfirm   = document.getElementById('print-confirm');
const printClose     = document.getElementById('print-close');
const editorContainer = document.getElementById('editor-container');

// ── Storage Utility (Chrome Storage API with LocalStorage Fallback) ──
const storage = {
  get: function(keys, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback);
    } else {
      const res = {};
      for (let k in keys) {
        const val = localStorage.getItem(k);
        res[k] = val !== null ? val : keys[k];
      }
      callback(res);
    }
  },
  set: function(items, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(items, callback);
    } else {
      for (let k in items) {
        localStorage.setItem(k, items[k]);
      }
      if (callback) callback();
    }
  }
};

// ── marked.js config ────────────────────────────────────────────────────
if (typeof marked !== 'undefined') {
  const markedConfig = {
    breaks: true,
    gfm: true,
  };
  if (marked.use) {
    marked.use(markedConfig);
  } else if (marked.setOptions) {
    marked.setOptions(markedConfig);
  }
}

// ── Render preview ───────────────────────────────────────────────────────
function renderPreview() {
  if (typeof marked !== 'undefined') {
    previewContent.innerHTML = marked.parse(editor.value || '');
  } else {
    // Fallback: basic render if CDN unavailable
    previewContent.innerHTML = `<pre>${escapeHtml(editor.value)}</pre>`;
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Word / Character / Reading Time Count ──────────────────────────────────
function updateWordCount() {
  const text = editor.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = editor.value.length;
  // Avg reading speed: 200 WPM
  const readTime = Math.max(1, Math.ceil(words / 200));
  wordCountEl.textContent = `${words}w • ${chars}c • ${readTime}m`;
}

// ── Mode switching ────────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  workspace.className = 'workspace';
  editorPane.classList.add('hidden');
  previewPane.classList.add('hidden');
  helpPane.classList.add('hidden');

  document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.classList.remove('active'));

  if (mode === 'editor') {
    editorPane.classList.remove('hidden');
    document.getElementById('btn-editor').classList.add('active');
    editor.focus();
  } else if (mode === 'preview') {
    renderPreview();
    previewPane.classList.remove('hidden');
    document.getElementById('btn-preview').classList.add('active');
  } else if (mode === 'split') {
    renderPreview();
    workspace.classList.add('split');
    editorPane.classList.remove('hidden');
    previewPane.classList.remove('hidden');
    document.getElementById('btn-split').classList.add('active');
  } else if (mode === 'help') {
    helpPane.classList.remove('hidden');
    document.getElementById('btn-help').classList.add('active');
  }
}

// ── Theme Management ──────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  currentTheme = theme;
  themeSelect.value = theme;
  storage.set({ 'md-studio-theme': theme });
}

// ── Font Size Management ──────────────────────────────────────────────────
function applyFontSize(size) {
  currentFontSize = Math.max(12, Math.min(24, size));
  document.body.style.setProperty('--editor-font-size', `${currentFontSize}px`);
  fontSizeVal.textContent = `${currentFontSize}px`;
  storage.set({ 'md-studio-fontsize': currentFontSize });
}

// ── Auto-save Status ──────────────────────────────────────────────────────
function setSaveStatus(status) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = statusIndicator.querySelector('.status-text');
  if (status === 'saved') {
    statusIndicator.classList.remove('unsaved');
    statusText.textContent = 'Saved';
  } else {
    statusIndicator.classList.add('unsaved');
    statusText.textContent = 'Saving...';
  }
}

function triggerAutoSave() {
  setSaveStatus('unsaved');
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    storage.set({
      'md-studio-content': editor.value,
      'md-studio-filename': filenameInput.value
    }, () => {
      setSaveStatus('saved');
    });
  }, 1000); // Trigger save 1s after last input
}

// ── Downloads Manager (Chrome Downloads API with standard fallback) ──────
function downloadFile(content, mimeType, defaultName) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const safeName = defaultName.replace(/[\\/]/g, '_');
  
  if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({
      url: url,
      filename: safeName,
      saveAs: true,
      conflictAction: 'overwrite'
    }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    });
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

// ── Save as .md ───────────────────────────────────────────────────────────
function saveMarkdown() {
  let raw = filenameInput.value.trim();
  if (!raw) raw = 'untitled';
  // Ensure .md extension
  const fn = raw.toLowerCase().endsWith('.md') ? raw : `${raw}.md`;
  downloadFile(editor.value, 'text/markdown', fn);
}

// ── Export as HTML ────────────────────────────────────────────────────────
function exportHtml() {
  const rawFilename = filenameInput.value.trim() || 'untitled.md';
  // Remove .md if present and add .html
  const base = rawFilename.replace(/\.md$/i, '');
  const outFilename = `${base}.html`;

  const html = typeof marked !== 'undefined'
    ? marked.parse(editor.value || '')
    : `<pre>${escapeHtml(editor.value)}</pre>`;

  const full = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${base}</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 720px; margin: 60px auto; padding: 0 24px; font-size: 18px; line-height: 1.75; color: #1c1917; background: #faf7f2; }
    h1 { font-size: 2.2em; font-weight: 300; border-bottom: 2px solid #e0d8cc; padding-bottom: 0.3em; margin-bottom: 0.6em; }
    h2 { font-size: 1.6em; font-weight: 400; margin-top: 1.4em; }
    h3 { font-size: 1.25em; font-style: italic; }
    blockquote { border-left: 3px solid #d4824a; padding: 4px 20px; color: #9c8f7e; font-style: italic; background: #f0ebe1; }
    code { font-family: monospace; font-size: 0.85em; background: #f0ebe1; padding: 1px 6px; border-radius: 4px; }
    pre { background: #1c1917; color: #e8d5b7; padding: 20px 24px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e0d8cc; padding: 8px 14px; }
    th { background: #f0ebe1; }
    a { color: #b5451b; }
    img { max-width: 100%; }
  </style>
</head>
<body>${html}</body>
</html>`;

  downloadFile(full, 'text/html', outFilename);
}

// ── Print preview ─────────────────────────────────────────────────────────
function openPrintPreview() {
  const html = typeof marked !== 'undefined'
    ? marked.parse(editor.value || '')
    : `<pre>${escapeHtml(editor.value)}</pre>`;
  printFrame.innerHTML = html;
  printOverlay.classList.remove('hidden');
}

// ── Markdown Formatting Helpers ───────────────────────────────────────────
function insertFormat(prefix, suffix) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const val = editor.value;
  const selectedText = val.substring(start, end);
  const replacement = prefix + selectedText + suffix;
  editor.value = val.substring(0, start) + replacement + val.substring(end);
  editor.selectionStart = start + prefix.length;
  editor.selectionEnd = start + prefix.length + selectedText.length;
  editor.focus();
  updateWordCount();
  renderPreview();
  triggerAutoSave();
}

// ── Drag & Drop File Loading ──────────────────────────────────────────────
function setupDragAndDrop() {
  editorContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    editorContainer.classList.add('drag-over');
  });

  editorContainer.addEventListener('dragleave', () => {
    editorContainer.classList.remove('drag-over');
  });

  editorContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    editorContainer.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type === 'text/markdown' || file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(evt) {
          editor.value = evt.target.result;
          filenameInput.value = file.name;
          updateWordCount();
          renderPreview();
          triggerAutoSave();
        };
        reader.readAsText(file);
      }
    }
  });
}

// ── Help content ──────────────────────────────────────────────────────────
const HELP_DATA = [
  {
    title: 'Headings',
    rows: [
      ['# H1',        'Heading level 1'],
      ['## H2',       'Heading level 2'],
      ['### H3',      'Heading level 3'],
      ['#### H4',     'Heading level 4'],
      ['##### H5',    'Heading level 5'],
      ['###### H6',   'Heading level 6'],
    ]
  },
  {
    title: 'Emphasis',
    rows: [
      ['**bold**',          'Bold text'],
      ['*italic*',          'Italic text'],
      ['_italic_',          'Italic (alt)'],
      ['~~strikethrough~~', 'Strikethrough'],
      ['**_bold italic_**', 'Bold & italic'],
      ['`inline code`',     'Inline code'],
    ]
  },
  {
    title: 'Lists',
    rows: [
      ['- item',        'Unordered list item'],
      ['* item',        'Unordered list (alt)'],
      ['+ item',        'Unordered list (alt)'],
      ['1. item',       'Ordered list item'],
      ['  - nested',    'Nested list (2 spaces)'],
      ['- [x] task',    'Checked task item'],
      ['- [ ] task',    'Unchecked task item'],
    ]
  },
  {
    title: 'Links & Images',
    rows: [
      ['[text](url)',            'Hyperlink'],
      ['[text](url "title")',    'Link with title'],
      ['![alt](url)',            'Image'],
      ['![alt](url "title")',    'Image with title'],
      ['[ref][id] … [id]: url', 'Reference link'],
      ['<https://url>',          'Auto-link'],
    ]
  },
  {
    title: 'Blockquotes & Code',
    rows: [
      ['> quote',       'Blockquote'],
      ['>> nested',     'Nested blockquote'],
      ['```lang … ```', 'Fenced code block'],
      ['    code',      'Indented code (4 spaces)'],
    ]
  },
  {
    title: 'Tables',
    rows: [
      ['| A | B |',           'Table row'],
      ['|---|---|',            'Header separator'],
      ['|:--|--:|:-:|',       'Left / right / center align'],
    ]
  },
  {
    title: 'Horizontal Rules',
    rows: [
      ['---',   'Horizontal rule'],
      ['***',   'Horizontal rule (alt)'],
      ['___',   'Horizontal rule (alt)'],
    ]
  },
  {
    title: 'Escaping',
    rows: [
      ['\\*',   'Literal asterisk'],
      ['\\#',   'Literal hash'],
      ['\\`',   'Literal backtick'],
      ['\\[',   'Literal bracket'],
      ['&amp;', 'HTML entity: &'],
      ['&lt;',  'HTML entity: <'],
    ]
  },
  {
    title: 'Miscellaneous',
    rows: [
      ['<!-- comment -->',  'HTML comment (hidden)'],
      ['<br>',              'Line break'],
      ['&nbsp;',            'Non-breaking space'],
      ['\\',                'Trailing backslash = <br>'],
      ['---',               'Front matter delimiter (YAML)'],
    ]
  },
];

function buildHelp() {
  const container = document.getElementById('help-content');
  container.innerHTML = '';
  HELP_DATA.forEach(section => {
    const sec = document.createElement('div');
    sec.className = 'help-section';
    sec.innerHTML = `<h3>${section.title}</h3>`;
    section.rows.forEach(([syntax, desc]) => {
      const row = document.createElement('div');
      row.className = 'help-row';
      row.innerHTML = `
        <span class="help-syntax">${escapeHtml(syntax)}</span>
        <span class="help-desc">${escapeHtml(desc)}</span>
      `;
      sec.appendChild(row);
    });
    container.appendChild(sec);
  });
}

// ── Event Wiring ──────────────────────────────────────────────────────────
function initEvents() {
  document.getElementById('btn-editor').addEventListener('click',       () => setMode('editor'));
  document.getElementById('btn-preview').addEventListener('click',      () => setMode('preview'));
  document.getElementById('btn-split').addEventListener('click',        () => setMode('split'));
  document.getElementById('btn-help').addEventListener('click',         () => setMode('help'));
  document.getElementById('btn-save').addEventListener('click',         saveMarkdown);
  document.getElementById('btn-export-html').addEventListener('click',  exportHtml);
  document.getElementById('btn-print').addEventListener('click',        openPrintPreview);

  printConfirm.addEventListener('click', () => {
    window.print();
  });

  printClose.addEventListener('click', () => {
    printOverlay.classList.add('hidden');
  });

  // Editor Inputs
  editor.addEventListener('input', () => {
    updateWordCount();
    if (currentMode === 'preview' || currentMode === 'split') {
      renderPreview();
    }
    triggerAutoSave();
  });

  // Tab key helper
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end   = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      editor.dispatchEvent(new Event('input'));
    }
  });

  // Renaming input
  filenameInput.addEventListener('input', () => {
    triggerAutoSave();
  });

  // Font Size Listeners
  btnFontDec.addEventListener('click', () => {
    applyFontSize(currentFontSize - 1);
  });

  btnFontInc.addEventListener('click', () => {
    applyFontSize(currentFontSize + 1);
  });

  // Theme Select Listener
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    
    // Commands without Ctrl
    if (!mod) return;
    
    // Command combinations
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); saveMarkdown();      break;
      case 'e': e.preventDefault(); exportHtml();        break;
      case 'p': e.preventDefault(); openPrintPreview();  break;
      case '1': e.preventDefault(); setMode('editor');   break;
      case '2': e.preventDefault(); setMode('preview');  break;
      case '3': e.preventDefault(); setMode('split');    break;
      case '/': e.preventDefault(); setMode('help');     break;
      
      // Formatting helpers
      case 'b':
        e.preventDefault();
        insertFormat('**', '**');
        break;
      case 'i':
        e.preventDefault();
        insertFormat('*', '*');
        break;
      case 'k':
        e.preventDefault();
        insertFormat('[', '](url)');
        break;
      case '`':
        e.preventDefault();
        insertFormat('`', '`');
        break;
    }
  });
}

// ── Initialization ────────────────────────────────────────────────────────
function initEditor() {
  storage.get({
    'md-studio-content': '',
    'md-studio-theme': 'light',
    'md-studio-fontsize': 14,
    'md-studio-filename': 'untitled.md'
  }, (items) => {
    applyTheme(items['md-studio-theme']);
    applyFontSize(parseInt(items['md-studio-fontsize']) || 14);
    filenameInput.value = items['md-studio-filename'] || 'untitled.md';
    
    if (items['md-studio-content']) {
      editor.value = items['md-studio-content'];
    } else {
      editor.value = `# Welcome to Markdown Studio

Start writing your document here. This editor supports **full** CommonMark markdown.

## Features

- Live **preview** and **split** view
- Customizable **themes** (Light, Sepia, Dark, OLED)
- Dynamic **font size** adjuster
- Smart **auto-save** indicator
- Local **file imports** via Drag & Drop
- Export to **.md** or **.html**
- **Print / PDF** preview layout
- Keyboard formatting shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)
- Markdown **reference** panel

> Use the sidebar on the left to switch modes, save, or export your work.

\`\`\`
Ctrl/Cmd + S  → Save as .md
Ctrl/Cmd + E  → Export as HTML
Ctrl/Cmd + P  → Print / PDF preview
Ctrl/Cmd + 1  → Editor
Ctrl/Cmd + 2  → Preview
Ctrl/Cmd + 3  → Split view
Ctrl/Cmd + /  → Help
Ctrl/Cmd + B  → Bold
Ctrl/Cmd + I  → Italic
Ctrl/Cmd + K  → Link
\`\`\`
`;
    }
    
    updateWordCount();
    renderPreview();
    setSaveStatus('saved');
  });
}

// Init
buildHelp();
initEvents();
setupDragAndDrop();
initEditor();
setMode('editor');
