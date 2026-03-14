(function (global) {
  const app = (global.MuffMojo = global.MuffMojo || {});

  function normalizeSearchTerm(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/^:+|:+$/g, "")
      .replace(/[\s_-]+/g, "");
  }

  function scoreValues(query, values, weights) {
    let bestScore = -1;

    values.forEach((value) => {
      if (!value) {
        return;
      }

      if (value === query) {
        bestScore = Math.max(bestScore, weights.exact);
        return;
      }

      if (value.startsWith(query)) {
        bestScore = Math.max(bestScore, weights.prefix - (value.length - query.length));
        return;
      }

      const position = value.indexOf(query);
      if (position >= 0) {
        bestScore = Math.max(bestScore, weights.contains - position);
      }
    });

    return bestScore;
  }

  function scoreEntry(query, entry) {
    const shortcodeScore = scoreValues(query, entry.normalizedShortcodes, {
      exact: 1200,
      prefix: 1000,
      contains: 760,
    });

    const keywordScore = scoreValues(query, entry.normalizedKeywords, {
      exact: 860,
      prefix: 720,
      contains: 540,
    });

    const fallbackScore = scoreValues(query, entry.searchTerms, {
      exact: 640,
      prefix: 520,
      contains: 380,
    });

    return Math.max(shortcodeScore, keywordScore, fallbackScore);
  }

  function compareResults(left, right) {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftShortcode = left.entry.shortcodes[0] || "";
    const rightShortcode = right.entry.shortcodes[0] || "";

    if (leftShortcode.length !== rightShortcode.length) {
      return leftShortcode.length - rightShortcode.length;
    }

    return leftShortcode.localeCompare(rightShortcode);
  }

  function searchEmojis(query, entries, limit) {
    const normalizedQuery = normalizeSearchTerm(query);
    if (!normalizedQuery) {
      return [];
    }

    return entries
      .map((entry) => ({
        entry,
        score: scoreEntry(normalizedQuery, entry),
      }))
      .filter((item) => item.score >= 0)
      .sort(compareResults)
      .slice(0, limit || 5)
      .map((item) => item.entry);
  }

  app.fuzzySearch = {
    normalizeSearchTerm,
    searchEmojis,
  };
})(globalThis);
