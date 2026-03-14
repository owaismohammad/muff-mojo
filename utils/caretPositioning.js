(function (global) {
  const app = (global.MuffMojo = global.MuffMojo || {});
  const TOKEN_CHAR = /[a-zA-Z0-9_+-]/;
  const SUPPORTED_INPUT_TYPES = new Set([
    "",
    "email",
    "search",
    "tel",
    "text",
    "url",
  ]);

  function isTextControl(element) {
    if (!element || !(element instanceof global.HTMLElement)) {
      return false;
    }

    if (element instanceof global.HTMLTextAreaElement) {
      return !element.disabled && !element.readOnly;
    }

    if (!(element instanceof global.HTMLInputElement)) {
      return false;
    }

    return SUPPORTED_INPUT_TYPES.has((element.type || "").toLowerCase()) && !element.disabled && !element.readOnly;
  }

  function isRichTextTarget(element) {
    if (!element || !(element instanceof global.HTMLElement)) {
      return false;
    }

    if (element.closest("[contenteditable='false']")) {
      return false;
    }

    return element.isContentEditable || element.getAttribute("role") === "textbox";
  }

  function resolveEditableTarget(node) {
    if (!node) {
      return null;
    }

    const element = node instanceof global.Element ? node : node.parentElement;
    if (!element) {
      return null;
    }

    const directTarget = isTextControl(element) ? element : null;
    if (directTarget) {
      return directTarget;
    }

    return element.closest("textarea, input, [contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox']");
  }

  function isEditableTarget(node) {
    const target = resolveEditableTarget(node);
    return isTextControl(target) || isRichTextTarget(target);
  }

  function isBoundary(character) {
    return !character || !TOKEN_CHAR.test(character);
  }

  function findTrigger(text, caretIndex) {
    if (!text || caretIndex == null) {
      return null;
    }

    let start = caretIndex;
    while (start > 0 && TOKEN_CHAR.test(text[start - 1])) {
      start -= 1;
    }

    if (start === 0 || text[start - 1] !== ":") {
      return null;
    }

    start -= 1;

    const previous = start > 0 ? text[start - 1] : "";
    if (!isBoundary(previous)) {
      return null;
    }

    let end = caretIndex;
    while (end < text.length && TOKEN_CHAR.test(text[end])) {
      end += 1;
    }

    const triggerText = text.slice(start, end);
    const query = triggerText.slice(1);

    if (query.length < 2) {
      return null;
    }

    return {
      start,
      end,
      triggerText,
      query,
    };
  }

  function getNodeTextLength(node) {
    if (!node) {
      return 0;
    }

    if (node.nodeType === global.Node.TEXT_NODE) {
      return node.textContent.length;
    }

    let total = 0;
    node.childNodes.forEach((child) => {
      total += getNodeTextLength(child);
    });
    return total;
  }

  function getTextOffset(root, node, offset) {
    let total = 0;
    let found = false;

    function walk(currentNode) {
      if (found || !currentNode) {
        return;
      }

      if (currentNode === node) {
        if (currentNode.nodeType === global.Node.TEXT_NODE) {
          total += offset;
        } else {
          for (let index = 0; index < Math.min(offset, currentNode.childNodes.length); index += 1) {
            total += getNodeTextLength(currentNode.childNodes[index]);
          }
        }
        found = true;
        return;
      }

      if (currentNode.nodeType === global.Node.TEXT_NODE) {
        total += currentNode.textContent.length;
        return;
      }

      currentNode.childNodes.forEach((child) => {
        walk(child);
      });
    }

    walk(root);
    return total;
  }

  function resolveTextOffset(root, offset) {
    const walker = document.createTreeWalker(root, global.NodeFilter.SHOW_TEXT);
    let currentOffset = offset;
    let currentNode = walker.nextNode();

    while (currentNode) {
      const length = currentNode.textContent.length;
      if (currentOffset <= length) {
        return {
          node: currentNode,
          offset: currentOffset,
        };
      }

      currentOffset -= length;
      currentNode = walker.nextNode();
    }

    if (root.lastChild && root.lastChild.nodeType === global.Node.TEXT_NODE) {
      return {
        node: root.lastChild,
        offset: root.lastChild.textContent.length,
      };
    }

    const trailingTextNode = document.createTextNode("");
    root.appendChild(trailingTextNode);
    return {
      node: trailingTextNode,
      offset: 0,
    };
  }

  function createTextOffsetRange(root, start, end) {
    const range = document.createRange();
    const startPoint = resolveTextOffset(root, start);
    const endPoint = resolveTextOffset(root, end);
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return range;
  }

  function getSelectionRangeForTarget(target) {
    const selection = global.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      return null;
    }

    if (!target.contains(range.startContainer)) {
      return null;
    }

    return range;
  }

  function readTextControlContext(target) {
    if (!isTextControl(target)) {
      return null;
    }

    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;

    if (selectionStart == null || selectionEnd == null || selectionStart !== selectionEnd) {
      return null;
    }

    const trigger = findTrigger(target.value, selectionStart);
    if (!trigger) {
      return null;
    }

    return {
      kind: "text-control",
      target,
      caretIndex: selectionStart,
      query: trigger.query,
      triggerText: trigger.triggerText,
      start: trigger.start,
      end: trigger.end,
      anchorRect: getTextControlCaretRect(target, selectionStart),
    };
  }

  function readRichTextContext(target) {
    if (!isRichTextTarget(target)) {
      return null;
    }

    const selectionRange = getSelectionRangeForTarget(target);
    if (!selectionRange) {
      return null;
    }

    const textContent = target.textContent || "";
    const caretIndex = getTextOffset(target, selectionRange.startContainer, selectionRange.startOffset);
    const trigger = findTrigger(textContent, caretIndex);
    if (!trigger) {
      return null;
    }

    return {
      kind: "rich-text",
      target,
      caretIndex,
      query: trigger.query,
      triggerText: trigger.triggerText,
      start: trigger.start,
      end: trigger.end,
      replacementRange: createTextOffsetRange(target, trigger.start, trigger.end),
      anchorRect: getRangeAnchorRect(selectionRange, target),
    };
  }

  function readCaretContext(target) {
    if (isTextControl(target)) {
      return readTextControlContext(target);
    }

    if (isRichTextTarget(target)) {
      return readRichTextContext(target);
    }

    return null;
  }

  function dispatchFrameworkEvents(target) {
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setNativeValue(target, value) {
    const prototype = target instanceof global.HTMLTextAreaElement ? global.HTMLTextAreaElement.prototype : global.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor && descriptor.set) {
      descriptor.set.call(target, value);
      return;
    }

    target.value = value;
  }

  function replaceActiveTrigger(target, context, replacement) {
    if (!target || !context) {
      return false;
    }

    if (context.kind === "text-control") {
      const nextValue = `${target.value.slice(0, context.start)}${replacement}${target.value.slice(context.end)}`;
      const nextCaretIndex = context.start + replacement.length;
      setNativeValue(target, nextValue);
      target.focus();
      target.setSelectionRange(nextCaretIndex, nextCaretIndex);
      dispatchFrameworkEvents(target);
      return true;
    }

    if (context.kind === "rich-text") {
      const range = context.replacementRange.cloneRange();
      const selection = global.getSelection();
      const textNode = document.createTextNode(replacement);

      range.deleteContents();
      range.insertNode(textNode);

      const nextRange = document.createRange();
      nextRange.setStart(textNode, replacement.length);
      nextRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(nextRange);
      target.focus();
      dispatchFrameworkEvents(target);
      return true;
    }

    return false;
  }

  function getSelectionMirrorStyle(target, mirror) {
    const style = global.getComputedStyle(target);
    const properties = [
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "height",
      "letterSpacing",
      "lineHeight",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "textAlign",
      "textIndent",
      "textTransform",
      "whiteSpace",
      "wordBreak",
      "wordSpacing",
      "wordWrap",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderRightWidth",
      "borderTopWidth",
      "width",
    ];

    properties.forEach((property) => {
      mirror.style[property] = style[property];
    });

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.overflow = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.whiteSpace = target instanceof global.HTMLInputElement ? "pre" : "pre-wrap";
    mirror.style.overflowWrap = "break-word";
  }

  function getTextControlCaretRect(target, caretIndex) {
    const mirror = document.createElement("div");
    getSelectionMirrorStyle(target, mirror);

    const before = target.value.slice(0, caretIndex);
    const after = target.value.slice(caretIndex) || ".";
    mirror.textContent = before;

    const marker = document.createElement("span");
    marker.textContent = after[0];
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const targetRect = target.getBoundingClientRect();
    const computed = global.getComputedStyle(target);
    const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2 || 18;
    const left = targetRect.left + marker.offsetLeft - target.scrollLeft;
    const top = targetRect.top + marker.offsetTop - target.scrollTop;

    mirror.remove();

    return {
      left,
      top,
      bottom: top + lineHeight,
      height: lineHeight,
      width: 1,
    };
  }

  function getRangeAnchorRect(range, target) {
    const rect = range.getBoundingClientRect();
    if (rect && rect.width + rect.height > 0) {
      return rect;
    }

    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    const clone = range.cloneRange();
    clone.insertNode(marker);
    const markerRect = marker.getBoundingClientRect();
    marker.remove();

    const selection = global.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    if (markerRect && markerRect.width + markerRect.height > 0) {
      return markerRect;
    }

    return target.getBoundingClientRect();
  }

  function getCaretAnchorRect(target, context) {
    if (!context) {
      return null;
    }

    if (context.anchorRect) {
      return context.anchorRect;
    }

    if (context.kind === "text-control") {
      return getTextControlCaretRect(target, context.caretIndex);
    }

    return target.getBoundingClientRect();
  }

  app.editable = {
    getCaretAnchorRect,
    isEditableTarget,
    readCaretContext,
    replaceActiveTrigger,
    resolveEditableTarget,
  };
})(globalThis);
