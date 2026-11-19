(() => {
  "use strict";

  // Physical keys (e.code), so shortcuts work with a Thai keyboard layout too.
  const CHOICE_KEYS = {
    Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
    Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8,
    Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4,
    Numpad6: 5, Numpad7: 6, Numpad8: 7, Numpad9: 8,
    KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3, KeyE: 4,
  };
  const NEXT_TEXT = "คำถามต่อไป";

  const activeSlide = () => document.querySelector(".swiper-slide-active");

  const choiceLabels = () => {
    const slide = activeSlide();
    if (!slide) return [];
    return [...slide.querySelectorAll("input.answer-input[type=radio], input[type=radio], input[type=checkbox]")]
      .map((i) => (i.id ? slide.querySelector(`label[for="${CSS.escape(i.id)}"]`) : null))
      .filter(Boolean);
  };

  const mainButtons = () =>
    [...document.querySelectorAll("main button")].filter((b) => !b.disabled && b.offsetParent !== null);

  const isTyping = (t) =>
    t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) &&
    !(t.tagName === "INPUT" && (t.type === "radio" || t.type === "checkbox"));

  // Number badges on the active question's choices.
  let raf = 0;
  const labelBadges = () => {
    raf = 0;
    document.querySelectorAll("label[data-fsk]").forEach((l) => l.removeAttribute("data-fsk"));
    choiceLabels().forEach((l, i) => l.setAttribute("data-fsk", String(i + 1)));
  };
  const scheduleBadges = () => { if (!raf) raf = requestAnimationFrame(labelBadges); };
  new MutationObserver(scheduleBadges).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["class"],
  });
  scheduleBadges();

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
    if (!activeSlide()) return;

    // Pick a choice.
    if (e.code in CHOICE_KEYS && !e.shiftKey) {
      const label = choiceLabels()[CHOICE_KEYS[e.code]];
      if (label) { e.preventDefault(); label.click(); }
      return;
    }

    // Next question: Enter or ArrowRight.
    // Any other button (e.g. final submit) needs Shift+Enter, to avoid accidental submits.
    if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "ArrowRight") {
      const btns = mainButtons();
      const next = btns.find((b) => b.textContent.includes(NEXT_TEXT));
      if (next && !e.shiftKey) { e.preventDefault(); next.click(); return; }
      if (e.shiftKey && e.code !== "ArrowRight") {
        const other = next || btns[btns.length - 1];
        if (other) { e.preventDefault(); other.click(); }
      }
    }
  }, true);
})();
