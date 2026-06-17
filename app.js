/* ── Markdown Studio — app.js ─────────────────────────────────────────── */

// ── State ────────────────────────────────────────────────────────────────
let currentMode = 'editor'; // 'editor' | 'preview' | 'split' | 'help'
let currentTheme = 'light';
let currentFontSize = 14;
let saveTimeout = null;
let isWelcomeContent = false;

// ── DOM refs ───────────────────────────────────────────────────────────────
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
const languageSelect = document.getElementById('language-select');
const printConfirm   = document.getElementById('print-confirm');
const printClose     = document.getElementById('print-close');
const editorContainer = document.getElementById('editor-container');
const fileInput      = document.getElementById('file-input');
const btnClearText   = document.getElementById('btn-clear-text');
const clearConfirmModal = document.getElementById('clear-confirm-modal');
const btnModalSave   = document.getElementById('btn-modal-save');
const btnModalDiscard = document.getElementById('btn-modal-discard');
const btnModalCancel = document.getElementById('btn-modal-cancel');

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
  },
  clear: function(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.clear(callback);
    } else {
      localStorage.clear();
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
  wordCountEl.textContent = `${words}${i18n.t('word_unit', 'w')} • ${chars}${i18n.t('char_unit', 'c')} • ${readTime}${i18n.t('minute_unit', 'm')}`;
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



// ── Downloads Manager (Standard download with proper filename handling) ──────
function downloadFile(content, mimeType, defaultName) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const safeName = defaultName.replace(/[\\/]/g, '_');
  
  // Use standard anchor-based download which properly respects the filename
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// ── Save as .md ─────────────────────────────────────────────────────────
function saveMarkdown() {
  let raw = filenameInput.value.trim();
  if (!raw) raw = i18n.t('untitled', 'untitled');
  // Ensure .md extension
  const fn = raw.toLowerCase().endsWith('.md') ? raw : `${raw}.md`;
  downloadFile(editor.value, 'text/markdown', fn);
}

// ── Export as HTML ────────────────────────────────────────────────────────
function exportHtml() {
  const rawFilename = filenameInput.value.trim() || `${i18n.t('untitled', 'untitled')}.md`;
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

// ── New Document ──────────────────────────────────────────────────────────
function newDocument() {
  const url = 'editor.html?new=true';
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: url });
  } else {
    window.open(url, '_blank');
  }
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
}

function clearEditorContent() {
  editor.value = '';
  isWelcomeContent = false;
  updateWordCount();
  if (currentMode === 'preview' || currentMode === 'split') {
    renderPreview();
  }
  editor.focus();
}

// ── Load File from Input ──────────────────────────────────────────────────
function loadFileContent(file) {
  if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type === 'text/markdown' || file.type === 'text/plain')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      editor.value = evt.target.result;
      filenameInput.value = file.name;
      isWelcomeContent = false;
      updateWordCount();
      renderPreview();
      setMode('editor');
    };
    reader.onerror = function() {
      alert(i18n.t('file_read_error', 'Error reading file. Please try again.'));
    };
    reader.readAsText(file);
  } else {
    alert(i18n.t('file_type_error', 'Please select a .md or .txt file.'));
  }
}

// ── Drag & Drop File Loading ────────────────────────────────────────────────
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
      loadFileContent(file);
    }
  });
}

