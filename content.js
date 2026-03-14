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
  const EDITABLE_SELECTOR = "textarea, input, [contenteditable]:not([contenteditable='false']), [role='textbox']";
  const MESSAGE_HINT_PATTERN = /(message|chat|reply|send|type|write|talk|dm|compose|comment|caption|note)/i;
  const AUTOFOCUS_HOSTS = [
    /web\.whatsapp\.com$/i,
    /instagram\.com$/i,
    /discord\.com$/i,
    /messenger\.com$/i,
    /messages\.google\.com$/i,
  ];

  const state = {
    activeTarget: null,
    context: null,
    lastInsertedEmoji: "",
    queryKey: "",
    queryText: "",
    results: [],
    selectedIndex: 0,
  };

  let refreshFrame = 0;
  let targetFrame = 0;
  let monitorTimer = 0;

  function getDeepActiveElement(root) {
    let activeElement = (root || document).activeElement || null;
    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
  }

  function getEventEditableTarget(event) {
    if (!event || typeof event.composedPath !== "function") {
      return null;
    }

    const path = event.composedPath();
    for (let index = 0; index < path.length; index += 1) {
      const target = editable.resolveEditableTarget(path[index]);
      if (editable.isEditableTarget(target)) {
        return target;
      }
    }

    return null;
  }

  function ensureMonitor() {
    if (monitorTimer) {
      return;
    }

    monitorTimer = global.setInterval(() => {
      if (document.hidden) {
        return;
      }

      const target = normalizeTarget(getSelectionAnchorTarget() || getDeepActiveElement() || state.activeTarget);
      if (target && isVisibleTarget(target)) {
        state.activeTarget = target;
        refreshSuggestions(false, target);
        return;
      }

      maybeReacquireTarget(false);
    }, 120);
  }

  function createTooltip() {
    const root = document.createElement("section");
    root.id = TOOLTIP_ID;
    root.setAttribute("role", "listbox");
    root.setAttribute("aria-label", "MuffMojo emoji suggestions");
    root.style.position = "fixed";
    root.style.display = "none";
    root.style.minWidth = "280px";
    root.style.maxWidth = "340px";
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
      if (!Number.isNaN(index)) {
        acceptSelection(index);
      }
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

  function clearSuggestionState() {
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

    clearSuggestionState();
  }

  function getSelectionAnchorTarget() {
    const selection = global.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    return editable.resolveEditableTarget(selection.anchorNode) || editable.resolveEditableTarget(selection.focusNode);
  }

  function normalizeTarget(node) {
    const directTarget = editable.resolveEditableTarget(node);
    if (editable.isEditableTarget(directTarget)) {
      return directTarget;
    }

    const selectionTarget = getSelectionAnchorTarget();
    if (editable.isEditableTarget(selectionTarget)) {
      return selectionTarget;
    }

    const deepActiveTarget = editable.resolveEditableTarget(getDeepActiveElement());
    return editable.isEditableTarget(deepActiveTarget) ? deepActiveTarget : null;
  }

  function targetIsConnected(target) {
    return Boolean(target && target.isConnected);
  }

  function getParentElement(element) {
    if (!element) {
      return null;
    }

    if (element.parentElement) {
      return element.parentElement;
    }

    const root = typeof element.getRootNode === "function" ? element.getRootNode() : null;
    if (root instanceof global.ShadowRoot) {
      return root.host;
    }

    return null;
  }

  function getTargetMetadata(target) {
    if (!target) {
      return "";
    }

    const tokens = [
      target.getAttribute("aria-label"),
      target.getAttribute("aria-placeholder"),
      target.getAttribute("placeholder"),
      target.getAttribute("title"),
      target.getAttribute("name"),
      target.id,
      target.className,
      target.getAttribute("data-lexical-editor"),
    ];

    const parent = target.parentElement;
    if (parent) {
      tokens.push(parent.getAttribute("aria-label"), parent.id, parent.className);
    }

    return tokens.filter(Boolean).join(" ");
  }

  function isVisibleElement(element) {
    if (!element || !element.isConnected) {
      return false;
    }

    const style = global.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 18 && rect.height > 18;
  }

  function getVisibleAnchorTarget(target) {
    let current = target;
    while (current) {
      if (current instanceof global.Element && isVisibleElement(current)) {
        return current;
      }

      current = getParentElement(current);
    }

    return null;
  }

  function isVisibleTarget(target) {
    if (!targetIsConnected(target)) {
      return false;
    }

    if (isVisibleElement(target)) {
      return true;
    }

    return Boolean(getVisibleAnchorTarget(target));
  }

  function scoreTarget(target) {
    if (!isVisibleTarget(target)) {
      return -1;
    }

    const anchorTarget = getVisibleAnchorTarget(target) || target;
    const rect = anchorTarget.getBoundingClientRect();
    const metadata = getTargetMetadata(target);
    const deepActiveElement = getDeepActiveElement();
    let score = 0;

    if (target === document.activeElement || target === deepActiveElement) {
      score += 100;
    }

    if (target === state.activeTarget) {
      score += 24;
    }

    if (MESSAGE_HINT_PATTERN.test(metadata)) {
      score += 54;
    }

    if (target.isContentEditable || target.tagName === "TEXTAREA") {
      score += 20;
    }

    if (rect.width >= 170) {
      score += 12;
    }

    if (rect.bottom > global.innerHeight * 0.46) {
      score += 18;
    }

    if (target.closest("footer, form, [role='dialog'], [aria-label*='chat' i], [aria-label*='message' i], [aria-label*='conversation' i]")) {
      score += 20;
    }

    if (rect.top < 110) {
      score -= 16;
    }

    return score;
  }

  function getVisibleEditableTargets() {
    const seen = new Set();
    const candidates = [];

    function addCandidate(node) {
      const target = editable.resolveEditableTarget(node);
      if (!target || seen.has(target)) {
        return;
      }

      seen.add(target);
      candidates.push(target);
    }

    function walk(root) {
      if (!root) {
        return;
      }

      if (typeof root.querySelectorAll === "function") {
        root.querySelectorAll(EDITABLE_SELECTOR).forEach((node) => {
          addCandidate(node);
        });
      }

      const walker = document.createTreeWalker(root, global.NodeFilter.SHOW_ELEMENT);
      let current = walker.nextNode();
      while (current) {
        if (current.shadowRoot) {
          walk(current.shadowRoot);
        }
        current = walker.nextNode();
      }
    }

    walk(document);

    return candidates
      .map((target) => ({
        target,
        score: scoreTarget(target),
      }))
      .filter((item) => item.score >= 0)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.target);
  }

  function hostAllowsAutofocus() {
    return AUTOFOCUS_HOSTS.some((pattern) => pattern.test(global.location.hostname));
  }

  function findPreferredTarget(candidates) {
    const selectionTarget = normalizeTarget(getSelectionAnchorTarget());
    if (selectionTarget && isVisibleTarget(selectionTarget)) {
      return selectionTarget;
    }

    const activeTarget = normalizeTarget(getDeepActiveElement() || document.activeElement);
    if (activeTarget && isVisibleTarget(activeTarget)) {
      const activeScore = scoreTarget(activeTarget);
      const bestScore = candidates.length ? scoreTarget(candidates[0]) : -1;
      if (activeScore >= bestScore - 18) {
        return activeTarget;
      }
    }

    return candidates[0] || null;
  }

  function shouldAutofocusTarget(target, candidates) {
    if (!target) {
      return false;
    }

    const score = scoreTarget(target);
    if (score >= 60) {
      return true;
    }

    if (hostAllowsAutofocus() && candidates.length <= 2 && score >= 24) {
      return true;
    }

    return false;
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

      const candidates = getVisibleEditableTargets();
      const preferredTarget = findPreferredTarget(candidates);

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

      const activeElement = getDeepActiveElement() || document.activeElement;
      const activeIsEditable = editable.isEditableTarget(activeElement);

      if (
        focusIfNeeded &&
        (!activeIsEditable || activeElement === document.body) &&
        shouldAutofocusTarget(preferredTarget, candidates)
      ) {
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
    let anchorRect = editable.getCaretAnchorRect(state.activeTarget, state.context);
    if (!anchorRect || !Number.isFinite(anchorRect.left) || !Number.isFinite(anchorRect.top)) {
      const anchorTarget = getVisibleAnchorTarget(state.activeTarget);
      anchorRect = anchorTarget ? anchorTarget.getBoundingClientRect() : null;
    }
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
    const target = normalizeTarget(preferredTarget || getSelectionAnchorTarget() || getDeepActiveElement() || document.activeElement || state.activeTarget);
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

  function getLiveSuggestionState(preferredTarget) {
    const liveTarget = normalizeTarget(preferredTarget || getSelectionAnchorTarget() || getDeepActiveElement() || state.activeTarget);
    if (!liveTarget || !isVisibleTarget(liveTarget)) {
      return null;
    }

    const liveContext = editable.readCaretContext(liveTarget);
    if (!liveContext) {
      return null;
    }

    const liveResults = searchEmojis(liveContext.query, dataset, TOOLTIP_LIMIT);
    if (!liveResults.length) {
      return null;
    }

    return {
      target: liveTarget,
      context: liveContext,
      results: liveResults,
    };
  }

  function acceptSelection(forcedIndex) {
    const liveState = getLiveSuggestionState(state.activeTarget);
    if (!liveState) {
      return;
    }

    const { target, context, results } = liveState;
    const selectedIndex = typeof forcedIndex === "number" ? forcedIndex : state.selectedIndex;
    const selected = results[selectedIndex] || results[0];
    if (!selected) {
      return;
    }

    const didReplace = editable.replaceActiveTrigger(target, context, selected.emoji);
    hideTooltip();

    if (didReplace) {
      state.lastInsertedEmoji = selected.emoji;
      state.activeTarget = normalizeTarget(target) || target;
      scheduleRefresh(false, state.activeTarget);
    }
  }

  function insertPreviousEmojiOverTrigger(context, target) {
    const liveTarget = normalizeTarget(target || state.activeTarget);
    const liveContext = context || (liveTarget ? editable.readCaretContext(liveTarget) : null);
    if (!liveContext || !liveTarget || !state.lastInsertedEmoji) {
      return false;
    }

    const didReplace = editable.replaceActiveTrigger(liveTarget, liveContext, state.lastInsertedEmoji);
    if (didReplace) {
      hideTooltip();
      state.activeTarget = liveTarget;
      scheduleRefresh(false, liveTarget);
    }

    return didReplace;
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
    const target = getEventEditableTarget(event) || normalizeTarget(event.target);
    if (target) {
      state.activeTarget = target;
    } else {
      state.activeTarget = normalizeTarget(getSelectionAnchorTarget()) || normalizeTarget(getDeepActiveElement()) || state.activeTarget;
    }

    if (event.key === "ArrowUp" && state.lastInsertedEmoji) {
      const liveContext = state.activeTarget ? editable.readCaretContext(state.activeTarget, { minQueryLength: 1 }) : null;
      if (insertPreviousEmojiOverTrigger(liveContext, state.activeTarget)) {
        event.preventDefault();
        return;
      }
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

    if (event.key === "ArrowLeft") {
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
      const target = getEventEditableTarget(event) || event.target;
      setActiveTarget(target);
      ensureMonitor();
      scheduleRefresh(true, target);
    },
    true
  );

  document.addEventListener(
    "beforeinput",
    (event) => {
      const target = getEventEditableTarget(event) || event.target || getSelectionAnchorTarget();
      if (!target) {
        return;
      }

      setActiveTarget(target);
      ensureMonitor();
      global.requestAnimationFrame(() => {
        scheduleRefresh(true, target);
      });
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      ensureMonitor();
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
      const target = getEventEditableTarget(event) || event.target || getSelectionAnchorTarget();
      setActiveTarget(target);
      ensureMonitor();
      scheduleRefresh(true, target);
    },
    true
  );

  document.addEventListener(
    "keyup",
    (event) => {
      if (event.isComposing) {
        return;
      }

      const target = getEventEditableTarget(event) || event.target || getSelectionAnchorTarget();
      if (!target) {
        return;
      }

      state.activeTarget = normalizeTarget(target) || state.activeTarget;
      ensureMonitor();
      scheduleRefresh(false, target);
    },
    true
  );

  document.addEventListener(
    "selectionchange",
    () => {
      const selectionTarget = getSelectionAnchorTarget();
      if (selectionTarget) {
        state.activeTarget = selectionTarget;
        ensureMonitor();
      }
      scheduleRefresh(false, selectionTarget || state.activeTarget);
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (isTooltipEventTarget(event.target)) {
        return;
      }

      const target = getEventEditableTarget(event) || normalizeTarget(event.target);
      if (target) {
        state.activeTarget = target;
        return;
      }

      hideTooltip();
    },
    true
  );

  document.addEventListener(
    "pointerup",
    (event) => {
      const target = getEventEditableTarget(event) || normalizeTarget(event.target);
      if (!target) {
        return;
      }

      state.activeTarget = target;
      ensureMonitor();
      scheduleRefresh(false, target);
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
    attributeFilter: ["aria-label", "aria-placeholder", "class", "contenteditable", "placeholder", "role", "style"],
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

  ensureMonitor();
})(globalThis);
