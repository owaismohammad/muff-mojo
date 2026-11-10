(() => {
  'use strict';
  const { CATEGORIES, ALL, search, withTone } = globalThis.MuffMojoEmojis;
  const $ = (s) => document.querySelector(s);

  const DEFAULTS = {
    enabled: true,
    sites: { whatsapp: true, instagram: true },
    autoSuggest: true,
    addSpace: true,
    theme: 'auto',
    skinTone: 0
  };
  const ext = typeof chrome !== 'undefined' && chrome.storage ? chrome : null;
  let settings = structuredClone(DEFAULTS);
  let recents = [];
  let activeSite = null; // 'whatsapp' | 'instagram' | null

  const byEmoji = new Map(ALL.map((e) => [e.emoji, e]));

  /* ───────── storage ───────── */
  function load() {
    return new Promise((resolve) => {
      if (!ext) return resolve();
      chrome.storage.sync.get('settings', (s) => {
        const st = (s && s.settings) || {};
        settings = { ...DEFAULTS, ...st, sites: { ...DEFAULTS.sites, ...st.sites } };
        chrome.storage.local.get(['recents', 'stats'], (l) => {
          recents = (l && l.recents) || [];
          renderStats((l && l.stats) || {});
          resolve();
        });
      });
    });
  }
  function save() {
    if (ext) chrome.storage.sync.set({ settings });
    renderStatus();
  }

  /* ───────── status line ───────── */
  function detectTab() {
    return new Promise((resolve) => {
      if (!ext || !chrome.tabs) return resolve(null);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs && tabs[0] && tabs[0].url; // only visible on our host_permissions sites
        if (!url) return resolve(null);
        const host = new URL(url).hostname;
        resolve(host === 'web.whatsapp.com' ? 'whatsapp' : /(^|\.)instagram\.com$/.test(host) ? 'instagram' : null);
      });
    });
  }
  const SITE_NAMES = { whatsapp: 'WhatsApp Web', instagram: 'Instagram' };
  function renderStatus() {
    const el = $('#status');
    const text = $('#status-text');
    document.body.classList.toggle('paused', !settings.enabled);
    $('#enabled').checked = settings.enabled;
    if (!settings.enabled) {
      el.dataset.state = 'paused';
      text.textContent = 'Paused. Switch on to get emoji suggestions';
    } else if (activeSite && settings.sites[activeSite] === false) {
      el.dataset.state = 'paused';
      text.textContent = `Turned off for ${SITE_NAMES[activeSite]} in Settings`;
    } else if (activeSite) {
      el.dataset.state = 'on';
      text.textContent = `Active on ${SITE_NAMES[activeSite]}. Start typing!`;
    } else {
      el.dataset.state = 'idle';
      text.textContent = 'Open WhatsApp Web or Instagram to use it';
    }
  }

  /* ───────── tabs ───────── */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    document.body.dataset.tab = tab.id.replace('tab-', '');
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }));

  /* ───────── emoji grid ───────── */
  let category = 'all';
  const grid = $('#grid');

  const chips = $('#chips');
  const chipsWrap = $('#chips-wrap');

  // Build the category row once; afterwards only the pressed state changes, so the
  // row keeps its sideways scroll position when you pick a category.
  function buildChips() {
    const all = [{ id: 'all', label: 'All', icon: '' }, ...CATEGORIES];
    for (const c of all) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = c.id;
      b.innerHTML = c.icon ? `<span>${c.icon}</span>` : '';
      b.append(c.id === 'all' ? 'All' : c.label.split(' ')[0]);
      b.title = c.label;
      b.addEventListener('click', () => {
        category = c.id;
        $('#q').value = '';
        renderChips();
        renderGrid();
        $('#grid-wrap').scrollTop = 0;
        // bring a half-hidden chip fully into view
        b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
      });
      chips.appendChild(b);
    }
  }

  function renderChips() {
    chips.querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.id === category)));
  }

  // Sideways scrolling: ‹ › buttons, the mouse wheel, and edge fades that show when
  // there's more to see in that direction.
  function updateChipNav() {
    const max = chips.scrollWidth - chips.clientWidth;
    chipsWrap.classList.toggle('can-prev', chips.scrollLeft > 2);
    chipsWrap.classList.toggle('can-next', chips.scrollLeft < max - 2);
  }
  $('#chips-prev').addEventListener('click', () => chips.scrollBy({ left: -160 }));
  $('#chips-next').addEventListener('click', () => chips.scrollBy({ left: 160 }));
  chips.addEventListener('scroll', updateChipNav, { passive: true });
  chips.addEventListener('wheel', (e) => {
    // a normal (vertical) mouse wheel scrolls the row sideways
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && chips.scrollWidth > chips.clientWidth) {
      e.preventDefault();
      chips.scrollLeft += e.deltaY;
    }
  }, { passive: false });
  window.addEventListener('resize', updateChipNav);

  function section(title, entries) {
    const frag = document.createDocumentFragment();
    if (title) {
      const h = document.createElement('h3');
      h.className = 'group-title';
      const tag = document.createElement('span');
      tag.textContent = title;
      h.appendChild(tag);
      frag.appendChild(h);
    }
    const g = document.createElement('div');
    g.className = 'grid';
    for (const e of entries) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = withTone(e, settings.skinTone);
      b.dataset.emoji = e.emoji;
      b.setAttribute('aria-label', `${e.name}. Type ${e.keywords.join(', ')}`);
      g.appendChild(b);
    }
    frag.appendChild(g);
    return frag;
  }

  function renderGrid() {
    const q = $('#q').value.trim();
    grid.innerHTML = '';
    let count = 0;
    if (q) {
      const hits = search(q, 120);
      count = hits.length;
      if (hits.length) grid.appendChild(section(`${hits.length} match${hits.length === 1 ? '' : 'es'}`, hits));
    } else {
      const recentEntries = recents.map((e) => byEmoji.get(e)).filter(Boolean).slice(0, 16);
      if (category === 'all' && recentEntries.length) grid.appendChild(section('Recently used', recentEntries));
      for (const c of CATEGORIES) {
        if (category !== 'all' && category !== c.id) continue;
        const entries = c.entries;
        count += entries.length;
        grid.appendChild(section(c.label, entries));
      }
    }
    $('#empty').hidden = count > 0;
    $('#empty-q').textContent = q;
  }

  function showDetail(entry) {
    $('#detail-emoji').textContent = entry ? withTone(entry, settings.skinTone) : '🧁';
    const t = $('#detail-text');
    if (!entry) {
      t.textContent = 'Hover an emoji to see what to type · click to copy';
      return;
    }
    t.innerHTML = 'Type ';
    entry.keywords.slice(0, 4).forEach((k, i) => {
      if (i) t.append(' ');
      const c = document.createElement('code');
      c.textContent = k;
      t.appendChild(c);
    });
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
  }

  grid.addEventListener('mouseover', (e) => {
    const b = e.target.closest('button[data-emoji]');
    if (b) showDetail(byEmoji.get(b.dataset.emoji));
  });
  grid.addEventListener('focusin', (e) => {
    const b = e.target.closest('button[data-emoji]');
    if (b) showDetail(byEmoji.get(b.dataset.emoji));
  });
  grid.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-emoji]');
    if (!b) return;
    try {
      const shown = b.textContent; // includes the chosen skin tone
      await navigator.clipboard.writeText(shown);
      toast(`Copied ${shown}`);
    } catch {
      toast(`Type “${byEmoji.get(b.dataset.emoji).name}” in chat`);
    }
  });

  $('#q').addEventListener('input', () => {
    if ($('#q').value.trim() && category !== 'all') { category = 'all'; renderChips(); }
    renderGrid();
    $('#grid-wrap').scrollTop = 0;
  });

  /* ───────── theme ───────── */
  const systemDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => settings.theme === 'dark' ||
    (settings.theme === 'auto' && !!systemDark && systemDark.matches);

  function applyTheme() {
    const dark = isDark();
    document.body.classList.toggle('dark', dark);
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    $('#theme-btn').setAttribute('aria-label', label);
    $('#theme-btn').title = label;
    document.querySelectorAll('.seg [data-theme]').forEach((b) =>
      b.setAttribute('aria-checked', String(b.dataset.theme === settings.theme)));
    try { localStorage.setItem('mm-theme', settings.theme); } catch (_) { /* storage blocked */ }
  }

  function setTheme(theme) {
    settings.theme = theme;
    applyTheme();
    save();
  }

  $('#theme-btn').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
  document.querySelectorAll('.seg [data-theme]').forEach((b) =>
    b.addEventListener('click', () => setTheme(b.dataset.theme)));
  if (systemDark) systemDark.addEventListener('change', () => settings.theme === 'auto' && applyTheme());

  /* ───────── skin tone ───────── */
  function applyTone() {
    document.querySelectorAll('.tones [data-tone]').forEach((b) =>
      b.setAttribute('aria-checked', String(Number(b.dataset.tone) === settings.skinTone)));
  }
  document.querySelectorAll('.tones [data-tone]').forEach((b) => b.addEventListener('click', () => {
    settings.skinTone = Number(b.dataset.tone);
    applyTone();
    renderGrid();
    save();
  }));

  /* ───────── settings ───────── */
  function bindSettings() {
    $('#enabled').addEventListener('change', (e) => { settings.enabled = e.target.checked; save(); });
    document.querySelectorAll('.toggle').forEach((input) => {
      const { site, key } = input.dataset;
      input.checked = site ? settings.sites[site] !== false : settings[key] !== false;
      input.addEventListener('change', () => {
        if (site) settings.sites[site] = input.checked;
        else settings[key] = input.checked;
        save();
      });
    });
  }

  function renderStats(stats) {
    const n = stats.inserted || 0;
    $('#stats').innerHTML = n ? `You've sprinkled <b>${n.toLocaleString()}</b> emoji${n === 1 ? '' : 's'} so far 🎉` : '';
  }

  /* ───────── boot ───────── */
  $('#version').textContent = ext && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : 'dev';
  buildChips();
  renderChips();
  updateChipNav();
  renderGrid();
  Promise.all([load(), detectTab().then((s) => { activeSite = s; })]).then(() => {
    bindSettings();
    applyTheme();
    applyTone();
    renderStatus();
    renderGrid();
  });
  $('#q').focus();
})();
