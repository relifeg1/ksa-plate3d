/* من الكنتورات ثنائية الأبعاد إلى مجسّمات three.js */
(function (global) {
  'use strict';

  var P = global.SvgPath;

  /* ——— كسرُ التعادل بين الثقوب ———
   *
   * يصل المثلِّثُ كلَّ ثقبٍ بالمحيط بجسرٍ أفقيّ يخرج من أيمنِ رؤوسه.
   * فإن مرّ الجسرُ على حافّةِ ثقبٍ آخرَ تقع على الإحداثيِّ الصادِ
   * نفسِه تماماً، انحلّ الوصلُ وانفتحت الحافّة.
   *
   * وهذا يقع في اللوحة كثيراً: حروفُ الصفِّ الواحد تجلس على خطِّ
   * أساسٍ واحد، فتتساوى صاداتُها إلى آخر رقم. والعلاجُ إزاحةُ
   * المتعادلِ بميكرونٍ واحد — أدقُّ من أن تراه طابعةٌ أو عينٌ،
   * وكافٍ لكسر التعادل.
   */
  var TIE = 1e-9, NUDGE = 1e-3;

  function dejitterHoles(holes) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i], dy = 0, tries = 0;
      while (tries++ < 8) {
        var hit = false;
        for (var k = 0; k < h.length && !hit; k++) {
          var key = Math.round((h[k].y + dy) / TIE);
          if (seen[key] !== undefined && seen[key] !== i) hit = true;
        }
        if (!hit) break;
        dy += NUDGE;
      }
      if (dy) h = h.map(function (p) { return { x: p.x, y: p.y + dy }; });
      for (var m = 0; m < h.length; m++) seen[Math.round(h[m].y / TIE)] = i;
      out.push(h);
    }
    return out;
  }

  function toShape(sh) {
    var outer = sh.outer;
    // اتجاه موجب للخارجي
    if (P.area(outer) < 0) outer = outer.slice().reverse();
    var s = new THREE.Shape(outer.map(function (p) { return new THREE.Vector2(p.x, p.y); }));
    var holes = dejitterHoles(sh.holes.map(function (h) {
      return P.area(h) > 0 ? h.slice().reverse() : h;
    }));
    for (var i = 0; i < holes.length; i++) {
      s.holes.push(new THREE.Path(holes[i].map(function (p) {
        return new THREE.Vector2(p.x, p.y);
      })));
    }
    return s;
  }

  /**
   * يبني BufferGeometry لجزء واحد.
   *
   * الجزء قد يحمل «مجموعات»: كل مجموعة تُكشف ثقوبها وحدها ثم تُبثق
   * مجسّماً مستقلّاً. هذا ضروري لكل ما يتراكب عمداً — سعف النخلة
   * وملتقى السيفين وحروف «السعودية» المتّصلة — لأن قاعدة الزوج
   * والفرد تقرأ التراكب ثقباً فتنخر الشكل. والمجسّمات المتراكبة
   * يوحّدها السلايسر عند الطباعة.
   */
  function partGeometry(part) {
    var groups = part.groups && part.groups.length ? part.groups : [part.contours];
    var shapes = [];
    for (var gi = 0; gi < groups.length; gi++) {
      if (!groups[gi] || !groups[gi].length) continue;
      shapes = shapes.concat(P.buildShapes(groups[gi]).map(toShape));
    }
    if (!shapes.length) return null;
    var depth = part.z1 - part.z0;
    var g = new THREE.ExtrudeGeometry(shapes, {
      depth: depth, bevelEnabled: false, curveSegments: 8, steps: 1
    });
    g.translate(0, 0, part.z0);
    return g;
  }

  /** يبني كل الأجزاء: [{part, geometry}] */
  function buildAll(design) {
    var out = [];
    for (var i = 0; i < design.parts.length; i++) {
      var g = null;
      try { g = partGeometry(design.parts[i]); }
      catch (e) { console.warn('تعذّر بناء الجزء ' + design.parts[i].id, e); }
      if (g) out.push({ part: design.parts[i], geometry: g });
    }
    return out;
  }

  /** مثلثات جزء بصيغة مصفوفات مسطّحة، للتصدير */
  function triangles(geometry) {
    var g = geometry.index ? geometry.toNonIndexed() : geometry;
    var pos = g.attributes.position.array;
    var nor = g.attributes.normal ? g.attributes.normal.array : null;
    return { position: pos, normal: nor, count: pos.length / 9 };
  }

  global.PlateGeometry = { buildAll: buildAll, partGeometry: partGeometry, triangles: triangles };
})(typeof window !== 'undefined' ? window : globalThis);
