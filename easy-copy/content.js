(() => {
  "use strict";

  // Events that blog sites commonly use to stop copying.
  const BLOCKED_EVENTS = ["copy", "cut", "contextmenu", "selectstart", "dragstart"];

  // Elements that get a "Copy" button when hovered.
  const BLOCK_SELECTOR = "p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, figcaption";

  const host = location.hostname;
  let enabled = true;
  let styleEl = null;
  let selectionBtn = null;
  let blockBtn = null;
  let toastEl = null;
  let hoveredBlock = null;
  let toastTimer = null;

  // Stop page scripts from cancelling copy/selection events.
  // Capturing on window runs before the page's own listeners, so they never see the event.
  for (const type of BLOCKED_EVENTS) {
    window.addEventListener(
      type,
      (e) => {
        if (enabled) e.stopImmediatePropagation();
      },
      true
    );
  }

  function applyCss(on) {
    if (on && !styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "easy-copy-style";
      styleEl.textContent =
        "html, body, body * { -webkit-user-select: text !important; user-select: text !important; }";
      (document.head || document.documentElement).appendChild(styleEl);
    } else if (!on && styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  function hideButtons() {
    if (selectionBtn) selectionBtn.style.display = "none";
    if (blockBtn) blockBtn.style.display = "none";
    hoveredBlock = null;
  }

  function applyState() {
    applyCss(enabled);
    if (!enabled) hideButtons();
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("easy-copy-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("easy-copy-show"), 1500);
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Fallback for pages where the async clipboard API is unavailable.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast("Copied!");
  }

  function positionAt(el, top, left) {
    el.style.top = `${top + window.scrollY}px`;
    el.style.left = `${left + window.scrollX}px`;
    el.style.display = "block";
  }

  function updateSelectionButton() {
    if (!enabled || !selectionBtn) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim() || sel.rangeCount === 0) {
      selectionBtn.style.display = "none";
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) {
      selectionBtn.style.display = "none";
      return;
    }
    positionAt(selectionBtn, rect.top - 40, rect.left + rect.width / 2 - 36);
  }

  function onMouseOver(e) {
    if (!enabled || !blockBtn) return;
    if (blockBtn.contains(e.target)) return;
    const block = e.target.closest ? e.target.closest(BLOCK_SELECTOR) : null;
    if (!block || !block.innerText || block.innerText.trim().length < 2) {
      if (hoveredBlock) {
        hoveredBlock = null;
        blockBtn.style.display = "none";
      }
      return;
    }
    if (block === hoveredBlock) return;
    hoveredBlock = block;
    const rect = block.getBoundingClientRect();
    positionAt(blockBtn, rect.top + 2, rect.right + 6);
  }

  function buildUi() {
    selectionBtn = document.createElement("button");
    selectionBtn.className = "easy-copy-btn easy-copy-selection";
    selectionBtn.type = "button";
    selectionBtn.textContent = "Copy";
    // Keep the page selection alive when the button is pressed.
    selectionBtn.addEventListener("mousedown", (e) => e.preventDefault());
    selectionBtn.addEventListener("click", () => {
      const text = window.getSelection().toString().trim();
      copyText(text);
      selectionBtn.style.display = "none";
    });

    blockBtn = document.createElement("button");
    blockBtn.className = "easy-copy-btn easy-copy-block";
    blockBtn.type = "button";
    blockBtn.title = "Copy this paragraph";
    blockBtn.textContent = "⧉";
    blockBtn.addEventListener("mousedown", (e) => e.preventDefault());
    blockBtn.addEventListener("click", () => {
      if (!hoveredBlock) return;
      copyText(hoveredBlock.innerText.trim());
      blockBtn.style.display = "none";
    });

    toastEl = document.createElement("div");
    toastEl.className = "easy-copy-toast";

    const root = document.documentElement;
    root.appendChild(selectionBtn);
    root.appendChild(blockBtn);
    root.appendChild(toastEl);

    document.addEventListener("mouseup", () => setTimeout(updateSelectionButton, 0), true);
    document.addEventListener("keyup", () => setTimeout(updateSelectionButton, 0), true);
    document.addEventListener("scroll", hideButtons, true);
    document.addEventListener("mouseover", onMouseOver, true);
  }

  // Read the per-site setting, then keep it in sync with the popup.
  try {
    chrome.storage.local.get({ disabledSites: [] }, (data) => {
      enabled = !data.disabledSites.includes(host);
      applyState();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.disabledSites) {
        enabled = !changes.disabledSites.newValue.includes(host);
        applyState();
      }
    });
  } catch (_) {
    enabled = true;
  }

  applyCss(true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUi, { once: true });
  } else {
    buildUi();
  }
})();
