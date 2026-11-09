// Applies the last-used theme before first paint so the popup doesn't flash light → dark.
// The real setting lives in chrome.storage; this is only a fast local cache of it.
(function () {
  let theme = 'auto';
  try { theme = localStorage.getItem('mm-theme') || 'auto'; } catch (_) { /* storage blocked */ }
  const dark = theme === 'dark' ||
    (theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', dark);
})();