// ── Help content ──────────────────────────────────────────────────────────
const HELP_DATA = [
  {
    titleKey: 'help_headings',
    rows: [
      { syntax: '# H1',        descKey: 'help_desc_heading_1', desc: 'Heading level 1' },
      { syntax: '## H2',       descKey: 'help_desc_heading_2', desc: 'Heading level 2' },
      { syntax: '### H3',      descKey: 'help_desc_heading_3', desc: 'Heading level 3' },
      { syntax: '#### H4',     descKey: 'help_desc_heading_4', desc: 'Heading level 4' },
      { syntax: '##### H5',    descKey: 'help_desc_heading_5', desc: 'Heading level 5' },
      { syntax: '###### H6',   descKey: 'help_desc_heading_6', desc: 'Heading level 6' },
    ]
  },
  {
    titleKey: 'help_emphasis',
    rows: [
      { syntax: '**bold**',          descKey: 'help_desc_bold', desc: 'Bold text' },
      { syntax: '*italic*',          descKey: 'help_desc_italic', desc: 'Italic text' },
      { syntax: '_italic_',          descKey: 'help_desc_italic_alt', desc: 'Italic (alt)' },
      { syntax: '~~strikethrough~~', descKey: 'help_desc_strikethrough', desc: 'Strikethrough' },
      { syntax: '**_bold italic_**', descKey: 'help_desc_bold_italic', desc: 'Bold & italic' },
      { syntax: '`inline code`',     descKey: 'help_desc_inline_code', desc: 'Inline code' },
    ]
  },
  {
    titleKey: 'help_lists',
    rows: [
      { syntax: '- item',        descKey: 'help_desc_list_unordered', desc: 'Unordered list item' },
      { syntax: '* item',        descKey: 'help_desc_list_unordered_alt1', desc: 'Unordered list (alt)' },
      { syntax: '+ item',        descKey: 'help_desc_list_unordered_alt2', desc: 'Unordered list (alt)' },
      { syntax: '1. item',       descKey: 'help_desc_ordered_list', desc: 'Ordered list item' },
      { syntax: '  - nested',    descKey: 'help_desc_list_nested', desc: 'Nested list (2 spaces)' },
      { syntax: '- [x] task',    descKey: 'help_desc_task_checked', desc: 'Checked task item' },
      { syntax: '- [ ] task',    descKey: 'help_desc_task_unchecked', desc: 'Unchecked task item' },
    ]
  },
  {
    titleKey: 'help_links',
    rows: [
      { syntax: '[text](url)',            descKey: 'help_desc_link', desc: 'Hyperlink' },
      { syntax: '[text](url "title")',  descKey: 'help_desc_link_title', desc: 'Link with title' },
      { syntax: '![alt](url)',            descKey: 'help_desc_image', desc: 'Image' },
      { syntax: '![alt](url "title")',  descKey: 'help_desc_image_title', desc: 'Image with title' },
      { syntax: '[ref][id] … [id]: url',  descKey: 'help_desc_ref_link', desc: 'Reference link' },
      { syntax: '<https://url>',          descKey: 'help_desc_auto_link', desc: 'Auto-link' },
    ]
  },
  {
    titleKey: 'help_blockquotes',
    rows: [
      { syntax: '> quote',       descKey: 'help_desc_blockquote', desc: 'Blockquote' },
      { syntax: '>> nested',     descKey: 'help_desc_blockquote_nested', desc: 'Nested blockquote' },
      { syntax: '```lang … ```', descKey: 'help_desc_code_fence', desc: 'Fenced code block' },
      { syntax: '    code',      descKey: 'help_desc_code_indent', desc: 'Indented code (4 spaces)' },
    ]
  },
  {
    titleKey: 'help_tables',
    rows: [
      { syntax: '| A | B |',        descKey: 'help_desc_table_row', desc: 'Table row' },
      { syntax: '|---|---|',         descKey: 'help_desc_table_header', desc: 'Header separator' },
      { syntax: '|:--|--:|:-:|',    descKey: 'help_desc_table_align', desc: 'Left / right / center align' },
    ]
  },
  {
    titleKey: 'help_rules',
    rows: [
      { syntax: '---', descKey: 'help_desc_rule', desc: 'Horizontal rule' },
      { syntax: '***', descKey: 'help_desc_rule_alt1', desc: 'Horizontal rule (alt)' },
      { syntax: '___', descKey: 'help_desc_rule_alt2', desc: 'Horizontal rule (alt)' },
    ]
  },
  {
    titleKey: 'help_escaping',
    rows: [
      { syntax: '\\*', descKey: 'help_desc_escape_asterisk', desc: 'Literal asterisk' },
      { syntax: '\\#', descKey: 'help_desc_escape_hash', desc: 'Literal hash' },
      { syntax: '\\`', descKey: 'help_desc_escape_backtick', desc: 'Literal backtick' },
      { syntax: '\\[', descKey: 'help_desc_escape_bracket', desc: 'Literal bracket' },
      { syntax: '&amp;', descKey: 'help_desc_escape_amp', desc: 'HTML entity: &' },
      { syntax: '&lt;',  descKey: 'help_desc_escape_lt', desc: 'HTML entity: <' },
    ]
  },
  {
    titleKey: 'help_misc',
    rows: [
      { syntax: '<!-- comment -->', descKey: 'help_desc_misc_comment', desc: 'HTML comment (hidden)' },
      { syntax: '<br>',             descKey: 'help_desc_misc_br', desc: 'Line break' },
      { syntax: '&nbsp;',           descKey: 'help_desc_misc_nbsp', desc: 'Non-breaking space' },
      { syntax: '\\',              descKey: 'help_desc_misc_backslash', desc: 'Trailing backslash = <br>' },
      { syntax: '---',              descKey: 'help_desc_misc_frontmatter', desc: 'Front matter delimiter (YAML)' },
    ]
  },
];

