(() => {
  const repositoryPath = /^\/[^/]+\/[^/]+\/?$/;
  const cardClass = "repo-qr-card";
  const svgNamespace = "http://www.w3.org/2000/svg";

  function createCard(websiteUrl) {
    const card = document.createElement("div");
    card.className = cardClass;
    card.dataset.websiteUrl = websiteUrl;

    const link = document.createElement("a");
    link.href = websiteUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Open repository website");

    try {
      const modules = repoQrCreate(websiteUrl, { errorCorrectionLevel: "M" }).modules;
      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("viewBox", `0 0 ${modules.size + 8} ${modules.size + 8}`);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "QR code for the repository website");
      svg.setAttribute("shape-rendering", "crispEdges");

      const background = document.createElementNS(svgNamespace, "rect");
      background.setAttribute("width", "100%");
      background.setAttribute("height", "100%");
      background.setAttribute("fill", "#fff");
      svg.append(background);

      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("fill", "#000");
      let pathData = "";
      for (let y = 0; y < modules.size; y++) {
        for (let x = 0; x < modules.size; x++) {
          if (modules.get(y, x)) pathData += `M${x + 4} ${y + 4}h1v1h-1z`;
        }
      }
      path.setAttribute("d", pathData);
      svg.append(path);
      link.append(svg);
    } catch (error) {
      console.error("Repo QR: unable to generate a QR code for the repository website.", error);
    }

    const caption = document.createElement("span");
    caption.textContent = link.firstElementChild
      ? "Scan to open website"
      : "QR code unavailable; open website";
    link.append(caption);
    card.append(link);
    return card;
  }

  function getWebsite(section) {
    const row = section.querySelector('[class*="websiteRow"]') ||
      section.querySelector(".octicon-link")?.closest("div, p");
    const link = row?.querySelector("a[href]");
    if (!link) return null;
    try {
      const url = new URL(link.getAttribute("href"), location.origin);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (error) {
      console.error("Repo QR: invalid repository website URL.", error);
      return null;
    }
  }

  function update() {
    const activeCards = new Set();
    if (repositoryPath.test(location.pathname)) {
      for (const heading of document.querySelectorAll("h2, h3")) {
        if (heading.textContent.trim() !== "About") continue;
        const section = heading.parentElement;
        if (!section) continue;
        const websiteUrl = getWebsite(section);
        if (!websiteUrl) continue;

        let card = heading.previousElementSibling;
        if (!card?.classList.contains(cardClass) || card.dataset.websiteUrl !== websiteUrl) {
          if (card?.classList.contains(cardClass)) card.remove();
          card = createCard(websiteUrl);
          heading.before(card);
        }
        activeCards.add(card);
      }
    }
    document.querySelectorAll(`.${cardClass}`).forEach(card => {
      if (!activeCards.has(card)) card.remove();
    });
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  new MutationObserver(scheduleUpdate).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
    characterData: true
  });
  document.addEventListener("turbo:load", scheduleUpdate);
  window.addEventListener("popstate", scheduleUpdate);
  update();
})();
