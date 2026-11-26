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
  let highlightEl = null;
  let toastEl = null;
  let pickMode = false;
  let pickTarget = null;
  let pickEl = null;
  const pins = []; // { target, el, labelEl, status, num, note } annotations pinned in pick mode
  let lastStatus = "fail";
  let shotTimer = null;
  let reporterName = "";
  const DOUBLE_PRESS_MS = 300;
  let notePanel = null;
  let noteNum = null;
  let noteText = null;
  let editingPin = null;

  const STATUSES = {
    pass: { label: "PASS", color: "#16a34a" },
    fail: { label: "FAIL", color: "#dc2626" },
    later: { label: "CHECK LATER", color: "#d97706" },
    unsure: { label: "NOT SURE", color: "#7c3aed" },
  };
  const STATUS_KEYS = { p: "pass", f: "fail", l: "later", n: "unsure" };
  let hoveredBlock = null;
  let toastTimer = null;
  let hideTimer = null;

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
    clearTimeout(hideTimer);
    if (selectionBtn) selectionBtn.style.display = "none";
    hideBlockUi();
  }

  // Hide the block copy button and the border around the block it will copy.
  function hideBlockUi() {
    if (blockBtn) blockBtn.style.display = "none";
    if (highlightEl) highlightEl.style.display = "none";
    hoveredBlock = null;
  }

  // Draw a border around the block using an overlay, so the page's own styles are never touched.
  function showHighlight(block) {
    if (!highlightEl) return;
    const rect = block.getBoundingClientRect();
    highlightEl.style.top = `${rect.top + window.scrollY}px`;
    highlightEl.style.left = `${rect.left + window.scrollX}px`;
    highlightEl.style.width = `${rect.width}px`;
    highlightEl.style.height = `${rect.height}px`;
    highlightEl.style.display = "block";
  }

  function applyState() {
    applyCss(enabled);
    if (!enabled) {
      hideButtons();
      setPickMode(false);
      clearPins();
    }
  }

  function showToast(message, ms = 1500) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("easy-copy-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("easy-copy-show"), ms);
  }

  // ---- Pick mode (Alt+H): outline any element, pin borders, copy a screenshot ----

  function placeBox(box, target) {
    const r = target.getBoundingClientRect();
    box.style.top = `${r.top + window.scrollY}px`;
    box.style.left = `${r.left + window.scrollX}px`;
    box.style.width = `${r.width}px`;
    box.style.height = `${r.height}px`;
    box.style.display = "block";
  }

  function isPickable(el) {
    return !!(
      el &&
      el.nodeType === 1 &&
      el !== document.documentElement &&
      el !== document.body &&
      !el.closest(
        ".easy-copy-btn, .easy-copy-toast, .easy-copy-highlight, .easy-copy-pick, .easy-copy-pin, .easy-copy-note"
      )
    );
  }

  function setPickMode(on) {
    if (pickMode === on) return;
    pickMode = on;
    document.documentElement.classList.toggle("easy-copy-picking", on);
    if (on) {
      hideButtons();
      showToast(
        "Pick mode: click pin · P pass · F fail · L later · N not sure · E note · S screenshot (SS = full screen) · R report · Esc exit",
        6000
      );
    } else {
      closeNoteEditor();
      if (pickEl) pickEl.style.display = "none";
      pickTarget = null;
      showToast("Pick mode off");
    }
  }

  function onPickOver(e) {
    if (!isPickable(e.target)) return;
    pickTarget = e.target;
    placeBox(pickEl, pickTarget);
  }

  const findPin = (target) => pins.find((p) => p.target === target);

  function renderPin(pin) {
    const s = STATUSES[pin.status];
    pin.el.style.setProperty("--c", s.color);
    pin.labelEl.textContent = `#${pin.num} ${s.label}${pin.note ? ` · ${pin.note}` : ""}`;
  }

  function createPin(target, status) {
    const el = document.createElement("div");
    el.className = "easy-copy-pin";
    const labelEl = document.createElement("span");
    labelEl.className = "easy-copy-pin-label";
    el.appendChild(labelEl);
    placeBox(el, target);
    document.documentElement.appendChild(el);
    const num = pins.reduce((m, p) => Math.max(m, p.num), 0) + 1;
    const pin = { target, el, labelEl, status, num, note: "" };
    pins.push(pin);
    renderPin(pin);
    return pin;
  }

  function removePin(pin) {
    if (editingPin === pin) closeNoteEditor();
    pin.el.remove();
    pins.splice(pins.indexOf(pin), 1);
  }

  // Click: pin with the last-used status, or remove an existing pin.
  function togglePin(target) {
    const pin = findPin(target);
    if (pin) removePin(pin);
    else createPin(target, lastStatus);
  }

  // P / F / L / N: set the status of the hovered element (pinning it if needed).
  function setStatus(target, status) {
    lastStatus = status;
    const pin = findPin(target) || createPin(target, status);
    pin.status = status;
    renderPin(pin);
    showToast(`#${pin.num} ${STATUSES[status].label}`);
  }

  function clearPins() {
    closeNoteEditor();
    for (const p of pins) p.el.remove();
    pins.length = 0;
  }

  function repositionPins() {
    for (const p of pins) if (p.target.isConnected) placeBox(p.el, p.target);
  }

  // ---- Note editor: set the number and a note on a pin ----

  function openNoteEditor(target) {
    if (!notePanel) return;
    const pin = findPin(target) || createPin(target, lastStatus);
    editingPin = pin;
    noteNum.value = pin.num;
    noteText.value = pin.note;
    const r = pin.target.getBoundingClientRect();
    const below = r.bottom + 190 < window.innerHeight;
    notePanel.style.top = `${(below ? r.bottom + 6 : Math.max(8, r.top - 150)) + window.scrollY}px`;
    notePanel.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - 300) + window.scrollX}px`;
    notePanel.style.display = "block";
    noteText.focus();
  }

  function closeNoteEditor() {
    editingPin = null;
    if (notePanel) notePanel.style.display = "none";
  }

  function saveNote() {
    if (!editingPin) return;
    const n = parseInt(noteNum.value, 10);
    if (Number.isFinite(n)) editingPin.num = n;
    editingPin.note = noteText.value.trim();
    renderPin(editingPin);
    closeNoteEditor();
  }

  // ---- Report: copy all pins as text ----

  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    else if (typeof el.className === "string" && el.className.trim()) s += `.${el.className.trim().split(/\s+/)[0]}`;
    const t = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return t ? `${s} "${t}"` : s;
  }

  function copyReport() {
    if (!pins.length) {
      showToast("No pins to report");
      return;
    }
    const lines = [...pins]
      .sort((a, b) => a.num - b.num)
      .map((p) => `#${p.num} [${STATUSES[p.status].label}] ${describe(p.target)}${p.note ? ` - ${p.note}` : ""}`);
    copyText(`${document.title}\n${location.href}\n\n${lines.join("\n")}`);
  }

  function onPickClick(e) {
    if (!pickMode || !enabled) return;
    if (e.target.closest && e.target.closest(".easy-copy-note")) return;
    // Don't let the page react (links, buttons) while picking.
    e.preventDefault();
    e.stopImmediatePropagation();
    if (isPickable(e.target)) togglePin(e.target);
  }

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  // Screenshot the picked element (border included) and put the PNG on the clipboard.
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Stamp "name · YYYY-MM-DD HH:MM:SS" in the bottom-right corner of a screenshot.
  function drawStamp(ctx, cw, ch, scale) {
    const d = new Date();
    const time =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const text = reporterName ? `${reporterName} · ${time}` : time;
    const fontPx = 12 * scale;
    ctx.font = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";
    const padX = 8 * scale;
    const boxH = fontPx + 10 * scale;
    const boxW = Math.min(cw, ctx.measureText(text).width + padX * 2);
    const bx = cw - boxW;
    const by = ch - boxH;
    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, bx + padX, by + boxH / 2, boxW - padX * 2);
  }

  // With no target, captures the whole visible screen (viewport) instead.
  async function copyElementScreenshot(target) {
    let x = 0;
    let y = 0;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (target) {
      const r = target.getBoundingClientRect();
      x = Math.max(0, r.left);
      y = Math.max(0, r.top);
      w = Math.min(window.innerWidth, r.right) - x;
      h = Math.min(window.innerHeight, r.bottom) - y;
      if (w <= 0 || h <= 0) {
        showToast("Element is off-screen: scroll it into view");
        return;
      }
    }
    // Hide our toast (and, for a full-screen shot, the hover outline) so they aren't captured.
    toastEl.style.visibility = "hidden";
    if (!target) pickEl.style.visibility = "hidden";
    await nextFrame();
    await nextFrame();
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: "capture" });
    } finally {
      toastEl.style.visibility = "";
      pickEl.style.visibility = "";
    }
    if (!resp || !resp.dataUrl) {
      showToast("Screenshot failed");
      return;
    }
    const img = new Image();
    img.src = resp.dataUrl;
    await img.decode();
    const scale = img.width / window.innerWidth;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(
      img,
      Math.round(x * scale), Math.round(y * scale), canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    );
    drawStamp(canvas.getContext("2d"), canvas.width, canvas.height, scale);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast(target ? "Element screenshot copied!" : "Full screenshot copied!");
    } catch (_) {
      showToast("Couldn't write image to clipboard");
    }
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

  // Delay hiding so the pointer has time to travel from the paragraph to the button.
  function scheduleBlockHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideBlockUi, 600);
  }

  function cancelBlockHide() {
    clearTimeout(hideTimer);
  }

  function isTypingTarget(el) {
    return !!(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
  }

  // Press "c" while a copy button is showing to trigger it.
  function onKeyDown(e) {
    if (!enabled) return;
    // Alt+H toggles pick mode; Alt+Shift+H clears pinned borders.
    if (e.altKey && e.code === "KeyH" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (e.shiftKey) clearPins();
      else setPickMode(!pickMode);
      return;
    }
    if (pickMode && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPickMode(false);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        copyReport();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.repeat) return;
        // Double-press S = whole screen. A single press waits briefly to see if a second comes.
        if (shotTimer) {
          clearTimeout(shotTimer);
          shotTimer = null;
          copyElementScreenshot(null);
        } else if (pickTarget) {
          const target = pickTarget;
          shotTimer = setTimeout(() => {
            shotTimer = null;
            copyElementScreenshot(target);
          }, DOUBLE_PRESS_MS);
        } else {
          copyElementScreenshot(null);
        }
      } else if (pickTarget) {
        const k = e.key.toLowerCase();
        if (STATUS_KEYS[k]) {
          e.preventDefault();
          setStatus(pickTarget, STATUS_KEYS[k]);
        } else if (k === "e") {
          e.preventDefault();
          openNoteEditor(pickTarget);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          const pin = findPin(pickTarget);
          if (pin) {
            e.preventDefault();
            removePin(pin);
          }
        }
      }
      return;
    }
    if (e.key.toLowerCase() !== "c") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
    if (isTypingTarget(e.target)) return;
    if (selectionBtn && selectionBtn.style.display === "block") {
      const text = window.getSelection().toString().trim();
      if (text) {
        e.preventDefault();
        copyText(text);
        selectionBtn.style.display = "none";
      }
    } else if (blockBtn && blockBtn.style.display === "block" && hoveredBlock) {
      e.preventDefault();
      copyText(hoveredBlock.innerText.trim());
      cancelBlockHide();
      hideBlockUi();
    }
  }

  function onMouseOver(e) {
    if (!enabled || !blockBtn) return;
    if (pickMode) {
      onPickOver(e);
      return;
    }
    if (blockBtn.contains(e.target)) {
      cancelBlockHide();
      return;
    }
    const block = e.target.closest ? e.target.closest(BLOCK_SELECTOR) : null;
    if (!block || !block.innerText || block.innerText.trim().length < 2) {
      if (hoveredBlock) scheduleBlockHide();
      return;
    }
    cancelBlockHide();
    if (block === hoveredBlock) return;
    hoveredBlock = block;
    const rect = block.getBoundingClientRect();
    positionAt(blockBtn, rect.top + 2, rect.right + 6);
    showHighlight(block);
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
      hideBlockUi();
    });

    highlightEl = document.createElement("div");
    highlightEl.className = "easy-copy-highlight";

    pickEl = document.createElement("div");
    pickEl.className = "easy-copy-pick";

    notePanel = document.createElement("div");
    notePanel.className = "easy-copy-note";
    notePanel.innerHTML =
      '<label>No. <input type="number" min="0" class="easy-copy-note-num"></label>' +
      '<textarea class="easy-copy-note-text" rows="3" placeholder="Note…"></textarea>' +
      '<div class="easy-copy-note-hint">Enter save · Shift+Enter newline · Esc cancel</div>';
    noteNum = notePanel.querySelector(".easy-copy-note-num");
    noteText = notePanel.querySelector(".easy-copy-note-text");
    notePanel.addEventListener("keydown", (e) => {
      e.stopPropagation(); // keep page shortcuts out of the editor
      if (e.key === "Escape") closeNoteEditor();
      else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveNote();
      }
    });
    notePanel.addEventListener("keyup", (e) => e.stopPropagation());

    toastEl = document.createElement("div");
    toastEl.className = "easy-copy-toast";

    const root = document.documentElement;
    root.appendChild(selectionBtn);
    root.appendChild(highlightEl);
    root.appendChild(pickEl);
    root.appendChild(notePanel);
    window.addEventListener("resize", repositionPins);
    root.appendChild(blockBtn);
    root.appendChild(toastEl);

    document.addEventListener("mouseup", () => setTimeout(updateSelectionButton, 0), true);
    document.addEventListener("keyup", () => setTimeout(updateSelectionButton, 0), true);
    document.addEventListener("scroll", hideButtons, true);
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("click", onPickClick, true);
    blockBtn.addEventListener("mouseenter", cancelBlockHide);
    blockBtn.addEventListener("mouseleave", scheduleBlockHide);
  }

  // Read the per-site setting, then keep it in sync with the popup.
  try {
    chrome.storage.local.get({ disabledSites: [], reporterName: "" }, (data) => {
      enabled = !data.disabledSites.includes(host);
      reporterName = data.reporterName;
      applyState();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.disabledSites) {
        enabled = !changes.disabledSites.newValue.includes(host);
        applyState();
      }
      if (changes.reporterName) reporterName = changes.reporterName.newValue || "";
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
