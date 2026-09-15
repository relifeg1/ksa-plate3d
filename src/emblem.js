/* شعار النخلة والسيفين — مبني هندسياً لا منقولاً
 *
 * مرسوم بالبرمجة ليخرج بمسارات نظيفة مغلقة صالحة للبثق والطباعة،
 * وبأطراف لا تنزل تحت حدّ النوزل. الإحداثيات في مربّع 100×100،
 * المحور الرأسي لأعلى، المركز (50,50).
 *
 * هذه صياغة مبسّطة للعرض والطباعة، لا نسخة رسمية طبق الأصل؛
 * ومن أراد الدقّة التامّة رفع ملف SVG خاصاً به من الواجهة.
 */
(function (global) {
  'use strict';

  function lerp(a, b, t) { return a + (b - a) * t; }

  /**
   * شريط على طول منحنى بسماكة متغيّرة.
   * @param {function(number):{x,y}} curve  دالة t∈[0,1] → نقطة
   * @param {function(number):number} width نصف السماكة عند t
   */
  function ribbon(curve, width, steps) {
    steps = steps || 40;
    var left = [], right = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var p = curve(t);
      var d = 0.0015;
      var a = curve(Math.max(0, t - d)), b = curve(Math.min(1, t + d));
      var tx = b.x - a.x, ty = b.y - a.y;
      var len = Math.hypot(tx, ty) || 1;
      var nx = -ty / len, ny = tx / len;
      var w = width(t);
      left.push({ x: p.x + nx * w, y: p.y + ny * w });
      right.push({ x: p.x - nx * w, y: p.y - ny * w });
    }
    right.reverse();
    return left.concat(right);
  }

  function qbez(p0, p1, p2) {
    return function (t) {
      var u = 1 - t;
      return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
               y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
    };
  }

  /** سيف منحنٍ: نصل مقوّس + قبضة + مقبض. mw = أدنى نصف سماكة بوحدات الشعار */
  function sword(mirror, mw) {
    var s = mirror ? -1 : 1;
    var parts = [];
    // النصل: قوس من القبضة (يمين أسفل) إلى الطرف (يسار أعلى)
    var blade = qbez(
      { x: 50 + s * 32, y: 9 },    // عند القبضة
      { x: 50 + s * 6,  y: 29 },   // انحناء
      { x: 50 - s * 31, y: 47 }    // الطرف
    );
    parts.push(ribbon(blade, function (t) {
      // يبدأ عريضاً وينتهي مدبّباً، مع بقاء حدّ أدنى للطباعة
      return Math.max(mw, lerp(4.0, 0.9, Math.pow(t, 1.4)));
    }, 44));

    // القبضة (حاجز عرضي)
    var g0 = { x: 50 + s * 29, y: 4.5 }, g1 = { x: 50 + s * 35.5, y: 13 };
    parts.push(ribbon(qbez(g0, { x: 50 + s * 32, y: 9 }, g1), function () { return Math.max(mw, 1.9); }, 10));

    // المقبض
    var h0 = { x: 50 + s * 33, y: 7.5 }, h1 = { x: 50 + s * 43, y: 3.5 };
    parts.push(ribbon(qbez(h0, { x: 50 + s * 38, y: 5.0 }, h1), function (t) { return Math.max(mw, lerp(2.5, 1.9, t)); }, 12));

    // الرمّانة في نهاية المقبض
    parts.push(global.SvgPath.circle(50 + s * 44.2, 3, Math.max(mw, 2.6), 16));
    return parts;
  }

  /** النخلة: جذع + سعف */
  function palm(mw) {
    var parts = [];
    var baseY = 34, topY = 63;

    // الجذع
    parts.push(ribbon(qbez({ x: 50, y: baseY }, { x: 49.4, y: 45 }, { x: 50, y: topY }),
      function (t) { return Math.max(mw, lerp(3.1, 2.0, t)); }, 16));

    // السعف: سبع من كل جهة + واحدة قائمة
    var fronds = [
      // [زاوية الخروج, الطول, الهبوط, أقصى عرض]
      [90, 24, 0, 3.0],
      [64, 27, 6, 3.2], [40, 30, 15, 3.4], [18, 28, 23, 3.1], [-2, 23, 26, 2.6]
    ];
    for (var m = 0; m < 2; m++) {
      var s = m === 0 ? 1 : -1;
      for (var i = 0; i < fronds.length; i++) {
        if (m === 1 && fronds[i][0] === 90) continue;   // القائمة واحدة فقط
        var ang = fronds[i][0] * Math.PI / 180;
        var L = fronds[i][1], drop = fronds[i][2], wMax = fronds[i][3];
        var p0 = { x: 50, y: topY - 1 };
        var tipX = 50 + s * Math.cos(ang) * L;
        var tipY = topY + Math.sin(ang) * L - drop;
        var ctrl = { x: 50 + s * Math.cos(ang) * L * 0.45,
                     y: topY + Math.sin(ang) * L * 0.86 };
        var curve = qbez(p0, ctrl, { x: tipX, y: tipY });
        parts.push(ribbon(curve, function (t) {
          // عدسة: صفر عند الأصل والطرف، أعرض في الوسط، مع حدّ أدنى للطباعة
          var w = Math.sin(Math.PI * Math.pow(t, 0.78)) * wMax;
          return Math.max(mw, 0.62, w);
        }, 30));
      }
    }
    return parts;
  }

  /**
   * الشعار كاملاً في مربّع 100×100.
   * @param {number} [minHalf] أدنى نصف سماكة بوحدات الشعار — يُحسب من
   *   المقاس النهائي وقطر النوزل حتى لا تتلاشى أطراف السعف عند التصغير.
   */
  function crest(minHalf) {
    var mw = minHalf || 0;
    return [].concat(sword(false, mw), sword(true, mw), palm(mw));
  }

  /** أدنى نصف سماكة بوحدات الشعار ليخرج بسماكة needMm عند ارتفاع heightMm */
  function minHalfFor(needMm, heightMm) {
    if (!heightMm) return 0;
    return (needMm / 2) * (100 / heightMm);
  }

  /** رموز نوع اللوحة أسفل الشريط الجانبي */
  function typeSymbol(kind, cx, cy, r) {
    var P = global.SvgPath;
    function poly(angles) {
      return angles.map(function (a) {
        return { x: cx + r * Math.cos(a * Math.PI / 180), y: cy + r * Math.sin(a * Math.PI / 180) };
      });
    }
    switch (kind) {
      case 'triangleUp':   return [poly([90, 210, 330])];
      case 'triangleDown': return [poly([270, 30, 150])];
      case 'square':       return [P.roundRect(cx, cy, r * 1.7, r * 1.7, r * 0.18, 3)];
      case 'none':         return [];
      default:             return [P.circle(cx, cy, r, 28)];
    }
  }

  global.Emblem = { crest: crest, typeSymbol: typeSymbol, ribbon: ribbon,
                    qbez: qbez, minHalfFor: minHalfFor };
})(typeof window !== 'undefined' ? window : globalThis);
