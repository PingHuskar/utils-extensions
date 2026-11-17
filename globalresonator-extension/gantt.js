(function () {
  "use strict";

  var PANEL_ID = "ifsgantt-panel";
  // The list has no end time, so every bar is drawn with this assumed length.
  var DURATION_H = 3;
  var HOUR = 3600000;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function utcLabel(ms) {
    var d = new Date(ms);
    return pad(d.getUTCHours()) + ":00";
  }

  function readEvents() {
    var out = [];
    document.querySelectorAll("#gr-event-list-body tr").forEach(function (tr) {
      if (tr.offsetParent === null) return; // hidden by a filter
      var utc = tr.querySelector(".gr-extra-utc");
      var a = tr.querySelector("td a");
      if (!utc || !a) return;
      var start = Date.parse(utc.textContent.trim());
      if (isNaN(start)) return;
      var cells = tr.children;
      var tz = tr.querySelector(".gr-extra-timezone");
      out.push({
        city: a.textContent.replace(/\s+/g, " ").trim(),
        url: a.href,
        start: start,
        local: cells[5] ? cells[5].textContent.trim() : "",
        tz: tz ? tz.textContent.trim() : "",
        yours: cells[8] ? cells[8].textContent.trim() : ""
      });
    });
    out.sort(function (x, y) { return x.start - y.start || x.city.localeCompare(y.city); });
    return out;
  }

  var lastSig = "";

  function build() {
    var events = readEvents();
    var sig = JSON.stringify(events.map(function (e) { return [e.city, e.start]; }));
    var existing = document.getElementById(PANEL_ID);
    if (existing && sig === lastSig) return;
    lastSig = sig;

    var wrapper = document.querySelector(".gr-event-list-wrapper");
    if (!wrapper) return;
    if (!events.length) { if (existing) existing.remove(); return; }

    var min = Math.floor(events[0].start / HOUR) * HOUR;
    var maxEnd = events[events.length - 1].start + DURATION_H * HOUR;
    var max = Math.ceil(maxEnd / HOUR) * HOUR;
    var span = max - min;
    var hours = Math.round(span / HOUR);
    var step = hours > 36 ? 6 : hours > 18 ? 3 : 1;

    var panel = el("details", "ifsgantt-panel");
    panel.id = PANEL_ID;
    panel.open = existing ? existing.open : true;
    panel.appendChild(el("summary", "", "Timeline (" + events.length + " events, UTC)"));
    panel.appendChild(el("div", "ifsgantt-note", "Bars assume a " + DURATION_H + "h event; start times come from the list."));

    var scroll = el("div", "ifsgantt-scroll");
    var chart = el("div", "ifsgantt-chart");
    chart.style.setProperty("--ifsgantt-hours", hours);

    // axis
    var axis = el("div", "ifsgantt-row ifsgantt-axis");
    axis.appendChild(el("div", "ifsgantt-label", ""));
    var axisTrack = el("div", "ifsgantt-track");
    var lastDay = null;
    for (var t = min; t <= max; t += HOUR) {
      var h = new Date(t).getUTCHours();
      if (h % step !== 0) continue;
      var d = new Date(t);
      var tick = el("div", "ifsgantt-tick", h === 0 ? pad(d.getUTCMonth() + 1) + "/" + pad(d.getUTCDate()) : utcLabel(t));
      tick.style.left = ((t - min) / span * 100) + "%";
      axisTrack.appendChild(tick);
    }
    axis.appendChild(axisTrack);
    chart.appendChild(axis);

    // rows
    events.forEach(function (e) {
      var row = el("div", "ifsgantt-row");
      var label = el("a", "ifsgantt-label", e.city);
      label.href = e.url;
      label.target = "_blank";
      label.rel = "noopener noreferrer";
      label.title = e.city;
      row.appendChild(label);
      var track = el("div", "ifsgantt-track");
      var bar = el("div", "ifsgantt-bar", e.local);
      bar.style.left = ((e.start - min) / span * 100) + "%";
      bar.style.width = (DURATION_H * HOUR / span * 100) + "%";
      bar.title = e.city + "\nLocal: " + e.local + (e.tz ? " (" + e.tz + ")" : "") +
        "\nUTC: " + pad(new Date(e.start).getUTCHours()) + ":" + pad(new Date(e.start).getUTCMinutes()) +
        (e.yours ? "\nYours: " + e.yours : "");
      track.appendChild(bar);
      row.appendChild(track);
      chart.appendChild(row);
    });

    // "now" marker
    var now = Date.now();
    if (now >= min && now <= max) {
      var line = el("div", "ifsgantt-now");
      line.style.left = "calc(var(--ifsgantt-label-w) + (100% - var(--ifsgantt-label-w)) * " + ((now - min) / span) + ")";
      line.title = "Now";
      chart.appendChild(line);
    }

    scroll.appendChild(chart);
    panel.appendChild(scroll);

    if (existing) existing.remove();
    wrapper.parentNode.insertBefore(panel, wrapper);
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(build, 200);
  }

  build();
  var body = document.getElementById("gr-event-list-body");
  var obs = new MutationObserver(schedule);
  if (body) obs.observe(body, { childList: true, subtree: true, attributes: true, characterData: true });
  // the table may be rendered late
  new MutationObserver(function () {
    var b = document.getElementById("gr-event-list-body");
    if (b && b !== body) {
      body = b;
      obs.observe(body, { childList: true, subtree: true, attributes: true, characterData: true });
      schedule();
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
