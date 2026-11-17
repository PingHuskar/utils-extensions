/*
 * Minimal self-contained QR Code generator (byte mode, error correction M, versions 1-40).
 * Exposes window.MiniQR.encode(text) -> { size, get(x, y) } and MiniQR.toSVG(text).
 * Written for this extension so no external library / network is needed.
 */
(function () {
  "use strict";

  // Error-correction codewords per block and number of blocks, level M, index = version.
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var FORMAT_ECC_BITS = 0; // level M

  function rawDataModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }

  function dataCodewords(ver) {
    return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];
  }

  // GF(256) arithmetic, Reed-Solomon
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree; i++) result.push(0);
    result[degree - 1] = 1;
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 2);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
  }

  function utf8Bytes(str) {
    return Array.prototype.slice.call(new TextEncoder().encode(str));
  }

  function alignmentPositions(ver) {
    if (ver === 1) return [];
    var num = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < num; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function encode(text) {
    var bytes = utf8Bytes(text);

    // pick smallest version
    var ver = 1;
    for (; ver <= 40; ver++) {
      var countBits = ver <= 9 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 40) throw new Error("Text too long for QR code");

    // build data bit stream
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(0x4, 4);
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var capBits = dataCodewords(ver) * 8;
    put(0, Math.min(4, capBits - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    for (var pad = 0xec; data.length < dataCodewords(ver); pad ^= 0xec ^ 0x11) data.push(pad);

    // split into blocks, add ECC, interleave
    var numBlocks = NUM_BLOCKS[ver];
    var eccLen = ECC_PER_BLOCK[ver];
    var rawCw = Math.floor(rawDataModules(ver) / 8);
    var numShort = numBlocks - (rawCw % numBlocks);
    var shortLen = Math.floor(rawCw / numBlocks);
    var blocks = [];
    var div = rsDivisor(eccLen);
    for (var b = 0, k = 0; b < numBlocks; b++) {
      var dat = data.slice(k, k + shortLen - eccLen + (b < numShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (b < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) {
      for (var d = 0; d < blocks.length; d++) {
        if (c !== shortLen - eccLen || d >= numShort) all.push(blocks[d][c]);
      }
    }

    // matrix
    var size = ver * 4 + 17;
    var modules = [];
    var isFn = [];
    for (var y = 0; y < size; y++) {
      modules.push(new Array(size).fill(false));
      isFn.push(new Array(size).fill(false));
    }
    function setFn(x, y, dark) { modules[y][x] = dark; isFn[y][x] = true; }

    for (var t = 0; t < size; t++) {
      setFn(6, t, t % 2 === 0);
      setFn(t, 6, t % 2 === 0);
    }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          var xx = cx + dx, yy = cy + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var ap = alignmentPositions(ver);
    for (var ai = 0; ai < ap.length; ai++) {
      for (var aj = 0; aj < ap.length; aj++) {
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === ap.length - 1) || (ai === ap.length - 1 && aj === 0)) continue;
        for (var dy2 = -2; dy2 <= 2; dy2++) {
          for (var dx2 = -2; dx2 <= 2; dx2++) {
            setFn(ap[ai] + dx2, ap[aj] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
          }
        }
      }
    }

    function drawFormat(mask) {
      var d2 = (FORMAT_ECC_BITS << 3) | mask;
      var rem = d2;
      for (var n = 0; n < 10; n++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((d2 << 10) | rem) ^ 0x5412;
      var n2;
      for (n2 = 0; n2 <= 5; n2++) setFn(8, n2, bit(fb, n2));
      setFn(8, 7, bit(fb, 6));
      setFn(8, 8, bit(fb, 7));
      setFn(7, 8, bit(fb, 8));
      for (n2 = 9; n2 < 15; n2++) setFn(14 - n2, 8, bit(fb, n2));
      for (n2 = 0; n2 < 8; n2++) setFn(size - 1 - n2, 8, bit(fb, n2));
      for (n2 = 8; n2 < 15; n2++) setFn(8, size - 15 + n2, bit(fb, n2));
      setFn(8, size - 8, true);
    }
    drawFormat(0); // reserve areas

    if (ver >= 7) {
      var vrem = ver;
      for (var n3 = 0; n3 < 12; n3++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1f25);
      var vbits = (ver << 12) | vrem;
      for (var n4 = 0; n4 < 18; n4++) {
        var col = bit(vbits, n4);
        var a = size - 11 + (n4 % 3);
        var bb = Math.floor(n4 / 3);
        setFn(a, bb, col);
        setFn(bb, a, col);
      }
    }

    // place codewords in zigzag
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var upward = ((right + 1) & 2) === 0;
          var yy2 = upward ? size - 1 - vert : vert;
          if (!isFn[yy2][x] && idx < all.length * 8) {
            modules[yy2][x] = bit(all[idx >>> 3], 7 - (idx & 7));
            idx++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (var yy3 = 0; yy3 < size; yy3++) {
        for (var xx3 = 0; xx3 < size; xx3++) {
          var inv;
          switch (mask) {
            case 0: inv = (xx3 + yy3) % 2 === 0; break;
            case 1: inv = yy3 % 2 === 0; break;
            case 2: inv = xx3 % 3 === 0; break;
            case 3: inv = (xx3 + yy3) % 3 === 0; break;
            case 4: inv = (Math.floor(xx3 / 3) + Math.floor(yy3 / 2)) % 2 === 0; break;
            case 5: inv = ((xx3 * yy3) % 2) + ((xx3 * yy3) % 3) === 0; break;
            case 6: inv = (((xx3 * yy3) % 2) + ((xx3 * yy3) % 3)) % 2 === 0; break;
            default: inv = (((xx3 + yy3) % 2) + ((xx3 * yy3) % 3)) % 2 === 0; break;
          }
          if (!isFn[yy3][xx3] && inv) modules[yy3][xx3] = !modules[yy3][xx3];
        }
      }
    }

    function penalty() {
      var score = 0, r, c2, run, line, dark = 0;
      var strs = [];
      for (r = 0; r < size; r++) {
        var rowS = "", colS = "";
        for (c2 = 0; c2 < size; c2++) {
          rowS += modules[r][c2] ? "1" : "0";
          colS += modules[c2][r] ? "1" : "0";
          if (modules[r][c2]) dark++;
        }
        strs.push(rowS, colS);
      }
      strs.forEach(function (s) {
        run = 1;
        for (var i2 = 1; i2 <= s.length; i2++) {
          if (i2 < s.length && s[i2] === s[i2 - 1]) run++;
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        var p = -1;
        while ((p = s.indexOf("10111010000", p + 1)) !== -1) score += 40;
        p = -1;
        while ((p = s.indexOf("00001011101", p + 1)) !== -1) score += 40;
      });
      for (r = 0; r < size - 1; r++) {
        for (c2 = 0; c2 < size - 1; c2++) {
          var v1 = modules[r][c2];
          if (v1 === modules[r][c2 + 1] && v1 === modules[r + 1][c2] && v1 === modules[r + 1][c2 + 1]) score += 3;
        }
      }
      var total = size * size;
      var kk = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      score += Math.max(0, kk) * 10;
      return score;
    }

    var bestMask = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      var p2 = penalty();
      if (p2 < bestScore) { bestScore = p2; bestMask = m; }
      applyMask(m); // undo
    }
    applyMask(bestMask);
    drawFormat(bestMask);

    return {
      size: size,
      version: ver,
      get: function (x, y) { return x >= 0 && y >= 0 && x < size && y < size && modules[y][x]; }
    };
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var qr = encode(text);
    var n = qr.size + quiet * 2;
    var d = "";
    for (var y = 0; y < qr.size; y++) {
      var x = 0;
      while (x < qr.size) {
        if (qr.get(x, y)) {
          var start = x;
          while (x < qr.size && qr.get(x, y)) x++;
          d += "M" + (start + quiet) + " " + (y + quiet) + "h" + (x - start) + "v1h-" + (x - start) + "z";
        } else x++;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n +
      '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  var api = { encode: encode, toSVG: toSVG };
  if (typeof window !== "undefined") window.MiniQR = api;
  if (typeof module !== "undefined") module.exports = api;
})();
