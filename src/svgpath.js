/* محلّل مسارات SVG → مضلّعات مسطّحة
 *
 * يخدم أمرين: رموز الخط المستخرجة، وأي شعار SVG يرفعه المستخدم.
 * المخرج: مصفوفة «كنتورات»، كل كنتور مصفوفة نقاط {x,y} مغلقة ضمنياً.
 */
(function (global) {
  'use strict';

  var NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

  function tokenize(d) {
    var out = [], re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g, m;
    while ((m = re.exec(d))) out.push(m[1] || parseFloat(m[2]));
    return out;
  }

  /** تقسيم منحنى تكعيبي */
  function cubic(pts, x0, y0, x1, y1, x2, y2, x3, y3, steps) {
    for (var i = 1; i <= steps; i++) {
      var t = i / steps, u = 1 - t;
      var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
      pts.push({ x: a * x0 + b * x1 + c * x2 + e * x3, y: a * y0 + b * y1 + c * y2 + e * y3 });
    }
  }

  function quad(pts, x0, y0, x1, y1, x2, y2, steps) {
    for (var i = 1; i <= steps; i++) {
      var t = i / steps, u = 1 - t;
      pts.push({ x: u * u * x0 + 2 * u * t * x1 + t * t * x2, y: u * u * y0 + 2 * u * t * y1 + t * t * y2 });
    }
  }

  /** قوس بيضوي بصيغة SVG → نقاط */
  function arc(pts, x0, y0, rx, ry, rot, largeArc, sweep, x1, y1, quality) {
    if (rx === 0 || ry === 0) { pts.push({ x: x1, y: y1 }); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    var phi = rot * Math.PI / 180, cosP = Math.cos(phi), sinP = Math.sin(phi);
    var dx2 = (x0 - x1) / 2, dy2 = (y0 - y1) / 2;
    var x1p = cosP * dx2 + sinP * dy2, y1p = -sinP * dx2 + cosP * dy2;
    var l = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (l > 1) { var s = Math.sqrt(l); rx *= s; ry *= s; }
    var sq = (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) /
             (rx * rx * y1p * y1p + ry * ry * x1p * x1p);
    sq = sq < 0 ? 0 : sq;
    var coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(sq);
    var cxp = coef * rx * y1p / ry, cyp = -coef * ry * x1p / rx;
    var cx = cosP * cxp - sinP * cyp + (x0 + x1) / 2;
    var cy = sinP * cxp + cosP * cyp + (y0 + y1) / 2;
    var ang = function (ux, uy, vx, vy) {
      var dot = ux * vx + uy * vy, len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
      var a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
      return (ux * vy - uy * vx < 0) ? -a : a;
    };
    var th0 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    var dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dth > 0) dth -= 2 * Math.PI;
    if (sweep && dth < 0) dth += 2 * Math.PI;
    var n = Math.max(3, Math.ceil(Math.abs(dth) / (Math.PI / (quality || 12))));
    for (var i = 1; i <= n; i++) {
      var th = th0 + dth * i / n;
      var xx = cx + rx * Math.cos(th) * cosP - ry * Math.sin(th) * sinP;
      var yy = cy + rx * Math.cos(th) * sinP + ry * Math.sin(th) * cosP;
      pts.push({ x: xx, y: yy });
    }
  }

  /**
   * يحلّل مسار SVG إلى كنتورات.
   * @param {string} d
   * @param {object} [opt] {quality:number, flipY:boolean}
   */
  function parsePath(d, opt) {
    opt = opt || {};
    var q = opt.quality || 12;          // تقسيمات المنحنى الواحد
    var flip = opt.flipY ? -1 : 1;      // SVG محوره الرأسي لأسفل
    var t = tokenize(d);
    var contours = [], cur = null;
    var x = 0, y = 0, sx = 0, sy = 0;
    var px = null, py = null;           // نقطة تحكّم منعكسة لـ S/T
    var cmd = null, i = 0;

    function start(nx, ny) {
      if (cur && cur.length > 1) contours.push(cur);
      cur = [{ x: nx, y: ny * flip }];
    }
    function line(nx, ny) { if (cur) cur.push({ x: nx, y: ny * flip }); }

    while (i < t.length) {
      if (typeof t[i] === 'string') { cmd = t[i]; i++; if (cmd === 'Z' || cmd === 'z') { if (cur && cur.length > 1) { contours.push(cur); } cur = null; x = sx; y = sy; continue; } }
      var rel = cmd === cmd.toLowerCase();
      var C = cmd.toUpperCase();
      var ox = rel ? x : 0, oy = rel ? y : 0;

      if (C === 'M') {
        x = t[i++] + ox; y = t[i++] + oy; sx = x; sy = y; start(x, y);
        cmd = rel ? 'l' : 'L'; px = py = null;
      } else if (C === 'L') {
        x = t[i++] + ox; y = t[i++] + oy; line(x, y); px = py = null;
      } else if (C === 'H') {
        x = t[i++] + ox; line(x, y); px = py = null;
      } else if (C === 'V') {
        y = t[i++] + oy; line(x, y); px = py = null;
      } else if (C === 'C' || C === 'S') {
        var x1, y1;
        if (C === 'C') { x1 = t[i++] + ox; y1 = t[i++] + oy; }
        else { x1 = px === null ? x : 2 * x - px; y1 = py === null ? y : 2 * y - py; }
        var x2 = t[i++] + ox, y2 = t[i++] + oy, x3 = t[i++] + ox, y3 = t[i++] + oy;
        var seg = [];
        cubic(seg, x, y, x1, y1, x2, y2, x3, y3, q);
        for (var k = 0; k < seg.length; k++) line(seg[k].x, seg[k].y);
        px = x2; py = y2; x = x3; y = y3;
      } else if (C === 'Q' || C === 'T') {
        var qx, qy;
        if (C === 'Q') { qx = t[i++] + ox; qy = t[i++] + oy; }
        else { qx = px === null ? x : 2 * x - px; qy = py === null ? y : 2 * y - py; }
        var ex = t[i++] + ox, ey = t[i++] + oy;
        var seg2 = [];
        quad(seg2, x, y, qx, qy, ex, ey, q);
        for (var k2 = 0; k2 < seg2.length; k2++) line(seg2[k2].x, seg2[k2].y);
        px = qx; py = qy; x = ex; y = ey;
      } else if (C === 'A') {
        var rx = t[i++], ry = t[i++], rot = t[i++], la = t[i++], sw = t[i++];
        var ax = t[i++] + ox, ay = t[i++] + oy;
        var seg3 = [];
        arc(seg3, x, y, rx, ry, rot, la, sw, ax, ay, q);
        for (var k3 = 0; k3 < seg3.length; k3++) line(seg3[k3].x, seg3[k3].y);
        x = ax; y = ay; px = py = null;
      } else { i++; }
    }
    if (cur && cur.length > 1) contours.push(cur);
    return contours.filter(function (c) { return c.length > 2; });
  }

  function area(c) {
    var a = 0;
    for (var i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j].x * c[i].y - c[i].x * c[j].y);
    return a / 2;
  }

  function bbox(contours) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < contours.length; i++) for (var j = 0; j < contours[i].length; j++) {
      var p = contours[i][j];
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    if (!isFinite(x0)) return null;
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  function pointInContour(pt, c) {
    var inside = false;
    for (var i = 0, j = c.length - 1; i < c.length; j = i++) {
      var yi = c[i].y, yj = c[j].y;
      if ((yi > pt.y) !== (yj > pt.y)) {
        var xx = (c[j].x - c[i].x) * (pt.y - yi) / (yj - yi) + c[i].x;
        if (pt.x < xx) inside = !inside;
      }
    }
    return inside;
  }

  function transform(contours, fn) {
    var out = [];
    for (var i = 0; i < contours.length; i++) {
      var c = contours[i], nc = new Array(c.length);
      for (var j = 0; j < c.length; j++) nc[j] = fn(c[j]);
      out.push(nc);
    }
    return out;
  }

  /** إزاحة + تحجيم سريع */
  function place(contours, sx, sy, dx, dy) {
    return transform(contours, function (p) { return { x: p.x * sx + dx, y: p.y * sy + dy }; });
  }

  /**
   * يصنّف الكنتورات إلى أشكال خارجية وثقوب حسب عمق التداخل.
   * @returns {Array<{outer:Array, holes:Array<Array>}>}
   */
  function buildShapes(contours) {
    var n = contours.length, depth = new Array(n), parent = new Array(n);
    var info = contours.map(function (c) { return { c: c, a: Math.abs(area(c)), bb: bbox([c]) }; });
    for (var i = 0; i < n; i++) {
      depth[i] = 0; parent[i] = -1;
      var probe = contours[i][0];
      var bestArea = Infinity;
      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var b = info[j].bb;
        if (probe.x < b.x0 || probe.x > b.x1 || probe.y < b.y0 || probe.y > b.y1) continue;
        if (pointInContour(probe, contours[j])) {
          depth[i]++;
          if (info[j].a < bestArea) { bestArea = info[j].a; parent[i] = j; }
        }
      }
    }
    var shapes = [], index = {};
    for (var k = 0; k < n; k++) {
      if (depth[k] % 2 === 0) { index[k] = shapes.length; shapes.push({ outer: contours[k], holes: [] }); }
    }
    for (var m = 0; m < n; m++) {
      if (depth[m] % 2 === 1 && parent[m] >= 0 && index[parent[m]] !== undefined) {
        shapes[index[parent[m]]].holes.push(contours[m]);
      }
    }
    return shapes;
  }

  /**
   * قصُّ كنتورٍ على شريحةٍ رأسية [x0, x1] بخوارزمية سذرلاند-هودجمان.
   *
   * الخوارزمية مضبوطةٌ تماماً على الأشكال المحدّبة، ومواضعُ القصّ في
   * اللوحة تقع في الفراغ بين الخانات فلا يعبرها إلّا محدَّب: حافّةُ
   * اللوحة، وإطارُها، ومستطيلاتُ الشبكة. أمّا الحروفُ والشعار فلا
   * يعبرها أصلاً، وهو شرطُ اختيار موضع القصّ.
   */
  function clipToSlab(c, x0, x1) {
    function half(pts, keep, at, axisMin) {
      if (!pts.length) return [];
      var out = [], n = pts.length;
      for (var i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        var ina = keep(a), inb = keep(b);
        if (ina) out.push(a);
        if (ina !== inb) {
          var t = (at - a.x) / (b.x - a.x);
          out.push({ x: at, y: a.y + (b.y - a.y) * t });
        }
      }
      return out;
    }
    var r = half(c, function (p) { return p.x >= x0; }, x0);
    r = half(r, function (p) { return p.x <= x1; }, x1);
    // الرأسُ الواقع على خطّ القصّ تماماً يُصدَر مرّتين، والمكرّرُ
    // يصنع مثلّثاً منحلّاً فتنفتح الحافّة.
    var out = [];
    for (var i = 0; i < r.length; i++) {
      var q = out[out.length - 1];
      if (q && Math.abs(q.x - r[i].x) < 1e-9 && Math.abs(q.y - r[i].y) < 1e-9) continue;
      out.push(r[i]);
    }
    while (out.length > 1 &&
           Math.abs(out[0].x - out[out.length - 1].x) < 1e-9 &&
           Math.abs(out[0].y - out[out.length - 1].y) < 1e-9) out.pop();
    return out.length >= 3 ? out : null;
  }

  /** مستطيل بزوايا مدوّرة كـ كنتور */
  function roundRect(cx, cy, w, h, r, seg) {
    seg = seg || 8;
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    var x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
    var pts = [];
    function corner(ax, ay, a0) {
      for (var i = 0; i <= seg; i++) {
        var a = a0 + (Math.PI / 2) * (i / seg);
        pts.push({ x: ax + r * Math.cos(a), y: ay + r * Math.sin(a) });
      }
    }
    if (r <= 1e-6) return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    corner(x1 - r, y0 + r, -Math.PI / 2);
    corner(x1 - r, y1 - r, 0);
    corner(x0 + r, y1 - r, Math.PI / 2);
    corner(x0 + r, y0 + r, Math.PI);
    return pts;
  }

  /** حلقة مستطيلة مدوّرة (إطار): كنتور خارجي + ثقب داخلي */
  function roundRing(cx, cy, w, h, r, t, seg) {
    var outer = roundRect(cx, cy, w, h, r, seg);
    // نصفُ القطر الداخلي لا ينزل إلى الصفر تماماً: الصفرُ مع خارجٍ
    // مدوّرٍ يكسر تثليثَ three.js فتنفتح الحواف.
    var inner = roundRect(cx, cy, w - 2 * t, h - 2 * t, Math.max(0.2, r - t), seg);
    inner.reverse();
    return [outer, inner];
  }

  function circle(cx, cy, r, seg) {
    seg = seg || 32;
    var pts = [];
    for (var i = 0; i < seg; i++) {
      var a = 2 * Math.PI * i / seg;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
  }

  global.SvgPath = {
    parsePath: parsePath, area: area, bbox: bbox, transform: transform, place: place,
    buildShapes: buildShapes, pointInContour: pointInContour,
    roundRect: roundRect, roundRing: roundRing, circle: circle,
    clipToSlab: clipToSlab
  };
})(typeof window !== 'undefined' ? window : globalThis);
