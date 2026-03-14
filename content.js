(function (global) {
  if (global.__muffmojoInlineEmojiInjectorLoaded) {
    return;
  }

  global.__muffmojoInlineEmojiInjectorLoaded = true;

  const app = global.MuffMojo;
  const dataset = app.emojiDataset.getDataset();
  const searchEmojis = app.fuzzySearch.searchEmojis;
  const editable = app.editable;
  const TOOLTIP_LIMIT = 5;
  const TOOLTIP_GAP = 10;
  const TOOLTIP_ID = "muffmojo-inline-tooltip";
  const EDITABLE_SELECTOR = "textarea, input, [contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox']";
  const MESSAGE_HINT_PATTERN = /(message|chat|reply|send|type|write|talk|dm)/i;

  const state = {
    activeTarget: null,
    context: null,
    queryKey: "",
    queryText: "",
    results: [],
    selectedIndex: 0,
  };

  let refreshFrame = 0;
  let targetFrame = 0;

  function createTooltip() {
    const root = document.createElement("section");
    root.id = TOOLTIP_ID;
    root.setAttribute("role", "listbox");
    root.setAttribute("aria-label", "MuffMojo emoji suggestions");
    root.style.position = "fixed";
    root.style.display = "none";
    root.style.minWidth = "260px";
    root.style.maxWidth = "320px";
    root.style.padding = "10px";
    root.style.border = "1px solid rgba(255, 255, 255, 0.22)";
    root.style.borderRadius = "20px";
    root.style.background = "linear-gradient(160deg, rgba(11, 18, 32, 0.96), rgba(34, 63, 99, 0.92))";
    root.style.boxShadow = "0 20px 60px rgba(11, 18, 32, 0.32)";
    root.style.backdropFilter = "blur(18px)";
    root.style.zIndex = "2147483647";
    root.style.color = "#f8fafc";
    root.style.pointerEvents = "auto";
    root.style.fontFamily = "Georgia, 'Times New Roman', serif";

    root.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    root.addEventListener("click", (event) => {
      const option = event.target.closest("[data-emoji-index]");
      if (!option) {
        return;
      }

      const index = Number(option.getAttribute("data-emoji-index"));
      if (Number.isNaN(index)) {
        return;
      }

      acceptSelection(index);
    });

    return root;
  }

  function ensureTooltipRoot() {
    let root = document.getElementById(TOOLTIP_ID);
    if (root) {
      return root;
    }

    root = createTooltip();
    (document.body || document.documentElement).appendChild(root);
    return root;
  }

  function clearState() {
    state.context = null;
    state.queryKey = "";
    state.queryText = "";
    state.results = [];
    state.selectedIndex = 0;
  }

  function hideTooltip() {
    const tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip) {
      tooltip.style.display = "none";
      tooltip.innerHTML = "";
    }

    clearState();
  }

  function normalizeTarget(node) {
    const target = editable.resolveEditableTarget(node);
    return editable.isEditableTarget(target) ? target : null;
  }

  function targetIsConnected(target) {
    return Boolean(target && target.isConnected);
  }

  function getTargetLabel(target) {
    if (!target) {
      return "";
    }

    return [
      target.getAttribute("aria-label"),
      target.getAttribute("placeholder"),
      target.getAttribute("title"),
      target.getAttribute("data-lexical-editor"),
    ]
      .filter(Boolean)
      .join(" ");
  }

  function isVisibleTarget(target) {
    if (!targetIsConnected(target)) {
      return false;
    }

    const style = global.getComputedStyle(target);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = target.getBoundingClientRect();
    return rect.width > 18 && rect.height > 18;
  }

  function scoreTarget(target) {
    if (!isVisibleTarget(target)) {
      return -1;
    }

    const rect = target.getBoundingClientRect();
    const label = getTargetLabel(target);
    let score = 0;

    if (target === document.activeElement) {
      score += 100;
    }

    if (MESSAGE_HINT_PATTERN.test(label)) {
      score += 50;
    }

    if (target.isContentEditable || target.tagName === "TEXTAREA") {
      score += 20;
    }

    if (rect.width >= 240) {
      score += 12;
    }

    if (rect.bottom > global.innerHeight * 0.52) {
      score += 18;
    }

    if (rect.top < 120) {
      score -= 20;
    }

    return score;
  }

  function getVisibleEditableTargets() {
    const candidates = Array.from(document.querySelectorAll(EDITABLE_SELECTOR))
      .map((node) => normalizeTarget(node))
      .filter(Boolean)
      .filter((target, index, list) => list.indexOf(target) === index);

    return candidates
      .map((target) => ({
        target,
        score: scoreTarget(target),
      }))
      .filter((item) => item.score >= 0)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.target);
  }

  function findPreferredTarget() {
    const activeTarget = normalizeTarget(document.activeElement);
    if (activeTarget && isVisibleTarget(activeTarget)) {
      return activeTarget;
    }

    const [bestTarget] = getVisibleEditableTargets();
    return bestTarget || null;
  }

  function shouldAutofocusTarget(target) {
    return Boolean(target) && scoreTarget(target) >= 60;
  }

  function setActiveTarget(node) {
    const target = normalizeTarget(node);
    state.activeTarget = target;
    if (!target) {
      hideTooltip();
    }
  }

  function maybeReacquireTarget(focusIfNeeded) {
    if (targetFrame) {
      return;
    }

    targetFrame = global.requestAnimationFrame(() => {
      targetFrame = 0;

      const preferredTarget = findPreferredTarget();
      if (!preferredTarget) {
        state.activeTarget = null;
        hideTooltip();
        return;
      }

      const needsSwap =
        preferredTarget !== state.activeTarget ||
        !targetIsConnected(state.activeTarget) ||
        !isVisibleTarget(preferredTarget);

      state.activeTarget = preferredTarget;

      const activeElement = document.activeElement;
      const activeIsEditable = editable.isEditableTarget(activeElement);

      if (focusIfNeeded && (!activeIsEditable || activeElement === document.body) && shouldAutofocusTarget(preferredTarget)) {
        preferredTarget.focus({ preventScroll: true });
      }

      if (needsSwap) {
        scheduleRefresh(true, preferredTarget);
      }
    });
  }

  function getPrimaryShortcode(entry) {
    return entry.shortcodes[0] ? `:${entry.shortcodes[0]}:` : "";
  }

  function renderTooltip() {
    const tooltip = ensureTooltipRoot();
    tooltip.innerHTML = "";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";
    header.style.padding = "4px 4px 10px";

    const brand = document.createElement("span");
    brand.textContent = "MuffMojo";
    brand.style.fontSize = "15px";
    brand.style.fontWeight = "700";
    brand.style.letterSpacing = "0.04em";

    const query = document.createElement("span");
    query.textContent = `:${state.queryText}`;
    query.style.padding = "4px 10px";
    query.style.borderRadius = "999px";
    query.style.background = "rgba(255, 255, 255, 0.12)";
    query.style.fontFamily = "Consolas, monospace";
    query.style.fontSize = "12px";

    header.appendChild(brand);
    header.appendChild(query);
    tooltip.appendChild(header);

    state.results.forEach((entry, index) => {
      const active = index === state.selectedIndex;
      const option = document.createElement("button");
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", active ? "true" : "false");
      option.setAttribute("data-emoji-index", String(index));
      option.style.display = "grid";
      option.style.gridTemplateColumns = "48px 1fr auto";
      option.style.alignItems = "center";
      option.style.width = "100%";
      option.style.gap = "12px";
      option.style.padding = "10px 12px";
      option.style.border = "0";
      option.style.borderRadius = "14px";
      option.style.background = active ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "rgba(255, 255, 255, 0.06)";
      option.style.color = "#f8fafc";
      option.style.cursor = "pointer";
      option.style.textAlign = "left";
      option.style.marginTop = index === 0 ? "0" : "6px";

      const emojiBadge = document.createElement("span");
      emojiBadge.textContent = entry.emoji;
      emojiBadge.style.display = "grid";
      emojiBadge.style.placeItems = "center";
      emojiBadge.style.width = "42px";
      emojiBadge.style.height = "42px";
      emojiBadge.style.borderRadius = "12px";
      emojiBadge.style.background = active ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.1)";
      emojiBadge.style.fontSize = "22px";

      const textColumn = document.createElement("span");
      textColumn.style.display = "flex";
      textColumn.style.flexDirection = "column";
      textColumn.style.minWidth = "0";

      const shortcode = document.createElement("span");
      shortcode.textContent = getPrimaryShortcode(entry);
      shortcode.style.fontSize = "13px";
      shortcode.style.fontWeight = "700";
      shortcode.style.fontFamily = "Consolas, monospace";

      const keywords = document.createElement("span");
      keywords.textContent = entry.keywords.slice(0, 3).join(" / ");
      keywords.style.fontSize = "11px";
      keywords.style.opacity = "0.86";
      keywords.style.whiteSpace = "nowrap";
      keywords.style.overflow = "hidden";
      keywords.style.textOverflow = "ellipsis";

      const action = document.createElement("span");
      action.textContent = active ? "Enter" : "";
      action.style.fontSize = "10px";
      action.style.fontFamily = "Consolas, monospace";
      action.style.opacity = "0.84";
      action.style.textTransform = "uppercase";
      action.style.letterSpacing = "0.08em";

      textColumn.appendChild(shortcode);
      textColumn.appendChild(keywords);
      option.appendChild(emojiBadge);
      option.appendChild(textColumn);
      option.appendChild(action);
      tooltip.appendChild(option);
    });

    tooltip.style.display = state.results.length ? "block" : "none";
  }

  function positionTooltip() {
    if (!state.context || !state.results.length) {
      return;
    }

    const tooltip = ensureTooltipRoot();
    const anchorRect = editable.getCaretAnchorRect(state.activeTarget, state.context);
    if (!anchorRect) {
      return;
    }

    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.visibility = "hidden";
    tooltip.style.display = "block";

    const rect = tooltip.getBoundingClientRect();
    const maxLeft = Math.max(10, global.innerWidth - rect.width - 10);
    const centeredLeft = anchorRect.left - rect.width * 0.18;
    const left = Math.min(Math.max(centeredLeft, 10), maxLeft);
    const preferredTop = anchorRect.bottom + TOOLTIP_GAP;
    const flippedTop = anchorRect.top - rect.height - TOOLTIP_GAP;
    const top = preferredTop + rect.height <= global.innerHeight - 10 ? preferredTop : Math.max(10, flippedTop);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.visibility = "visible";
  }

  function updateTooltip() {
    if (!state.results.length || !state.context) {
      hideTooltip();
      return;
    }

    renderTooltip();
    positionTooltip();
  }

  function refreshSuggestions(resetSelection, preferredTarget) {
    const target = normalizeTarget(preferredTarget || document.activeElement || state.activeTarget);
    if (!target || !isVisibleTarget(target)) {
      hideTooltip();
      return;
    }

    state.activeTarget = target;
    const context = editable.readCaretContext(target);
    if (!context) {
      hideTooltip();
      return;
    }

    const results = searchEmojis(context.query, dataset, TOOLTIP_LIMIT);
    if (!results.length) {
      hideTooltip();
      return;
    }

    const queryKey = `${context.kind}:${context.start}:${context.end}:${context.query}`;
    if (resetSelection || queryKey !== state.queryKey) {
      state.selectedIndex = 0;
    } else if (state.selectedIndex >= results.length) {
      state.selectedIndex = 0;
    }

    state.context = context;
    state.queryKey = queryKey;
    state.queryText = context.query;
    state.results = results;
    updateTooltip();
  }

  function scheduleRefresh(resetSelection, preferredTarget) {
    if (refreshFrame) {
      global.cancelAnimationFrame(refreshFrame);
    }

    refreshFrame = global.requestAnimationFrame(() => {
      refreshFrame = 0;
      refreshSuggestions(Boolean(resetSelection), preferredTarget);
    });
  }

  function acceptSelection(forcedIndex) {
    if (!state.activeTarget || !state.context || !state.results.length) {
      return;
    }

    const selectedIndex = typeof forcedIndex === "number" ? forcedIndex : state.selectedIndex;
    const selected = state.results[selectedIndex];
    if (!selected) {
      return;
    }

    const didReplace = editable.replaceActiveTrigger(state.activeTarget, state.context, selected.emoji);
    hideTooltip();

    if (didReplace) {
      maybeReacquireTarget(false);
    }
  }

  function moveSelection(direction) {
    if (!state.results.length) {
      return;
    }

    const count = state.results.length;
    state.selectedIndex = (state.selectedIndex + direction + count) % count;
    updateTooltip();
  }

  function isTooltipEventTarget(node) {
    const tooltip = document.getElementById(TOOLTIP_ID);
    return Boolean(tooltip && node instanceof global.Element && tooltip.contains(node));
  }

  function handleKeydown(event) {
    const target = normalizeTarget(event.target);
    if (target) {
      state.activeTarget = target;
    }

    if (!state.results.length) {
      return;
    }

    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      acceptSelection();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      hideTooltip();
    }
  }

  document.addEventListener(
    "focusin",
    (event) => {
      setActiveTarget(event.target);
      scheduleRefresh(true, event.target);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      handleKeydown(event);
      if (!state.results.length) {
        maybeReacquireTarget(false);
      }
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      setActiveTarget(event.target);
      scheduleRefresh(true, event.target);
    },
    true
  );

  document.addEventListener(
    "selectionchange",
    () => {
      scheduleRefresh(false, state.activeTarget);
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (isTooltipEventTarget(event.target)) {
        return;
      }

      const target = normalizeTarget(event.target);
      if (target) {
        state.activeTarget = target;
        return;
      }

      hideTooltip();
    },
    true
  );

  global.addEventListener(
    "scroll",
    () => {
      if (state.results.length) {
        positionTooltip();
      }
    },
    true
  );

  global.addEventListener("resize", () => {
    maybeReacquireTarget(false);
    if (state.results.length) {
      positionTooltip();
    }
  });

  const observer = new MutationObserver(() => {
    maybeReacquireTarget(true);
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-label", "class", "contenteditable", "placeholder", "role", "style"],
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        maybeReacquireTarget(true);
      },
      { once: true }
    );
  } else {
    maybeReacquireTarget(true);
  }
})(globalThis);
