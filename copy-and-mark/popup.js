const hostEl = document.getElementById("host");
const toggle = document.getElementById("toggle");

// The name is stamped on screenshots (bottom right, next to the date and time).
const nameEl = document.getElementById("name");
chrome.storage.local.get({ reporterName: "" }, (d) => {
  nameEl.value = d.reporterName;
});
nameEl.addEventListener("input", () => {
  chrome.storage.local.set({ reporterName: nameEl.value.trim() });
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try {
    host = new URL(tab.url).hostname;
  } catch (_) {
    host = "";
  }

  if (!host) {
    hostEl.textContent = "This page can't use Copy & Mark.";
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