function buildHelp() {
  const container = document.getElementById('help-content');
  container.innerHTML = '';
  HELP_DATA.forEach(section => {
    const sec = document.createElement('div');
    sec.className = 'help-section';
    sec.innerHTML = `<h3>${i18n.t(section.titleKey, section.titleKey)}</h3>`;
    section.rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'help-row';
      rowEl.innerHTML = `
        <span class="help-syntax">${escapeHtml(row.syntax)}</span>
        <span class="help-desc">${escapeHtml(i18n.t(row.descKey, row.desc))}</span>
      `;
      sec.appendChild(rowEl);
    });
    container.appendChild(sec);
  });
}

function buildWelcomeText() {
  return `# ${i18n.t('welcome_title', 'Welcome to Markdown Studio')}

${i18n.t('welcome_intro', 'Start writing your document here. This editor supports **full** CommonMark markdown.')}

## ${i18n.t('welcome_features', 'Features')}

- ${i18n.t('welcome_feature_1', 'Live **preview** and **split** view')}
- ${i18n.t('welcome_feature_2', 'Customizable **themes** (Light, Sepia, Dark, OLED)')}
- ${i18n.t('welcome_feature_3', 'Dynamic **font size** adjuster')}
- ${i18n.t('welcome_feature_4', 'Smart **auto-save** indicator')}
- ${i18n.t('welcome_feature_5', 'Local **file imports** via Drag and Drop')}
- ${i18n.t('welcome_feature_6', 'Export to **.md** or **.html**')}
- ${i18n.t('welcome_feature_7', '**Print / PDF** preview layout')}
- ${i18n.t('welcome_feature_8', 'Keyboard formatting shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)')}
- ${i18n.t('welcome_feature_9', 'Markdown **reference** panel')}

> ${i18n.t('welcome_note', 'Use the sidebar on the left to switch modes, save, or export your work.')}

\`\`\`
${i18n.t('shortcuts_title', 'Keyboard Shortcuts')}

Ctrl/Cmd + S  → ${i18n.t('shortcut_save', 'Save as .md')}
Ctrl/Cmd + O  → ${i18n.t('shortcut_open', 'Open file')}
Ctrl/Cmd + E  → ${i18n.t('shortcut_export', 'Export as HTML')}
Ctrl/Cmd + P  → ${i18n.t('shortcut_print', 'Print / PDF preview')}
Ctrl/Cmd + 1  → ${i18n.t('shortcut_editor', 'Editor')}
Ctrl/Cmd + 2  → ${i18n.t('shortcut_preview', 'Preview')}
Ctrl/Cmd + 3  → ${i18n.t('shortcut_split', 'Split view')}
Ctrl/Cmd + /  → ${i18n.t('shortcut_help', 'Help')}
Ctrl/Cmd + B  → ${i18n.t('shortcut_bold', 'Bold')}
Ctrl/Cmd + I  → ${i18n.t('shortcut_italic', 'Italic')}
Ctrl/Cmd + K  → ${i18n.t('shortcut_link', 'Link')}
\`\`\`
`;
}

