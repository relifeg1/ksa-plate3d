/* الواجهة والمعاينة والتصدير */
(function () {
  'use strict';

  var L = window.PlateLayout, P = window.SvgPath, G = window.PlateGeometry, X = window.PlateExport;
  var $ = function (id) { return document.getElementById(id); };

  // ————————————————————————————————————————
  //  الحالة
  // ————————————————————————————————————————
  var state = {
    type: 'standard',
    color: 'white',
    blank: false,
    digits: '6251',
    letters: 'احع',          // ترتيب القراءة العربي
    lettersLa: '', digitsAr: '',
    rowTop: 'ar',            // ar | la
    rowBottom: 'la',         // ar | la | none
    digitsTop: '',           // فارغ = يتبع صفَّه
    digitsBottom: '',
    joinText: false,         // وصلُ الحروف العربية كلمةً
    bandTextAr: '', bandTextLa: '',   // فارغ = «السعودية» و KSA
    colRatio: 1,             // عرض خانة الأرقام إلى خانة الحروف
    glyphScaleLetters: 1,    // مقبضٌ حرٌّ يضرب في حجم الحرف بعد الحدود
    glyphScaleDigits: 1,     // ومثلُه للرقم
    baseColor: '#F2F2EE', symbol: 'circle',
    targetWidth: 335,
    baseThickness: 3,
    reliefHeight: 1,
    nozzle: 0.4,
    innerLines: true,
    cellStyle: 'grid',       // grid | sharp | none
    inkColor: '#111111',
    extruders: { base: 1, ink: 2, logo: 3 },
    lineWeight: 0.016,       // سماكة خطّ الخانة نسبةً إلى الارتفاع
    innerStroke: 0.6,        // نحافةُ الفاصل بين خانتين إلى الإطار
    cornerRadius: 0.20,      // تدوير زوايا الخانة
    machine: 'p1s',
    settingsTemplate: null,  // إعدادات مشروع حقيقيّ تُدمج فيها الألوان
    /* النطاقُ صار ارتفاعَ جسم الحرف لا ارتفاعَ الرمز بغلافه، فيُفسح
     * للإعجام من الخانة. و٠٫٥٨ أكبرُ ممّا كان يناله الحرفُ المعجَم
     * (٠٫٤٥ عند «ب») وأصغرُ ممّا كان يناله الأعزل (٠٫٦٨). */
    /* ارتفاعُ الخطّ نسبةً من ارتفاع الخانة. كان ٠٫٥٨ ولا أثرَ له:
     * النطاقُ كان محكوماً بحجزٍ لأبجدية الخطّ كلِّها لا به. ولمّا
     * حُصر الحجزُ في حروف اللوحة صار المنزلقُ يعمل، ويشبع عند ٠٫٦٦
     * حيث يبلغ الحبرُ ٠٫٦٧ من الخانة — وهو قياسُ اللوحة الحقيقية. */
    textFill: 0.72,
    logo: 'crest',           // crest | custom
    bandWords: true,         // إظهار «السعودية» و KSA تحت الشعار
    /* عرضُ الرمز في خانته — لكلِّ صنفٍ منزلِقُه. والنسبةُ الافتراضية
     * من FE-Schrift: الحرفُ ٤٧٫٥ مم والرقمُ ٤٤٫٥ على ارتفاعٍ واحد. */
    glyphFillLetters: 0.95,
    glyphFillDigits: 0.95,
    glyphLink: true,         // منزلِقٌ واحد يحرّك الاثنين بنسبتهما
    uniformGlyphs: 1,        // ١ = كلُّ حرفٍ بارتفاع الصفّ بعينه
    /* حدُّ الضغط الأفقيّ. قِستُ المنحنى: على لوحةٍ بصفّين لا يعمل الحدُّ
     * أصلاً حتى ٠٫٤٥، وفوقها يبدأ يصغّر الحروف العريضة بلا فائدة —
     * التفاوت ١٫٠٥× عند ٠٫٤٥ و١٫٦٠× عند ٠٫٧٠. وعلى صفٍّ واحدٍ يمنع
     * أنحفَ تفصيلٍ من النزول إلى ٠٫٢٦ مم (دون النوزل) فيرفعه إلى ١٫٣٩. */
    squeezeMin: 0.45,
    logoContours: null,
    logoRaw: null,           // الشعار كما قُرئ، قبل الدوران والقلب
    logoRotate: 0, logoFlipX: false, logoFlipY: false,
    logoHeight: 1,
    logoColor: '#111111',
    screwHoles: false, screwDiameter: 6,
    magnet: false, magnetDiameter: 8, magnetThickness: 3, magnetCount: 2,
    keyring: false, keyringHole: 4, keyringPos: 'topRight', keyringSize: 0.075,
    mirrorHole: false,
    wallMount: false, wallDepth: 2.5, wallCount: 1,
    stand: false, standAngle: 15,
    split: false, spliceDepth: 1.2, spliceClearance: 0.25,
    engrave: false,
    logoSync: true
  };

  // نسخةٌ من الافتراضي يعود إليها زرُّ الإعادة
  var DEFAULTS = JSON.parse(JSON.stringify(state));

  /* جدولُ الطابعات — كلُّ اسمٍ فيه مقروءٌ من كتالوج قوالب Bambu
   * المثبّت ومُتحقَّقٌ من توافقه، لا مكتوبٌ من الذاكرة. */
  var PRINTERS = {
    p1s: { label: 'Bambu Lab P1S 0.4', model: 'Bambu Lab P1S', variant: '0.4',
           settings: 'Bambu Lab P1S 0.4 nozzle', process: '0.20mm Standard @BBL X1C',
           filament: 'Generic PLA', bed: { w: 256, h: 256 } },
    p1p: { label: 'Bambu Lab P1P 0.4', model: 'Bambu Lab P1P', variant: '0.4',
           settings: 'Bambu Lab P1P 0.4 nozzle', process: '0.20mm Standard @BBL P1P',
           filament: 'Generic PLA @BBL P1P', bed: { w: 256, h: 256 } },
    x1c: { label: 'Bambu Lab X1 Carbon 0.4', model: 'Bambu Lab X1 Carbon', variant: '0.4',
           settings: 'Bambu Lab X1 Carbon 0.4 nozzle', process: '0.20mm Standard @BBL X1C',
           filament: 'Generic PLA', bed: { w: 256, h: 256 } },
    a1:  { label: 'Bambu Lab A1 0.4', model: 'Bambu Lab A1', variant: '0.4',
           settings: 'Bambu Lab A1 0.4 nozzle', process: '0.20mm Standard @BBL A1',
           filament: 'Generic PLA @BBL A1', bed: { w: 256, h: 256 } },
    a1m: { label: 'Bambu Lab A1 mini 0.4', model: 'Bambu Lab A1 mini', variant: '0.4',
           settings: 'Bambu Lab A1 mini 0.4 nozzle', process: '0.20mm Standard @BBL A1M',
           filament: 'Generic PLA @BBL A1M', bed: { w: 180, h: 180 } }
  };

  var SIZES = [
    { id: 'real',   label: '١:١ حقيقي',  fn: function (s) { return s.w; } },
    { id: 'key',    label: 'ميدالية',    fn: function () { return 70; } },
    { id: 'magnet', label: 'مغناطيس',    fn: function () { return 120; } },
    { id: 's10',    label: '١:١٠',       fn: function (s) { return s.w / 10; } },
    { id: 's18',    label: '١:١٨',       fn: function (s) { return s.w / 18; } },
    { id: 's24',    label: '١:٢٤',       fn: function (s) { return s.w / 24; } }
  ];

  var design = null, entries = [], stand = null;

  // ————————————————————————————————————————
  //  المشهد
  // ————————————————————————————————————————
  var stage = $('stage');
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  stage.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.5, 5000);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.HemisphereLight(0xd8e4f0, 0x1a1d22, 0.85));
  var key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(-0.6, 0.5, 1.4);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xbcd0e8, 0.42);
  fill.position.set(0.9, -0.7, 0.6);
  scene.add(fill);
  var rim = new THREE.DirectionalLight(0xffffff, 0.3);
  rim.position.set(0.2, 0.9, -1);
  scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', function () { resize(); frameCamera(lastView); });
  var lastView = 'iso';

  /* المسافة تُحسب على البعدين معاً: اللوحة الطويلة عرضُها خمسةُ
   * أضعاف ارتفاعها، وحسابُها على الارتفاع وحده يقصّ طرفيها. */
  function frameCamera(view) {
    if (!design) return;
    if (view) lastView = view; else view = lastView;
    var extra = state.stand ? design.h * 0.55 : 0;
    var w = design.w, h = design.h + extra;
    var t = Math.tan((camera.fov * Math.PI / 180) / 2);
    var aspect = camera.aspect || 1;
    var d = Math.max((h / 2) / t, (w / 2) / (t * aspect)) * 1.25 + 20;
    if (view === 'front') camera.position.set(0, 0, d);
    else if (view === 'back') camera.position.set(0, 0, -d);
    else camera.position.set(-d * 0.42, -d * 0.5, d * 0.72);
    controls.target.set(0, -extra / 2, 0);
    controls.update();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // ————————————————————————————————————————
  //  البناء
  // ————————————————————————————————————————
  function clearGroup() {
    while (group.children.length) {
      var m = group.children.pop();
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    }
  }

  function materialFor(part) {
    var isInk = part.role === 'ink' || part.role === 'logo';
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(part.color),
      roughness: isInk ? 0.55 : 0.72,
      metalness: 0.02,
      flatShading: false
    });
  }

  /** إعداداتُ البناء من الحالة — يشترك فيها العرضُ وتصديرُ الوجه */
  function buildCfg() {
    var cfg = {};
    for (var k in state) cfg[k] = state[k];
    // الشعار المدمج يبنيه محرّك التخطيط بنفسه ليضبط سماكته على المقاس؛
    // ولا يُمرَّر هنا إلّا ما رفعه المستخدم.
    cfg.logoContours = state.logo === 'custom' && state.logoRaw
                     ? orientLogo(state.logoRaw) : null;

    cfg.cellBorders = state.cellStyle !== 'none';
    cfg.inkColor = state.inkColor || null;
    cfg.baseColor = state.baseColor || null;
    cfg.innerLines = state.innerLines;
    cfg.symbol = state.symbol;
    cfg.lettersLa = state.lettersLa;
    cfg.digitsAr = state.digitsAr;
    cfg.rowTop = state.rowTop;
    cfg.rowBottom = state.rowBottom;
    cfg.digitsTop = state.digitsTop;
    cfg.digitsBottom = state.digitsBottom;
    cfg.joinText = state.joinText;
    cfg.bandTextAr = state.bandTextAr === '' ? null : state.bandTextAr;
    cfg.bandTextLa = state.bandTextLa === '' ? null : state.bandTextLa;
    cfg.colRatio = state.colRatio;
    cfg.glyphScaleLetters = state.glyphScaleLetters;
    cfg.glyphScaleDigits = state.glyphScaleDigits;
    cfg.glyphFillLetters = state.glyphFillLetters;
    cfg.glyphFillDigits = state.glyphFillDigits;
    cfg.uniformGlyphs = state.uniformGlyphs;
    cfg.squeezeMin = state.squeezeMin;
    cfg.innerStroke = state.innerStroke;
    cfg.border = { stroke: state.lineWeight, rimW: state.lineWeight,
                   radius: state.cornerRadius };
    var mi = machineInfo();
    cfg.bed = mi ? mi.bed : null;
    return cfg;
  }

  function rebuild() {
    var cfg = buildCfg();

    try {
      design = L.build(cfg);
    } catch (e) {
      console.error(e);
      showWarnings(['تعذّر بناء اللوحة: ' + e.message]);
      return;
    }

    stand = state.stand ? buildStand(design) : null;

    clearGroup();
    entries = G.buildAll(design);
    entries.forEach(function (e) {
      var mesh = new THREE.Mesh(e.geometry, materialFor(e.part));
      group.add(mesh);
    });
    if (stand) {
      entries.push(stand);
      group.add(new THREE.Mesh(stand.geometry, materialFor(stand.part)));
    }

    updateHud();
    updateSplitNote();
    syncGhost();
    showWarnings(design.warnings);
    updatePartList();
  }

  /** قاعدة المكتب: مقطع جانبي فيه أخدود مائل، يُبثق بعرض اللوحة */
  function buildStand(des) {
    var a = state.standAngle * Math.PI / 180;
    var t = state.baseThickness + state.reliefHeight + 0.5;   // خلوص الأخدود
    var D = Math.max(18, des.h * 0.32 + t * 2);               // العمق
    var Hb = Math.max(10, des.h * 0.14);                      // الارتفاع
    var slotDepth = Math.min(Hb - 2.5, Math.max(5, des.h * 0.09));
    var Ls = Math.max(20, des.w * 0.5);                       // الطول

    var w = t / 2;
    var gc = D * 0.52;
    var dx = Math.sin(a), dy = -Math.cos(a);
    var px = Math.cos(a), py = Math.sin(a);
    var Tx = gc, Ty = Hb;
    var Bx = Tx + dx * slotDepth, By = Ty + dy * slotDepth;

    var pts = [
      { x: 0, y: 0 }, { x: D, y: 0 }, { x: D, y: Hb },
      { x: Tx + px * w, y: Ty + py * w },
      { x: Bx + px * w, y: By + py * w },
      { x: Bx - px * w, y: By - py * w },
      { x: Tx - px * w, y: Ty - py * w },
      { x: 0, y: Hb }
    ];

    var part = {
      id: 'stand', name: 'قاعدة المكتب', role: 'base',
      contours: [pts], z0: 0, z1: Ls, color: design.color.base
    };
    var geo = G.partGeometry(part);
    if (!geo) return null;
    // (px,py,pz) → (z, x, y) : المقطع يقف والبثق يمتدّ بعرض اللوحة
    var m = new THREE.Matrix4();
    m.set(0, 0, 1, 0,
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 0, 1);
    geo.applyMatrix4(m);
    // تُعرض قطعةً مستقلّة أمام اللوحة بوضع الطباعة (الأخدود لأعلى)،
    // لا ملتصقةً بها — فهي تُطبع وحدها وتُركّب بعد الطباعة.
    // المقطعُ يمتدّ من y=0 إلى y=D قبل الإزاحة، فلا بدّ من إزاحةٍ
    // بمقدار العمق كاملاً لا نصفه — وإلّا اشتبك طرفُ القاعدة باللوحة.
    geo.translate(-Ls / 2, -(des.h / 2 + D + Math.max(8, des.h * 0.12)), 0);
    return { part: part, geometry: geo };
  }

  // ————————————————————————————————————————
  //  عرض المعلومات
  // ————————————————————————————————————————
  function updateHud() {
    if (!design) return;
    var t = design.text;
    var thick = state.engrave ? state.baseThickness
                              : state.baseThickness + state.reliefHeight;
    $('hud').innerHTML =
      '<b>' + design.spec.label + '</b> · ' + design.color.label + '<br>' +
      'المقاس <b>' + design.w.toFixed(1) + ' × ' + design.h.toFixed(1) + '</b> مم' +
      ' · سماكة <b>' + thick.toFixed(1) + '</b> مم' +
      (state.engrave ? ' · <b>غائر</b>' : '') + '<br>' +
      (state.blank ? 'لوحة فارغة' :
        'اللوحة <b>' + t.digits + ' ' + t.visLa + '</b> · <b>' + t.lettersAr + '</b>') + '<br>' +
      'أنحف تفصيل <b>' + (isFinite(design.minFeature) ? design.minFeature.toFixed(2) : '—') + '</b> مم';
  }

  function updateSplitNote() {
    var el = $('splitNote');
    if (!state.split || !design.pieces) { el.textContent = ''; return; }
    var w = design.pieces.map(function (p) { return p.w.toFixed(0); }).join(' + ');
    el.textContent = design.pieces.length + ' قطع: ' + w + ' مم عرضاً · ' +
      design.cutXs.length + ' لوح وصل يُطبع منفصلاً ويُلصق في تجويف الظهر.';
  }

  function showWarnings(list) {
    var box = $('warns');
    box.innerHTML = '';
    (list || []).forEach(function (w) {
      var d = document.createElement('div');
      d.className = 'warn';
      d.textContent = w;
      box.appendChild(d);
    });
  }

  var ROLE_LABEL = { base: 'القاعدة', ink: 'النقش', logo: 'الشعار' };

  function updatePartList() {
    var seen = {}, html = '', roles = [];
    entries.forEach(function (e) {
      var c = e.part.color;
      if (seen[c]) return;
      seen[c] = 1;
      html += '<span><i style="background:' + c + '"></i>' + e.part.name + '</span>';
      if (roles.indexOf(e.part.role) < 0) roles.push(e.part.role);
    });
    $('partList').innerHTML = html;

    /* رقمُ الفتحة هو ما يقرّر اللون في السلايسر فعلاً — لا ما يُكتب
     * في الملف. فإن كان الأصفر في فتحتك الثانية، وجّه القاعدة إليها. */
    var ex = '';
    roles.forEach(function (r) {
      var c = entries.filter(function (e) { return e.part.role === r; })[0].part.color;
      ex += '<label><i style="background:' + c + '"></i>' + (ROLE_LABEL[r] || r) +
            ' <select data-ex="' + r + '">';
      for (var k = 1; k <= 8; k++) {
        ex += '<option value="' + k + '"' +
              (state.extruders[r] === k ? ' selected' : '') + '>' + k + '</option>';
      }
      ex += '</select></label>';
    });
    $('extruders').innerHTML = ex;
    [].forEach.call($('extruders').querySelectorAll('select'), function (sel) {
      sel.onchange = function () {
        state.extruders[sel.dataset.ex] = +sel.value;
      };
    });
  }

  function updateMirror() {
    var vis = L.visualOrder(state.letters);
    var la = L.toLatin(vis);
    $('mirrorLine').innerHTML =
      'على اللوحة: <b>' + state.digits + '&nbsp;&nbsp;' + la + '</b>' +
      '<span style="opacity:.6"> &nbsp;←&nbsp; القراءة ' + state.letters + '</span>';
  }

  // ————————————————————————————————————————
  //  ربط الواجهة
  // ————————————————————————————————————————
  /* التأجيل بمؤقّت لا بإطار رسم: إطارُ الرسم يتوقّف إذا كانت
   * الصفحة مخفيّة، فتبقى الحالة مبنيّةً على إعداداتٍ قديمة ويخرج
   * التصديرُ على غير ما ترى. */
  var pending = null;
  function refresh() {
    updateMirror();
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () { pending = null; rebuild(); }, 16);
  }

  function chipGroup(host, items, getActive, onPick) {
    host.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'chip' + (getActive() === it.id ? ' on' : '');
      b.dataset.id = it.id;
      if (it.swatch) {
        b.classList.add('sw');
        b.innerHTML = '<i style="background:' + it.swatch + '"></i>' + it.label;
      } else b.textContent = it.label;
      b.onclick = function () {
        onPick(it.id);
        [].forEach.call(host.children, function (c) { c.classList.toggle('on', c.dataset.id === it.id); });
      };
      host.appendChild(b);
    });
  }

  // الأنواع
  chipGroup($('typeChips'),
    Object.keys(L.TYPES).map(function (k) {
      return { id: k, label: L.TYPES[k].label + ' · ' + L.TYPES[k].w + '×' + L.TYPES[k].h };
    }),
    function () { return state.type; },
    function (id) {
      var prevRatio = state.targetWidth / L.TYPES[state.type].w;
      state.type = id;
      state.targetWidth = Math.round(L.TYPES[id].w * prevRatio);
      // الطويلة وحدها فيها موضع شعار أوسط؛ وغيرها تُبنى بلا شعار
      syncLogoChips();
      syncWidthSlider();
      updateTypeNote();
      refresh();
      frameCamera('iso');
    });

  function updateTypeNote() {
    var t = L.TYPES[state.type];
    $('logoNote').textContent = t.bandStyle === 'tall'
      ? 'الشعار في الشريط اليمين فوق K S A. والمدمج صياغة هندسية مبسّطة'
        + ' للطباعة، لا نسخة رسمية — وللدقّة ارفع SVG خاصاً بك.'
      : 'الشعار في وسط اللوحة وتحته السعودية و KSA. أخفِ الكلمتين ليكبر'
        + ' الشعار ويملأ الوسط وحده.';
    $('typeNote').textContent = (t.rows === 1
      ? 'صفّ واحد لاتيني، والشريط في الوسط — كما في اللوحة الأمامية القصيرة.'
      : (state.type === 'long'
          ? 'صفّان في كل خانة، شعار في الوسط، وشريط ضيّق في أقصى اليمين.'
          : 'أربع خانات في شبكة ٢×٢: عربي فوق ولاتيني تحت، والشريط على اليمين.'))
      /* ما لا مقاسَ منشوراً له يُقال فيه ذلك، ولا يُترك يوهم الدقّة */
      + (t.approx
          ? ' ومقاسُها ' + t.w + '×' + t.h + ' تقديريٌّ لا رسميّ: المرور'
            + ' يُصدرها ولا يَنشر أبعادَها.'
          : ' ومقاسُها ' + t.w + '×' + t.h + ' مم.');
  }

  // المقاسات
  chipGroup($('sizeChips'), SIZES,
    function () { return null; },
    function (id) {
      var s = SIZES.filter(function (x) { return x.id === id; })[0];
      state.targetWidth = Math.round(s.fn(L.TYPES[state.type]));
      syncWidthSlider();
      refresh();
      frameCamera('iso');
    });

  function syncWidthSlider() {
    var el = $('targetWidth');
    el.value = state.targetWidth;
    $('targetWidthV').textContent = state.targetWidth + ' مم';
    var sc = state.targetWidth / L.TYPES[state.type].w;
    $('sizeNote').textContent = 'المقياس ' + (sc >= 1 ? '١:١' : '١:' + (1 / sc).toFixed(1)) +
      ' · الارتفاع ' + (L.TYPES[state.type].h * sc).toFixed(1) + ' مم';
  }

  /* حقولٌ حرّة بدل القوائم الثابتة: الأبجديتان مفتوحتان، والأداة
   * تُسقط ما لا رمزَ له فقط. */
  function bindText(id, key) {
    var el = $(id);
    if (!el) return;
    el.value = state[key] || '';
    el.oninput = function () { state[key] = this.value; refresh(); };
  }

  bindText('digits', 'digits');
  bindText('letters', 'letters');
  bindText('lettersLa', 'lettersLa');
  bindText('digitsAr', 'digitsAr');

  /* حقلا الصفّ الآخر مفتوحان دائماً، وفراغُهما يعني «ولّده الأداة».
   * فيُعرض المولَّدُ شبحاً (placeholder) حتى إذا كتب المستخدمُ شيئاً
   * حلَّ محلَّه. وهذا ما يجعل «ش» — ولا مقابلَ لها — قابلةً لأن
   * يختار صاحبُ اللوحة ما يُكتب تحتها. */
  function syncGhost() {
    if (!design) return;
    $('digitsAr').placeholder = design.text.digitsAr || 'الصفّ العربي';
    $('lettersLa').placeholder = design.text.visLa || 'الصفّ اللاتيني';
  }

  var SCRIPT2 = [{ id: 'ar', label: 'عربي' }, { id: 'la', label: 'لاتيني' }];
  var SCRIPT3 = SCRIPT2.concat([{ id: 'none', label: 'بلا' }]);
  var DIGITS3 = [{ id: '', label: 'يتبع الصفّ' }].concat(SCRIPT2);

  function rowChips(host, key, items) {
    chipGroup($(host), items, function () { return state[key]; }, function (id) {
      state[key] = id;
      syncRowRows();
      refresh();
    });
  }
  /** صفُّ أرقام الأسفل لا معنى له إن لم يكن هناك صفٌّ أسفل */
  function syncRowRows() {
    $('digitsBottomRow').classList.toggle('hidden', state.rowBottom === 'none');
  }

  rowChips('rowTopChips', 'rowTop', SCRIPT2);
  rowChips('rowBottomChips', 'rowBottom', SCRIPT3);
  rowChips('digitsTopChips', 'digitsTop', DIGITS3);
  rowChips('digitsBottomChips', 'digitsBottom', DIGITS3);
  syncRowRows();

  $('joinText').onchange = function () {
    state.joinText = this.checked;
    this.parentElement.classList.toggle('on', this.checked);
    refresh();
  };

  bindText('bandTextAr', 'bandTextAr');
  bindText('bandTextLa', 'bandTextLa');

  [].forEach.call(document.querySelectorAll('[data-engrave]'), function (b) {
    b.onclick = function () {
      state.engrave = b.dataset.engrave === '1';
      syncEngrave();
      refresh();
    };
  });
  function syncEngrave() {
    document.querySelectorAll('[data-engrave]').forEach(function (x) {
      x.classList.toggle('on', (x.dataset.engrave === '1') === state.engrave);
    });
    $('reliefLbl').textContent = state.engrave ? 'عمق الحفر' : 'ارتفاع النقش';
    // الحفرُ يأكل من القاعدة، والشعارُ يُحفر معه فلا ارتفاع مستقلّ له
    $('logoRow1').classList.toggle('hidden', state.engrave);
    $('logoRow2').classList.toggle('hidden', state.engrave);
  }

  [].forEach.call(document.querySelectorAll('[data-wallc]'), function (b) {
    b.onclick = function () {
      state.wallCount = +b.dataset.wallc;
      document.querySelectorAll('[data-wallc]').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      refresh();
    };
  });

  chipGroup($('keyPos'), [
    { id: 'topRight', label: 'أعلى يمين' }, { id: 'midRight', label: 'وسط يمين' },
    { id: 'bottomRight', label: 'أسفل يمين' }, { id: 'topLeft', label: 'أعلى يسار' },
    { id: 'midLeft', label: 'وسط يسار' }, { id: 'bottomLeft', label: 'أسفل يسار' },
    { id: 'topCenter', label: 'أعلى وسط' }, { id: 'bottomCenter', label: 'أسفل وسط' }
  ], function () { return state.keyringPos; }, function (id) {
    state.keyringPos = id; refresh();
  });

  [].forEach.call(document.querySelectorAll('[data-mag]'), function (b) {
    b.classList.toggle('on', +b.dataset.mag === state.magnetCount);
    b.onclick = function () {
      state.magnetCount = +b.dataset.mag;
      document.querySelectorAll('[data-mag]').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      refresh();
    };
  });

  // المنزلقات
  var SLIDERS = {
    targetWidth: { unit: ' مم', dp: 0 },
    baseThickness: { unit: ' مم', dp: 1 },
    reliefHeight: { unit: ' مم', dp: 1 },
    textFill: { unit: '', dp: 2 },
    glyphFillLetters: { unit: '', dp: 2 },
    glyphFillDigits: { unit: '', dp: 2 },
    uniformGlyphs: { unit: '', dp: 2 },
    squeezeMin: { unit: '×', dp: 2 },
    lineWeight: { unit: '', dp: 3 },
    innerStroke: { unit: '×', dp: 2 },
    cornerRadius: { unit: '', dp: 2 },
    colRatio: { unit: '×', dp: 2 },
    glyphScaleLetters: { unit: '×', dp: 2 },
    glyphScaleDigits: { unit: '×', dp: 2 },
    logoHeight: { unit: ' مم', dp: 1 },
    logoRotate: { unit: '°', dp: 0 },
    screwDiameter: { unit: ' مم', dp: 1 },
    magnetDiameter: { unit: ' مم', dp: 1 },
    magnetThickness: { unit: ' مم', dp: 1 },
    keyringHole: { unit: ' مم', dp: 1 },
    keyringSize: { unit: '', dp: 3 },
    wallDepth: { unit: ' مم', dp: 1 },
    spliceDepth: { unit: ' مم', dp: 1 },
    spliceClearance: { unit: ' مم', dp: 2 },
    standAngle: { unit: '°', dp: 0 }
  };
  Object.keys(SLIDERS).forEach(function (id) {
    var el = $(id), out = $(id + 'V');
    if (!el) return;
    el.value = state[id];
    var paint = function () {
      var v = parseFloat(el.value);
      state[id] = v;
      if (out) out.textContent = v.toFixed(SLIDERS[id].dp) + SLIDERS[id].unit;
      if (id === 'targetWidth') syncWidthSlider();
    };
    el.oninput = function () {
      paint();
      if (id === 'reliefHeight' && state.logoSync) {
        state.logoHeight = state.reliefHeight;
        var lh = $('logoHeight');
        if (lh) { lh.value = state.logoHeight; $('logoHeightV').textContent =
          state.logoHeight.toFixed(1) + ' مم'; }
      }
      /* ربطُ عرضِ الحروف بعرض الأرقام: يحفظ الفرقَ بينهما لا يساويهما،
       * فمن رفع الحروفَ ارتفع الرقمُ معها وبقيت نسبةُ الخطّ. */
      if (state.glyphLink && (id === 'glyphFillLetters' || id === 'glyphFillDigits')) {
        var other = id === 'glyphFillLetters' ? 'glyphFillDigits' : 'glyphFillLetters';
        var ratio = id === 'glyphFillLetters' ? 0.75 / 0.80 : 0.80 / 0.75;
        var nv = Math.max(0.5, Math.min(1, state[id] * ratio));
        state[other] = nv;
        var oe = $(other);
        if (oe) { oe.value = nv; $(other + 'V').textContent = nv.toFixed(2); }
      }
      if (id === 'logoHeight' && state.logoSync && Math.abs(state.logoHeight - state.reliefHeight) > 1e-6) {
        state.logoSync = false;
        $('logoSync').checked = false;
        $('logoSync').parentElement.classList.remove('on');
      }
      refresh();
    };
    paint();
  });

  // المربّعات
  ['blank', 'innerLines', 'bandWords', 'logoSync', 'glyphLink', 'joinText', 'screwHoles', 'magnet',
   'keyring', 'mirrorHole', 'wallMount', 'stand', 'split'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.checked = !!state[id];
    var sync = function () {
      state[id] = el.checked;
      if (el.parentElement) el.parentElement.classList.toggle('on', el.checked);
      $('textSec').classList.toggle('hidden', state.blank);
      $('screwRow').classList.toggle('hidden', !state.screwHoles);
      ['magRow1', 'magRow2', 'magRow3'].forEach(function (r) {
        $(r).classList.toggle('hidden', !state.magnet);
      });
      ['keyRow0', 'keyRow', 'keyRow2'].forEach(function (r) {
        $(r).classList.toggle('hidden', !state.keyring);
      });
      ['wallRow', 'wallRow2'].forEach(function (r) {
        $(r).classList.toggle('hidden', !state.wallMount);
      });
      $('standRow').classList.toggle('hidden', !state.stand);
      ['splitRow', 'splitRow2', 'splitNote'].forEach(function (r) {
        $(r).classList.toggle('hidden', !state.split);
      });
      refresh();
    };
    el.onchange = sync;
    if (el.parentElement) el.parentElement.classList.toggle('on', el.checked);
  });
  $('screwRow').classList.add('hidden');

  $('nozzle').onchange = function () { state.nozzle = parseFloat(this.value); refresh(); };
  $('logoColor').oninput = function () { state.logoColor = this.value; refresh(); };
  $('inkColor').oninput = function () { state.inkColor = this.value; refresh(); };
  $('baseColor').oninput = function () { state.baseColor = this.value; refresh(); };

  chipGroup($('symChips'), [
    { id: '', label: 'تلقائي' },
    { id: 'circle', label: 'دائرة' },
    { id: 'triangleUp', label: '▲' },
    { id: 'triangleDown', label: '▼' },
    { id: 'square', label: '■' },
    { id: 'none', label: 'بلا' }
  ], function () { return state.symbol || ''; }, function (id) {
    state.symbol = id || null;
    refresh();
  });

  chipGroup($('cellStyleChips'), [
    { id: 'grid', label: 'زوايا مدوّرة' },
    { id: 'sharp', label: 'زوايا قائمة' },
    { id: 'none', label: 'بلا خطوط' }
  ], function () { return state.cellStyle; }, function (id) {
    state.cellStyle = id;
    $('strokeRow').classList.toggle('hidden', id === 'none');
    $('radiusRow').classList.toggle('hidden', id !== 'grid');
    refresh();
  });

  // الشعار
  chipGroup($('logoChips'), [
    { id: 'crest', label: 'النخلة والسيفان' },
    { id: 'custom', label: 'ملف مرفوع' }
  ], function () { return state.logo; }, function (id) {
    if (id === 'custom' && !state.logoContours) { $('logoFile').click(); }
    state.logo = id;
    syncLogoChips();
    refresh();
  });

  function syncLogoChips() {
    [].forEach.call($('logoChips').children, function (c) {
      c.classList.toggle('on', c.dataset.id === state.logo);
    });
  }

  [].forEach.call(document.querySelectorAll('[data-rot]'), function (b) {
    b.onclick = function () {
      state.logoRotate = (state.logoRotate + (+b.dataset.rot) + 360) % 360;
      $('logoRotate').value = state.logoRotate;
      $('logoRotateV').textContent = state.logoRotate + '°';
      refresh();
    };
  });
  ['logoFlipX', 'logoFlipY'].forEach(function (id) {
    var el = $(id);
    el.onchange = function () {
      state[id] = el.checked;
      el.parentElement.classList.toggle('on', el.checked);
      refresh();
    };
  });

  var drop = $('drop');
  drop.onclick = function () { $('logoFile').click(); };
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer.files[0]) readSvg(e.dataTransfer.files[0]);
  });
  $('logoFile').onchange = function () { if (this.files[0]) readSvg(this.files[0]); };

  function readSvg(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var cs = svgToContours(fr.result);
        if (!cs.length) throw new Error('لم يُعثر على أي شكل في الملف');
        state.logoRaw = cs;
        state.logoContours = cs;
        state.logo = 'custom';
        [].forEach.call($('logoChips').children, function (c) {
          c.classList.toggle('on', c.dataset.id === 'custom');
        });
        drop.textContent = file.name + ' · ' + cs.length + ' شكلاً';
        refresh();
      } catch (err) {
        drop.textContent = 'تعذّرت القراءة: ' + err.message;
      }
    };
    fr.readAsText(file);
  }

  /** يستخرج الأشكال من ملف SVG (بلا دعم لتحويلات transform) */
  /* ——— مصفوفة تحويل ثنائية: [a, b, c, d, e, f] ———
   * x' = a·x + c·y + e   ·   y' = b·x + d·y + f
   */
  function matMul(m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
            m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
            m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }

  /** يحلّل خاصية transform بصيغة SVG إلى مصفوفة */
  function parseTransform(str) {
    var m = [1, 0, 0, 1, 0, 0];
    if (!str) return m;
    var re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g, t;
    while ((t = re.exec(str))) {
      var v = t[2].trim().split(/[\s,]+/).map(parseFloat);
      var k = t[1], n;
      if (k === 'matrix') n = [v[0], v[1], v[2], v[3], v[4], v[5]];
      else if (k === 'translate') n = [1, 0, 0, 1, v[0] || 0, v.length > 1 ? v[1] : 0];
      else if (k === 'scale') n = [v[0], 0, 0, v.length > 1 ? v[1] : v[0], 0, 0];
      else if (k === 'rotate') {
        var r = (v[0] || 0) * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
        n = [cs, sn, -sn, cs, 0, 0];
        if (v.length > 2) {
          n = matMul([1, 0, 0, 1, v[1], v[2]], matMul(n, [1, 0, 0, 1, -v[1], -v[2]]));
        }
      } else if (k === 'skewX') n = [1, 0, Math.tan((v[0] || 0) * Math.PI / 180), 1, 0, 0];
      else n = [1, Math.tan((v[0] || 0) * Math.PI / 180), 0, 1, 0, 0];   // skewY
      m = matMul(m, n);
    }
    return m;
  }

  /** مصفوفةُ عنصرٍ مضروبةً في مصفوفات آبائه */
  function ctmOf(el) {
    var chain = [];
    for (var n = el; n && n.getAttribute; n = n.parentNode) {
      chain.unshift(parseTransform(n.getAttribute('transform')));
    }
    var m = [1, 0, 0, 1, 0, 0];
    for (var i = 0; i < chain.length; i++) m = matMul(m, chain[i]);
    return m;
  }

  function applyMat(contours, m) {
    return P.transform(contours, function (p) {
      return { x: m[0] * p.x + m[2] * p.y + m[4],
               y: m[1] * p.x + m[3] * p.y + m[5] };
    });
  }

  /**
   * يستخرج الأشكال من ملف SVG.
   *
   * وتُقرأ خاصيةُ `transform` وتُضرب في مصفوفات الآباء — وكان
   * تجاهلُها سببَ انقلاب الشعار المرفوع: أكثرُ المحرّرات تلفّ
   * محتواها في `<g transform="…">`، وفيها ما يقلب المحور.
   *
   * والقلبُ الرأسي في آخر الخطوة: محورُ SVG لأسفل ومحورُنا لأعلى.
   */
  function svgToContours(text) {
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw new Error('ملف SVG غير سليم');
    var out = [];

    function add(el, contours) {
      if (contours && contours.length) out = out.concat(applyMat(contours, ctmOf(el)));
    }

    doc.querySelectorAll('path').forEach(function (el) {
      var d = el.getAttribute('d');
      if (d) add(el, P.parsePath(d, { quality: 14 }));
    });
    doc.querySelectorAll('circle, ellipse').forEach(function (el) {
      var cx = +el.getAttribute('cx') || 0, cy = +el.getAttribute('cy') || 0;
      var rx = +(el.getAttribute('r') || el.getAttribute('rx')) || 0;
      var ry = +(el.getAttribute('r') || el.getAttribute('ry')) || rx;
      if (rx > 0 && ry > 0) {
        var c = P.circle(0, 0, 1, 48).map(function (q) {
          return { x: cx + q.x * rx, y: cy + q.y * ry };
        });
        add(el, [c]);
      }
    });
    doc.querySelectorAll('rect').forEach(function (el) {
      var x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0,
          w = +el.getAttribute('width') || 0, h = +el.getAttribute('height') || 0,
          r = +el.getAttribute('rx') || 0;
      if (w > 0 && h > 0) add(el, [P.roundRect(x + w / 2, y + h / 2, w, h, r, 6)]);
    });
    doc.querySelectorAll('polygon, polyline').forEach(function (el) {
      var nums = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      var pts = [];
      for (var i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
      if (pts.length > 2) add(el, [pts]);
    });
    doc.querySelectorAll('line').forEach(function () { /* الخطوط بلا مساحة */ });

    // من محور SVG (لأسفل) إلى محورنا (لأعلى)
    return P.transform(out, function (p) { return { x: p.x, y: -p.y }; });
  }

  /** يطبّق دورانَ المستخدم وقلبَه على الشعار المرفوع */
  function orientLogo(contours) {
    if (!contours || !contours.length) return contours;
    var r = (state.logoRotate || 0) * Math.PI / 180;
    var cs = Math.cos(r), sn = Math.sin(r);
    var fx = state.logoFlipX ? -1 : 1, fy = state.logoFlipY ? -1 : 1;
    return P.transform(contours, function (p) {
      var x = p.x * fx, y = p.y * fy;
      return { x: x * cs - y * sn, y: x * sn + y * cs };
    });
  }

  // أزرار العرض
  [].forEach.call(document.querySelectorAll('#viewbtns button'), function (b) {
    b.onclick = function () { frameCamera(b.dataset.view); };
  });

  // ————————————————————————————————————————
  //  التصدير
  // ————————————————————————————————————————
  function baseName() {
    var t = design.text;
    var id = state.blank ? 'فارغة' : (t.digits + '-' + t.visLa);
    return 'لوحة-' + design.spec.label + '-' + id + '-' + Math.round(design.w) + 'مم';
  }

  /** يجمع الأجزاء حسب اللون */
  function groupByColor() {
    var map = {}, order = [];
    entries.forEach(function (e) {
      var c = e.part.color;
      if (!map[c]) { map[c] = { color: c, name: e.part.name, list: [] }; order.push(c); }
      map[c].list.push(e);
    });
    return order.map(function (c) { return map[c]; });
  }

  function machineInfo() { return PRINTERS[state.machine] || null; }

  /* ترتيبُ القطع على المنصّة: صفٌّ أفقيّ بفراغ خمسة مليمترات، موسَّطٌ
   * حول مركز المنصّة. والقطعُ في فضاء اللوحة لا تزال في مواضعها من
   * اللوحة الأصلية، فتُزاح كلُّ قطعةٍ بفرق مركزها عن الموضع الجديد. */
  function pieceLayout() {
    if (!design || !design.pieces || !design.pieces.length) return {};
    var gap = 5, out = {};
    var total = design.pieces.reduce(function (a, p) { return a + p.w; }, 0) +
                gap * (design.pieces.length - 1);
    var x = -total / 2;
    design.pieces.forEach(function (p) {
      var oldCx = (p.x0 + p.x1) / 2;
      out[String(p.index)] = { dx: x + p.w / 2 - oldCx, dy: 0 };
      x += p.w + gap;
    });
    // ألواح الوصل مرسومةٌ أصلاً أسفل اللوحة، فتُترك في مكانها
    out.splice = { dx: 0, dy: 0 };
    return out;
  }

  function exportOpts() {
    var m = machineInfo();
    return { title: baseName(), extruders: state.extruders, printer: m,
             template: state.settingsTemplate, pieceLayout: pieceLayout(),
             bedX: m ? m.bed.w / 2 : 128, bedY: m ? m.bed.h / 2 : 128 };
  }

  $('machine').onchange = function () { state.machine = this.value; refresh(); };
  $('machine').value = state.machine;

  /* قالبُ الإعدادات: ملفٌّ صادرٌ عن السلايسر نفسه، تُؤخذ منه إعدادات
   * المشروع كاملةً وتُدمج فيها ألوانُنا. فلا يبقى للسلايسر سببٌ
   * لرفضها — هي إعداداتُه هو. */
  function loadTemplate(file) {
    var tpl = $('tplDrop');
    tpl.textContent = 'يُقرأ ' + file.name + ' …';
    var fr = new FileReader();
    fr.onload = function () {
      X.readSettingsTemplate(new Uint8Array(fr.result)).then(function (j) {
        state.settingsTemplate = j;
        tpl.textContent = '✓ قالب محمّل: ' + Object.keys(j).length + ' مفتاحاً · ' +
                          (j.printer_settings_id || 'بلا طابعة');
        tpl.style.borderColor = 'var(--accent)';
        tpl.style.color = 'var(--accent)';
      }).catch(function (e) {
        state.settingsTemplate = null;
        tpl.textContent = 'تعذّرت القراءة: ' + e.message;
        tpl.style.borderColor = 'var(--warn)';
      });
    };
    fr.readAsArrayBuffer(file);
  }

  $('tplDrop').onclick = function () { $('tplFile').click(); };
  $('tplFile').onchange = function () { if (this.files[0]) loadTemplate(this.files[0]); };
  ['dragenter', 'dragover'].forEach(function (ev) {
    $('tplDrop').addEventListener(ev, function (e) { e.preventDefault(); });
  });
  $('tplDrop').addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer.files[0]) loadTemplate(e.dataTransfer.files[0]);
  });

  $('dl3mf').onclick = function () {
    if (!entries.length) return;
    var bytes = X.threeMF(entries, exportOpts());
    X.download(bytes, baseName() + '.3mf', 'model/3mf');
  };

  /* تقريرُ التشخيص: يبني الملفَّ ثم يكتب ما فيه نصّاً — الأجزاءُ
   * وأدوارُها وألوانُها وأرقامُ فتحاتها، ومحتوى ملفّي الإعداد كاملاً.
   * فإن خرج اللونُ على غير ما صُمّم قُورن المكتوبُ بالمعروض وعُرف
   * أيُّهما أخطأ: الأداةُ أم السلايسر. */
  $('diagBtn').onclick = function () {
    if (!entries.length) return;
    X.threeMF(entries, exportOpts());
    var r = X.report();
    if (!r) return;
    var L2 = [];
    L2.push('تقرير تشخيص — مولّد اللوحات السعودية');
    L2.push('التاريخ: ' + new Date().toISOString());
    L2.push('');
    L2.push('اللوحة: ' + design.spec.label + ' · ' + design.w.toFixed(1) + '×' +
            design.h.toFixed(1) + ' مم · ' + design.color.label);
    L2.push('النقش: ' + (state.engrave ? 'غائر' : 'بارز') +
            ' · الخانات: ' + state.cellStyle + ' · سماكة الخطّ: ' + state.lineWeight);
    L2.push('الطابعة المعلنة : ' + r.machine);
    L2.push('طراز الطابعة    : ' + r.printerModel);
    L2.push('قالب الفلمنت    : ' + r.filamentPreset);
    L2.push('قالب العملية    : ' + r.processPreset);
    L2.push('بطاقة المنشئ    : ' + r.appTag);
    L2.push('قالب الإعدادات  : ' + (r.usedTemplate
            ? 'مستعمَل — ' + r.templateKeys + ' مفتاحاً من ملفّك'
            : 'غير مستعمَل — الإعدادات مبنيّة هنا (' + r.projectKeys.length + ' مفتاحاً)'));
    L2.push('حجم الملف: ' + (r.bytes / 1024).toFixed(0) + ' ك.ب');
    L2.push('');
    if (design.pieces) {
      L2.push('التقسيم        : ' + design.pieces.length + ' قطع · ' +
              design.pieces.map(function (x) { return x.w.toFixed(0); }).join(' + ') + ' مم');
    }
    L2.push('');
    L2.push('— الأجزاء كما كُتبت في الملف —');
    L2.push('الدور        اللون      الفتحة  القطعة  الجسم  المثلثات  الاسم');
    r.parts.forEach(function (p2) {
      L2.push(('' + p2.role).padEnd(12) + ('' + p2.color).padEnd(11) +
              ('' + p2.extruder).padEnd(8) + ('' + p2.piece).padEnd(8) +
              ('' + p2.objectId).padEnd(7) + ('' + p2.triangles).padEnd(10) + p2.name);
    });
    L2.push('');
    L2.push('— ما يجب أن تراه في السلايسر —');
    r.parts.forEach(function (p2) {
      L2.push('  ' + p2.name + ' → الفتحة ' + p2.extruder + ' → يجب أن يكون ' + p2.color);
    });
    L2.push('');
    L2.push('— كيف تتحقّق في السلايسر —');
    L2.push('  ١) انظر «Project Filaments» في اليسار: يجب أن تكون ' +
            r.parts.length + ' فلمنتات لا واحداً.');
    L2.push('     فإن كانت واحداً فالسلايسر لم يقرأ project_settings.config،');
    L2.push('     وغالبُ سببه اسمُ قالب فلمنتٍ لا وجود له في كتالوجه.');
    L2.push('  ٢) إن ظهرت الفلمنتات بعددها ثم خالف اللون، فغيّر رقمَ الفتحة');
    L2.push('     لهذا الجزء من لوحة التصدير — وهذا يعمل دائماً.');
    L2.push('  ٣) افتح الملف بـ File ▸ Open Project لا بالسحب والإفلات:');
    L2.push('     الاستيرادُ يأخذ الشكل وحده ويترك إعدادات المشروع.');
    L2.push('  ٤) إن لم تتغيّر الألوان، حمّل «قالب إعدادات» من لوحة التصدير:');
    L2.push('     صدّر أي مشروع من السلايسر واسحبه هناك، فتُؤخذ إعداداتُه');
    L2.push('     كاملةً وتُدمج فيها ألوانُك — ولا يبقى سببٌ للرفض.');
    L2.push('  ٥) إن كانت الطابعة موصولةً وAMS مزامَناً، فالسلايسر يأخذ');
    L2.push('     ألوانَ الفلمنت من البكرات الفعلية ويتجاهل ما في الملف.');
    L2.push('     أوقف المزامنة، أو استعمل رقمَ الفتحة للتوجيه.');
    L2.push('');
    L2.push('— محتويات الملف —');
    r.files.forEach(function (f) { L2.push('  ' + f); });
    L2.push('');
    L2.push('— Metadata/model_settings.config —');
    L2.push(r.modelSettings);
    L2.push('— Metadata/project_settings.config —');
    L2.push(r.projectSettings);
    var blob = L2.join('\n');
    X.download(new TextEncoder().encode(blob), 'تقرير-التشخيص.txt', 'text/plain;charset=utf-8');
  };

  /* وجهُ اللوحة SVG.
   *
   * يُبنى بنقشٍ بارزٍ وبلا تقسيمٍ مهما كان المعروض: الغرضُ صورةُ
   * اللوحة كما تُقرأ، لا حكايةُ المجسّم. فالنقشُ الغائر لو صُدِّر
   * كما هو خرجت الحروفُ ثقوباً بلون القاعدة فلا يُرى شيء، والتقسيمُ
   * يقطّع الوجه أجزاءً لا معنى لها في الصورة.
   */
  $('dlsvg').onclick = function () {
    var cfg = buildCfg();
    cfg.engrave = false;
    cfg.split = false;
    var faceDesign;
    try { faceDesign = L.build(cfg); }
    catch (e) { showWarnings(['تعذّر بناء الوجه: ' + e.message]); return; }
    var bytes = X.svgFace(faceDesign);
    if (!bytes) return;
    X.download(bytes, baseName() + '-وجه.svg', 'image/svg+xml');
  };

  $('dlstls').onclick = function () {
    if (!entries.length) return;
    groupByColor().forEach(function (g, i) {
      var label = g.list.map(function (e) { return e.part.role; })[0];
      var nm = baseName() + '-' + (i + 1) + '-' + label + '.stl';
      X.download(X.stlBinary(g.list, nm), nm, 'model/stl');
    });
  };

  $('dlone').onclick = function () {
    if (!entries.length) return;
    var nm = baseName() + '-مدمج.stl';
    X.download(X.stlBinary(entries, nm), nm, 'model/stl');
  };

  // ————————————————————————————————————————
  //  الإقلاع
  // ————————————————————————————————————————
  /* يدفع الحالة إلى كل عناصر الواجهة — يخدم زرَّ إعادة الافتراضي
   * وأيَّ تغييرٍ يمسّ أكثر من عنصر. */
  function syncAll() {
    Object.keys(SLIDERS).forEach(function (id) {
      var el = $(id), out = $(id + 'V');
      if (!el) return;
      el.value = state[id];
      if (out) out.textContent = (+state[id]).toFixed(SLIDERS[id].dp) + SLIDERS[id].unit;
    });
    ['blank', 'innerLines', 'bandWords', 'logoSync', 'glyphLink', 'joinText', 'screwHoles', 'magnet',
     'keyring', 'mirrorHole', 'wallMount', 'stand', 'split',
     'logoFlipX', 'logoFlipY'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.checked = !!state[id];
      if (el.parentElement) el.parentElement.classList.toggle('on', el.checked);
    });
    ['digits', 'letters', 'lettersLa', 'digitsAr',
     'bandTextAr', 'bandTextLa'].forEach(function (k) {
      if ($(k)) $(k).value = state[k] || '';
    });
    [['rowTopChips', 'rowTop'], ['rowBottomChips', 'rowBottom'],
     ['digitsTopChips', 'digitsTop'], ['digitsBottomChips', 'digitsBottom']]
      .forEach(function (x) {
        mark('#' + x[0] + ' .chip', function (c) {
          c.classList.toggle('on', c.dataset.id === state[x[1]]);
        });
      });
    syncRowRows();
    $('nozzle').value = String(state.nozzle);
    $('logoColor').value = state.logoColor;
    $('inkColor').value = state.inkColor || '#111111';
    $('baseColor').value = state.baseColor || '#F2F2EE';
    mark('#symChips .chip', function (c) {
      c.classList.toggle('on', c.dataset.id === (state.symbol || ''));
    });

    function mark(sel, test) {
      [].forEach.call(document.querySelectorAll(sel), test);
    }
    mark('#typeChips .chip', function (c) { c.classList.toggle('on', c.dataset.id === state.type); });
    mark('#logoChips .chip', function (c) { c.classList.toggle('on', c.dataset.id === state.logo); });
    mark('#keyPos .chip', function (c) { c.classList.toggle('on', c.dataset.id === state.keyringPos); });
    mark('#cellStyleChips .chip', function (c) { c.classList.toggle('on', c.dataset.id === state.cellStyle); });
    $('strokeRow').classList.toggle('hidden', state.cellStyle === 'none');
    $('radiusRow').classList.toggle('hidden', state.cellStyle !== 'grid');
    $('machine').value = state.machine;
    mark('[data-mag]', function (c) { c.classList.toggle('on', +c.dataset.mag === state.magnetCount); });
    mark('[data-wallc]', function (c) { c.classList.toggle('on', +c.dataset.wallc === state.wallCount); });

    syncEngrave();
    syncWidthSlider();
    updateTypeNote();

    $('textSec').classList.toggle('hidden', state.blank);
    $('screwRow').classList.toggle('hidden', !state.screwHoles);
    ['magRow1', 'magRow2', 'magRow3'].forEach(function (r) {
      $(r).classList.toggle('hidden', !state.magnet);
    });
    ['keyRow0', 'keyRow', 'keyRow2'].forEach(function (r) {
      $(r).classList.toggle('hidden', !state.keyring);
    });
    ['wallRow', 'wallRow2'].forEach(function (r) {
      $(r).classList.toggle('hidden', !state.wallMount);
    });
    $('standRow').classList.toggle('hidden', !state.stand);
    ['splitRow', 'splitRow2', 'splitNote'].forEach(function (r) {
      $(r).classList.toggle('hidden', !state.split);
    });
  }

  $('resetAll').onclick = function () {
    var keep = state.logoRaw, keepTpl = state.settingsTemplate;
    for (var k in DEFAULTS) state[k] = DEFAULTS[k];
    state.logoRaw = keep;                    // الملف المرفوع يبقى محمّلاً
    state.settingsTemplate = keepTpl;
    syncAll();
    refresh();
    frameCamera('iso');
  };

  // منفذ فحص: يتيح تحريك الكاميرا وقراءة الحالة من الخارج عند الاختبار
  window.PlateApp = {
    state: state, rebuild: rebuild, frameCamera: frameCamera, refresh: refresh,
    camera: camera, controls: controls, scene: scene,
    get design() { return design; },
    get entries() { return entries; },
    look: function (x, y, z, tx, ty) {
      camera.position.set(x, y, z);
      controls.target.set(tx || 0, ty || 0, 0);
      controls.update();
    }
  };

  syncAll();
  resize();
  rebuild();
  frameCamera('iso');
  animate();
  setTimeout(resize, 60);
})();
