/*
 * Muff-Mojo content script — inline emoji suggestions for chat boxes.
 *
 *  • Type a word ("love")         → picker shows matching emojis
 *  • Type ":" + letters (":lau")  → search the whole dictionary
 *  • ↑ next / ↓ previous · Tab inserts (Enter too in ":" search) · Esc dismisses
 */
(() => {
  'use strict';
  if (window.__muffMojoLoaded) return;
  window.__muffMojoLoaded = true;

  const Emojis = globalThis.MuffMojoEmojis;
  if (!Emojis) return;

  /* ───────────────────────── settings ───────────────────────── */

  const DEFAULTS = {
    enabled: true,
    sites: { whatsapp: true, instagram: true },
    autoSuggest: true, // suggest on plain words (not just ":" search)
    addSpace: true,
    theme: 'auto', // 'auto' (match the site) | 'light' | 'dark'
    skinTone: 0 // 0 = default yellow, 1–5 = light → dark (for emojis that support it)
  };
  const SITE = /(^|\.)web\.whatsapp\.com$/.test(location.hostname)
    ? 'whatsapp'
    : /(^|\.)instagram\.com$/.test(location.hostname) ? 'instagram' : 'other';

  let settings = { ...DEFAULTS };
  let recents = []; // most recent first

  const hasStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

  function mergeSettings(stored) {
    settings = {
      ...DEFAULTS,
      ...stored,
      sites: { ...DEFAULTS.sites, ...(stored && stored.sites) }
    };
  }

  if (hasStorage) {
    chrome.storage.sync.get('settings', (r) => mergeSettings(r && r.settings));
    chrome.storage.local.get('recents', (r) => { recents = (r && r.recents) || []; });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        mergeSettings(changes.settings.newValue);
        if (!isActive()) hide();
        else if (ui) ui.card.classList.toggle('dark', isDarkPage());
      }
      if (changes.recents) recents = changes.recents.newValue || [];
    });
  }

  function isActive() {
    return settings.enabled && (SITE === 'other' || settings.sites[SITE] !== false);
  }

  function remember(emoji) {
    recents = [emoji, ...recents.filter((e) => e !== emoji)].slice(0, 24);
    if (hasStorage) {
      chrome.storage.local.get('stats', (r) => {
        const stats = (r && r.stats) || { inserted: 0 };
        stats.inserted = (stats.inserted || 0) + 1;
        chrome.storage.local.set({ recents, stats });
      });
    }
  }

  /* ───────────────────────── editable helpers ───────────────────────── */

  const TEXT_INPUT_TYPES = /^(text|search|url|email|)$/i;

  function editableFrom(node) {
    if (!node || node.nodeType !== 1) node = node && node.parentElement;
    if (!node) return null;
    if (node.tagName === 'TEXTAREA') return node;
    if (node.tagName === 'INPUT' && TEXT_INPUT_TYPES.test(node.type)) return node;
    const ce = node.closest('[contenteditable]:not([contenteditable="false"])');
    return ce && ce.isContentEditable ? ce : null;
  }

  const isField = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');

  // word characters: letters, numbers, underscore (unicode-aware)
  const TOKEN_RE = /(?:^|[^\p{L}\p{N}_:])(:?)([\p{L}\p{N}_]{1,32})$/u;

  /**
   * Find the word right before the caret.
   * Returns { editor, colon, word, length, node?, offset?, start? } or null.
   */
  function readToken(editor) {
    let before;
    let ctx;
    if (isField(editor)) {
      if (editor.selectionStart !== editor.selectionEnd) return null;
      const end = editor.selectionStart;
      before = editor.value.slice(Math.max(0, end - 64), end);
      ctx = { end };
    } else {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      let offset = range.startOffset;
      // caret positioned on an element boundary → step into the previous text node
      if (node.nodeType !== 3) {
        const prev = node.childNodes[offset - 1];
        if (!prev) return null;
        node = prev;
        while (node && node.nodeType !== 3) node = node.lastChild;
        if (!node) return null;
        offset = node.data.length;
      }
      if (!editor.contains(node)) return null;
      before = node.data.slice(0, offset);
      ctx = { node, offset };
    }
    const m = TOKEN_RE.exec(before);
    if (!m) return null;
    const colon = m[1] === ':';
    const word = m[2];
    return { editor, colon, word, length: word.length + (colon ? 1 : 0), ...ctx };
  }

  const MAX_ITEMS = 8;

  function candidatesFor(token) {
    if (token.colon) return Emojis.search(token.word, MAX_ITEMS);
    if (!settings.autoSuggest || token.word.length < 2) return [];
    // Exact matches first ("happy"), then words that start with what's typed ("hap" → happy…),
    // so suggestions grow while you type. Prefix matches only from 3 letters to limit noise.
    const exact = Emojis.exact(token.word, { triggersOnly: true });
    const prefix = token.word.length >= 3
      ? Emojis.search(token.word, MAX_ITEMS * 2, { prefixOnly: true, triggersOnly: true }).filter((e) => !exact.includes(e))
      : [];
    const rank = (e) => { const i = recents.indexOf(e.emoji); return i === -1 ? 99 : i; };
    const byRecent = (list) => (recents.length ? [...list].sort((a, b) => rank(a) - rank(b)) : list);
    return [...byRecent(exact), ...byRecent(prefix)].slice(0, MAX_ITEMS);
  }

  /* ───────────────────────── insertion ───────────────────────── */

  function insert(entry) {
    const token = state.token;
    if (!token) return;
    const { editor } = token;
    let text = Emojis.withTone(entry, settings.skinTone);

    if (isField(editor)) {
      const start = token.end - token.length;
      const after = editor.value.charAt(token.end);
      if (settings.addSpace && !/\s/.test(after)) text += ' ';
      editor.focus();
      editor.setSelectionRange(start, token.end);
      if (!document.execCommand('insertText', false, text)) {
        editor.setRangeText(text, start, token.end, 'end');
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    } else {
      hide();
      // Let the editor finish the last keystroke first (Lexical commits asynchronously),
      // then re-read the word, since the text node may have been replaced meanwhile.
      setTimeout(() => {
        const fresh = readToken(editor);
        if (!fresh || fresh.word !== token.word || fresh.colon !== token.colon) return;
        const { node, offset } = fresh;
        const after = node.data.charAt(offset);
        if (settings.addSpace && !/[\s ]/.test(after)) text += ' ';
        const start = offset - fresh.length;
        const typed = node.data.slice(start, offset);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, offset);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // Lexical only adopts a new DOM selection on the next tick, so insert after it.
        // execCommand goes through the editor's own input pipeline, keeping its state in sync.
        setTimeout(() => {
          const before = editor.textContent;
          const ok = document.execCommand('insertText', false, text);
          // Editors may apply the change asynchronously; only fall back if nothing happened.
          setTimeout(() => {
            const untouched = editor.textContent === before && node.isConnected &&
              node.data.slice(start, offset) === typed;
            if (!ok || untouched) manualInsert(editor, node, start, offset, text);
          }, 50);
        }, 0);
      }, 0);
    }
    remember(entry.emoji);
    hide();
  }

  // Last resort for editors that ignore execCommand: edit the DOM and announce it.
  function manualInsert(editor, node, start, end, text) {
    if (!node.isConnected) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    range.deleteContents();
    const t = document.createTextNode(text);
    range.insertNode(t);
    range.setStartAfter(t);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  /* ───────────────────────── picker UI ───────────────────────── */

  const state = { token: null, items: [], index: 0, dismissed: null, visible: false };

  let host = null;
  let shadow = null;
  let ui = null;

  const CSS = `
    :host { all: initial; }
    .card {
      position: fixed; z-index: 2147483647; display: flex; flex-direction: column;
      min-width: 180px; max-width: 320px;
      font: 600 12px/1.3 "Libre Franklin", "Helvetica Neue", Arial, sans-serif;
      color: var(--fg); background: var(--bg);
      border: 1.5px solid var(--line); border-radius: 16px;
      box-shadow: 0 10px 28px -10px rgba(23, 23, 23, .35);
      padding: 6px; opacity: 0; transform: translateY(6px) rotate(-1deg) scale(.96);
      transition: opacity .14s ease, transform .22s cubic-bezier(.3, 1.5, .5, 1); pointer-events: auto;
      --bg: #feece3; --fg: #171717; --muted: rgba(23, 23, 23, .55); --line: #171717;
      --sel: #ef8db8; --ring: #171717; --kbd: rgba(23, 23, 23, .08);
    }
    .card.dark {
      --bg: #171717; --fg: #feece3; --muted: rgba(254, 236, 227, .6); --line: #feece3;
      --sel: #ef8db8; --ring: #feece3; --kbd: rgba(254, 236, 227, .12);
    }
    .card.show { opacity: 1; transform: none; }
    .card.below { transform-origin: top left; }
    .row { display: flex; gap: 2px; flex-wrap: wrap; }
    button {
      all: unset; box-sizing: border-box; cursor: pointer;
      width: 38px; height: 38px; border-radius: 10px;
      display: grid; place-items: center; font-size: 22px; line-height: 1;
      font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;
      transition: background .08s ease, transform .08s ease;
    }
    button:hover { background: var(--kbd); }
    button[aria-selected="true"] { background: var(--sel); box-shadow: inset 0 0 0 1.5px var(--ring); }
    button:active { transform: scale(.92); }
    .foot {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 6px 4px 2px; margin-top: 4px; border-top: 1px solid var(--line);
    }
    .name {
      color: var(--bg); background: var(--fg); padding: 2px 9px 3px; border-radius: 99px;
      font-weight: 800; letter-spacing: -.01em; transform: rotate(-2deg);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .keys { display: flex; gap: 6px; color: var(--muted); white-space: nowrap; }
    kbd {
      font: 600 10px/1 system-ui, sans-serif; background: var(--kbd); color: var(--fg);
      border-radius: 99px; padding: 3px 6px; margin-right: 3px;
    }
    @media (prefers-reduced-motion: reduce) { .card, button { transition: none; } }
  `;

  function ensureUI() {
    if (host && host.isConnected) return;
    host = document.createElement('muff-mojo-picker');
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CSS}</style>
      <div class="card" role="listbox" aria-label="Emoji suggestions">
        <div class="row"></div>
        <div class="foot"><span class="name"></span><span class="keys"></span></div>
      </div>`;
    ui = {
      card: shadow.querySelector('.card'),
      row: shadow.querySelector('.row'),
      name: shadow.querySelector('.name'),
      keys: shadow.querySelector('.keys')
    };
    // keep focus/caret in the chat box when clicking the picker
    ui.card.addEventListener('mousedown', (e) => e.preventDefault());
    ui.row.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) insert(state.items[Number(btn.dataset.i)]);
    });
    ui.row.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('button');
      if (btn && Number(btn.dataset.i) !== state.index) select(Number(btn.dataset.i));
    });
    document.documentElement.appendChild(host);
  }

  function isDarkPage() {
    if (settings.theme === 'dark') return true;
    if (settings.theme === 'light') return false;
    if (SITE === 'whatsapp' && document.body && document.body.classList.contains('dark')) return true;
    const bg = document.body && getComputedStyle(document.body).backgroundColor;
    const m = bg && bg.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3 && (m.length < 4 || Number(m[3]) > 0)) {
      const [r, g, b] = m.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
    }
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function render() {
    ensureUI();
    ui.card.classList.toggle('dark', isDarkPage());
    ui.row.textContent = '';
    state.items.forEach((entry, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.dataset.i = i;
      b.title = ':' + entry.name;
      b.textContent = Emojis.withTone(entry, settings.skinTone);
      ui.row.appendChild(b);
    });
    const many = state.items.length > 1;
    const enter = state.token.colon ? '<span><kbd>↵</kbd></span>' : '';
    ui.keys.innerHTML =
      (many ? '<span><kbd>↑↓</kbd></span>' : '') +
      `<span><kbd>Tab</kbd>insert</span>${enter}<span><kbd>Esc</kbd></span>`;
    select(Math.min(state.index, state.items.length - 1));
  }

  function select(i) {
    state.index = i;
    [...ui.row.children].forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
    const entry = state.items[i];
    ui.name.textContent = entry ? entry.name : '';
  }

  function anchorRect(token) {
    if (isField(token.editor)) return token.editor.getBoundingClientRect();
    try {
      const r = document.createRange();
      r.setStart(token.node, token.offset - token.length);
      r.setEnd(token.node, token.offset);
      const rects = r.getClientRects();
      if (rects.length) return rects[0];
      const b = r.getBoundingClientRect();
      if (b.width || b.height) return b;
    } catch (_) { /* node changed under us */ }
    return token.editor.getBoundingClientRect();
  }

  function position() {
    if (!state.visible || !state.token) return;
    const a = anchorRect(state.token);
    const card = ui.card;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const gap = 8;
    let left = Math.min(Math.max(8, a.left - 6), window.innerWidth - w - 8);
    let top = a.top - h - gap;
    const below = top < 8;
    if (below) top = Math.min(a.bottom + gap, window.innerHeight - h - 8);
    card.classList.toggle('below', below);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  function show(token, items) {
    const sameWord = state.visible && state.token && state.token.word === token.word && state.token.colon === token.colon;
    state.token = token;
    state.items = items;
    if (!sameWord) state.index = 0;
    render();
    state.visible = true;
    position();
    void ui.card.offsetWidth; // commit start state so the fade-in transition runs
    ui.card.classList.add('show');
  }

  function hide() {
    state.visible = false;
    state.token = null;
    state.items = [];
    if (ui) ui.card.classList.remove('show');
    if (ui) ui.card.style.top = '-9999px';
  }

  /* ───────────────────────── event wiring ───────────────────────── */

  function currentEditor() {
    const ae = document.activeElement;
    if (isField(ae)) return editableFrom(ae);
    if (!ae || !ae.isContentEditable) return null; // selection can linger after blur
    const sel = window.getSelection();
    const ed = sel && sel.anchorNode ? editableFrom(sel.anchorNode) : null;
    return ed && (ed === ae || ae.contains(ed) || ed.contains(ae)) ? ed : null;
  }

  const tokenKey = (t) => t && `${t.colon ? ':' : ''}${t.word}|${t.end ?? t.offset}`;

  function evaluate() {
    if (!isActive()) return hide();
    const editor = currentEditor();
    if (!editor) return hide();
    const token = readToken(editor);
    if (!token) { state.dismissed = null; return hide(); }
    if (state.dismissed && state.dismissed === tokenKey(token)) return hide();
    const items = candidatesFor(token);
    if (!items.length) return hide();
    show(token, items);
  }

  // setTimeout(0) lets the site's editor (React / Lexical) finish updating the DOM first.
  let pending = 0;
  const schedule = () => {
    if (pending) return;
    pending = setTimeout(() => { pending = 0; evaluate(); }, 0);
  };

  // Editors like Lexical (WhatsApp) often handle typing themselves and skip the native
  // `input` event, so listen to every signal that text may have changed.
  const onTextChange = (e) => { if (!e.isComposing) schedule(); };
  document.addEventListener('input', onTextChange, true);
  document.addEventListener('beforeinput', onTextChange, true);
  document.addEventListener('compositionend', schedule, true);
  document.addEventListener('keyup', (e) => {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') schedule();
  }, true);
  document.addEventListener('selectionchange', () => { if (state.visible) schedule(); });

  window.addEventListener('keydown', (e) => {
    // a key right after typing can beat the scheduled check — run it now
    if (pending && (e.key === 'Tab' || e.key === 'Enter' || e.key.startsWith('Arrow') || e.key === 'Escape')) {
      clearTimeout(pending); pending = 0; evaluate();
    }
    if (!state.visible || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = state.items.length;
    let handled = true;
    switch (e.key) {
      case 'Tab':
        if (e.shiftKey) { handled = false; break; }
        insert(state.items[state.index]);
        break;
      case 'Enter':
        // In plain-word mode Enter must still send the message — only take it over in ":" search.
        if (state.token.colon && !e.shiftKey) insert(state.items[state.index]);
        else handled = false;
        break;
      // ↑ moves to the next emoji (right), ↓ to the previous one (left)
      case 'ArrowUp':
        if (n > 1) select((state.index + 1) % n); else handled = false;
        break;
      case 'ArrowDown':
        if (n > 1) select((state.index - 1 + n) % n); else handled = false;
        break;
      case 'Escape':
        state.dismissed = tokenKey(state.token);
        hide();
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('focusout', () => setTimeout(() => {
    if (!currentEditor()) hide();
  }, 0), true);
  document.addEventListener('mousedown', (e) => {
    if (state.visible && e.target !== host) schedule();
  }, true);
  window.addEventListener('scroll', () => state.visible && position(), true);
  window.addEventListener('resize', () => state.visible && position());

  const version = hasStorage && chrome.runtime && chrome.runtime.getManifest
    ? chrome.runtime.getManifest().version : 'dev';
  console.info(`[Muff-Mojo] v${version} ready on ${location.hostname}`);
})();