// ── Event Wiring ──────────────────────────────────────────────────────────
function initEvents() {
  document.getElementById('btn-editor').addEventListener('click',       () => setMode('editor'));
  document.getElementById('btn-preview').addEventListener('click',      () => setMode('preview'));
  document.getElementById('btn-split').addEventListener('click',        () => setMode('split'));
  document.getElementById('btn-help').addEventListener('click',         () => setMode('help'));
  document.getElementById('btn-open').addEventListener('click',         () => fileInput.click());
  document.getElementById('btn-new').addEventListener('click',          newDocument);
  document.getElementById('btn-save').addEventListener('click',         saveMarkdown);
  document.getElementById('btn-export-html').addEventListener('click',  exportHtml);
  document.getElementById('btn-print').addEventListener('click',        openPrintPreview);

  btnClearText.addEventListener('click', () => {
    if (!editor.value.trim() || isWelcomeContent) {
      clearEditorContent();
      return;
    }
    clearConfirmModal.classList.remove('hidden');
  });

  btnModalSave.addEventListener('click', () => {
    saveMarkdown();
    clearEditorContent();
    clearConfirmModal.classList.add('hidden');
  });

  btnModalDiscard.addEventListener('click', () => {
    clearEditorContent();
    clearConfirmModal.classList.add('hidden');
  });

  btnModalCancel.addEventListener('click', () => {
    clearConfirmModal.classList.add('hidden');
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadFileContent(e.target.files[0]);
      // Reset the input so the same file can be opened again
      e.target.value = '';
    }
  });

  printConfirm.addEventListener('click', () => {
    window.print();
  });

  printClose.addEventListener('click', () => {
    printOverlay.classList.add('hidden');
  });

  // Editor Inputs
  editor.addEventListener('input', () => {
    if (isWelcomeContent && editor.value !== buildWelcomeText()) {
      isWelcomeContent = false;
    }
    updateWordCount();
    if (currentMode === 'preview' || currentMode === 'split') {
      renderPreview();
    }
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

  // Language Select Listener
  languageSelect.addEventListener('change', () => {
    i18n.setLanguage(languageSelect.value);
    buildHelp();
    if (isWelcomeContent) {
      editor.value = buildWelcomeText();
      updateWordCount();
      if (currentMode === 'preview' || currentMode === 'split') {
        renderPreview();
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    
    // Commands without Ctrl
    if (!mod) return;
    
    // Command combinations
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); saveMarkdown();      break;
      case 'o': e.preventDefault(); fileInput.click();   break;
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

// ── Handle Window Close Event (Confirm before exit) ────────────────────────
window.addEventListener('beforeunload', (e) => {
  if (editor.value.trim() && !isWelcomeContent) {
    e.preventDefault();
    e.returnValue = ''; // Standard browser confirmation dialog
  }
});

// ── Initialization ────────────────────────────────────────────────────────
function initEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const isNewDoc = urlParams.get('new') === 'true';
  if (isNewDoc) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  storage.get({
    'md-studio-theme': 'light',
    'md-studio-fontsize': 14
  }, (items) => {
    applyTheme(items['md-studio-theme']);
    applyFontSize(parseInt(items['md-studio-fontsize']) || 14);
    
    filenameInput.value = 'untitled.md';
    if (isNewDoc) {
      editor.value = '';
      isWelcomeContent = false;
    } else {
      editor.value = buildWelcomeText();
      isWelcomeContent = true;
    }
    
    updateWordCount();
    renderPreview();
  });
}

// Init
i18n.init().then(() => {
  languageSelect.value = i18n.currentLanguage;
  buildHelp();
  initEvents();
  setupDragAndDrop();
  initEditor();
  setMode('editor');
});
