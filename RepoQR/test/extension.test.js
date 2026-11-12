const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { TextEncoder } = require("node:util");
const jsQR = require("jsqr");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const generator = fs.readFileSync(path.join(root, "qr-generator.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const website = "https://genuine-kitten-7b48d7.netlify.app/";
const otherWebsite = "https://nodejs.org/";
const repository = "https://github.com/PingHuskar/PDF-Splitter";
const about = url => `<section><h2>About</h2><div class="websiteRow__abc"><a href="${url}">Website</a></div></section>`;

function openPage(url, html) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.TextEncoder = TextEncoder;
  dom.errors = [];
  dom.window.console.error = (...args) => dom.errors.push(args);
  const Observer = dom.window.MutationObserver;
  dom.window.MutationObserver = class extends Observer {
    constructor(callback) {
      super(callback);
      dom.observer = this;
    }
  };
  dom.window.eval(`${generator}\n${content}`);
  return dom;
}

function closePage(dom) {
  dom.observer.disconnect();
  dom.window.close();
}

function settle() {
  return new Promise(resolve => setTimeout(resolve, 80));
}

function decodeSvg(svg) {
  const size = Number(svg.getAttribute("viewBox").split(" ")[2]);
  const scale = 8;
  const width = size * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of svg.querySelector("path").getAttribute("d").matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const index = ((y * scale + dy) * width + x * scale + dx) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
      }
    }
  }
  return jsQR(pixels, width, width)?.data;
}

test("renders scannable website QR codes above both responsive About sections", async () => {
  for (const [pageUrl, url] of [[repository, website], ["https://github.com/nodejs/node", otherWebsite]]) {
    const dom = openPage(pageUrl, `${about(url)}${about(url)}<section><h2>About</h2><a href="https://example.com">Other link</a></section>`);
    const { document } = dom.window;
    assert.equal(document.querySelectorAll(".repo-qr-card").length, 2);
    const card = document.querySelector(".repo-qr-card");
    assert.equal(card.nextElementSibling.textContent, "About");
    assert.equal(card.querySelector("a").href, url);
    assert.equal(card.querySelector("svg").getAttribute("role"), "img");
    assert.equal(decodeSvg(card.querySelector("svg")), url);

    document.body.append(document.createElement("div"));
    await settle();
    assert.equal(document.querySelectorAll(".repo-qr-card").length, 2);
    closePage(dom);
  }
});

test("updates and removes the QR code when About changes", async () => {
  const dom = openPage(repository, about(website));
  const { document } = dom.window;
  const websiteLink = document.querySelector('[class^="websiteRow"] a');
  websiteLink.href = otherWebsite;
  await settle();
  assert.equal(document.querySelector(".repo-qr-card a").href, otherWebsite);
  assert.equal(decodeSvg(document.querySelector(".repo-qr-card svg")), otherWebsite);

  websiteLink.href = "javascript:alert(1)";
  await settle();
  assert.equal(document.querySelectorAll(".repo-qr-card").length, 0);

  websiteLink.href = website;
  await settle();
  assert.equal(document.querySelectorAll(".repo-qr-card").length, 1);
  websiteLink.parentElement.remove();
  await settle();
  assert.equal(document.querySelectorAll(".repo-qr-card").length, 0);
  closePage(dom);
});

test("handles GitHub navigation between repository main pages and other pages", async () => {
  const dom = openPage("https://github.com/nodejs/node/issues", about(otherWebsite));
  const { document, history } = dom.window;
  assert.equal(document.querySelectorAll(".repo-qr-card").length, 0);

  history.pushState({}, "", "/nodejs/node/");
  document.dispatchEvent(new dom.window.Event("turbo:load"));
  await settle();
  assert.equal(document.querySelector(".repo-qr-card a").href, otherWebsite);

  history.pushState({}, "", "/PingHuskar/PDF-Splitter");
  document.body.innerHTML = about(website);
  document.dispatchEvent(new dom.window.Event("turbo:load"));
  await settle();
  assert.equal(document.querySelector(".repo-qr-card a").href, website);

  history.pushState({}, "", "/PingHuskar/PDF-Splitter/issues");
  dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
  await settle();
  assert.equal(document.querySelectorAll(".repo-qr-card").length, 0);
  closePage(dom);
});

test("supports About sections marked with GitHub's link icon", () => {
  const dom = openPage(repository, `<section><h2>About</h2><p><svg class="octicon octicon-link"></svg><a href="${website}">Website</a></p></section>`);
  assert.equal(decodeSvg(dom.window.document.querySelector(".repo-qr-card svg")), website);
  closePage(dom);
});

test("shows an explicit message if the URL exceeds QR capacity", () => {
  const dom = openPage(repository, about(`https://example.com/${"x".repeat(5000)}`));
  const card = dom.window.document.querySelector(".repo-qr-card");
  assert.equal(card.querySelector("svg"), null);
  assert.match(card.textContent, /QR code unavailable/);
  assert.equal(dom.errors.length, 1);
  closePage(dom);
});
