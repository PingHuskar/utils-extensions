(function () {
  "use strict";

  var PANEL_ID = "ifsqr-panel";
  var URL_RE = /https?:\/\/[^\s<>"'`]+/g;

  function hostOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "Link"; }
  }

  function cleanUrl(u) {
    return u.replace(/[.,;:!?)\]}>]+$/, "");
  }

  function findDescriptionBlock() {
    var titles = document.querySelectorAll("h3.fs-section-title, h3");
    for (var i = 0; i < titles.length; i++) {
      if (/^\s*Event Description\s*$/i.test(titles[i].textContent)) {
        return { title: titles[i], body: titles[i].nextElementSibling };
      }
    }
    return null;
  }

  // Links in the header lines: Base Portal / Restocking Portal / Event Channel
  function collectHeaderLinks() {
    var items = [];
    var lines = document.querySelectorAll(".fs-meta-line");
    lines.forEach(function (line) {
      var anchors = line.querySelectorAll("a[href]");
      if (!anchors.length) return;
      var text = line.textContent.replace(/\s+/g, " ").trim();
      var first = text.split("//")[0].trim();
      var colon = first.indexOf(":");
      var heading = colon > -1 ? first.slice(0, colon).trim() : first;
      var detail = colon > -1 ? first.slice(colon + 1).trim() : "";
      anchors.forEach(function (a) {
        if (!/^https?:/i.test(a.href)) return;
        var linkText = a.textContent.replace(/\s+/g, " ").trim();
        // If the link text is the detail itself (e.g. Event Channel), do not repeat it
        var sub = detail && detail !== linkText ? detail : "";
        var title = anchors.length > 1 && linkText ? heading + " · " + linkText : heading;
        items.push({ url: a.href, title: title, sub: sub });
      });
    });
    return items;
  }

  // Links in the Event Description: real <a> tags and plain-text URLs
  function collectDescriptionLinks(body) {
    var items = [];
    if (!body) return items;
    var seen = {};
    body.querySelectorAll("a[href]").forEach(function (a) {
      if (!/^https?:/i.test(a.href) || seen[a.href]) return;
      seen[a.href] = true;
      var t = a.textContent.replace(/\s+/g, " ").trim();
      items.push({ url: a.href, title: t && t !== a.href ? t : hostOf(a.href), sub: "" });
    });
    var text = body.innerText || body.textContent || "";
    var m = text.match(URL_RE) || [];
    m.forEach(function (raw) {
      var u = cleanUrl(raw);
      var norm;
      try { norm = new URL(u).href; } catch (e) { return; }
      if (seen[norm] || seen[u]) return;
      seen[norm] = true;
      items.push({ url: norm, title: hostOf(norm), sub: "" });
    });
    return items;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svgFor(url) {
    try {
      return window.MiniQR.toSVG(url);
    } catch (e) {
      return null;
    }
  }

  function showOverlay(item) {
    var svg = svgFor(item.url);
    if (!svg) return;
    var ov = el("div", "ifsqr-overlay");
    var big = el("div", "ifsqr-big");
    big.innerHTML = svg;
    var cap = el("div", "ifsqr-cap", (item.title ? item.title + (item.sub ? " – " + item.sub : "") + "\n" : "") + item.url);
    cap.style.whiteSpace = "pre-line";
    ov.appendChild(big);
    ov.appendChild(cap);
    function close() {
      ov.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    ov.addEventListener("click", close);
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(ov);
  }

  function makeCard(item) {
    var card = el("div", "ifsqr-card");
    var qr = el("div", "ifsqr-qr");
    qr.title = "Click to enlarge";
    var svg = svgFor(item.url);
    if (svg) qr.innerHTML = svg;
    else qr.textContent = "QR error";
    qr.addEventListener("click", function () { showOverlay(item); });
    card.appendChild(qr);
    card.appendChild(el("div", "ifsqr-title", item.title));
    if (item.sub) card.appendChild(el("div", "ifsqr-sub", item.sub));
    var link = el("a", "ifsqr-url", item.url.replace(/^https?:\/\//, ""));
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = item.url;
    card.appendChild(link);
    return card;
  }

  var lastSignature = "";

  function update() {
    var header = collectHeaderLinks();
    var desc = findDescriptionBlock();
    var descLinks = collectDescriptionLinks(desc && desc.body);

    // description links already shown in header are skipped
    var headerUrls = {};
    header.forEach(function (h) { headerUrls[h.url] = true; });
    descLinks = descLinks.filter(function (d) { return !headerUrls[d.url]; });

    var signature = JSON.stringify([header, descLinks]);
    var existing = document.getElementById(PANEL_ID);
    if (existing && signature === lastSignature) return;
    if (!header.length && !descLinks.length) {
      if (existing) existing.remove();
      lastSignature = signature;
      return;
    }
    lastSignature = signature;

    var panel = el("details", "ifsqr-panel");
    panel.id = PANEL_ID;
    panel.open = existing ? existing.open : true;
    panel.appendChild(el("summary", "", "QR Codes (" + (header.length + descLinks.length) + ")"));

    if (header.length) {
      panel.appendChild(el("div", "ifsqr-section-title", "Event links"));
      var g1 = el("div", "ifsqr-grid");
      header.forEach(function (it) { g1.appendChild(makeCard(it)); });
      panel.appendChild(g1);
    }
    if (descLinks.length) {
      panel.appendChild(el("div", "ifsqr-section-title", "Event description links"));
      var g2 = el("div", "ifsqr-grid");
      descLinks.forEach(function (it) { g2.appendChild(makeCard(it)); });
      panel.appendChild(g2);
    }

    if (existing) existing.remove();
    if (desc && desc.title && desc.title.parentNode) {
      desc.title.parentNode.insertBefore(panel, desc.title);
    } else {
      var lines = document.querySelectorAll(".fs-meta-line");
      var last = lines[lines.length - 1];
      if (last && last.parentNode) last.parentNode.insertBefore(panel, last.nextSibling);
      else document.body.appendChild(panel);
    }
  }

  // ---- RSVP export ----
  var EXPORT_ID = "ifsqr-export";
  var FACTIONS = { enl: "Enlightened", res: "Resistance" };

  function splitNames(node) {
    if (!node) return [];
    return (node.innerText || node.textContent || "")
      .split(/\n/)
      .map(function (s) { return s.replace(/\s+/g, " ").trim(); })
      .filter(Boolean);
  }

  function collectRsvps() {
    var rows = [];
    ["enl", "res"].forEach(function (f) {
      // Leaders: <div class="enl">Enl Leader</div> followed by a div with the name(s)
      document.querySelectorAll("div." + f).forEach(function (d) {
        if (!/^\s*(Enl|Res)\s+Leaders?\s*$/i.test(d.textContent)) return;
        splitNames(d.nextElementSibling).forEach(function (n) {
          rows.push({ faction: FACTIONS[f], role: "Leader", agent: n });
        });
      });
      // Attendees: <h4 class="enl">Enl Attendees (N)</h4> followed by a div of names
      document.querySelectorAll("h4." + f).forEach(function (h) {
        if (!/Attendees/i.test(h.textContent)) return;
        splitNames(h.nextElementSibling).forEach(function (n) {
          rows.push({ faction: FACTIONS[f], role: "Attendee", agent: n });
        });
      });
    });
    return rows;
  }

  function csvCell(v) {
    v = String(v);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function exportRsvps() {
    var rows = collectRsvps();
    if (!rows.length) { alert("No RSVP data found on this page."); return; }
    var lines = ["Faction,Role,Agent"].concat(rows.map(function (r) {
      return [r.faction, r.role, r.agent].map(csvCell).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var id = (location.search.match(/[?&]e=(\d+)/) || [])[1];
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ingressfs-rsvp" + (id ? "-" + id : "") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function ensureExportButton() {
    var existing = document.getElementById(EXPORT_ID);
    var n = collectRsvps().length;
    if (!n) { if (existing) existing.remove(); return; }
    var label = "Export Agents RSVP (" + n + ")";
    if (existing) { if (existing.textContent !== label) existing.textContent = label; return; }
    var anchor = null;
    document.querySelectorAll("div.enl").forEach(function (d) {
      if (!anchor && /^\s*Enl\s+Leaders?\s*$/i.test(d.textContent)) anchor = d;
    });
    if (!anchor) {
      var h = document.querySelector("h4.enl");
      anchor = h && h.parentElement;
    }
    if (!anchor || !anchor.parentNode) return;
    var btn = el("button", "ifsqr-export", label);
    btn.id = EXPORT_ID;
    btn.type = "button";
    btn.addEventListener("click", exportRsvps);
    anchor.parentNode.insertBefore(btn, anchor);
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { update(); ensureExportButton(); }, 200);
  }

  update();
  ensureExportButton();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
