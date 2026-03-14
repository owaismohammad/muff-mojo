(function (global) {
  const app = (global.MuffMojo = global.MuffMojo || {});

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function prepareDataset(sourceEntries) {
    const normalize = app.fuzzySearch.normalizeSearchTerm;

    return (sourceEntries || [])
      .map((entry, index) => {
        const shortcodes = unique(entry.shortcodes || []);
        const keywords = unique(entry.keywords || []);
        const normalizedShortcodes = unique(shortcodes.map(normalize));
        const normalizedKeywords = unique(keywords.map(normalize));
        const searchTerms = unique([...normalizedShortcodes, ...normalizedKeywords]);

        if (!entry.emoji || shortcodes.length === 0) {
          return null;
        }

        return {
          id: `${entry.emoji}-${shortcodes[0] || index}`,
          emoji: entry.emoji,
          shortcodes,
          keywords,
          normalizedShortcodes,
          normalizedKeywords,
          searchTerms,
        };
      })
      .filter(Boolean);
  }

  const dataset = prepareDataset(app.emojiData || []);

  function getDataset() {
    return dataset;
  }

  app.emojiDataset = {
    getDataset,
    prepareDataset,
  };
})(globalThis);
