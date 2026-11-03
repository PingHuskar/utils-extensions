const hostEl = document.getElementById("host");
const toggle = document.getElementById("toggle");

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try {
    host = new URL(tab.url).hostname;
  } catch (_) {
    host = "";
  }

  if (!host) {
    hostEl.textContent = "This page can't use Easy Copy.";
    toggle.disabled = true;
    return;
  }

  hostEl.textContent = host;
  const { disabledSites } = await chrome.storage.local.get({ disabledSites: [] });
  toggle.checked = !disabledSites.includes(host);

  toggle.addEventListener("change", async () => {
    const data = await chrome.storage.local.get({ disabledSites: [] });
    const list = data.disabledSites.filter((h) => h !== host);
    if (!toggle.checked) list.push(host);
    await chrome.storage.local.set({ disabledSites: list });
  });
}

init();
