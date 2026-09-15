/* مصدّرات STL و 3MF — بلا أي مكتبة خارجية
 *
 * 3MF يُبنى كأرشيف ZIP بلا ضغط (طريقة STORE)، وهي صيغة صالحة تماماً
 * ويقرأها Bambu Studio و Orca و PrusaSlicer.
 */
(function (global) {
  'use strict';

  // ————— CRC32 —————
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) { return new TextEncoder().encode(str); }

  // ————— كاتب ZIP بطريقة STORE —————
  function zipStore(files) {
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = utf8(f.name);
      var data = typeof f.data === 'string' ? utf8(f.data) : f.data;
      var crc = crc32(data);

      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);           // نسخة
      lh.setUint16(6, 0x0800, true);       // علم UTF-8
      lh.setUint16(8, 0, true);            // بلا ضغط
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x2821, true);  // وقت/تاريخ ثابتان
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x2821, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);

      offset += 30 + name.length + data.length;
    });

    var centralSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, files.length, true);
    eocd.setUint16(10, files.length, true);
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, offset, true);

    var all = chunks.concat(central, [new Uint8Array(eocd.buffer)]);
    var total = all.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  // ————— PNG مصمت (مصغّرة المشروع) —————
  /* ملفّ مشروع Bambu يحمل مصغّرةً في Metadata/plate_1.png وعلاقةً
   * إليها في _rels. ووجودُها من علامات «هذا مشروع لا مجرّد شكل».
   * فتُبنى هنا صورةٌ مصمتة بلون اللوحة — بلا مكتبة ضغط: زليب
   * يقبل كتلاً مخزّنةً بلا ضغط، وهي ما نكتبه. */
  function adler32(buf) {
    var a = 1, b = 0;
    for (var i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  function pngChunk(type, data) {
    var out = new Uint8Array(12 + data.length);
    var dv = new DataView(out.buffer);
    dv.setUint32(0, data.length, false);
    var t = utf8(type);
    out.set(t, 4);
    out.set(data, 8);
    var crcBuf = new Uint8Array(4 + data.length);
    crcBuf.set(t, 0); crcBuf.set(data, 4);
    dv.setUint32(8 + data.length, crc32(crcBuf), false);
    return out;
  }

  function pngSolid(w, h, hex) {
    var c = (hex || '#cccccc').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16),
        b = parseInt(c.slice(4, 6), 16);

    // صفوف الصورة: بايت المرشّح ثم البكسلات RGBA
    var raw = new Uint8Array(h * (1 + w * 4));
    var o = 0;
    for (var y = 0; y < h; y++) {
      raw[o++] = 0;
      for (var x = 0; x < w; x++) { raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = 255; }
    }

    // زليب بكتلٍ مخزّنة
    var blocks = [], pos = 0;
    while (pos < raw.length) {
      var len = Math.min(65535, raw.length - pos);
      var last = (pos + len >= raw.length) ? 1 : 0;
      var head = new Uint8Array(5);
      head[0] = last;
      head[1] = len & 0xFF; head[2] = (len >> 8) & 0xFF;
      head[3] = (~len) & 0xFF; head[4] = ((~len) >> 8) & 0xFF;
      blocks.push(head, raw.subarray(pos, pos + len));
      pos += len;
    }
    var zLen = 2 + blocks.reduce(function (a, x) { return a + x.length; }, 0) + 4;
    var z = new Uint8Array(zLen);
    z[0] = 0x78; z[1] = 0x01;
    var zp = 2;
    blocks.forEach(function (x) { z.set(x, zp); zp += x.length; });
    new DataView(z.buffer).setUint32(zp, adler32(raw), false);

    var ihdr = new Uint8Array(13);
    var dv2 = new DataView(ihdr.buffer);
    dv2.setUint32(0, w, false); dv2.setUint32(4, h, false);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    var sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    var parts2 = [sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', z),
                  pngChunk('IEND', new Uint8Array(0))];
    var total = parts2.reduce(function (a, x) { return a + x.length; }, 0);
    var png = new Uint8Array(total), pp = 0;
    parts2.forEach(function (x) { png.set(x, pp); pp += x.length; });
    return png;
  }

  // ————— قارئ ZIP (لقالب الإعدادات) —————
  /**
   * يقرأ ملفّاً واحداً من أرشيف ZIP.
   *
   * ملفّات Bambu مضغوطة بـ DEFLATE، وكاتبُنا يكتب بلا ضغط. فللقراءة
   * منها نحتاج فكَّ الضغط، ويكفينا فيه `DecompressionStream` المتاحُ
   * في المتصفّح — بلا مكتبة.
   */
  async function zipRead(bytes, wanted) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // نهاية الدليل المركزي
    var eocd = -1;
    for (var i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('ليس أرشيف ZIP سليماً');
    var count = dv.getUint16(eocd + 10, true);
    var off = dv.getUint32(eocd + 16, true);
    var dec = new TextDecoder();

    for (var k = 0; k < count; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      var method = dv.getUint16(off + 10, true);
      var compSize = dv.getUint32(off + 20, true);
      var nameLen = dv.getUint16(off + 28, true);
      var extraLen = dv.getUint16(off + 30, true);
      var cmtLen = dv.getUint16(off + 32, true);
      var lho = dv.getUint32(off + 42, true);
      var name = dec.decode(bytes.subarray(off + 46, off + 46 + nameLen));
      off += 46 + nameLen + extraLen + cmtLen;
      if (name !== wanted) continue;

      var lNameLen = dv.getUint16(lho + 26, true);
      var lExtraLen = dv.getUint16(lho + 28, true);
      var start = lho + 30 + lNameLen + lExtraLen;
      var raw = bytes.subarray(start, start + compSize);
      if (method === 0) return dec.decode(raw);
      if (method !== 8) throw new Error('ضغط غير مدعوم: ' + method);
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('المتصفّح لا يدعم فكّ الضغط');
      }
      var ds = new DecompressionStream('deflate-raw');
      var stream = new Blob([raw]).stream().pipeThrough(ds);
      var buf = await new Response(stream).arrayBuffer();
      return dec.decode(new Uint8Array(buf));
    }
    return null;
  }

  /** يقرأ قالب إعدادات المشروع من ملف 3MF صادر عن السلايسر */
  async function readSettingsTemplate(bytes) {
    var txt = await zipRead(bytes, 'Metadata/project_settings.config');
    if (!txt) throw new Error('لا يحوي الملف Metadata/project_settings.config');
    var j = JSON.parse(txt);
    if (!j.filament_colour) throw new Error('القالب بلا ألوان فلمنت');
    return j;
  }

  /* مفاتيحُ طولُها يساوي عددَ الفلمنتات مصادفةً لا لأنها لكل فلمنت:
   * مضلّعاتُ المنصّة أربعُ نقاط، فلو حُجّمت فسدت. */
  var NOT_PER_FILAMENT = {
    bed_exclude_area: 1, printable_area: 1, extruder_printable_area: 1,
    extruder_offset: 1, thumbnails: 1, bed_custom_model: 1, bed_custom_texture: 1,
    head_wrap_detect_zone: 1
  };

  /**
   * يدمج ألواني في قالب إعداداتٍ حقيقيّ.
   *
   * وهذا هو الفرق الجوهري: بدل أن أكتب سبعةَ عشرَ مفتاحاً وأرجو أن
   * يقبلها السلايسر، آخذ إعداداتِه هو — خمسَ مئةٍ وإحدى وسبعين مفتاحاً
   * خرجت من يده — ولا أغيّر فيها إلّا ما يخصّ الفلمنت: لونَه وعددَه.
   * فلا مجال لرفضٍ بسبب مفتاحٍ ناقصٍ أو اسمِ قالبٍ لا يعرفه.
   */
  function mergeTemplate(tpl, hexColors) {
    var out = {}, k;
    for (k in tpl) out[k] = tpl[k];
    var n0 = (tpl.filament_colour || []).length || 1;
    var N = hexColors.length;

    for (k in out) {
      var v = out[k];
      if (!Array.isArray(v) || v.length !== n0 || NOT_PER_FILAMENT[k]) continue;
      var r = [];
      for (var i = 0; i < N; i++) r.push(v[i % v.length]);
      out[k] = r;
    }
    out.filament_colour = hexColors.slice();
    if (out.filament_multi_colour) out.filament_multi_colour = hexColors.slice();
    out.from = 'project';
    out.name = 'project_settings';
    return out;
  }

  // ————— STL ثنائي —————
  function stlBinary(entries, title) {
    var count = 0;
    entries.forEach(function (e) { count += global.PlateGeometry.triangles(e.geometry).count; });
    var buf = new ArrayBuffer(84 + count * 50);
    var dv = new DataView(buf);
    var head = utf8(('مولّد لوحات سعودية — ' + (title || '')).slice(0, 78));
    new Uint8Array(buf, 0, 80).set(head.slice(0, 80));
    dv.setUint32(80, count, true);

    var o = 84;
    entries.forEach(function (e) {
      var t = global.PlateGeometry.triangles(e.geometry);
      var pos = t.position, nor = t.normal;
      for (var i = 0; i < pos.length; i += 9) {
        var nx = 0, ny = 0, nz = 0;
        if (nor) { nx = nor[i]; ny = nor[i + 1]; nz = nor[i + 2]; }
        dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true);
        o += 12;
        for (var v = 0; v < 9; v++) { dv.setFloat32(o, pos[i + v], true); o += 4; }
        dv.setUint16(o, 0, true); o += 2;
      }
    });
    return new Uint8Array(buf);
  }

  // ————— 3MF —————
  function xmlEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 3MF بصيغة Bambu Studio / Orca.
   *
   * التلوينُ لا يأتي من basematerials — هذه يتجاهلها السلايسر.
   * والذي يقرؤه فعلاً هو Metadata/model_settings.config: جسمٌ واحد
   * مركّبٌ من «أجزاء»، ولكلِّ جزءٍ رقمُ إكسترودر. فتُبنى الملفّات هكذا:
   *
   *   3D/3dmodel.model                  أجسامُ الشِّباك + جسمٌ يجمعها components
   *   Metadata/model_settings.config    جزءٌ لكل لون برقم إكسترودره
   *   Metadata/project_settings.config  ألوانُ الفلمنت لتخرج كما صُمّمت
   *   Metadata/slice_info.config        ترويسة يعرفها السلايسر
   *
   * وقد بُنيت هذه على قراءة ملفِ مشروعٍ حقيقيّ من Bambu. ولا تحمل
   * basematerials: يتجاهلها السلايسر. وتحمل project_settings كاملَ
   * المفاتيح الإلزامية، فالناقصُ منها يُرفض ويضيع معه ما بعده.
   */
  function threeMF(entries, opts) {
    opts = opts || {};
    var NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
    var BS = 'http://schemas.bambulab.com/package/2021';
    var MS = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';

    /* خانةُ «المنشئ».
     *
     * السلايسر يُقارب ملفّاتِ نفسه مقاربةً غيرَ ما يقارب به ملفّاً
     * مستورَداً: يثق بإعدادات الأوّل ويقرؤها مشروعاً، ويأخذ من
     * الثاني الشكلَ وحده. فتُكتب هنا بطاقةُ برنامجه.
     *
     * وهذا تصريحُ توافقٍ في صيغةِ ملفٍّ لا ادّعاءُ نسبة، وقد أذن به
     * صاحبُ المشروع صراحةً بعد أن استُؤذن. ومن أراد بطاقةً صادقة
     * فليضع appTag = 'KSA Plate Generator' هنا. */
    var appTag = opts.appTag || 'BambuStudio-02.07.01.57';
    var today = new Date().toISOString().slice(0, 10);


    // جسمٌ واحد لكل لون: القاعدة وطبقاتها جسم، والنقش جسم، والشعار جسم
    /* المفتاحُ (قطعةٌ × لون) لا اللونُ وحده: القطعُ تُطبع منفصلةً
     * فلا تُدمج شِباكُها، وداخلَ كلِّ قطعةٍ جسمٌ لكل لونٍ ليُسنَد
     * إلى فتحته. */
    var byColor = [], index = Object.create(null);
    entries.forEach(function (e) {
      var pc = (e.part.piece === undefined || e.part.piece === null) ? '' : e.part.piece;
      var key = pc + '|' + e.part.color;
      if (index[key] === undefined) {
        index[key] = byColor.length;
        byColor.push({ color: e.part.color, name: e.part.name, role: e.part.role,
                       piece: pc, list: [] });
      }
      byColor[index[key]].list.push(e);
    });

    var objects = [], parts = [], components = [], mats = [], colors = [];
    var pieceObjects = [];
    var matId = byColor.length + 900;    // basematerials — المواصفة الأساسية
    var colId = byColor.length + 901;    // m:colorgroup — امتداد المواد

    /* لونٌ لكلِّ فتحةٍ لا لكلِّ مجموعة.
     *
     * القطعُ تكرّر المجموعات: لوحةٌ من قطعتين بثلاثة ألوانٍ تخرج
     * ستَّ مجموعات. ولو بُنيت قائمةُ الفلمنت منها لطُلبت ستُّ بكرات
     * لثلاثة ألوان. فالقائمةُ تُبنى على أرقام الفتحات، وكلُّ مجموعةٍ
     * تشير إلى فتحتها. */
    var exColor = Object.create(null), maxEx = 1;
    byColor.forEach(function (g) {
      var e = (opts.extruders && opts.extruders[g.role]) || 1;
      g.extruder = e;
      if (!exColor[e]) exColor[e] = g.color;
      if (e > maxEx) maxEx = e;
    });
    var slotColors = [];
    for (var si2 = 1; si2 <= maxEx; si2++) {
      var sc = exColor[si2] || '#FFFFFF';
      slotColors.push(sc);
      mats.push('   <base name="فتحة ' + si2 + '" displaycolor="' + hexToRGBA(sc) + '"/>');
      colors.push('   <m:color color="' + hexToRGBA(sc) + '"/>');
    }

    byColor.forEach(function (grp, idx) {
      var id = idx + 1;
      var map = Object.create(null), verts = [], tris = [];
      grp.list.forEach(function (e) {
        var pos = global.PlateGeometry.triangles(e.geometry).position;
        for (var i = 0; i < pos.length; i += 3) {
          var x = +pos[i].toFixed(4), y = +pos[i + 1].toFixed(4), z = +pos[i + 2].toFixed(4);
          var key = x + ',' + y + ',' + z;
          var vi = map[key];
          if (vi === undefined) { vi = verts.length; map[key] = vi; verts.push([x, y, z]); }
          tris.push(vi);
        }
      });
      var vx = verts.map(function (v) {
        return '     <vertex x="' + v[0] + '" y="' + v[1] + '" z="' + v[2] + '"/>';
      }).join('\n');
      var tx = [], faces = 0;
      for (var k = 0; k < tris.length; k += 3) {
        if (tris[k] === tris[k + 1] || tris[k + 1] === tris[k + 2] || tris[k] === tris[k + 2]) continue;
        tx.push('     <triangle v1="' + tris[k] + '" v2="' + tris[k + 1] + '" v3="' + tris[k + 2] + '"/>');
        faces++;
      }

      objects.push(
        '  <object id="' + id + '" type="model" name="' + xmlEscape(grp.name) +
        '" pid="' + matId + '" pindex="' + (grp.extruder - 1) + '">\n   <mesh>\n    <vertices>\n' + vx +
        '\n    </vertices>\n    <triangles>\n' + tx.join('\n') +
        '\n    </triangles>\n   </mesh>\n  </object>');

      components.push('    <component objectid="' + id +
                      '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>');

      var ex = grp.extruder;
      // السلايسر يكتب الإكسترودر على الجسم وعلى الجزء معاً
      parts.push(
        '    <part id="' + id + '" subtype="normal_part">\n' +
        '      <metadata key="name" value="' + xmlEscape(grp.name) + '"/>\n' +
        '      <metadata key="extruder" value="' + ex + '"/>\n' +
        '      <mesh_stat face_count="' + faces + '" edges_fixed="0" degenerate_facets="0"' +
        ' facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n' +
        '    </part>');
    });

    /* تجميعُ الأجسام في «قطع»: كلُّ قطعةٍ جسمٌ مركّب يوضع على المنصّة
     * وحده. فلو قُسّمت اللوحةُ ثلاثاً بثلاثة ألوان خرجت تسعةُ أجسام
     * في ثلاث مجموعاتٍ مرتّبة، لا كومةً واحدة. */
    var pieceKeys = [], pieceMap = Object.create(null);
    byColor.forEach(function (g, i) {
      var k = String(g.piece);
      if (!pieceMap[k]) { pieceMap[k] = []; pieceKeys.push(k); }
      pieceMap[k].push(i);
    });

    var bx = opts.bedX || 128, by = opts.bedY || 128;
    var layout = opts.pieceLayout || {};
    var items = [];
    var nextId = byColor.length + 1;

    pieceKeys.forEach(function (k) {
      var ids = pieceMap[k];
      var comps = ids.map(function (i) {
        return '    <component objectid="' + (i + 1) +
               '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>';
      });
      var aid = nextId++;
      objects.push('  <object id="' + aid + '" type="model" name="' +
                   xmlEscape((opts.title || 'لوحة') + (k ? ' · ' + k : '')) +
                   '">\n   <components>\n' + comps.join('\n') +
                   '\n   </components>\n  </object>');
      var off = layout[k] || { dx: 0, dy: 0 };
      items.push('  <item objectid="' + aid + '" transform="1 0 0 0 1 0 0 0 1 ' +
                 (bx + off.dx).toFixed(3) + ' ' + (by + off.dy).toFixed(3) +
                 ' 0" printable="1"/>');
      pieceObjects.push({ id: aid, key: k, partIds: ids.map(function (i) { return i + 1; }) });
    });

    var model =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<model unit="millimeter" xml:lang="en-US" xmlns="' + NS +
      '" xmlns:m="' + MS + '" xmlns:BambuStudio="' + BS + '">\n' +
      ' <metadata name="Application">' + appTag + '</metadata>\n' +
      ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n' +
      ' <metadata name="CreationDate">' + today + '</metadata>\n' +
      ' <metadata name="Title">' + xmlEscape(opts.title || 'لوحة سعودية') + '</metadata>\n' +
      ' <resources>\n' +
      '  <basematerials id="' + matId + '">\n' + mats.join('\n') + '\n  </basematerials>\n' +
      '  <m:colorgroup id="' + colId + '">\n' + colors.join('\n') + '\n  </m:colorgroup>\n' +
      objects.join('\n') + '\n' +
      ' </resources>\n' +
      ' <build>\n' + items.join('\n') + '\n </build>\n' +
      '</model>\n';

    var modelSettings =
      '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' +
      pieceObjects.map(function (po) {
        return '  <object id="' + po.id + '">\n' +
               '    <metadata key="name" value="' +
               xmlEscape((opts.title || 'لوحة') + (po.key ? ' · ' + po.key : '')) + '"/>\n' +
               po.partIds.map(function (id) { return parts[id - 1]; }).join('\n') +
               '\n  </object>';
      }).join('\n') + '\n</config>\n';

    /* ألوانُ الفلمنت.
     *
     * `filament_settings_id` في ملفّات السلايسر اسمُ قالبٍ مربوطٍ
     * بالطابعة نفسها — «Generic PLA @BBL A1» مثلاً. وكتابةُ اسمٍ
     * لا وجودَ له تُبطل قسمَ الفلمنت كلَّه، ومعه الألوان. ولأن
     * الطابعة غير معروفة هنا، لا يُذكر القالبُ أصلاً ويُكتفى
     * باللون مع المفاتيح الإلزامية.
     *
     * ويبقى الأهمّ: اللونُ الذي تراه في السلايسر هو لونُ الفلمنت
     * في الفتحة التي أُسنِد إليها الجزء. فإن كان الأصفر في الفتحة
     * الثانية، وُجّهت القاعدةُ إلى الثانية — وهذا ما تفعله
     * «أرقام الإكسترودر» في الواجهة. */
    var n = slotColors.length;
    var M = opts.printer || null;      // انظر PRINTERS في app.js
    var rep = function (v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; };

    /* تعريفُ الطابعة لا يكفيه اسمُها.
     *
     * ملفُّ مشروعٍ حقيقيٍّ من Bambu يعرّف طابعتَه بخمسةِ مفاتيح لا
     * بواحد: `printer_model` و`printer_variant` و`nozzle_diameter`
     * و`printer_settings_id` و`print_settings_id`. وكنتُ أكتب الأخير
     * وحده، فلا يستطيع السلايسر أن يحلّ الطابعة، فيُسقط قسمَ
     * الفلمنت كلَّه ومعه الألوان — وهو ما ظهر في «Project Filaments: 1».
     *
     * وقالبُ الفلمنت لا يصلح أيُّ اسم: لكلِّ قالبٍ قائمةُ طابعاتٍ
     * متوافقة. قرأتُ كتالوجَ القوالب المثبّت (BBL.json وملفّاته)
     * وتحقّقتُ من كل اسمٍ هنا أنه موجودٌ ومتوافقٌ مع طابعته. */
    var ps = {
      from: 'project',
      version: (opts.template && opts.template.version) || '02.07.00.00',
      name: 'project_settings',
      filament_colour: slotColors.map(hexToRGB),
      filament_type: rep('PLA'),
      filament_ids: rep('GFL99'),
      filament_vendor: rep('Generic'),
      filament_is_support: rep('0')
    };
    if (M) {
      ps.filament_settings_id = rep(M.filament);
      ps.printer_settings_id = M.settings;
      ps.print_settings_id = M.process;
      ps.printer_model = M.model;
      ps.printer_variant = M.variant;
      ps.nozzle_diameter = [M.variant];
      ps.curr_bed_type = 'Textured PEI Plate';
    }
    var hexColors = slotColors.map(hexToRGB);
    ps.filament_multi_colour = hexColors.slice();

    var usedTemplate = false;
    if (opts.template) {
      try {
        ps = mergeTemplate(opts.template, hexColors);
        usedTemplate = true;
      } catch (e) { /* يُكتفى بالمبني هنا */ }
    }
    var projectSettings = JSON.stringify(ps, null, 2);
    var projectKeys = Object.keys(ps);

    var sliceInfo =
      '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n' +
      '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n' +
      '    <header_item key="X-BBL-Client-Version" value="' +
      xmlEscape(appTag.replace(/^BambuStudio-/, '')) + '"/>\n' +
      '  </header>\n</config>\n';

    var contentTypes =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>' +
      '<Default Extension="png" ContentType="image/png"/>' +
      '<Default Extension="gcode" ContentType="text/x.gcode"/>' +
      '</Types>';

    var rels =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" ' +
      'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
      ' <Relationship Target="/Metadata/plate_1.png" Id="rel-2" ' +
      'Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>\n' +
      ' <Relationship Target="/Metadata/plate_1.png" Id="rel-4" ' +
      'Type="http://schemas.bambulab.com/package/2021/cover-thumbnail-middle"/>\n' +
      ' <Relationship Target="/Metadata/plate_1_small.png" Id="rel-5" ' +
      'Type="http://schemas.bambulab.com/package/2021/cover-thumbnail-small"/>\n' +
      '</Relationships>';

    var plateJson = JSON.stringify({
      bbox_objects: [],
      filament_ids: byColor.map(function (g, i) {
        return (opts.extruders && opts.extruders[g.role]) || (i + 1);
      }),
      first_extruder: 1,
      index: 1,
      is_seq_print: false,
      nozzle_diameter: 0.4
    }, null, 1);

    var thumbBig = pngSolid(96, 96, byColor[0] ? byColor[0].color : '#cccccc');
    var thumbSmall = pngSolid(32, 32, byColor[0] ? byColor[0].color : '#cccccc');

    var cutInfo =
      '<?xml version="1.0" encoding="UTF-8"?>\n<objects>\n' +
      pieceObjects.map(function (po) {
        return '  <object id="' + po.id + '">\n' +
               '    <cut_id id="0" check_sum="1" connectors_cnt="0"/>\n  </object>';
      }).join('\n') + '\n</objects>\n';

    var filamentSeq = JSON.stringify({
      plate_1: { nozzle_sequence: [], optimal_assignment: [], sequence: [] }
    });

    var bytes = zipStore([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rels },
      { name: '3D/3dmodel.model', data: model },
      { name: 'Metadata/model_settings.config', data: modelSettings },
      { name: 'Metadata/project_settings.config', data: projectSettings },
      { name: 'Metadata/slice_info.config', data: sliceInfo },
      { name: 'Metadata/plate_1.json', data: plateJson },
      { name: 'Metadata/plate_1.png', data: thumbBig },
      { name: 'Metadata/plate_1_small.png', data: thumbSmall },
      { name: 'Metadata/plate_no_light_1.png', data: thumbBig },
      { name: 'Metadata/top_1.png', data: thumbSmall },
      { name: 'Metadata/pick_1.png', data: thumbSmall },
      { name: 'Metadata/cut_information.xml', data: cutInfo },
      { name: 'Metadata/filament_sequence.json', data: filamentSeq }
    ]);

    /* تقريرٌ يرافق البايتات: ما كُتب في الملف بالضبط، ليُقارن بما
     * يعرضه السلايسر. لا يُخمَّن موضعُ الخلل بل يُقرأ. */
    lastReport = {
      pieceCount: pieceObjects.length,
      parts: byColor.map(function (g, i) {
        return { name: g.name, role: g.role, color: hexToRGB(g.color),
                 piece: g.piece === '' ? '—' : g.piece, objectId: i + 1,
                 extruder: (opts.extruders && opts.extruders[g.role]) || (i + 1),
                 triangles: g.list.reduce(function (a, e) {
                   return a + global.PlateGeometry.triangles(e.geometry).count; }, 0) };
      }),
      files: ['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model',
              'Metadata/model_settings.config', 'Metadata/project_settings.config',
              'Metadata/slice_info.config', 'Metadata/plate_1.json',
              'Metadata/plate_1.png', 'Metadata/plate_1_small.png',
              'Metadata/plate_no_light_1.png', 'Metadata/top_1.png',
              'Metadata/pick_1.png', 'Metadata/cut_information.xml',
              'Metadata/filament_sequence.json'],
      projectKeys: projectKeys,
      usedTemplate: usedTemplate,
      appTag: appTag,
      templateKeys: opts.template ? Object.keys(opts.template).length : 0,
      machine: M ? M.settings : '(غير محدّد)',
      printerModel: M ? M.model : '(غير محدّد)',
      filamentPreset: M ? M.filament : '(غير محدّد)',
      processPreset: M ? M.process : '(غير محدّد)',
      modelSettings: modelSettings,
      projectSettings: projectSettings,
      bytes: bytes.length
    };
    return bytes;
  }

  var lastReport = null;
  function report() { return lastReport; }

  function hexToRGB(hex) {
    var h = (hex || '#cccccc').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h.toUpperCase();
  }

  function hexToRGBA(hex) {
    var h = (hex || '#cccccc').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h.toUpperCase() + 'FF';
  }

  // ————— وجهُ اللوحة ملفَّ SVG —————
  /**
   * يكتب وجهَ اللوحة رسماً متّجهاً بمقاسه الحقيقيّ بالمليمتر.
   *
   * ومحرّكُ التخطيط يبني كلَّ شيءٍ كنتوراتٍ ثنائيةَ الأبعاد قبل البثق،
   * فالوجهُ حاضرٌ أصلاً ولا يحتاج إلّا كتابةً. ولذلك يخرج الملفُّ
   * متّجهاً نقيّاً — لا صورةً — يُكبَّر بلا حدّ ويُفتح في كانفا
   * وإنكسكيب وإلستريتور بمقاسه الصحيح.
   *
   * وثلاثةُ أمورٍ تضبط صحّته:
   *
   * ١) محورُ SVG إلى أسفل ومحورُنا إلى أعلى، فيُقلب بـ scale(1,-1)
   *    ويُحسب إطارُ العرض على الإحداثيّ المقلوب.
   *
   * ٢) الأجزاءُ تُرسم بترتيب ارتفاعها في المجسّم، فما علا غطّى ما
   *    تحته — كما تراه العينُ من الأمام.
   *
   * ٣) «المجموعات» تُكتب مساراتٍ مستقلّة. فالأشكالُ المتراكبةُ عمداً —
   *    سعفُ النخلة وملتقى السيفين وحروف «السعودية» — لو جُمعت في
   *    مسارٍ واحدٍ لقرأت قاعدةُ الزوج والفرد تراكبَها ثقباً فنخرته،
   *    وهي العلّةُ نفسُها التي عولجت في بناء المجسّم.
   */
  function num(v) {
    var t = v.toFixed(3);
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t === '-0' ? '0' : t;
  }

  function pathData(contours) {
    var d = [];
    for (var i = 0; i < contours.length; i++) {
      var c = contours[i];
      if (!c || c.length < 3) continue;
      var seg = 'M' + num(c[0].x) + ' ' + num(c[0].y);
      for (var j = 1; j < c.length; j++) seg += 'L' + num(c[j].x) + ' ' + num(c[j].y);
      d.push(seg + 'Z');
    }
    return d.join('');
  }

  function svgFace(design, opts) {
    opts = opts || {};
    var parts = design.parts.filter(function (p) {
      return p.contours && p.contours.length;
    });
    if (!parts.length) return null;

    // إطارُ العرض على كلِّ ما يُرسم — واللسانُ قد يخرج عن اللوحة
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    parts.forEach(function (p) {
      p.contours.forEach(function (c) {
        for (var i = 0; i < c.length; i++) {
          if (c[i].x < x0) x0 = c[i].x;
          if (c[i].x > x1) x1 = c[i].x;
          if (c[i].y < y0) y0 = c[i].y;
          if (c[i].y > y1) y1 = c[i].y;
        }
      });
    });
    var pad = opts.pad || 0;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    var w = x1 - x0, h = y1 - y0;

    var order = parts.map(function (p, i) { return { p: p, i: i }; });
    order.sort(function (a, b) {
      return (a.p.z0 - b.p.z0) || (a.i - b.i);
    });

    var body = [];
    order.forEach(function (o) {
      var p = o.p;
      var groups = p.groups && p.groups.length ? p.groups : [p.contours];
      groups.forEach(function (g) {
        var d = pathData(g);
        if (!d) return;
        body.push('  <path fill="' + p.color + '" fill-rule="evenodd" d="' + d + '"/>');
      });
    });

    var title = (design.spec ? design.spec.label : 'لوحة') + ' — ' +
                design.w.toFixed(0) + '×' + design.h.toFixed(0) + ' مم';
    var out =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"' +
      ' width="' + num(w) + 'mm" height="' + num(h) + 'mm"' +
      ' viewBox="' + num(x0) + ' ' + num(-y1) + ' ' + num(w) + ' ' + num(h) + '">\n' +
      '<title>' + title + '</title>\n' +
      '<g transform="scale(1,-1)">\n' + body.join('\n') +
      '\n</g>\n</svg>\n';
    return new TextEncoder().encode(out);
  }

  function download(bytes, filename, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  global.PlateExport = {
    stlBinary: stlBinary, threeMF: threeMF, zipStore: zipStore, report: report,
    readSettingsTemplate: readSettingsTemplate, zipRead: zipRead,
    download: download, crc32: crc32, svgFace: svgFace
  };
})(typeof window !== 'undefined' ? window : globalThis);
