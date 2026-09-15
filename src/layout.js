/* محرّك تخطيط اللوحة السعودية
 *
 * يحوّل الإعدادات إلى «أجزاء» ثنائية الأبعاد بارتفاعات z، جاهزة للبثق.
 * فضاء الإحداثيات: المليمتر، الأصل في مركز اللوحة، المحور الرأسي لأعلى.
 *
 * ترتيب المحتوى — وهو ما يخطئ فيه أكثر التصاميم:
 *   الحروف تُخزَّن بترتيب القراءة العربي (يمين ← يسار).
 *   وتُرسم على اللوحة بالعكس، واللاتيني يوضع تحت كل حرف في عموده نفسه.
 *   مثال: «ا ح ع» تُرسم بصرياً ع ح ا، وتحتها E J A.
 */
(function (global) {
  'use strict';

  var P = global.SvgPath;

  // ————— مواصفات الأنواع —————
  /* مواصفات الأنواع الثلاثة — مستخرجة من صور لوحات حقيقية.
   *
   * النموذج أعمدة: كل عمود نصّ فيه خانة لكل صفّ (عربي فوق، لاتيني تحت)،
   * ولكل خانة إطارها كما في اللوحة الحقيقية. والشريط والشعار عمودان
   * بارتفاع كامل. الكسور نسبةٌ إلى الارتفاع الداخلي.
   */
  var TYPES = {
    /* خانات ٢×٢ وشريط طويل على اليمين — والشعار فيه فوق K S A
     *
     * وعرضُ الشريط نسبةٌ من الارتفاع الداخليّ. كان ٠٫٢٢ فخرج الشريطُ
     * ٣٢ مليمتراً على لوحة ٣٣٥، أي تسعةً ونصفاً بالمئة من عرضها.
     * وقيس على صورتين حقيقيّتين مواجِهتين — لوحة RUA ولوحة RRJ —
     * فوقع حدُّ الشريط في كلتيهما عند ٨٣٫٩٪ من العرض، أي أنّ الشريطَ
     * ١٦٫١٪ = أربعةٌ وخمسون مليمتراً. فصار ٠٫٣٦٥. */
    standard: { label: 'عادية', w: 335, h: 155, rows: 2,
                order: ['digits', 'letters', 'band'],
                /* وخانةُ الأرقام أعرضُ من خانة الحروف. قيست الصورتان
                 * المواجِهتان نفسُهما: الفاصلُ الأوسط عند ٤٩٪ من العرض
                 * والشريطُ يبدأ عند ٨٤٪ — فالأرقام ٤٩٪ والحروف ٣٥٪،
                 * نسبتُهما ١٫٤٦. وكانتا متساويتين بطلبٍ سابق، ثمّ
                 * اختير أن تُطابَق اللوحة. والمنزلقُ يضرب في هذا. */
                weight: { digits: 1.38, letters: 1 },
                bandStyle: 'tall', bandW: 0.315, bandSymbol: true },

    /* الشعار في الوسط وتحته السعودية و KSA — لا شريط على اليمين
     *
     * وطولُها خمس مئةٍ وخمسون لا خمس مئةٍ وعشرون. والخمس مئةٍ وعشرون
     * مقاسٌ أوروبيٌّ قياسيّ، فيسبق إلى الظنّ أنّه مقاسُها — وعليه
     * مصنّعُ لوحاتٍ أجنبيّ وصندوقُ ويكيبيديا الإنجليزية. لكنّ ذلك
     * المصنّعَ يقول في القصيرة ٣١٦٫٥×١٥٦٫٥ وهي بالإجماع ٣٣٥×١٥٥،
     * فأرقامُه قوالبُ عامّةٌ لا مواصفةٌ سعودية. والمصادرُ السعوديةُ
     * متّفقةٌ على ٥٥٠×١١٠. */
    long:     { label: 'طويلة', w: 550, h: 110, rows: 2,
                order: ['digits', 'band', 'letters'],
                weight: { digits: 1, letters: 1 },
                bandStyle: 'compact', bandW: 0.70, bandSymbol: true },

    /* صفٌّ واحدٌ لاتينيٌّ والشريطُ في الوسط — للوحة الأمامية القصيرة.
     *
     * ومقاسُها **تقديريّ**: المرورُ يُصدرها عبر أبشر ولا يَنشر أبعادَها،
     * ولم أجدها عند ويكيبيديا ولا عند بائعٍ ولا في خبر. فارتفاعُها
     * أُخذ من الطويلة (١١٠) وطولُها قُدّر. ومن قاس واحدةً فليُصحّح. */
    sport:    { label: 'رياضية', w: 310, h: 110, rows: 1, script: 'la', approx: true,
                order: ['digits', 'band', 'letters'],
                weight: { digits: 1, letters: 1 },
                bandStyle: 'compact', bandW: 0.42, bandSymbol: false }
  };

  // ————— ألوان اللوحات ورموزها —————
  var COLORS = {
    white:  { label: 'بيضاء · خاصة',        base: '#f2f2ee', ink: '#111111', symbol: 'circle' },
    yellow: { label: 'صفراء · أجرة',        base: '#f0c000', ink: '#111111', symbol: 'triangleUp' },
    green:  { label: 'خضراء · دبلوماسية',   base: '#0d7a3c', ink: '#f5f5f0', symbol: 'square' },
    blue:   { label: 'زرقاء · تجارية',      base: '#1256a0', ink: '#f5f5f0', symbol: 'triangleDown' },
    silver: { label: 'فضية · مؤقتة',        base: '#b9bcc0', ink: '#111111', symbol: 'none' }
  };

  /* المعتمَدُ في اللوحة سبعةَ عشرَ حرفاً، والأداةُ لا تحصر المستخدمَ
   * فيها: يكتب ما شاء من الأبجديتين. وتبقى الخريطةُ للتحويل التلقائي
   * بين الصفّين حين يكون الحرفُ منها. */
  var PLATE_LETTERS = 'ابحدرسصطعقكلمنهوى';
  var LETTERS_AR = PLATE_LETTERS;

  /* مواضع لسان حلقة المفاتيح: [اتجاه أفقي, اتجاه رأسي, محور] */
  var KEYRING_POS = {
    topRight:    [ 1,  1, 'h'], midRight: [ 1, 0, 'h'], bottomRight: [ 1, -1, 'h'],
    topLeft:     [-1,  1, 'h'], midLeft:  [-1, 0, 'h'], bottomLeft:  [-1, -1, 'h'],
    topCenter:   [ 0,  1, 'v'], bottomCenter: [0, -1, 'v']
  };

  // ————— قياسات مرجعية للرموز (تُحسب مرة) —————
  var DIGITS_ALL = '0123456789٠١٢٣٤٥٦٧٨٩';
  function notDigit(ch) { return DIGITS_ALL.indexOf(ch) < 0; }

  /* الرموزُ من Noto Naskh Arabic و Arimo — قريبةٌ لا مطابقة.
   *
   * وقد جُرّب تتبّعُها من صور لوحاتٍ حقيقية ليكون للأداة خطُّها، ثمّ
   * صُرف عن ذلك: ما خرج من التتبّع كان رسمَ لوحةٍ مستعملةٍ بما فيها،
   * لا حرفاً مضبوطاً. والمستعارُ أنظفُ وإن لم يطابق.
   * وما بُني لتلك المحاولة محفوظٌ في الوسم plate-font.
   */
  var _ref = null;
  function refMetrics() {
    if (_ref) return _ref;
    var G = global.KSA_GLYPHS;
    function union(dict, keys) {
      var y0 = Infinity, y1 = -Infinity;
      for (var i = 0; i < keys.length; i++) {
        var g = dict[keys[i]];
        if (!g || !g.bbox) continue;
        if (g.bbox.y0 < y0) y0 = g.bbox.y0;
        if (g.bbox.y1 > y1) y1 = g.bbox.y1;
      }
      return { y0: y0, y1: y1, h: y1 - y0, mid: (y0 + y1) / 2 };
    }
    // الأرقام تُقاس على صندوق الأرقام والحروف على صندوق الحروف.
    // خلطهما يجعل ٦٢٥١ أصغر من 6251، لأن الحروف العربية تنزل تحت السطر
    // فيطول صندوقها المشترك ويصغر ما يُقاس عليه.
    // الحروف العربية تُقاس بصندوقها كاملاً — من قاع نزول «م» و«ع»
    // إلى أعلى «ا» — لا من السطر. القياس من السطر يخرج «ل» بمقدار
    // ١٫٧ ضعف الصفّ فينزل ذيلها خارج الخانة، وقد رأيتُ ذلك.
    // والصندوق الكامل يضمن أن أي تشكيلة حروف تسع الخانة.
    _ref = {
      ar: { digits: union(G.ar, '٠١٢٣٤٥٦٧٨٩'.split('')),
            letters: union(G.ar, Object.keys(G.ar).filter(notDigit)) },
      la: { digits: union(G.la, '0123456789'.split('')),
            letters: union(G.la, Object.keys(G.la).filter(notDigit)) }
    };
    return _ref;
  }

  var DIGIT_RE = /[0-9٠-٩]/;
  function refFor(str, script) {
    var r = refMetrics()[script];
    return DIGIT_RE.test(str.charAt(0)) ? r.digits : r.letters;
  }

  /* الحروف العربية تُرسم في خطّ اللوحة أكبرَ نسبةً إلى الألف ممّا
   * ترسمها خطوطُ النسخ المتاحة. معاملٌ صغير يقرّب النسبة، ويبقى
   * القياسُ على الصندوق الكامل فلا يخرج ذيلُ حرفٍ عن خانته. */
  var AR_LETTER_BOOST = 1.10;

  function scriptBoost(str, script) {
    return (script === 'ar' && !DIGIT_RE.test(str.charAt(0))) ? AR_LETTER_BOOST : 1;
  }

  /* ——— وصلُ الحروف ———
   *
   * الخطُّ العربيُّ متّصل: يتغيّر شكلُ الحرف بحسب جارَيه، وله إلى
   * أربعةِ أشكال — منفردة ونهائية وابتدائية ووسطية. واللوحةُ الرسمية
   * تكتب حروفَها مقطّعةً لأنّها رموزُ ترقيمٍ لا كلمة؛ أمّا من أراد
   * اسماً أو كلمةً فيحتاج الوصل.
   *
   * والقاعدةُ في اختيار الشكل من نوع وصل الجارَين:
   *   يأخذ الحرفُ شكلاً نهائياً أو وسطياً إن كان ما قبله يصل من
   *   الجهتين (D)، وابتدائياً أو وسطياً إن كان هو نفسُه D وما بعده
   *   يقبل الوصل (D أو R). وما عدا ذلك منفرد.
   *
   * واللامُ ألف مركّبةٌ واجبة: تُكتب حرفاً واحداً لا حرفين.
   */
  function shapeArabic(str) {
    var G = global.KSA_GLYPHS;
    var F = G.ar4 || {}, J = G.join || {}, LIG = G.lig || {};
    var units = [];
    for (var i = 0; i < str.length; i++) {
      var pair = str.charAt(i) + str.charAt(i + 1);
      if (LIG[pair]) { units.push({ c: pair, lig: true }); i++; }
      else units.push({ c: str.charAt(i), lig: false });
    }
    function joinOf(u) { return u.lig ? 'R' : (J[u.c] || 'U'); }

    var out = [];
    for (var k = 0; k < units.length; k++) {
      var cur = units[k], prev = units[k - 1], next = units[k + 1];
      var joinBefore = !!prev && joinOf(prev) === 'D';
      var joinAfter = !!next && joinOf(cur) === 'D' &&
                      (joinOf(next) === 'D' || joinOf(next) === 'R');
      var key = joinBefore ? (joinAfter ? 'med' : 'fin')
                           : (joinAfter ? 'ini' : 'iso');
      var set = cur.lig ? LIG[cur.c] : F[cur.c];
      var g = set ? (set[key] || set.fin || set.iso) : null;
      if (!g) g = G.ar[cur.c];          // ما لا شكلَ وصلٍ له يُكتب منفرداً
      if (g) out.push(g);
    }
    return out;
  }

  /**
   * يرسم نصّاً عربياً موصولاً داخل منطقة، ويعيده **مجموعات**.
   *
   * والحروفُ تتراكب عند الوصل بحكم الخطّ، فلو جُمعت في شكلٍ واحدٍ
   * لقرأت قاعدةُ الزوج والفرد موضعَ الوصل ثقباً فنخرت الكلمة — وهي
   * العلّةُ نفسُها في سعف النخلة وملتقى السيفين. فكلُّ حرفٍ مجموعةٌ
   * مستقلّةٌ تُبثق وحدَها ويوحّدها السلايسر.
   */
  function joinedWord(str, cx, cy, targetH, maxW) {
    var glyphs = shapeArabic(str);
    if (!glyphs.length) return [];
    var y0 = Infinity, y1 = -Infinity, total = 0;
    glyphs.forEach(function (g) {
      if (g.bbox) {
        if (g.bbox.y0 < y0) y0 = g.bbox.y0;
        if (g.bbox.y1 > y1) y1 = g.bbox.y1;
      }
      total += g.adv;
    });
    if (!isFinite(y0) || total <= 0) return [];
    var em = targetH / ((y1 - y0) || 1);
    if (total * em > maxW) em = maxW / total;

    var groups = [];
    var x = cx + (total * em) / 2;         // يُكتب من اليمين إلى اليسار
    var yOff = cy - ((y0 + y1) / 2) * em;
    glyphs.forEach(function (g) {
      x -= g.adv * em;
      var cs = P.place(P.parsePath(g.d, { quality: 10 }), em, em, x, yOff);
      if (cs.length) groups.push(cs);
    });

    /* والمجموعاتُ لا تكفي في النقش الغائر: الحروفُ هناك ثقوبٌ في
     * القاعدة لا مجسّماتٌ فوقها، والثقوبُ المتراكبةُ يقرأ تراكبَها
     * كشفُ الثقوب جزيرةً فينكسر التثليث. فتُوحَّد الكلمةُ شكلاً واحداً
     * بلا تقاطع — وهو ما يفعله بناءُ «السعودية» وقت التوليد، وهنا
     * يقع وقت التشغيل لأنّ النصَّ حرّ. */
    var merged = unionContours(groups);
    return merged ? [merged] : groups;
  }

  /**
   * يفصل الخارجيَّ عن الثقب **باتّجاه اللفّ** لا بعمق التداخل.
   *
   * وعمقُ التداخل يكفي في الحرف المفرد ولا يكفي في المركّب: «لا»
   * كنتوران كلاهما ملفوفٌ لفَّ الخارجي — لامٌ وألفٌ متراكبان — ونقطةُ
   * أحدهما تقع داخل الآخر، فيقرأه العمقُ ثقباً فينخر الحرف وتنفتح
   * ٦٨ حافّة. واتّجاهُ اللفّ يفرّق بينهما: الثقبُ في الخطّ ملفوفٌ
   * عكسَ خارجيّه دائماً.
   */
  function shapesByWinding(contours) {
    var outers = [], holes = [];
    contours.forEach(function (c) {
      (P.area(c) < 0 ? outers : holes).push(c);
    });
    if (!outers.length) { outers = holes; holes = []; }
    return outers.map(function (o) {
      var mine = holes.filter(function (h) { return P.pointInContour(h[0], o); });
      return { outer: o, holes: mine };
    });
  }

  /** يوحّد أشكالاً متراكبة في كنتوراتٍ بلا تقاطع */
  function unionContours(groups) {
    var PC = global.polygonClipping;
    if (!PC) return null;
    function ring(c) {
      var r = [];
      for (var i = 0; i < c.length; i++) r.push([c[i].x, c[i].y]);
      r.push([c[0].x, c[0].y]);
      return r;
    }
    try {
      var polys = [];
      groups.forEach(function (cs) {
        shapesByWinding(cs).forEach(function (sh) {
          polys.push([[ring(sh.outer)].concat(sh.holes.map(ring))]);
        });
      });
      if (polys.length < 2) return null;
      var acc = polys[0];
      for (var i = 1; i < polys.length; i++) acc = PC.union(acc, polys[i]);
      var out = [];
      for (var a = 0; a < acc.length; a++) {
        for (var b = 0; b < acc[a].length; b++) {
          var r2 = acc[a][b], pts = [];
          for (var k = 0; k < r2.length - 1; k++) pts.push({ x: r2[k][0], y: r2[k][1] });
          if (pts.length >= 3) out.push(pts);
        }
      }
      return out.length ? out : null;
    } catch (e) {
      // الدمجُ عمليةٌ عدديّةٌ قد تتعثّر؛ والرجوعُ إلى المجموعات سليمٌ بارزاً
      return null;
    }
  }

  /* ——— تشريحُ الرمز: جسمٌ وإعجام ———
   *
   * «ب» و«ت» و«ث» حرفٌ واحدٌ في الرسم — كأسٌ واحدةٌ ارتفاعُها ٠٫٤٤٣٠
   * بالكسر عينِه — ولا تفترق إلّا في موضع النقط. فلمّا كان القياسُ على
   * صندوق الرمز كاملاً، دفع «ب» ثمنَ نقطةٍ تتدلّى تحته: غلافُه ٠٫٦٦٦٠
   * وغلافُ «ت» ٠٫٤٨٨٠، فخرج أصغرَ منه بـ ١٫٣٦ مرّة وهما حرفٌ واحد.
   * وفي الأبجدية إحدى عشرةَ مجموعةَ رسمٍ فيها هذا العطب، أشدُّها ١٫٤٧×.
   *
   * فيُفصل الإعجامُ عن الجسم ويُقاس الجسم. والتمييزُ بالكنتورات:
   * النقطةُ كنتورٌ صغيرٌ يقع خارج صندوق الجسم؛ أمّا الصغيرُ الواقعُ
   * داخلَه فجوفٌ (كجوف «ه») لا نقطة.
   */
  var _anat = {};

  function anatomy(script, ch, dict) {
    var key = script + ch;
    if (_anat[key]) return _anat[key];
    var g = dict[ch];
    var cs = P.parsePath(g.d, { quality: 10 });
    var info = cs.map(function (c) {
      return { c: c, a: Math.abs(P.area(c)), b: P.bbox([c]) };
    });
    var core = info[0];
    info.forEach(function (q) { if (q.a > core.a) core = q; });

    var body = [], dots = [];
    info.forEach(function (q) {
      if (q === core) { body.push(q); return; }
      var inside = q.b.y0 >= core.b.y0 - 1e-6 && q.b.y1 <= core.b.y1 + 1e-6 &&
                   q.b.x0 >= core.b.x0 - 1e-6 && q.b.x1 <= core.b.x1 + 1e-6;
      if (!inside && q.a < core.a * 0.30) dots.push(q); else body.push(q);
    });

    var bb = P.bbox(body.map(function (q) { return q.c; }));
    var db = dots.length ? P.bbox(dots.map(function (q) { return q.c; })) : null;
    /* جهةُ الإعجام بمقارنة المركزين، لا باشتراط انفصالٍ تامّ.
     * فنقاطُ «ت» و«ث» و«ن» و«ش» تتداخل رأسياً مع أعلى الجسم في خطّ
     * النسخ، فكان اشتراطُ الانفصال يعدُّها تحتَه فتُنقل إلى أسفل
     * الحرف — وهو ما ظهر في اللوحة نقاطاً في غير موضعها. */
    var above = db ? ((db.y0 + db.y1) / 2 > (bb.y0 + bb.y1) / 2) : false;
    var a = {
      body: body.map(function (q) { return q.c; }),
      dots: dots.map(function (q) { return q.c; }),
      bb: bb, db: db, above: above,
      gap: db ? (above ? db.y0 - bb.y1 : bb.y0 - db.y1) : 0,
      full: P.bbox(cs)
    };
    _anat[key] = a;
    return a;
  }

  /* الإعجامُ في خطّ النسخ أكبرُ وأبعدُ عن الحرف ممّا ترسمه خطوطُ
   * اللوحات. فيُقرَّب ويُصغَّر قليلاً حتى يسع الجسمُ النطاقَ كاملاً
   * ويبقى الرمزُ داخل خانته. */
  /* الإعجامُ يبقى بحجمه الذي رُسم به. جرّبتُ تصغيرَه لأُوسّع للجسم،
   * فخرجت النقطةُ حصاةً لا تُقرأ. والمخرجُ أن يُفسح للإعجام من
   * ارتفاع النطاق نفسِه: النطاقُ ٠٫٥٨ من الخانة بدل ٠٫٦٨، فيتّسع
   * الهامشُ للجميع بالتساوي — وهو نقصانٌ لا يُرى لأنّه يشمل كلَّ رمز،
   * بخلاف تفاوتٍ بين حرفٍ وجاره فإنّه يُرى.
   *
   * ومسحتُ المجموعات الإحدى عشرةَ على تشكيلاتٍ من النطاق والمقياس
   * والإزاحة: عند ٠٫٥٨ بنقطةٍ كاملةٍ وإزاحةٍ ٠٫٤٠ يبلغ التفاوتُ
   * ١٫٠٠× في كلِّها، وأقصى إزاحةِ مركزٍ ٢٫٩٨ مم من نطاقٍ ٣٨٫٤. */
  var DOT_GAP = 0.03;      // فجوةُ الإعجام عن الجسم بوحدات الخطّ
  var DOT_SCALE = 1.00;    // مقياسُ النقطة — كما رُسمت

  /** يبني كنتورات الرمز بإعجامٍ مُقرَّبٍ مُصغَّر بمقدار u */
  function glyphParts(a, u) {
    if (!a.dots.length || u <= 0) return { cs: a.body.concat(a.dots), box: a.full };
    var s = 1 + (DOT_SCALE - 1) * u;
    /* لا تُقرَّب النقطةُ إلّا إن كانت بعيدة. والفجوةُ السالبة تعني
     * تداخلاً مقصوداً في الخطّ، فتُترك كما رُسمت. */
    var gap = a.gap > DOT_GAP ? a.gap + (DOT_GAP - a.gap) * u : a.gap;
    var db = a.db;
    var dcx = (db.x0 + db.x1) / 2, dcy = (db.y0 + db.y1) / 2;
    var nearAfter = dcy + ((a.above ? db.y0 : db.y1) - dcy) * s;
    var target = a.above ? a.bb.y1 + gap : a.bb.y0 - gap;
    var dy = target - nearAfter;
    var moved = a.dots.map(function (c) {
      return c.map(function (q) {
        return { x: dcx + (q.x - dcx) * s, y: dcy + (q.y - dcy) * s + dy };
      });
    });
    var cs = a.body.concat(moved);
    return { cs: cs, box: P.bbox(cs) };
  }

  /* ——— الطبقاتُ الرأسية الثلاث ———
   *
   * ثلاثُ قواعدَ للقياس تعاقبت وكلُّها كسرت شرطاً واحداً: أن يبقى
   * ترتيبُ الأطوال كما وضعه الخطّ. فحين وُحّد صندوقُ كلِّ حرفٍ ساوت
   * القاعدةُ «د» بـ«ا» — و«د» كأسٌ على السطر و«ا» ألفٌ قائمة.
   *
   * والعلّةُ أنّ صندوقَ الحرف يخلط ثلاثةَ مقاديرَ مستقلّة: ارتفاعَ
   * الصاعد، وارتفاعَ الكأس على السطر، وعمقَ النازل. فلا يصلح مقياساً
   * واحداً لها جميعاً.
   *
   * فتُصنَّف الحروفُ إلى طبقاتها الثلاث — وهي طبقاتُ الخطّ العربيّ
   * نفسِه — ولكلِّ طبقةٍ مقياسُها ونسبتُها:
   *
   *   الصاعدة  (ا ل ك ط ظ)  يُقاس ارتفاعُها **فوق السطر**، فيتساوى
   *                          عمودُ «ا» وعمودُ «ل» وإن نزل ذيلُ اللام.
   *   الكأس    (ب ت ث د ذ ه ف)  يُقاس ارتفاعُ جسمها، وهي لا تنزل.
   *   النازلة  (ن ر ز و س ص ج م ع ق ي …)  يُقاس ارتفاعُ جسمها كاملاً
   *                          من قاع النازل إلى قمّته.
   *
   * وتستقرُّ كلُّها على **خطِّ أساسٍ واحد** — وهو ما يفعله الخطّ، وما
   * لم تكن تفعله القواعدُ الثلاث إذ كانت توسّط كلَّ حرفٍ على حدة.
   */
  var CLASS_TOP = 0.60;      // ما بلغ هذا فوق السطر فهو صاعد
  var CLASS_BOT = -0.10;     // وما نزل عن هذا فهو نازل

  function vClass(bb) {
    if (bb.y1 >= CLASS_TOP) return 'asc';
    if (bb.y0 <= CLASS_BOT) return 'desc';
    return 'bowl';
  }

  /* نسبُ الطبقات إلى ارتفاع الصاعد — مقيسةٌ بميزان الشكل لا مقدَّرة.
   *
   * مسحتُ ثلاثين تشكيلةً من النسبتين: النازلةُ عند ١٫٠٠ وحدَها تُنهي
   * انقلابَ الأطوال (صفرُ انقلاب بعد ثمانيةَ عشر)، وما دونها يُبقي
   * «ع» أقصرَ من «ا» وهو في الخطّ أطولُ منها؛ وما فوقها يقلب أكثر.
   *
   * والكأسُ ٠٫٧٢ — ونسبتُها في الخطّ ٠٫٦٦ — فزيادةٌ يسيرةٌ نحو التساوي
   * بلا مبالغةٍ تجعل «د» بحجم «ا». */
  var CLASS_F = { asc: 1.00, bowl: 0.72, desc: 1.00 };

  /**
   * أقصى ما تعلو الأبجديةُ وما تنزل، منسوباً لارتفاع الصاعد.
   *
   * ويُحسب على **الرمز كاملاً بإعجامه** لا على جسمه وحدَه. فلو حُسب
   * على الجسم لخرجت نقاطُ «ي» تحت الخانة، فيُصغَّر «ي» وحدَه لتسع —
   * فيخرج أقصرَ من «ن» وهو في الخطّ أطولُ منه. والتصغيرُ الشاملُ لا
   * يُرى لأنّه يعمّ، وتصغيرُ حرفٍ بين جيرانه يُرى.
   */
  var _span = null;
  function classSpan() {
    if (_span) return _span;
    var G = global.KSA_GLYPHS;
    var up = 0, dn = 0;
    /* ——— النطاقُ لحروف اللوحة لا لأبجدية الخطّ ———
     *
     * كان يُمسح على الستّةِ والثلاثين حرفاً التي في الخطّ، فيحجز
     * لأطولها صعوداً وأعمقها نزولاً. وأطولُها «أ» بهمزتها (١٫٣٤٩)
     * وأعمقُها «ي» (٠٫٦٦٧) — **وكلاهما ليس من حروف اللوحة**.
     * فيُحجز ٢٫٠١٦ ولا يُستعمل منه إلّا ١٫٤٨٣، ويبقى الرمزُ نصفَ
     * خانته: حبرُه ٠٫٤٢ من ارتفاعها والحقيقةُ ٠٫٦٧.
     *
     * ولذلك لم يكن لمنزلق «ارتفاع الخطّ» أثرٌ يُرى: النطاقُ محكومٌ
     * بالحجز لا به.
     *
     * فيُحصر المسحُ في السبعةَ عشرَ حرفاً التي تقع على اللوحة —
     * صاعدُها «ا» ونازلُها «ن» — فيصير المحجوزُ ١٫٤٨٣ وهو المستعمَل
     * بعينه. وخطُّ الأساس يبقى واحداً لا يتغيّر بما يُكتب، وما شذَّ
     * من حرفٍ خارج هؤلاء يردُّه الحارسُ الأخير إلى خانته. */
    Object.keys(G.ar).forEach(function (ch) {
      if (DIGIT_RE.test(ch)) return;
      if (!global.__SPAN_ALL && PLATE_LETTERS.indexOf(ch) < 0) return;
      var a = anatomy('ar', ch, G.ar);
      var cl = vClass(a.bb);
      var metric = cl === 'asc' ? a.bb.y1 : (a.bb.y1 - a.bb.y0);
      if (metric <= 0) return;
      var k = CLASS_F[cl] / metric;          // em لكلِّ وحدةٍ من الصاعد
      var box = glyphParts(a, 1).box;
      up = Math.max(up, box.y1 * k);
      dn = Math.max(dn, -box.y0 * k);
    });
    _span = { up: up, dn: dn };
    return _span;
  }

  /* ——— أعرضُ حروف اللوحة ———
   *
   * الحروفُ تُضغط أفقيّاً لتسع خانتَها، وللضغط حدٌّ دونه تنحُف
   * الأعمدةُ الرأسيةُ تحت الفوهة. فإذا كبر النطاقُ بلغ أعرضُ الحروف
   * الحدَّ فصغُر وحدَه، وخرج «ص» أقصرَ من «ن» بلا سببٍ في رسمه.
   *
   * فيُقاس أعرضُها مرّةً واحدة — عرضُه منسوباً إلى النطاق — ويُحَدّ
   * النطاقُ به، فيسع الجميعَ على حجمٍ واحد. وهو ما يفعله مصمّمُ
   * الخطّ المضغوط: يضبط الأبجديةَ على أعرضِ حرفٍ فيها.
   */
  var _wideRatio = null;
  function widestLetterRatio(script) {
    if (_wideRatio && _wideRatio[script] !== undefined) return _wideRatio[script];
    if (!_wideRatio) _wideRatio = {};
    var dict = script === 'ar' ? global.KSA_GLYPHS.ar : global.KSA_GLYPHS.la;
    var set = script === 'ar' ? PLATE_LETTERS : 'ABDEGHJKLNRSTUVXZ';
    var w = 0;
    for (var i = 0; i < set.length; i++) {
      var ch = set[i];
      if (!dict[ch]) continue;
      var a = anatomy(script, ch, dict);
      var cl = vClass(a.bb);
      var metric = cl === 'asc' ? a.bb.y1 : (a.bb.y1 - a.bb.y0);
      if (metric <= 0) continue;
      var box = glyphParts(a, 1).box;
      w = Math.max(w, (box.x1 - box.x0) * CLASS_F[cl] / metric);
    }
    _wideRatio[script] = w;
    return w;
  }

  /** عرض نصّ بوحدات em مع التتبّع */
  function measure(str, dict, tracking) {
    var w = 0;
    for (var i = 0; i < str.length; i++) {
      var g = dict[str[i]];
      if (!g) continue;
      w += g.adv + (i < str.length - 1 ? tracking : 0);
    }
    return w;
  }

  /**
   * يبني كنتورات نصّ داخل صندوق.
   * الارتفاع مقيس على الصندوق المرجعي للنص لا على أحرف السلسلة،
   * حتى لا يتغيّر حجم الخط باختلاف الأرقام المكتوبة.
   */
  function textContours(str, script, cx, cy, targetH, maxW, tracking, xs) {
    var G = global.KSA_GLYPHS;
    var dict = script === 'ar' ? G.ar : G.la;
    var ref = refFor(str, script);
    var em = (targetH * scriptBoost(str, script)) / ref.h;
    xs = xs || 1;
    var wEm = measure(str, dict, tracking);
    if (wEm * em * xs > maxW && wEm > 0) xs = maxW / (wEm * em);

    var out = [];
    var x = cx - (wEm * em * xs) / 2;
    var yOff = cy - ref.mid * em;
    for (var i = 0; i < str.length; i++) {
      var g = dict[str[i]];
      if (!g) continue;
      var cs = P.parsePath(g.d, { quality: 10 });
      out = out.concat(P.place(cs, em * xs, em, x, yOff));
      x += (g.adv + tracking) * em * xs;
    }
    return { contours: out, width: wEm * em * xs, em: em };
  }

  /* أعرض تشكيلة ممكنة في عمود: أربعة أرقام أو ثلاثة حروف بأعرض
   * رموزها. حجم الخطّ يُقاس عليها لا على النصّ المكتوب، حتى لا يكبر
   * الخطّ حين تختصر الرقم — واللوحة الحقيقية تفعل ذلك: خانةٌ كاملة
   * لرقمٍ واحد، والرمز بحجمه المعتاد. */
  var _wide = null;
  function widestAdv(dict, keys) {
    var m = 0;
    for (var i = 0; i < keys.length; i++) {
      var g = dict[keys[i]];
      if (g && g.adv > m) m = g.adv;
    }
    return m;
  }
  function worstWidth(kind, script, targetH, tracking, slots) {
    if (!_wide) {
      var G = global.KSA_GLYPHS;
      _wide = {
        ar: { digits: widestAdv(G.ar, '٠١٢٣٤٥٦٧٨٩'.split('')),
              letters: widestAdv(G.ar, Object.keys(G.ar).filter(notDigit)) },
        la: { digits: widestAdv(G.la, '0123456789'.split('')),
              letters: widestAdv(G.la, Object.keys(G.la).filter(notDigit)) }
      };
    }
    var n = slots || (kind === 'digits' ? 4 : 3);
    var adv = _wide[script][kind];
    var ref = refMetrics()[script][kind];
    var boost = kind === 'letters' && script === 'ar' ? AR_LETTER_BOOST : 1;
    return (n * adv + (n - 1) * tracking) * ((targetH * boost) / ref.h);
  }

  /**
   * يرسم النصّ على شبكةٍ متساوية الخانات — وهذا ما تفعله اللوحة
   * الحقيقية: أربع خانات للأرقام وثلاث للحروف، عرضها واحد مهما
   * كان الرمز، وكلُّ رمزٍ يتوسّط خانته بصندوقه المرئي لا بعرض
   * تقدّمه. فيخرج التباعدُ منتظماً، ويثبت الحجم، ولا يتداخل رمزان
   * ولا يخرج نصٌّ عن منطقته مهما قصر أو طال.
   *
   * والرموزُ الأقلّ من سعة الشبكة تتوسّط مجموعةً في وسط المنطقة.
   */
  function textSlots(str, script, cx, cy, targetH, areaW, nSlots, fill, uniform,
                     cellH, squeezeMin) {
    var G = global.KSA_GLYPHS;
    var dict = script === 'ar' ? G.ar : G.la;
    var refs = refMetrics()[script];
    var ref = refFor(str, script);
    var u = uniform === undefined ? 1 : Math.max(0, Math.min(1, uniform));
    // سقفٌ لعرض الخانة: لو تُرك عرضُ المنطقة يقسّم وحده لتباعدت
    // أرقامُ اللوحة الطويلة تباعداً غيرَ واقعي. الخانةُ لا تتجاوز
    // قرابةَ ارتفاع الرمز، والشبكةُ كلّها تتوسّط المنطقة.
    var slot = Math.min(areaW / nSlots, targetH * 0.92);
    var gridW = slot * nSlots;
    var n = Math.min(str.length, nSlots);
    var first = (nSlots - n) / 2;          // توسيط المجموعة
    var out = [];

    var maxH = (cellH || targetH) * 0.98;
    var xsMin = squeezeMin > 0 ? squeezeMin : 0;
    var drawn = [];

    for (var i = 0; i < n; i++) {
      var g = dict[str[i]];
      if (!g) continue;
      var slotCx = cx - gridW / 2 + slot * (first + i + 0.5);

      /* — نطاقٌ واحد، وقياسان داخله —
       *
       * الحروفُ تفاوتُها ناشئٌ من الصواعد والنوازل لا من معنىً في
       * الحرف، فتُوحَّد: كلُّ حرفٍ يُمدُّ حتى يبلغ ارتفاعَ النطاق
       * بعينه، فيتساوى «ر» و«ا» و R.
       *
       * والأرقامُ لا تُوحَّد: منظومةُ الأرقام مصمّمةٌ مجموعةً واحدة،
       * وارتفاعُ كلِّ رقمٍ فيها من معناه — «٠» نقطةٌ بالتصميم، ومدُّه
       * إلى ارتفاع النطاق يخرجه قرصاً يملأ خانته (٢٫٨٧ ضعفَ حجمه،
       * رأيتُه في «١٠٥٠»). فتُقاس مجموعةُ الأرقام على صندوقها، فيبلغ
       * أطولُها حدَّ النطاق ويصغر ما دونه كما وُضع.
       *
       * والنطاقُ واحدٌ في الحالين، فتتطابق قيعانُ العمودين وقممُهما.
       */
      var isD = DIGIT_RE.test(str[i]);
      var rf = isD ? refs.digits : refs.letters;
      var uu = isD ? 0 : u;

      var a = anatomy(script, str[i], dict);
      var gp = glyphParts(a, uu);
      var b = gp.box;

      /* — القياسُ بالطبقة، والاستقرارُ على خطِّ أساسٍ واحد —
       *
       * ارتفاعُ الصاعد `asc` هو النطاق، وتُقاس عليه الطبقتان
       * الأخريان بنسبتيهما. وموضعُ خطِّ الأساس يُحسب مرّةً من أقصى
       * ما تعلو الأبجديةُ وما تنزل، فيثبت لكلِّ الحروف ولا يتغيّر
       * بتغيّر المكتوب.
       *
       * والأرقامُ تُقاس مجموعةً على صندوقها كما كانت — «٠» نقطةٌ
       * بالتصميم لا رمزٌ قُصّر — وتستقرُّ على خطّ الأساس نفسِه.
       */
      var sp = classSpan();
      var asc = maxH / (sp.up + sp.dn);       // ارتفاعُ الصاعد بالمليمتر
      if (asc > targetH) asc = targetH;
      /* والحروفُ لا تتجاوز ما يسعه الضغط: أعرضُها يبلغ الحدَّ أوّلاً،
       * فيُحَدُّ النطاقُ به ليبقى الجميعُ على حجمٍ واحد. والأرقامُ
       * أضيقُ وأكثرُ خاناتٍ فلا يبلغها هذا. */
      if (!isD && xsMin > 0) {
        var wr = widestLetterRatio(script);
        if (wr > 0) asc = Math.min(asc, (slot * fill) / (wr * xsMin));
      }
      var baseY = cy - (sp.up - sp.dn) * asc / 2;   // خطُّ الأساس

      var em, yBase;
      if (isD || uu <= 0) {
        /* الأرقام، وكذلك الحروفُ حين يُخفَّض «توحيد الأحجام» إلى صفر:
         * صندوقُ المجموعة يُقاس على الصاعد، والاستقرارُ على السطر. */
        em = asc / (rf.y1 || rf.h);
        yBase = baseY;
      } else {
        var cl = vClass(a.bb);
        var metric = cl === 'asc' ? a.bb.y1 : (a.bb.y1 - a.bb.y0);
        if (metric <= 0) metric = ref.h;
        var emCls = (asc * CLASS_F[cl]) / metric;
        var emRef = asc / (rf.y1 || rf.h);
        em = emRef * (1 - uu) + emCls * uu;   // u يمزج بين نسب الخطّ والطبقات
        yBase = baseY;
      }

      /* حارسٌ أخير: ما خرج عن الخانة رغم حساب المدى يصغر. ولا يقع
       * هذا في الأبجدية المقيسة، وإنّما يُبقى لرمزٍ يُضاف يوماً. */
      var above = b.y1 * em, below = -b.y0 * em;
      var topLim = (cy + maxH / 2) - yBase;
      var botLim = yBase - (cy - maxH / 2);
      if (above > topLim || below > botLim) {
        var k = Math.min(above > topLim ? topLim / above : 1,
                         below > botLim ? botLim / below : 1);
        em *= k;
      }

      /* منفذُ قياسٍ لكلِّ رمز — به عُرف أنّ `textFill` لا أثرَ له:
       * النطاقُ محكومٌ بـ asc = maxH / (صاعد + نازل)، والمجموعُ
       * يبلغ ضعفَ الصاعد، فيبقى الصاعدُ نصفَ الخانة ولا يبلغه
       * `textFill` أصلاً. */
      if (global.__SLOT_DEBUG && isD) {
        global.__SLOT_DEBUG.push({ ch: str[i], targetH: targetH, cellH: cellH,
          maxH: maxH, asc: asc, slot: slot, em: em, inkH: (b.y1 - b.y0) * em });
      }
      drawn.push({ gp: gp, b: b, em: em, yBase: yBase, slotCx: slotCx,
                   gw: (b.x1 - b.x0) * em, ch: str[i] });
    }

    /* ——— الضغطُ للصفِّ كلِّه لا لكلِّ رمزٍ وحدَه ———
     *
     * كان لكلِّ رمزٍ ضغطُه: «ا» نحيفٌ فلا يُضغط، و«ص» عريضٌ فيُضغط
     * حتى يبلغ الحدَّ ثمّ **يصغر**. فيخرج «ص» أقصرَ من جيرانه بلا
     * سببٍ في رسمه — وذلك ما كسر «رسمٌ واحدٌ ⇒ حجمٌ واحد» لمّا كبرت
     * الرموز: بلغ «س» و«ص» الحدَّ وحدَهما فتخلّفا.
     *
     * والخطُّ المضغوطُ يُضغط كلُّه بنسبةٍ واحدة، لا حرفاً دون حرف.
     * فيُؤخذ أشدُّ ما يحتاجه الصفُّ ويُعمّ. فإن نزل عن الحدّ صغُر
     * **الصفُّ كلُّه** بنسبةٍ واحدة — فتبقى النسبُ بين الحروف كما
     * هي، ويبقى الحدُّ حارساً على سماكة العمود الرأسيّ. */
    var lim = slot * fill;
    var xs = 1;
    drawn.forEach(function (d) {
      if (d.gw > lim && d.gw > 0) xs = Math.min(xs, lim / d.gw);
    });
    var shrink = 1;
    if (xs < xsMin && xs > 0) { shrink = xs / xsMin; xs = xsMin; }

    drawn.forEach(function (d) {
      var em2 = d.em * shrink;
      if (global.__XS_DEBUG) {
        global.__XS_DEBUG.push({ ch: d.ch, slotCx: d.slotCx, cx: cx, n: n, nSlots: nSlots, em: em2, xs: xs, gw: d.gw,
          slot: slot, lim: lim, inkH: (d.b.y1 - d.b.y0) * em2 });
      }
      // التوسيط على الصندوق المرئي: «١» نحيف و«٥» عريض، والتقدّم
      // وحده يجعل النحيف يبدو مزاحاً عن مركز خانته.
      var dx = d.slotCx - (d.b.x0 + d.b.x1) / 2 * em2 * xs;
      out = out.concat(P.place(d.gp.cs, em2 * xs, em2, dx, d.yBase));
    });
    return out;
  }

  function measureWidth(str, script, targetH, tracking) {
    var G = global.KSA_GLYPHS;
    var dict = script === 'ar' ? G.ar : G.la;
    var ref = refFor(str, script);
    return measure(str, dict, tracking) * ((targetH * scriptBoost(str, script)) / ref.h);
  }

  /**
   * كلمة «السعودية» — مسارٌ واحد مدموجٌ وقت البناء.
   * حروفُ الخطّ العربي تتراكب عند الوصل، وقد دُمجت في
   * tools/extract-glyphs.js فلم يبق فيها تقاطع.
   */
  function wordContours(key, cx, cy, targetH, maxW) {
    var g = global.KSA_GLYPHS.words[key];
    if (!g || !g.d) return [];
    var bh = g.bbox.y1 - g.bbox.y0;
    var em = targetH / bh;
    if (g.adv * em > maxW) em = maxW / g.adv;
    var bw = (g.bbox.x1 - g.bbox.x0) * em;
    var dx = cx - bw / 2 - g.bbox.x0 * em;
    var dy = cy - ((g.bbox.y0 + g.bbox.y1) / 2) * em;
    return [P.place(P.parsePath(g.d, { quality: 6 }), em, em, dx, dy)];
  }

  /**
   * كلمةُ الشريط: المدموجةُ إن كانت «السعودية»، وإلّا تُوصل الآن.
   *
   * و«السعودية» مدموجةٌ وقت البناء بمسارٍ منقّى، فتبقى هي الأصل.
   * وما سواها يمرُّ بالوصل والدمج في الحين — وهو ما جعله ممكناً
   * جدولُ أشكال الوصل.
   */
  function bandWord(str, cx, cy, targetH, maxW) {
    if (!str) return [];
    if (global.KSA_GLYPHS.words[str]) {
      return wordContours(str, cx, cy, targetH, maxW);
    }
    return joinedWord(str, cx, cy, targetH, maxW);
  }

  /** يعكس ترتيب الحروف: القراءة العربية → الترتيب البصري على اللوحة */
  function visualOrder(letters) {
    return letters.split('').reverse().join('');
  }

  /**
   * يحوّل الحروفَ العربية إلى مقابلها اللاتينيِّ المعتمد.
   *
   * والخريطةُ لا تشمل إلّا السبعةَ عشرَ حرفاً المعتمدةَ في اللوحة،
   * فما سواها — «ش» مثلاً — لا مقابلَ له. وكان يُحذف، فتنزاح بقيّةُ
   * الصفِّ اللاتينيِّ خانةً وتفترق الأعمدةُ عن بعضها. فصار يُترك
   * فراغاً يحفظ موضعَه، ويكتب صاحبُ اللوحة ما شاء مكانَه في حقل
   * الصفِّ اللاتينيِّ الحرّ.
   */
  function toLatin(arLetters) {
    var map = global.KSA_GLYPHS.map, out = '';
    for (var i = 0; i < arLetters.length; i++) out += (map[arLetters[i]] || ' ');
    return out;
  }

  /** هل في النصّ حرفٌ عربيٌّ لا مقابلَ لاتينيَّ له؟ */
  function hasUnmapped(arLetters) {
    var map = global.KSA_GLYPHS.map;
    for (var i = 0; i < arLetters.length; i++) if (!map[arLetters[i]]) return true;
    return false;
  }

  function toArabicDigits(s) {
    var d = '٠١٢٣٤٥٦٧٨٩', out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i) - 48;
      out += (c >= 0 && c <= 9) ? d[c] : s[i];
    }
    return out;
  }

  // ————————————————————————————————————————
  //  البناء
  // ————————————————————————————————————————

  function build(cfg) {
    var spec = TYPES[cfg.type] || TYPES.standard;
    var preset = COLORS[cfg.color] || COLORS.white;
    var col = {
      label: cfg.baseColor ? 'لون مخصّص' : preset.label,
      base: cfg.baseColor || preset.base,
      ink: preset.ink,
      symbol: cfg.symbol !== undefined && cfg.symbol !== null ? cfg.symbol : preset.symbol
    };
    // لونُ النقش يُختار مستقلّاً عن لون اللوحة إن شاء صاحبُها
    var inkColor = cfg.inkColor || col.ink;
    var warnings = [];
    _crestNozzle = cfg.nozzle > 0 ? cfg.nozzle : 0.4;
    var S = cfg.targetWidth / spec.w;        // معامل التحجيم
    var W = spec.w * S, H = spec.h * S;
    /* — أيُّ الصفّين يُطبع —
     *
     * اللوحةُ الحقيقية صفّان: عربيٌّ فوق ولاتينيٌّ تحت. ومن أراد
     * جهةً واحدةً — عربيّةً وحدَها أو لاتينيّةً وحدَها — سقط الصفُّ
     * الآخرُ وصارت الخانةُ صفّاً واحداً يملأ ارتفاعَها، فيكبر الخطُّ
     * ولا يبقى نصفُ الخانة فارغاً.
     */
    /* الصفُّ الأعلى والأسفل يُختار لكلٍّ أبجديتُه على حدة، وللأرقام
     * أن تخالف صفَّها: فتُكتب اللوحةُ عربيّةً فوق لاتينيّةً تحت أو
     * العكس، وتُكتب أرقامُ صفٍّ بالعربي وحروفُه باللاتيني.
     *
     * و`scriptRows` القديمُ يبقى مقروءاً فلا تنكسر الإعداداتُ السابقة. */
    var LEGACY = { both: ['ar', 'la'], ar: ['ar', 'none'], la: ['la', 'none'] };
    var leg = LEGACY[cfg.scriptRows] || LEGACY.both;
    var rowTop = cfg.rowTop || spec.script || leg[0];
    var rowBottom = cfg.rowBottom || (spec.rows === 1 ? 'none' : leg[1]);
    if (spec.rows === 1) rowBottom = 'none';
    var rowScript = [rowTop, rowBottom];
    var rows = rowBottom === 'none' ? 1 : 2;

    var tBase = cfg.baseThickness;
    var engraved = cfg.engrave === true;
    var zTop = tBase;
    var zInk = tBase + cfg.reliefHeight;

    var parts = [];
    /** groups اختياري: مجموعات تُبثق مستقلّة ثم يوحّدها السلايسر */
    function add(id, name, role, contours, z0, z1, color, groups) {
      if (!contours || !contours.length) return;
      parts.push({ id: id, name: name, role: role, contours: contours,
                   z0: z0, z1: z1, color: color, groups: groups || null });
    }
    function flatten(groups) {
      var out = [];
      for (var i = 0; i < groups.length; i++) out = out.concat(groups[i]);
      return out;
    }

    // — هيكل اللوحة —
    var corner = H * (cfg.cellStyle === 'sharp' ? 0.030 : 0.072);
    var outline = [P.roundRect(0, 0, W, H, corner, 10)];

    /* نسبُ الإطار والخانات — كلُّها كسورٌ من ارتفاع اللوحة، ومجموعةٌ
     * في كائنٍ واحد ليسهل ضبطها على صورة لوحةٍ حقيقية. */
    var B = cfg.border || {};
    var bInset  = B.inset  !== undefined ? B.inset  : 0.018;   // من الطرف إلى الإطار
    var bRimW   = B.rimW   !== undefined ? B.rimW   : 0.016;   // سماكة الإطار
    var bPad    = B.pad    !== undefined ? B.pad    : 0.008;   // فراغ إضافي
    var bStroke = B.stroke !== undefined ? B.stroke : 0.016;   // سماكة خطّ الخانة
    var bGap    = B.gap    !== undefined ? B.gap    : 0.030;   // فراغ بين خانتين
    var bRadius = B.radius !== undefined ? B.radius : 0.20;    // تدوير زوايا الخانة
    /* grid  : شبكة بزوايا مدوّرة
     * sharp : الشبكة نفسها بزوايا قائمة
     * none  : بلا خطوط */
    var cellStyle = cfg.cellStyle || 'grid';
    var isGrid = cellStyle === 'grid' || cellStyle === 'sharp';
    var sharp = cellStyle === 'sharp';

    var rimInset = H * bInset;
    var rimW = H * bRimW;
    /* النقشُ مجموعاتٌ لا كومةً واحدة: الإطارُ مجموعة، والشبكةُ
     * مجموعة، وكلُّ سطرِ نصٍّ مجموعة. فلا يتداخل كشفُ ثقوبِ عنصرٍ
     * بعنصر — والنصُّ يقع داخل خانةِ الشبكة، ولو كُشفا معاً لقُرئ
     * الحرفُ جزيرةً في ثقب، فينكسر التثليث. */
    var inkGroups = [];
    var inkParts = [];    // نصّ وخطوط مسطّحة: تُقاس سماكتها
    var artParts = [];    // شعار ورموز: مجموعات، سماكتها مضمونة بالبناء

    function pushInk(contours) {
      if (!contours || !contours.length) return;
      inkGroups.push(contours);
      inkParts = inkParts.concat(contours);
    }

    /* لا إطارَ منفصلٌ عن الشبكة: خطُّ الشبكة الخارجيُّ هو إطارُ
     * اللوحة، كما في اللوحة الحقيقية — إطارٌ واحد لا إطاران. */

    // — المنطقة الداخلية —
    var pad = rimInset + H * bPad;
    var innerW = W - 2 * pad, innerH = H - 2 * pad;
    var cellStroke = Math.max(H * bStroke, 0.5);
    var gapX = H * bGap, gapY = H * bGap;

    /* في الشبكة تكون الخطوطُ هي الفراغَ بين الخانات، فتنكمش مساحةُ
     * التخطيط بسماكة الخطّ من كل جهة، ويصير الفاصلُ بين خانتين
     * سماكةَ الخطّ نفسها. وفي «الصناديق» يبقى الفراغُ فراغاً. */
    if (isGrid) { gapX = gapY = cellStroke; }
    var inset = isGrid ? cellStroke : 0;
    var layoutW = innerW - 2 * inset, layoutH = innerH - 2 * inset;

    // — الصفوف داخل عمود النصّ —
    var rowH = rows === 2 ? (layoutH - gapY) / 2 : layoutH;
    var rowY = rows === 2 ? [(rowH + gapY) / 2, -(rowH + gapY) / 2] : [0];
    // نصفُ قطر الزاوية على أصغر بُعدٍ في الخانة: الشريط ضيّقٌ فلو
    // قِيس على الارتفاع وحده لخرج معيَّناً لا مستطيلاً مدوّراً.
    /* «الزوايا القائمة» ليست صفراً تماماً بل تدويرٌ بعُشر مليمتر.
     * والسببُ عمليّ لا جماليّ: مثلّثُ three.js ينكسر على المستطيلات
     * الحادّة تماماً المتوازيةِ المحاور حين تُثقب بمستطيلاتٍ مثلها،
     * فتخرج حوافُّ مفتوحة. اختبرتُه: تدويرٌ بثلاثة أعشار المليمتر
     * يُصلحه، وهو دون ما تراه العين على لوحةٍ بطول ثلث متر. */
    function radiusFor(w, h) {
      var m = Math.min(w, h);
      return sharp ? Math.max(0.2, m * 0.004) : m * bRadius;
    }

    // — تجهيز النصوص —
    /* بلا تصفيةٍ ولا قصّ: يُكتب ما شاء صاحبُ اللوحة. ويُسقَط ما لا
     * رمزَ له في المجموعة فقط، لئلّا يظهر فراغٌ لا يُفسَّر. */
    function keepKnown(str, dict) {
      var o = '';
      for (var i = 0; i < str.length; i++) {
        if (dict[str[i]]) o += str[i];
        else if (str[i] === ' ') o += ' ';   // خانةٌ فارغة تُحفظ موضعاً
      }
      return o.replace(/\s+$/, '');
    }
    var G0 = global.KSA_GLYPHS;
    var digits = keepKnown(String(cfg.digits || ''), G0.la);
    var lettersAr = keepKnown(String(cfg.letters || ''), G0.ar);
    var visAr = visualOrder(lettersAr);
    var visLa = cfg.lettersLa !== undefined && cfg.lettersLa !== null && cfg.lettersLa !== ''
              ? keepKnown(String(cfg.lettersLa), G0.la) : toLatin(visAr);
    var digitsAr = cfg.digitsAr ? keepKnown(String(cfg.digitsAr), G0.ar)
                                : toArabicDigits(digits);

    /* حرفٌ عربيٌّ خارج السبعةَ عشرَ المعتمدة لا مقابلَ له، فيُترك
     * موضعُه فارغاً في الصفّ اللاتينيّ حتى يكتبه صاحبُ اللوحة. */
    var manualLa = cfg.lettersLa !== undefined && cfg.lettersLa !== null &&
                   cfg.lettersLa !== '';
    if (!manualLa && hasUnmapped(visAr) && rows === 2) {
      warnings.push('فيما كتبتَ حرفٌ خارج الحروف السبعةَ عشرَ المعتمدة، ' +
                    'ولا مقابلَ لاتينيَّ له — موضعُه في الصفّ اللاتينيِّ ' +
                    'فارغ. اكتب ما تريده في حقل «الصفّ اللاتينيّ»، أو ' +
                    'اطبع الصفَّ العربيَّ وحدَه.');
    }

    /** ما يُكتب في كل صفّ من عمود ما: [نصّ، أبجدية] */
    function rowText(kind, r) {
      var sc = rowScript[r] || 'la';
      if (kind === 'digits') {
        var ds = (r === 0 ? cfg.digitsTop : cfg.digitsBottom) || sc;
        return [ds === 'ar' ? digitsAr : digits, ds];
      }
      return [sc === 'ar' ? visAr : visLa, sc];
    }

    /* أربعُ خاناتٍ للأرقام وثلاثٌ للحروف كما في اللوحة الرسمية، وتزيد
     * إن كُتب أطول — فلا يُمنع من أرادها لافتةً أو زينة. */
    var SLOTS = { digits: 4, letters: 3 };
    for (var sr = 0; sr < rows; sr++) {
      SLOTS.digits = Math.max(SLOTS.digits, rowText('digits', sr)[0].length);
      SLOTS.letters = Math.max(SLOTS.letters, rowText('letters', sr)[0].length);
    }
    var cellH = rowH - 2 * cellStroke;       // كامل ارتفاع الخانة الصالح
    var textH = cellH * cfg.textFill;        // نطاقُ الصفّ
    var squeezeMin = cfg.squeezeMin > 0 ? Math.min(1, cfg.squeezeMin) : 0;

    /* عرضُ الرمز لكلِّ صنفٍ على حدة.
     *
     * وخطوطُ اللوحات تفعل ذلك: في FE-Schrift الألمانيِّ عرضُ الحرف
     * ٤٧٫٥ مم وعرضُ الرقم ٤٤٫٥ مم على ارتفاعٍ واحدٍ ٧٥ مم — أي أنّ
     * الحرفَ أعرضُ من الرقم بنحو ٦٫٧٪ وارتفاعُهما سواء. فالأصلُ هنا
     * ٠٫٨٠ للحروف و٠٫٧٥ للأرقام، وهما بتلك النسبة. */
    function fillFor(kind) {
      var v = kind === 'digits' ? cfg.glyphFillDigits : cfg.glyphFillLetters;
      if (v === undefined || v === null) v = cfg.glyphFill;
      return v > 0 ? v : 0.8;
    }
    var uniformGlyphs = cfg.uniformGlyphs === undefined || cfg.uniformGlyphs === null
                      ? 1 : cfg.uniformGlyphs;
    var padMin = H * 0.045;

    // — الأعمدة: مقاساتها ثابتة كما في اللوحة الحقيقية —
    var bandW = innerH * spec.bandW;
    var order = spec.order.slice();

    var fixedW = order.reduce(function (a, k) {
      return a + (k === 'band' ? bandW : 0);
    }, 0);
    var gaps = gapX * (order.length - 1);
    var textRoom = layoutW - fixedW - gaps;
    /* الأصلُ أن يتساوى عمودُ الأرقام وعمودُ الحروف. ومن أراد أحدَهما
     * أعرضَ — كما في بعض اللوحات — حرّك النسبةَ، فتُضرب في وزن
     * عمود الأرقام وحده ويقتسمان الباقي على وزنَيهما. */
    var colRatio = cfg.colRatio > 0 ? cfg.colRatio : 1;
    function weightOf(k) {
      if (k === 'band') return 0;
      return (spec.weight[k] || 1) * (k === 'digits' ? colRatio : 1);
    }
    var wsum = order.reduce(function (a, k) { return a + weightOf(k); }, 0);

    /* منفذٌ للقياس: المقاساتُ الداخليةُ لا تظهر في المخرَج، فلا تُراجَع.
     * ومن وضع مصفوفةً في __PLATE_DEBUG_COLS تُملأ له بها — وبه قيست
     * نسبةُ الشريط وقورنت بصور لوحاتٍ حقيقية. */
    if (global.__PLATE_DEBUG_COLS) {
      global.__PLATE_DEBUG_COLS.push({ W: W, layoutW: layoutW, innerH: innerH,
        bandW: bandW, gapX: gapX, textRoom: textRoom });
    }

    var x = -layoutW / 2;
    var cols = [];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      var cw = (k === 'band') ? bandW
             : textRoom * (weightOf(k) / Math.max(1e-6, wsum));
      cols.push({ kind: k, cx: x + cw / 2, w: cw });
      x += cw + gapX;
    }

    /* مواضعُ القصّ الممكنة: منتصفُ الفراغ بين عمودين.
     * واختيارُ هذه المواضع بعينها شرطٌ لا زينة: لا يعبرها حرفٌ ولا
     * شعار، فلا يُقَصّ إلّا محدَّب — وهو ما تضبطه خوارزميةُ القصّ. */
    var cutSpots = [];
    for (var ci = 0; ci < cols.length - 1; ci++) {
      cutSpots.push((cols[ci].cx + cols[ci].w / 2 + cols[ci + 1].cx - cols[ci + 1].w / 2) / 2);
    }

    // — رسم الأعمدة —
    var emblemArt = [];
    cols.forEach(function (c) {
      if (c.kind === 'band') {
        var bc = bandContent(c, innerH, spec, col, cfg);
        bc.ink.forEach(function (g) { pushInk(g); });
        artParts = artParts.concat(bc.art);
        emblemArt = emblemArt.concat(bc.emblem);
        return;
      }

      // عمود نصّ: خانة لكل صفّ، كما في اللوحة الحقيقية.
      // منطقةُ الشبكة ٨٤٪ من عرض الخانة — قِستُ على صورة لوحة حقيقية
      // أنّ «٢٠٣٠» تشغل نحو ٨١٪ من خانتها، فيبقى هامشٌ لا يلامس الإطار.
      var innerCellW = c.w * 0.84 - 2 * cellStroke;
      for (var r = 0; r < rows; r++) {
        if (cfg.blank) continue;
        var t = rowText(c.kind, r);
        /* النصُّ الموصول يترك شبكةَ الخانات: الكلمةُ وحدةٌ واحدة
         * تتوسّط المنطقة، لا رموزٌ كلٌّ في خانته.
         *
         * ويُوصل على **ترتيب القراءة** لا على الترتيب البصريّ: شكلُ
         * الحرف يتبع جارَيه في النطق، و`joinedWord` هي التي تكتب من
         * اليمين. ولو مُرِّر المقلوبُ لخرجت أشكالٌ لا تمتُّ للكلمة. */
        if (cfg.joinText && t[1] === 'ar' && c.kind === 'letters' &&
            lettersAr.length > 1) {
          joinedWord(lettersAr, c.cx, rowY[r], textH, innerCellW).forEach(pushInk);
        } else {
          pushInk(textSlots(t[0], t[1], c.cx, rowY[r], textH, innerCellW,
                            SLOTS[c.kind], fillFor(c.kind), uniformGlyphs,
                            cellH, squeezeMin));
        }
      }
    });

    /* أسلوب الشبكة: إطارٌ واحد يحيط بالمنطقة الداخلية كلّها، وفواصلُ
     * مستقيمة بين الأعمدة وبين الصفّين — كجدولٍ لا كصناديقَ منفصلة. */
    /* الشبكة تُبنى بالنفي لا بالجمع: شكلٌ واحد يغطّي المساحة الداخلية،
     * وثقوبُه هي الخاناتُ البيضاء. فما يبقى من مادّةٍ هو الإطارُ
     * والفواصلُ معاً، بخطٍّ واحدٍ متّصلٍ لا مستطيلاتٍ متلاصقة.
     *
     * وهذا ليس تجميلاً: رسمُها حلقةً وفواصلَ كان يُنتج تداخلاً رباعيَّ
     * المستويات — لوحةٌ، فحلقةٌ ثقبٌ فيها، فجزيرةٌ داخل الحلقة، ففاصلٌ
     * ثقبٌ في الجزيرة — فينكسر التثليثُ عند الحفر. وبالنفي لا يتجاوز
     * التداخلُ مستويين. */
    if (cfg.cellBorders && isGrid) {
      var panels = [], minR = Infinity;
      cols.forEach(function (c) {
        if (c.kind === 'band') {
          var rb = radiusFor(c.w, layoutH);
          minR = Math.min(minR, rb);
          panels.push(P.roundRect(c.cx, 0, c.w, layoutH, rb, 8));
        } else {
          for (var pr = 0; pr < rows; pr++) {
            var rp = radiusFor(c.w, rowH);
            minR = Math.min(minR, rp);
            panels.push(P.roundRect(c.cx, rowY[pr], c.w, rowH, rp, 8));
          }
        }
      });
      /* تدويرُ الإطار الخارجي يساوي تدويرَ الخانة زائدَ سماكة الخطّ،
       * فيبقى المنحنيان متوازيين. ولو زاد لانحنى الإطارُ إلى الداخل
       * عند الزاوية فخرجت الخانةُ منه وتقاطع الشكلان. */
      var gridR = Math.min(radiusFor(innerW, innerH), minR + inset);
      var gridShape = [P.roundRect(0, 0, innerW, innerH, gridR, 10)];

      if (cfg.innerLines === false) {
        /* إطارٌ وحده: ثقبٌ واحد يملأ الداخل، فيبقى الخطُّ الخارجيّ
         * ولا يبقى فاصلٌ بين خانة وخانة. */
        var one = P.roundRect(0, 0, innerW - 2 * cellStroke, innerH - 2 * cellStroke,
                              Math.max(0.2, gridR - cellStroke), 10);
        one.reverse();
        gridShape.push(one);
      } else {
        panels.forEach(function (pc) { gridShape.push(pc.slice().reverse()); });
      }
      pushInk(gridShape);
    }

    // — ثقوب البراغي —
    var baseHoles = [];
    if (cfg.screwHoles) {
      var sr = cfg.screwDiameter / 2;
      var spots = [];
      var textCols = cols.filter(function (c) { return c.kind === 'digits' || c.kind === 'letters'; });
      if (rows === 2) {
        textCols.forEach(function (c) { spots.push([c.cx, rowY[0] + rowH * 0.30]); });
      } else {
        textCols.forEach(function (c) { spots.push([c.cx, 0]); });
      }
      spots.forEach(function (p) {
        var cc = P.circle(p[0], p[1], sr, 24);
        cc.reverse();
        baseHoles.push(cc);
      });
    }

    var baseOutline = outline.concat(baseHoles);

    // — المغانط: القاعدة تُشطر شطرين ليتكوّن تجويف أعمى من الخلف —
    var magRecess = cfg.magnet && cfg.magnetThickness > 0 &&
                    cfg.magnetThickness < tBase - 0.6;
    if (cfg.magnet && !magRecess) {
      warnings.push('تجويف المغناطيس يحتاج قاعدة أسمك من ' +
                    (cfg.magnetThickness + 0.6).toFixed(1) + ' مم — عُطِّل التجويف.');
    }

    var cuts = [];

    /* القاعدة تُبنى طبقاتٍ بين z=0 و z=tBase. كلُّ ميزةٍ تحفر تعلن
     * مداها وثقوبها، ثم يُقسّم المدى عند كل حدٍّ وتُجمع ثقوبُ ما
     * يغطّي كلَّ طبقة. هكذا تجتمع المغانطُ وفتحةُ التعليق والحفرُ
     * في قاعدةٍ واحدة بلا أي عملية منطقية، وكلُّ طبقةٍ مجسّمٌ مغلق. */
    if (magRecess) {
      cuts.push({ from: 0, to: cfg.magnetThickness + 0.2,
        holes: magnetPositions(W, H, cfg.magnetCount).map(function (p) {
          var cc = P.circle(p[0], p[1], cfg.magnetDiameter / 2 + 0.15, 28);
          cc.reverse();
          return cc;
        }) });
    }

    // فتحةُ التعليق على الجدار: محفورةٌ في ظهر اللوحة لا كتلةٌ خلفها
    if (cfg.wallMount) {
      var wd = Math.min(cfg.wallDepth, tBase - 1.2);
      if (wd < 1.2) {
        warnings.push('فتحة التعليق تحتاج قاعدة أسمك من ' +
                      (cfg.wallDepth + 1.2).toFixed(1) + ' مم — عُطِّلت.');
      } else {
        var khR = Math.max(3.0, H * 0.035);
        var khY = H * 0.30;
        var spots = cfg.wallCount === 2
          ? [[-W * 0.28, khY], [W * 0.28, khY]]
          : [[0, khY]];
        cuts.push({ from: 0, to: wd, holes: spots.map(function (p) {
          var k = keyhole(p[0], p[1], khR, khR * 0.45, khR * 2.2).through[0];
          if (P.area(k) > 0) k.reverse();
          return k;
        }) });
      }
    }

    /* التقسيم: أيُّ المواضع تجعل كلَّ قطعةٍ تسع المنصّة؟
     * تُجرَّب قطعةٌ واحدة فقطعتان فثلاث، ويؤخذ أقلُّ عددٍ يكفي. */
    var cutXs = [];
    if (cfg.split && cfg.bed && cfg.bed.w) {
      var room = cfg.bed.w - 8;
      var best = null;
      for (var k = 1; k <= cutSpots.length && !best; k++) {
        var combos = k === 1 ? cutSpots.map(function (x) { return [x]; })
                  : [cutSpots.slice(0, 2)];
        for (var q = 0; q < combos.length; q++) {
          var xs = combos[q].slice().sort(function (a, b) { return a - b; });
          var edges = [-W / 2].concat(xs, [W / 2]);
          var widest = 0;
          for (var e = 0; e < edges.length - 1; e++) {
            widest = Math.max(widest, edges[e + 1] - edges[e]);
          }
          if (widest <= room && (!best || widest < best.widest)) {
            best = { xs: xs, widest: widest };
          }
        }
      }
      if (best) {
        cutXs = best.xs;
        /* هل تجتمع القطعُ على منصّةٍ واحدة؟ قطعتان عرضُ كلٍّ منهما
         * سبعون في المئة من المنصّة لا تجتمعان صفّاً ولا عموداً.
         * وهذا ليس عيباً بل واقعُ لوحةٍ بطول ثلث متر. */
        var nP = best.xs.length + 1;
        if (W + (nP - 1) * 5 > cfg.bed.w - 8 && nP * H + (nP - 1) * 5 > cfg.bed.h - 8) {
          warnings.push('القطع لا تجتمع على منصّة واحدة — اطبعها على ' + nP +
                        ' دفعات: احذف ما عدا قطعةً في السلايسر كلَّ مرّة.');
        }
      }
      else warnings.push('تعذّر تقسيمُ اللوحة على مواضع الخانات بما يسع المنصّة — صغّر المقاس.');
      if (H > cfg.bed.h - 8) {
        warnings.push('ارتفاع اللوحة ' + H.toFixed(0) + ' مم يتجاوز عمق المنصّة — القسمة الأفقية غير مدعومة بعد.');
      }
    }

    // تجويفُ لوح الوصل في ظهر اللوحة عند كل موضع قصّ
    var spliceW = Math.min(W * 0.14, 48);
    var spliceH = innerH * 0.55;
    var spliceDepth = Math.min(cfg.spliceDepth || 1.2, tBase * 0.45);
    if (cutXs.length && spliceDepth >= 0.6) {
      cuts.push({ from: 0, to: spliceDepth, holes: cutXs.map(function (x) {
        var r = P.roundRect(x, 0, spliceW, spliceH, Math.min(spliceW, spliceH) * 0.12, 6);
        r.reverse();
        return r;
      }) });
    }

    if (engraved) {
      var dpt = Math.min(cfg.reliefHeight, tBase - 0.8);
      if (dpt < cfg.reliefHeight) {
        warnings.push('عمق الحفر حُدّ بـ ' + dpt.toFixed(1) +
                      ' مم ليبقى تحت النقش جدارٌ لا يقلّ عن ٠٫٨ مم.');
      }
      var carve = inkParts.concat(flatten(artParts)).concat(flatten(emblemArt))
                    .map(function (c) { return P.area(c) > 0 ? c.slice().reverse() : c; });
      cuts.push({ from: tBase - dpt, to: tBase, holes: carve });
    }

    // حدود الطبقات
    var marks = [0, tBase];
    cuts.forEach(function (c) { marks.push(c.from, c.to); });
    marks = marks.filter(function (v) { return v >= 0 && v <= tBase; })
                 .sort(function (a, b) { return a - b; })
                 .filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-4; });

    var NAMES = ['القاعدة (خلف)', 'القاعدة (وسط)', 'القاعدة (أمام)', 'القاعدة'];
    for (var li = 0; li < marks.length - 1; li++) {
      var z0 = marks[li], z1 = marks[li + 1];
      var mid = (z0 + z1) / 2, holes = [];
      cuts.forEach(function (c) {
        if (mid > c.from && mid < c.to) holes = holes.concat(c.holes);
      });
      var nm = marks.length === 2 ? 'القاعدة'
             : (li === 0 ? NAMES[0] : (li === marks.length - 2 ? NAMES[2] : NAMES[1]));
      add('base_' + li, nm, 'base', baseOutline.concat(holes), z0, z1, col.base);
    }

    if (!engraved) {
      add('ink', 'النقش البارز', 'ink', inkParts, zTop, zInk, inkColor, inkGroups);
      add('ink_art', 'الشعار والرموز', 'ink', flatten(artParts), zTop, zInk, inkColor, artParts);
      // الشعار جزءٌ مستقلّ بلونه وارتفاعه — ليُطبع ذهبياً مثلاً
      if (emblemArt.length) {
        add('emblem', 'الشعار', 'logo', flatten(emblemArt), zTop,
            tBase + cfg.logoHeight, cfg.logoColor, emblemArt);
      }
    }

    // — لسان حلقة المفاتيح —
    if (cfg.keyring) {
      var rIn = Math.max(1.0, cfg.keyringHole / 2);
      var rOut = Math.max(rIn + 1.6, H * (cfg.keyringSize || 0.075));
      var pos = KEYRING_POS[cfg.keyringPos] || KEYRING_POS.topRight;
      var kx = (W / 2 + rOut * 0.45) * pos[0];
      var ky = pos[1] === 0 ? 0 : (H / 2 - rOut * 1.1) * pos[1];
      if (pos[2] === 'v') { kx = 0; ky = (H / 2 + rOut * 0.45) * pos[1]; }
      var hole = P.circle(kx, ky, rIn, 20); hole.reverse();
      // الحلقة والوصلة مجموعتان: تراكبهما مقصود، ولو كُشفت ثقوبهما
      // معاً لقُرئ موضعُ التراكب ثقباً وانفتحت حوافُّ المجسّم.
      var link = pos[2] === 'v'
        ? P.roundRect(kx, ky - rOut * 0.9 * pos[1], rOut * 1.3, rOut * 1.8, rOut * 0.3, 4)
        : P.roundRect(kx - rOut * 0.9 * pos[0], ky, rOut * 1.8, rOut * 1.3, rOut * 0.3, 4);
      var ringGroups = [[P.circle(kx, ky, rOut, 28), hole], [link]];
      add('keyring', 'لسان الحلقة', 'base', flatten(ringGroups), 0, tBase, col.base, ringGroups);
      if (rOut - rIn < 1.5) {
        warnings.push('جدار حلقة المفاتيح ' + (rOut - rIn).toFixed(1) +
                      ' مم — كبّر الحلقة أو صغّر ثقبها.');
      }
    }

    // — ثقب تعليق المرآة —
    if (cfg.mirrorHole) {
      var mr = Math.max(2.2, H * 0.05), mrIn = Math.min(1.5, mr * 0.45);
      var myc = H / 2 + mr * 0.5;
      var th = P.circle(0, myc, mrIn, 18); th.reverse();
      var tabGroups = [
        [P.circle(0, myc, mr, 24), th],
        [P.roundRect(0, myc - mr * 0.7, mr * 1.7, mr * 1.4, mr * 0.3, 4)]
      ];
      add('mirror', 'لسان التعليق', 'base', flatten(tabGroups), 0, tBase, col.base, tabGroups);
    }

    // — حارس التفاصيل —
    // يُقاس النصّ والخطوط فقط: الأشكال الفنّية متداخلة عمداً،
    // وتقاطعها يقرأ صفراً في أي قياس لا يوحّد المجسّمات أولاً.
    var minF = minFeature(inkParts, Math.max(2, cfg.nozzle * 8));
    var need = cfg.nozzle * 2;

    // الشعار الرسمي مرسومٌ لا مبنيّ، فلا سبيل إلى تغليظ أطرافه.
    // يُقاس على حدة ويُبلَّغ به، ليُعرف أن الشعار — لا النصّ — هو
    // ما سيضيع إن صغُرت اللوحة.
    if (emblemArt.length) {
      var minE = minFeature(flatten(emblemArt), Math.max(1.5, cfg.nozzle * 6), true);
      if (isFinite(minE) && minE < cfg.nozzle) {
        warnings.push('أدقّ خطوط الشعار ' + minE.toFixed(2) + ' مم — دون قطر النوزل، ' +
                      'فستسقط في الطباعة. والشعار يبقى مقروءاً؛ ومن أراد تفاصيله ' +
                      'كاملةً كبّر اللوحة أو أخفى «السعودية» و KSA ليكبر الشعار.');
      }
    }

    // المنصّة: لوحةٌ بطول ثلث متر لا تسع منصّةَ ٢٥٦ مم
    // لا يُكرَّر التحذير إن كانت القسمةُ مفعّلة: لها تحذيرُها
    if (cfg.bed && cfg.bed.w && !cutXs.length) {
      if (W > cfg.bed.w - 2 || H > cfg.bed.h - 2) {
        warnings.push('اللوحة ' + W.toFixed(0) + '×' + H.toFixed(0) +
                      ' مم لا تسع منصّة ' + cfg.bed.w + '×' + cfg.bed.h +
                      ' مم. صغّر المقاس، أو اقطعها في السلايسر، أو اطبعها على مراحل.');
      }
    }

    if (isFinite(minF) && minF < need) {
      warnings.push('أنحف تفصيل في النقش ' + minF.toFixed(2) + ' مم، وهو دون ضعف النوزل (' +
                    need.toFixed(2) + ' مم). كبّر المقاس أو استخدم نوزل أصغر.');
    }

    // ——— التقسيم: كلُّ جزءٍ يُقَصّ على شريحة قطعته ———
    var pieces = null;
    if (cutXs.length) {
      var edges2 = [-W / 2 - 1].concat(cutXs, [W / 2 + 1]);
      pieces = [];
      var split = [];
      /* فراغٌ بين القطع: يُظهر موضعَ القصّ في المعاينة، ويمنع
       * التصاقَ قطعتين على المنصّة فيقرأهما السلايسر جسماً واحداً. */
      var PGAP = Math.max(3, W * 0.01);
      for (var pi = 0; pi < edges2.length - 1; pi++) {
        var x0 = edges2[pi], x1 = edges2[pi + 1];
        var shift = pi * PGAP;
        var px0 = Math.max(x0, -W / 2), px1 = Math.min(x1, W / 2);
        pieces.push({ index: pi, x0: px0 + shift, x1: px1 + shift,
                      w: px1 - px0, h: H, shift: shift });
        for (var pj = 0; pj < parts.length; pj++) {
          var src = parts[pj];
          var groups = src.groups || [src.contours];
          var ng = [], flat = [];
          for (var gi2 = 0; gi2 < groups.length; gi2++) {
            /* الخارجيُّ يُقَصّ على خطّ القصّ تماماً، وكلُّ مستوى
             * تداخلٍ بعده يُسحب عنه شعرةً زائدة. وإلّا التقى مستويان
             * على الخطّ نفسه — ثقبٌ يلامس حدَّه، أو جزيرةٌ تلامس
             * ثقبَها — وهي حالةٌ ينكسر عندها التثليث. والشعرةُ خمسةُ
             * أجزاءٍ من مئة من المليمتر: دون النوزل بثمانية أضعاف،
             * يوحّدها السلايسر ولا تراها العين. */
            var g2 = groups[gi2];
            var dep = nestDepth(g2);
            var EPSC = 0.05;
            var cg = [];
            for (var cj = 0; cj < g2.length; cj++) {
              var e2 = dep[cj] * EPSC;
              var clipped = P.clipToSlab(g2[cj], x0 + e2, x1 - e2);
              if (clipped) cg.push(clipped);
            }
            if (cg.length) { ng.push(cg); flat = flat.concat(cg); }
          }
          if (!flat.length) continue;
          if (shift) {
            ng = ng.map(function (g3) { return P.place(g3, 1, 1, shift, 0); });
            flat = [];
            for (var fi = 0; fi < ng.length; fi++) flat = flat.concat(ng[fi]);
          }
          split.push({ id: src.id + '_p' + pi, name: src.name + ' — قطعة ' + (pi + 1),
                       role: src.role, contours: flat, groups: ng,
                       z0: src.z0, z1: src.z1, color: src.color, piece: pi });
        }
      }

      // ألواحُ الوصل: تُطبع منفصلةً وتُلصق في تجويف الظهر
      if (spliceDepth >= 0.6) {
        var sy = -H / 2 - spliceH / 2 - Math.max(8, H * 0.08);
        for (var si = 0; si < cutXs.length; si++) {
          var cl = cfg.spliceClearance || 0.25;
          var pl = [P.roundRect(cutXs[si] + (si + 0.5) * PGAP, sy,
                                spliceW - 2 * cl, spliceH - 2 * cl,
                                Math.min(spliceW, spliceH) * 0.12, 6)];
          split.push({ id: 'splice_' + si, name: 'لوح وصل ' + (si + 1), role: 'base',
                       contours: pl, groups: [pl], z0: 0, z1: spliceDepth - 0.15,
                       color: col.base, piece: 'splice' });
        }
      }
      parts = split;
    }

    return {
      w: W, h: H, scale: S, spec: spec, color: col, pieces: pieces, cutXs: cutXs,
      parts: parts, warnings: warnings, minFeature: minF,
      engraved: cfg.engrave === true,
      totalThickness: cfg.engrave ? tBase : zInk,
      text: { digits: digits, lettersAr: lettersAr, visAr: visAr, visLa: visLa, digitsAr: digitsAr }
    };
  }

  // ————— مساعدات —————

  function magnetPositions(W, H, n) {
    if (n <= 1) return [[0, 0]];
    if (n === 2) return [[-W * 0.26, 0], [W * 0.26, 0]];
    return [[-W * 0.28, -H * 0.24], [W * 0.28, -H * 0.24],
            [-W * 0.28, H * 0.24], [W * 0.28, H * 0.24]];
  }

  /** فتحة تعليق على شكل ثقب مفتاح */
  function keyhole(cx, cy, rBig, rSmall, len) {
    var pts = [];
    var i;
    for (i = 0; i <= 20; i++) {
      var a = Math.PI / 2 + Math.PI * i / 20;
      pts.push({ x: cx + rBig * Math.cos(a), y: cy + len / 2 + rBig * Math.sin(a) });
    }
    for (i = 0; i <= 20; i++) {
      var b = -Math.PI / 2 + Math.PI * i / 20;
      pts.push({ x: cx + rSmall * Math.cos(b), y: cy - len / 2 + rSmall * Math.sin(b) });
    }
    pts.reverse();
    return { through: [pts] };
  }

  /** عمقُ تداخل كل كنتور داخل مجموعته: صفرٌ للخارجي فما فوق */
  function nestDepth(contours) {
    var boxes = contours.map(function (c) { return P.bbox([c]); });
    return contours.map(function (c, i) {
      var probe = c[0], d = 0;
      for (var j = 0; j < contours.length; j++) {
        if (i === j) continue;
        var b = boxes[j];
        if (probe.x < b.x0 || probe.x > b.x1 || probe.y < b.y0 || probe.y > b.y1) continue;
        if (P.pointInContour(probe, contours[j])) d++;
      }
      return d;
    });
  }

  /** قاعدة الزوج والفرد: هل النقطة داخل مادّة الأشكال؟ */
  function insideAll(x, y, contours) {
    var crossings = 0;
    for (var i = 0; i < contours.length; i++) {
      var c = contours[i];
      for (var a = 0, b = c.length - 1; a < c.length; b = a++) {
        var ya = c[a].y, yb = c[b].y;
        if ((ya > y) !== (yb > y)) {
          var xx = (c[b].x - c[a].x) * (y - ya) / (yb - ya) + c[a].x;
          if (x < xx) crossings++;
        }
      }
    }
    return (crossings % 2) === 1;
  }

  /** يلائم كنتورات داخل صندوق مع حفظ النسبة */
  function fitContours(contours, cx, cy, maxW, maxH) {
    var b = P.bbox(contours);
    if (!b || b.w === 0 || b.h === 0) return [];
    var s = Math.min(maxW / b.w, maxH / b.h);
    var dx = cx - (b.x0 + b.w / 2) * s, dy = cy - (b.y0 + b.h / 2) * s;
    return P.place(contours, s, s, dx, dy);
  }

  /**
   * أنحف تفصيل فعلي: أصغر سماكة جدار وأصغر فجوة بين شكلين.
   *
   * نقطتان على الكنتور نفسه لا تدلّان على جدار رقيق إلّا إذا كان
   * الطريق بينهما على المحيط أطول بكثير من المسافة المستقيمة —
   * وإلّا فهما نقطتان متجاورتان على منحنى أملس. النسبة هنا ٣ أضعاف،
   * وهي خالية من وحدة القياس فتصحّ في كل المقاسات.
   *
   * الحساب على شبكة مكانية لا بمقارنة الجميع بالجميع، لأن النقش
   * يتجاوز ستة آلاف نقطة والمعاينة تُعاد مع كل حركة منزلق.
   */
  function minFeature(contours, limit, sameOnly) {
    if (!contours || !contours.length) return Infinity;
    limit = limit || 5;
    var cell = limit, pts = [];

    var EPS = 1e-6;
    for (var i = 0; i < contours.length; i++) {
      // تنظيف النقاط المكرّرة: نقطة الإغلاق المعادة تُقرأ جداراً بسماكة صفر
      var raw = contours[i], c = [];
      for (var r = 0; r < raw.length; r++) {
        var prev = c[c.length - 1];
        if (prev && Math.abs(prev.x - raw[r].x) < EPS && Math.abs(prev.y - raw[r].y) < EPS) continue;
        c.push(raw[r]);
      }
      while (c.length > 1 && Math.abs(c[0].x - c[c.length - 1].x) < EPS &&
                             Math.abs(c[0].y - c[c.length - 1].y) < EPS) c.pop();
      if (c.length < 3) continue;

      var acc = 0, arc = new Array(c.length);
      for (var j = 0; j < c.length; j++) {
        arc[j] = acc;
        var n = c[(j + 1) % c.length];
        acc += Math.hypot(n.x - c[j].x, n.y - c[j].y);
      }
      for (var k = 0; k < c.length; k++) {
        pts.push({ x: c[k].x, y: c[k].y, ci: i, s: arc[k], per: acc });
      }
    }

    var grid = Object.create(null);
    function keyOf(x, y) { return Math.floor(x / cell) + ':' + Math.floor(y / cell); }
    for (var p = 0; p < pts.length; p++) {
      var kk = keyOf(pts[p].x, pts[p].y);
      (grid[kk] || (grid[kk] = [])).push(p);
    }

    var best = limit * limit;
    for (var a = 0; a < pts.length; a++) {
      var pa = pts[a];
      var gx = Math.floor(pa.x / cell), gy = Math.floor(pa.y / cell);
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        var bucket = grid[(gx + ox) + ':' + (gy + oy)];
        if (!bucket) continue;
        for (var bi = 0; bi < bucket.length; bi++) {
          var b = bucket[bi];
          if (b <= a) continue;
          var pb = pts[b];
          var dx = pa.x - pb.x, dy = pa.y - pb.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= best) continue;
          if (pa.ci === pb.ci) {
            var ds = Math.abs(pa.s - pb.s);
            var arcSep = Math.min(ds, pa.per - ds);
            if (arcSep < 3 * Math.sqrt(d2)) continue;   // جاران على منحنى، لا جدار رقيق
          } else if (sameOnly) {
            // في الشعار: نخلةٌ تكاد تلامس سيفاً تراكبٌ مقصود يلتحم
            // عند الطباعة، لا فجوةٌ تضيع. فلا يُقاس إلّا جدارُ كل
            // شكلٍ في نفسه.
            continue;
          }
          // الفيصل: منتصف المسافة. الجدار الرقيق منتصفه مادّة،
          // وزاوية الحرف الحادّة أو فجوة بين شكلين منتصفها فراغ.
          if (!insideAll((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, contours)) continue;
          best = d2;
        }
      }
    }
    var v = Math.sqrt(best);
    return v >= limit ? Infinity : v;
  }

  global.PlateLayout = {
    TYPES: TYPES, COLORS: COLORS, LETTERS_AR: LETTERS_AR,
    PLATE_LETTERS: PLATE_LETTERS, shapeArabic: shapeArabic,
    build: build, toLatin: toLatin, toArabicDigits: toArabicDigits,
    visualOrder: visualOrder, fitContours: fitContours,
    textContours: textContours, wordContours: wordContours,
    /* حارسُ التفاصيل يُصدَّر ليُقاس به كلُّ جزءٍ على حدة من خارج
     * المحرّك: التحذيرُ يقول «الشعار» جملةً، والعلاجُ يحتاج الرقمَ
     * للشعار وللكلمة ولخطوط الخانات كلٍّ على انفراد. */
    minFeature: minFeature
  };

  // ————— محتوى الشريط —————
  /**
   * يعيد {ink, art, emblem}.
   *   ink    : مجموعاتُ نصٍّ تُقاس (K S A في الشريط الطويل)
   *   art    : كلمة «السعودية» ورمزُ النوع — مجموعات، تراكبها مقصود
   *   emblem : النخلة والسيفان أو الشعار المرفوع — جزءٌ بلونه وارتفاعه
   *
   * في العادية الشريطُ على اليمين: شعار · السعودية · K S A مركومة ·
   * رمزُ النوع. وفي الطويلة والرياضية الشريطُ في الوسط: شعارٌ كبير
   * وتحته السعودية و KSA، أو الشعارُ وحده إن أُخفيت الكلمتان.
   */
  function bandContent(cell, innerH, spec, col, cfg) {
    var ink = [], art = [], emblem = [];
    var w = cell.w, cx = cell.cx;
    /* عرضُ ما يُكتب في الشريط.
     *
     * رُفع مرّةً إلى ٠٫٩٤ ليغلُظ خطُّ «السعودية»: كان أنحفُه ٠٫٥٧ مم،
     * فوق الفوهة ودون ضِعفها، فيُطبع جداراً واحداً هشّاً. فبلغ ٠٫٦٧
     * حين كبرت الكلمة.
     *
     * ثمّ رآها صاحبُ الأداة على الشاشة فاستكبرها وأمر بردّها. وهو
     * صاحبُ الشكل. والغلظُ يُدرك بغير التكبير: يُغلَّظ رسمُ الكلمة
     * نفسِه كما غُلّظ الشعار في emblem-print.js. */
    var usableW = w * 0.82;
    var top = innerH / 2 - innerH * 0.06;
    var bot = -innerH / 2 + innerH * 0.06;
    var span = top - bot;
    var words = cfg.bandWords !== false;
    /* نصُّ الشريط حرّ: «السعودية» و KSA أصلٌ لا حدّ. */
    var bandAr = cfg.bandTextAr === undefined || cfg.bandTextAr === null
               ? 'السعودية' : String(cfg.bandTextAr);
    var bandLa = cfg.bandTextLa === undefined || cfg.bandTextLa === null
               ? 'KSA' : String(cfg.bandTextLa).toUpperCase();

    function artwork(ccx, ccy, mw, mh) {
      if (cfg.logo === 'custom' && cfg.logoContours && cfg.logoContours.length) {
        return fitContours(cfg.logoContours, ccx, ccy, mw, mh)
                 .map(function (c) { return [c]; });
      }
      return crestFitted(ccx, ccy, mw, mh);
    }

    if (spec.bandStyle === 'tall') {
      var yc = top;
      var hCrest = span * 0.26;
      emblem = emblem.concat(artwork(cx, yc - hCrest / 2, usableW, hCrest));
      yc -= hCrest + span * 0.035;

      if (words && bandAr) {
        // قامةُ «السعودية» في الشريط — أُعيدت إلى ما كانت بأمر صاحبها
        var hWord = span * 0.075;
        art = art.concat(bandWord(bandAr, cx, yc - hWord / 2, hWord, usableW));
        yc -= hWord + span * 0.05;
      }

      var symH = col.symbol === 'none' ? 0 : span * 0.11;
      if (words && bandLa) {
        /* الحروفُ اللاتينية على الشريط الطويل تُركَّب رأسياً حرفاً
         * فوق حرف، فيتّسع لها الشريطُ الضيّق. وعددُها يتبع ما يُكتب. */
        var ksaSpan = (yc - bot) - (symH ? symH + span * 0.05 : 0);
        var letters = bandLa.split('');
        var lh = ksaSpan / letters.length;
        for (var i = 0; i < letters.length; i++) {
          ink.push(textContours(letters[i], 'la', cx, yc - lh * (i + 0.5),
                              lh * 0.74, usableW * 0.9, 0).contours);
        }
      }
      if (symH) art = art.concat(global.Emblem.typeSymbol(col.symbol, cx, bot + symH / 2, symH / 2)
                                   .map(function (c) { return [c]; }));
    } else {
      // كتلةٌ واحدة موسّطة رأسياً: الشريط أطولُ من محتواه بكثير
      /* اللوحةُ الطويلةُ الحقيقية تحمل رمزَ النوع أسفلَ شريطها كما
       * تحمله العادية — دائرةً للخاصّة ومثلثاً للأجرة — والرياضيةُ
       * لا تحمله. فيُضبط بالنوع لا بالأسلوب. */
      var wantSym = spec.bandSymbol && col.symbol !== 'none';
      if (!words) {
        var hOnly = wantSym ? span * 0.62 : span * 0.86;
        emblem = emblem.concat(artwork(cx, wantSym ? span * 0.10 : 0, usableW, hOnly));
        if (wantSym) {
          var sr0 = Math.min(usableW * 0.21, span * 0.07);
          art = art.concat(global.Emblem.typeSymbol(col.symbol, cx, bot + sr0 * 1.6, sr0)
                             .map(function (c) { return [c]; }));
        }
      } else {
        var hc = Math.min(usableW * 0.98, span * (wantSym ? 0.40 : 0.52));
        var hw = hc * 0.20;
        var hk = hc * 0.26;
        var g1 = hc * 0.10, g2 = hc * 0.09;
        var hs = wantSym ? hc * 0.30 : 0;
        var g3 = wantSym ? hc * 0.16 : 0;
        var total = hc + g1 + hw + g2 + hk + g3 + hs;
        var y = total / 2;

        emblem = emblem.concat(artwork(cx, y - hc / 2, usableW, hc));
        y -= hc + g1;
        if (bandAr) art = art.concat(bandWord(bandAr, cx, y - hw / 2, hw, usableW));
        y -= hw + g2;
        if (bandLa) {
          ink.push(textContours(bandLa, 'la', cx, y - hk / 2, hk, usableW, 0.06).contours);
        }
        y -= hk + g3;
        if (wantSym) {
          art = art.concat(global.Emblem.typeSymbol(col.symbol, cx, y - hs / 2, hs / 2)
                             .map(function (c) { return [c]; }));
        }
      }
    }
    return { ink: ink, art: art, emblem: emblem };
  }

  /**
   * الشعار الرسمي ملائماً للصندوق.
   *
   * مرسومٌ رسمياً لا مبنيّاً، فلا سبيل إلى تغليظ أطرافه كما كان في
   * الشعار السابق. ولهذا يُقاس أنحفُ تفصيلٍ فيه بعد التصغير ويُبلَّغ
   * به، ليعرف صاحبُه أن الشعار — لا النصّ — هو ما سيضيع في الطباعة.
   */
  function crestFitted(cx, cy, maxW, maxH) {
    var raw = global.KSA_EMBLEM;
    if (!raw || !raw.length) return [];
    var out = fitContours(raw, cx, cy, maxW, maxH).map(function (c) { return [c]; });

    /* ——— نسخةُ الطباعة ———
     *
     * كان يُقال: الشعارُ مرسومٌ لا مبنيّ فلا سبيل إلى تغليظ أطرافه،
     * فيُقاس ويُبلَّغ به ويُترك. وقد طبع صاحبُ الأداة لوحةً فقال:
     * «الشعار لم يكن واضحاً، وفي المناطق الصغيرة يفقد الشكل» —
     * فالتبليغُ وحدَه لا يكفي.
     *
     * وله سبيل: يُرسَم في شبكةٍ عالية الدقّة، فيُغلق حتى تلتحم
     * الفجواتُ التي أضيقُ من الفوهة، ثمّ يُمدَّد حتى يبلغ أنحفُه
     * الفوهةَ، ثمّ يُعاد تتبّعُه. وذاك في وقت البناء لا في الحين —
     * ونتيجتُه في emblem-print.js.
     *
     * فإن كان الأصلُ يفوت الفوهةَ عند هذا المقاس أُخذت نسخةُ الطباعة،
     * وإلّا فالأصلُ أدقُّ ويبقى. */
    if (!global.KSA_EMBLEM_PRINT) return out;
    var nz = _crestNozzle || 0.4;
    var flat = [];
    out.forEach(function (g) { flat = flat.concat(g); });
    var thin = minFeature(flat, Math.max(1.5, nz * 6), true);
    if (isFinite(thin) && thin < nz) {
      out = fitContours(global.KSA_EMBLEM_PRINT, cx, cy, maxW, maxH)
              .map(function (c) { return [c]; });
    }
    return out;
  }

  /* قطرُ الفوهة يبلغ رسّامَ الشعار من البناء: هو وحده ما يقرّر
   * أيَّ النسختين تُؤخذ، ولا يمرُّ عبر توقيع الدالّة لأنّها تُنادى
   * من مواضعَ شتّى. */
  var _crestNozzle = 0.4;
})(typeof window !== 'undefined' ? window : globalThis);
