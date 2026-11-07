// 节日倒数 · Egern 小组件
//
// 结构参考：lylywayr/NetWork-Module「时光倒数」（布局与配色表）
// 透明模式参考：pronounAI/Egern Countdown-Widget
//
// 数据全部内置、运行时不联网：
//   · 农历节日 2024–2050（lunardate 生成）
//   · 二十四节气 2024–2050（cnlunar 生成）
//   · 固定公历节日与「某月第 n 个周几」类（母亲节/父亲节/感恩节）现算

// 农历节日表（春节,元宵,端午,七夕,中秋,重阳,除夕）—— 由 lunardate 一次性生成，运行时无需计算农历
var LUNAR_FEST = {
  2024: "02-10,02-24,06-10,08-10,09-17,10-11,02-09",
  2025: "01-29,02-12,05-31,08-29,10-06,10-29,01-28",
  2026: "02-17,03-03,06-19,08-19,09-25,10-18,02-16",
  2027: "02-06,02-20,06-09,08-08,09-15,10-08,02-05",
  2028: "01-26,02-09,05-28,08-26,10-03,10-26,01-25",
  2029: "02-13,02-27,06-16,08-16,09-22,10-16,02-12",
  2030: "02-03,02-17,06-05,08-05,09-12,10-05,02-02",
  2031: "01-23,02-06,06-24,08-24,10-01,10-24,01-22",
  2032: "02-11,02-25,06-12,08-12,09-19,10-12,02-10",
  2033: "01-31,02-14,06-01,08-01,09-08,10-01,01-30",
  2034: "02-19,03-05,06-20,08-20,09-27,10-20,02-18",
  2035: "02-08,02-22,06-10,08-10,09-16,10-09,02-07",
  2036: "01-28,02-11,05-30,08-28,10-04,10-27,01-27",
  2037: "02-15,03-01,06-18,08-17,09-24,10-17,02-14",
  2038: "02-04,02-18,06-07,08-07,09-13,10-07,02-03",
  2039: "01-24,02-07,05-27,08-26,10-02,10-26,01-23",
  2040: "02-12,02-26,06-14,08-14,09-20,10-14,02-11",
  2041: "02-01,02-15,06-03,08-03,09-10,10-03,01-31",
  2042: "01-22,02-05,06-22,08-22,09-28,10-22,01-21",
  2043: "02-10,02-24,06-11,08-11,09-17,10-11,02-09",
  2044: "01-30,02-13,05-31,07-31,10-05,10-29,01-29",
  2045: "02-17,03-03,06-19,08-19,09-25,10-18,02-16",
  2046: "02-06,02-20,06-08,08-08,09-15,10-08,02-05",
  2047: "01-26,02-09,05-29,08-27,10-04,10-27,01-25",
  2048: "02-14,02-28,06-15,08-16,09-22,10-16,02-13",
  2049: "02-02,02-16,06-04,08-05,09-11,10-05,02-01",
  2050: "01-23,02-06,06-23,08-23,09-30,10-24,01-22",
};

// 二十四节气「日」表：每年 24 个两位数字，依次为
// 小寒 大寒 立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至
var TERM_DAYS = {
  2024: "062004190520041905200521062207220722082307220621",
  2025: "052003180520042005210521072207230723082307220721",
  2026: "052004180520052005210521072307230723082307220722",
  2027: "052004190621052006210621072308230823082307220722",
  2028: "062004190520041905200521062207220722082307220621",
  2029: "052003180520042005210521072207230723082307220721",
  2030: "052004180520052005210521072307230723082307220722",
  2031: "052004190621052006210621072308230823082307220722",
  2032: "062004190520041905200521062207220722082307220621",
  2033: "052003180520042005210521072207230723082307220721",
  2034: "052004180520052005210521072307230723082307220722",
  2035: "052004190621052005210621072307230823082307220722",
  2036: "062004190520041905200521062207220722082307220621",
  2037: "052003180520042005210521072207230723082307220721",
  2038: "052004180520052005210521072307230723082307220722",
  2039: "052004190621052005210621072307230823082307220722",
  2040: "062004190520041905200521062207220722082307220621",
  2041: "052003180520042005200521072207230722082307220721",
  2042: "052004180520042005210521072307230723082307220722",
  2043: "052004190621052005210621072307230823082307220722",
  2044: "062004190520041905200521062207220722072307220621",
  2045: "052003180520041905200521072207230722082307220721",
  2046: "052004180520042005210521072207230723082307220722",
  2047: "052004190621052005210621072307230823082307220722",
  2048: "062004190520041905200520062207220722072307210621",
  2049: "051903180520041905200521062207220722082307220721",
  2050: "052003180520042005210521072207230723082307220722",
};

// ── 节日清单 ────────────────────────────────────────────────
// kind: fixed(公历) / lunar(农历) / term(节气) / nth(某月第 n 个周几)
// cat:  sys(法定与传统) / term(节气) / west(现代与西方节日) / custom(自定义)

var TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

var FIXED = [
  ['元旦', '01-01', 'sys'],
  ['情人节', '02-14', 'west'],
  ['妇女节', '03-08', 'west'],
  ['愚人节', '04-01', 'west'],
  ['劳动节', '05-01', 'sys'],
  ['青年节', '05-04', 'west'],
  ['表白日', '05-20', 'west'],
  ['儿童节', '06-01', 'west'],
  ['教师节', '09-10', 'west'],
  ['万圣夜', '10-31', 'west'],
  ['光棍节', '11-11', 'west'],
  ['双十二', '12-12', 'west'],
  ['平安夜', '12-24', 'west'],
  ['圣诞节', '12-25', 'west'],
  ['跨年夜', '12-31', 'west'],
  ['国庆', '10-01', 'sys'],
];

var LUNAR = [
  ['春节', 0],
  ['元宵', 1],
  ['端午', 2],
  ['七夕', 3],
  ['中秋', 4],
  ['重阳', 5],
  ['除夕', 6],
];

// 第 n 个周几：nth 从 1 开始，weekday 0=周日
var NTH = [
  ['母亲节', 5, 0, 2],
  ['父亲节', 6, 0, 3],
  ['感恩节', 11, 4, 4],
];

var FESTIVALS = [];
FIXED.forEach(function (f) {
  FESTIVALS.push({ name: f[0], kind: 'fixed', md: f[1], cat: f[2] });
});
LUNAR.forEach(function (f) {
  FESTIVALS.push({ name: f[0], kind: 'lunar', idx: f[1], cat: 'sys' });
});
NTH.forEach(function (f) {
  FESTIVALS.push({ name: f[0], kind: 'nth', month: f[1], weekday: f[2], nth: f[3], cat: 'west' });
});
for (var ti = 0; ti < TERM_NAMES.length; ti++) {
  FESTIVALS.push({ name: TERM_NAMES[ti], kind: 'term', idx: ti, cat: 'term' });
}

var DAY = 86400000;

function beijingToday(nowMs) {
  var bj = new Date(nowMs + 8 * 3600000);
  var y = bj.getUTCFullYear();
  var m = bj.getUTCMonth() + 1;
  var d = bj.getUTCDate();
  return { y: y, m: m, d: d, week: bj.getUTCDay(), ms: Date.UTC(y, m - 1, d) };
}

// 21 世纪清明：day = floor(yy*0.2422 + 4.81) - floor(yy/4)，表用完时兜底
function qingmingDay(y) {
  var yy = y % 100;
  return Math.floor(yy * 0.2422 + 4.81) - Math.floor(yy / 4);
}

// 某月第 n 个周几
function nthWeekday(y, m, weekday, nth) {
  var first = new Date(Date.UTC(y, m - 1, 1));
  var offset = (weekday - first.getUTCDay() + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

// 某年某节日对应的公历 {m,d}，没有数据返回 null
function festDate(f, y) {
  if (f.kind === 'fixed') {
    return { m: parseInt(f.md.slice(0, 2), 10), d: parseInt(f.md.slice(3, 5), 10) };
  }
  if (f.kind === 'nth') {
    return { m: f.month, d: nthWeekday(y, f.month, f.weekday, f.nth) };
  }
  if (f.kind === 'term') {
    var trow = TERM_DAYS[y];
    if (trow) return { m: Math.floor(f.idx / 2) + 1, d: parseInt(trow.substr(f.idx * 2, 2), 10) };
    if (f.idx === 6) return { m: 4, d: qingmingDay(y) };
    return null;
  }
  var row = LUNAR_FEST[y];
  if (!row) return null;
  var parts = row.split(',');
  if (parts.length <= f.idx) return null;
  var md = parts[f.idx];
  return { m: parseInt(md.slice(0, 2), 10), d: parseInt(md.slice(3, 5), 10) };
}

// 解析自定义纪念日："结婚纪念日=05-20,生日=1990-03-08"
function parseCustom(raw) {
  var out = [];
  if (!raw || typeof raw !== 'string') return out;
  raw.split(/[,，;；\n]/).forEach(function (seg) {
    seg = seg.trim();
    if (!seg) return;
    var i = seg.indexOf('=');
    if (i < 0) i = seg.indexOf('：');
    if (i < 0) return;
    var name = seg.slice(0, i).trim();
    var val = seg.slice(i + 1).trim();
    if (!name) return;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(val);
    if (m) {
      out.push({ name: name, once: { y: +m[1], m: +m[2], d: +m[3] }, md: m[2] + '/' + m[3] });
      return;
    }
    m = /^(\d{1,2})-(\d{1,2})$/.exec(val);
    if (m) {
      out.push({ name: name, md: { m: +m[1], d: +m[2] }, mdText: m[1] + '/' + m[2] });
    }
  });
  return out;
}

// ── 计算接下来要显示的条目 ────────────────────────────────────
function buildItems(today, env) {
  var items = [];
  var showTerms = String(env.SHOW_TERMS == null ? 'true' : env.SHOW_TERMS).toLowerCase() !== 'false';
  var showWest = String(env.SHOW_WESTERN == null ? 'true' : env.SHOW_WESTERN).toLowerCase() !== 'false';

  FESTIVALS.forEach(function (f) {
    if (!showTerms && f.cat === 'term') return;
    if (!showWest && f.cat === 'west') return;
    for (var y = today.y; y <= today.y + 2; y++) {
      var dt = festDate(f, y);
      if (!dt) continue;
      var ms = Date.UTC(y, dt.m - 1, dt.d);
      if (ms < today.ms) continue;
      items.push({
        name: f.name,
        cat: f.cat,
        days: Math.round((ms - today.ms) / DAY),
        md: dt.m + '/' + dt.d,
      });
      return;
    }
  });

  parseCustom(env.ANNIVERSARIES).forEach(function (c) {
    var ms, mdText;
    if (c.once) {
      ms = Date.UTC(c.once.y, c.once.m - 1, c.once.d);
      mdText = c.md;
      if (ms < today.ms) return;
    } else {
      var thisYear = Date.UTC(today.y, c.md.m - 1, c.md.d);
      ms = thisYear >= today.ms ? thisYear : Date.UTC(today.y + 1, c.md.m - 1, c.md.d);
      mdText = c.mdText;
    }
    items.push({ name: c.name, cat: 'custom', days: Math.round((ms - today.ms) / DAY), md: mdText });
  });

  items.sort(function (a, b) {
    if (a.days !== b.days) return a.days - b.days;
    return a.name < b.name ? -1 : 1;
  });
  return items;
}
// ── SVG 圆环生成 ─────────────────────────────────────────────
// 生成三层圆环 Data URI（轨道 + 内虚线 + 进度弧 + 端点）
// progress: 0~1，color: 进度弧颜色，size: 画布边长，centerIcon: 中心图标 SVG 字符串（可选）
function makeRingSVG(progress, color, size, centerIcon) {
  var cx = size / 2, cy = size / 2;
  var r  = size * 0.386;         // 进度轨道半径
  var ri = size * 0.295;         // 内虚线半径
  var ro = size * 0.466;         // 外装饰圈半径
  var sw = Math.max(2, size * 0.057); // 进度弧线宽
  var circ = 2 * Math.PI * r;
  var dash = circ * Math.min(1, Math.max(0, progress));
  var angle = -Math.PI / 2 + 2 * Math.PI * progress;
  var ex = cx + r * Math.cos(angle);
  var ey = cy + r * Math.sin(angle);

  var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + size + ' ' + size + "'"
    + " width='" + size + "' height='" + size + "'>"
    + "<circle cx='" + cx + "' cy='" + cy + "' r='" + ro + "' fill='none' stroke='" + color + "' stroke-opacity='0.10' stroke-width='1'/>"
    + "<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='none' stroke='" + color + "' stroke-opacity='0.12' stroke-width='" + sw + "'/>"
    + "<circle cx='" + cx + "' cy='" + cy + "' r='" + ri + "' fill='none' stroke='" + color + "' stroke-opacity='0.10' stroke-width='1' stroke-dasharray='3 5'/>"
    + "<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='none' stroke='" + color + "' stroke-width='" + sw + "'"
    + " stroke-dasharray='" + dash.toFixed(1) + ' ' + circ.toFixed(1) + "' stroke-linecap='round'"
    + " transform='rotate(-90 " + cx + ' ' + cy + ")'/>"
    + "<circle cx='" + cx + "' cy='" + (cy - r) + "' r='" + (sw * 0.5) + "' fill='" + color + "' fill-opacity='0.18'/>"
    + (progress > 0.01
      ? "<circle cx='" + ex.toFixed(1) + "' cy='" + ey.toFixed(1) + "' r='" + (sw * 0.78) + "' fill='" + color + "'/>"
      : '')
    + (progress >= 0.999
      ? "<circle cx='" + cx + "' cy='" + cy + "' r='" + (ro + 1) + "' fill='none' stroke='" + color + "' stroke-width='1.5' stroke-opacity='0.2'/>"
      : '')
    + (centerIcon || '')
    + '</svg>';

  // percent 编码：不依赖 btoa，任何运行时都能跑
  return 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27');
}

// 以 (cx,cy) 为几何中心的正五角星（替代手写路径，不会偏）
function starPath(cx, cy, R, opacity, color) {
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var rr = i % 2 === 0 ? R : R * 0.42;
    var a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push((cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2));
  }
  return "<path d='M" + pts.join('L') + "Z' fill='" + color + "' fill-opacity='" + opacity + "'/>";
}

// 计算圆环进度：用当年的节日周期作分母
// 找同名节日上一次出现到这次的天数作 totalDays，默认 365
function ringProgress(item, today) {
  // 粗略：倒计时天数越少进度越高，以 365 天为满圈
  var total = 365;
  var elapsed = total - item.days;
  return Math.max(0, Math.min(1, elapsed / total));
}

// ── 配色（原有，保持不变）────────────────────────────────────
var C = {
  bgWorkday: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
  bgWeekend: [{ light: '#F4F8FF', dark: '#111827' }, { light: '#E6F2FF', dark: '#0B0F19' }],
  bgFest:    [{ light: '#FFF8EC', dark: '#2A1F0E' }, { light: '#FFEFD5', dark: '#1A1208' }],
  main:  { light: '#1C1C1E', dark: '#FFFFFF' },
  sub:   { light: '#48484A', dark: '#D1D1D6' },
  muted: { light: '#8E8E93', dark: '#8E8E93' },
  gold:  { light: '#A07820', dark: '#D6A53A' },
  red:   { light: '#B83028', dark: '#FF453A' },
  green: { light: '#3E6B3E', dark: '#8FBF8F' },
  blue:  { light: '#1A5FA8', dark: '#4A9EE0' },
};

var PILL_BG = { light: 'rgba(0,0,0,0.055)', dark: 'rgba(255,255,255,0.12)' };

function catColor(cat, isToday) {
  if (isToday) return C.red;
  if (cat === 'term')   return C.green;
  if (cat === 'west')   return C.gold;
  return C.main;
}

function ringColor(themeKey, isToday) {
  if (isToday)              return C.red;
  if (themeKey === 'weekend') return C.blue;
  return C.main;
}

function mdToCn(md) {
  var parts = String(md || '').split('/');
  if (parts.length < 2) return md;
  return parseInt(parts[0], 10) + '月' + parseInt(parts[1], 10) + '日';
}

// ── 工具函数（原有）─────────────────────────────────────────
function mkText(text, size, weight, color, opts) {
  var o = { type: 'text', text: String(text == null ? '' : text), font: { size: size, weight: weight }, textColor: color };
  if (opts) for (var k in opts) o[k] = opts[k];
  return o;
}
function mkRow(children, gap, opts) {
  children = children.filter(function (c) { return c; });
  var o = { type: 'stack', direction: 'row', alignItems: 'center', gap: gap || 4, children: children };
  if (opts) for (var k in opts) o[k] = opts[k];
  return o;
}
function mkCol(children, gap, opts) {
  children = children.filter(function (c) { return c; });
  var o = { type: 'stack', direction: 'column', alignItems: 'start', gap: gap || 2, children: children };
  if (opts) for (var k in opts) o[k] = opts[k];
  return o;
}
function mkIcon(name, color, size) {
  return { type: 'image', src: 'sf-symbol:' + name, color: color, width: size, height: size };
}
function mkSpacer(len) {
  return len == null ? { type: 'spacer' } : { type: 'spacer', length: len };
}
function mkImage(src, w, h) {
  return { type: 'image', src: src, width: w, height: h };
}

// ── 新版 pill ─────────────────────────────────────────────────
var DISPLAY_NAME = { '元旦': '元旦', '春节': '春节', '清明': '清明节', '劳动节': '劳动节', '端午': '端午节', '中秋': '中秋节', '国庆': '国庆节' };

function pill(it, st, isToday) {
  var pillBg = isToday ? { light: 'rgba(184,48,40,0.1)', dark: 'rgba(255,69,58,0.15)' } : PILL_BG;
  var pillColor = isToday ? C.red : C.sub;
  var iconName = isToday ? 'circle.fill' : 'paperplane.fill';
  return mkRow([
    mkIcon(iconName, pillColor, Math.round(st.title * 0.65)),
    mkText(
      (DISPLAY_NAME[it.name] || it.name) + ' · ' + mdToCn(it.md),
      st.title * 0.85, 'semibold', pillColor,
      { maxLines: 1, minScale: 0.6 }
    ),
  ], 4, {
    padding: [3, 8],
    backgroundColor: pillBg,
    borderRadius: 10,
    flex: 0,
  });
}

// ── 新版 heroBlock：圆环图片 + 右侧大数字 + pill ──────────────
// 圆环只做装饰，数字完全在圆环外右侧
function heroBlock(it, st, themeKey) {
  var isToday = it.days === 0;
  var rColor   = isToday
    ? (C.red.light)
    : themeKey === 'weekend' ? C.blue.light : C.main.light;

  var progress = ringProgress(it, null);
  if (isToday) progress = 1;

  // 中心图标：用几何中心画，绝对不会偏
  var midR = st.ringSize * 0.14;
  var centerIcon = isToday
    ? starPath(st.ringSize / 2, st.ringSize / 2, midR, 0.42, rColor)
    : "<circle cx='" + (st.ringSize / 2) + "' cy='" + (st.ringSize / 2) + "' r='" + midR * 0.8 + "'" +
      " fill='none' stroke='" + rColor + "' stroke-opacity='0.22' stroke-width='" + (midR * 0.45).toFixed(1) + "'/>";

  var ringDataURI = makeRingSVG(progress, rColor, st.ringSize, centerIcon);
  var ringImg = mkImage(ringDataURI, st.ringSize, st.ringSize);

  var numColor = catColor(it.cat, isToday);
  var numStr   = isToday ? '今天' : String(it.days);
  var numSize  = isToday ? Math.round(st.num * 0.72) : st.num;

  var rightCol = mkCol([
    mkRow([
      mkText(numStr, numSize, 'heavy', numColor, { maxLines: 1, minScale: 0.4 }),
      isToday ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
    ], isToday ? 0 : Math.round(st.num * 0.15), { alignItems: 'end' }),
    pill(it, st, isToday),
  ], Math.round(st.num * 0.1));

  return mkRow([ringImg, rightCol], st.gapHero || 12, { alignItems: 'center' });
}

// ── 新版 cell：格子加日期副标（大号专用）────────────────────
function cellLarge(it, st) {
  var isToday = it.days === 0;
  var daysColor = catColor(it.cat, isToday);
  return mkCol([
    mkText(it.name, st.name, 'medium',
      isToday ? C.red : C.sub, { maxLines: 1, minScale: 0.65 }),
    mkText(isToday ? '今天' : it.days + '天', st.day, 'bold',
      daysColor, { maxLines: 1, minScale: 0.6 }),
    mkText(it.md, Math.round(st.name * 0.85), 'regular',
      C.muted, { maxLines: 1 }),
  ], 1, { flex: 1 });
}

// 中/小号格子（原版，不加日期副标）
function cell(it, st) {
  var isToday = it.days === 0;
  return mkCol([
    mkText(it.name, st.name, 'medium',
      isToday ? C.red : C.sub, { maxLines: 1, minScale: 0.65 }),
    mkText(isToday ? '今天' : it.days + '天', st.day, 'bold',
      catColor(it.cat, isToday), { maxLines: 1, minScale: 0.6 }),
  ], 0, { flex: 1 });
}

// ── 布局参数（扩展 ringSize / gapHero）──────────────────────
var FAMILY_STYLE = {
  systemSmall: {
    pad: 10, cols: 2,
    name: 9, day: 10, num: 18, unit: 9,
    title: 11, heroName: 14,
    gapRow: 3, gapTop: 1, gapMid: 2,
    ringSize: 52, gapHero: 8, heroH: 0,
  },
  systemMedium: {
    pad: 13, cols: 3,
    name: 9, day: 11, num: 24, unit: 10,
    title: 11, heroName: 19,
    gapRow: 4, gapTop: 2, gapMid: 4,
    ringSize: 52, gapHero: 12, heroH: 62,
  },
  systemLarge: {
    pad: 15, cols: 3,
    name: 11, day: 13, num: 52, unit: 16,
    title: 13, heroName: 24,
    gapRow: 0, gapTop: 2, gapMid: 8,
    ringSize: 88, gapHero: 14, heroH: 96,
  },
};

function familyStyle(family) {
  if (family === 'systemSmall') return FAMILY_STYLE.systemSmall;
  if (family === 'systemLarge' || family === 'systemExtraLarge') return FAMILY_STYLE.systemLarge;
  return FAMILY_STYLE.systemMedium;
}

// ── 布局预算（原有逻辑，小调整）────────────────────────────
var LINE   = 1.5;
var SAFETY = 6;

function canvasOf(ctx, family) {
  var size = ctx && ctx.size;
  var w = size && size.width  ? size.width  : (family === 'systemSmall' ? 155 : 329);
  var h = size && size.height ? size.height : (family === 'systemSmall' ? 155 : family === 'systemLarge' || family === 'systemExtraLarge' ? 345 : 155);
  return { w: w, h: h };
}

function estimateLayout(w, h, st, maxItems) {
  var innerH   = h - st.pad * 2;
  var headerH  = st.title * LINE + 4;
  var heroH    = st.heroH || (st.ringSize + st.gapMid);   // hero 区高度（圆环 vs 右侧数字列取大者，已调好）
  var avail    = innerH - headerH - heroH - (st.gapTop || 0) - SAFETY;
  // 大号格子多一行副标题
  var cellLineH = (st === FAMILY_STYLE.systemLarge)
    ? (st.name * LINE + st.day * LINE + st.name * 0.85 * LINE)
    : (st.name * LINE + st.day * LINE);
  var perRow   = cellLineH + (st.gapRow || 0);
  var rows     = avail <= cellLineH ? 0 : Math.floor((avail + st.gapRow) / perRow);
  rows = Math.max(0, rows);
  var count    = Math.min(rows * st.cols, maxItems || rows * st.cols);
  return { rows: rows, cols: st.cols, count: count };
}

// ── header（原有逻辑）────────────────────────────────────────
function headerRow(title, today, st, themeKey) {
  var iconColor = themeKey === 'fest' ? C.red : C.gold;
  return mkRow([
    mkIcon('hourglass.circle.fill', iconColor, Math.round(st.title * 0.9)),
    mkText(title, st.title, 'heavy', C.main, { maxLines: 1, minScale: 0.7 }),
    mkSpacer(),
    mkText(today.m + '/' + today.d, Math.round(st.title * 0.8), 'medium', C.muted, { maxLines: 1 }),
  ], 4);
}

// ── 小号布局（圆环在上，数字在圆环下方，不放圆环内）────────
function buildSmall(ctx, items, title, today, themeKey, nowMs) {
  var st  = familyStyle('systemSmall');
  var next = items[0];
  var rest = items.slice(1, 3);  // 底部最多 2 条
  var children = [];

  if (!next) {
    children.push(mkText('没有数据', st.title, 'medium', C.muted));
    return { type: 'widget', padding: st.pad, gap: 0, children: children };
  }

  var isToday  = next.days === 0;
  var rColor   = isToday
    ? C.red.light
    : themeKey === 'weekend' ? C.blue.light : C.main.light;
  var progress = isToday ? 1 : ringProgress(next, null);
  var star = isToday ? starPath(st.ringSize / 2, st.ringSize / 2, st.ringSize * 0.15, 0.42, rColor) : '';
  var ringImg  = mkImage(makeRingSVG(progress, rColor, st.ringSize, star), st.ringSize, st.ringSize);

  // 节日名：加粗 + 按类别着色（今天红 / 节气绿 / 现代节日金），右上角跟日期
  children.push(mkRow([
    mkText(next.name, st.heroName, 'heavy',
      catColor(next.cat, isToday), { maxLines: 1, minScale: 0.55, flex: 1 }),
    mkText(today.m + '/' + today.d, Math.round(st.title * 0.75), 'medium', C.muted, { maxLines: 1 }),
  ], 4));

  children.push(null);

  // 圆环居中
  children.push(mkRow([mkSpacer(), ringImg, mkSpacer()], 0));

  // 数字在圆环正下方
  children.push(null);
  children.push(mkRow([
    mkSpacer(),
    mkText(isToday ? '今天' : String(next.days),
      isToday ? Math.round(st.num * 0.9) : st.num,
      'heavy', catColor(next.cat, isToday),
      { maxLines: 1, minScale: 0.4 }),
    isToday ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
    mkSpacer(),
  ], 3, { alignItems: 'end' }));

  children.push(mkSpacer(st.gapMid));

  // 底部 2 条：先算一下加进去会不会超出画布，超了就不放
  var canvasH = canvasOf(ctx, 'systemSmall').h;
  var usedH = st.heroName * LINE + st.ringSize + st.num * LINE + st.gapMid + 2;
  var cellH = st.name * LINE + st.day * LINE;
  if (rest.length > 0 && usedH + cellH <= canvasH - st.pad * 2) {
    var rowKids = rest.map(function(it) { return cell(it, st); });
    while (rowKids.length < 2) rowKids.push(mkSpacer());
    children.push(mkRow(rowKids, 8));
  }

  return { type: 'widget', padding: st.pad, gap: 0, children: children };
}

// ── 中号布局：左「圆环 + 今天倒计时」，右「后面的节日列表」──
function buildMedium(ctx, items, title, today, themeKey, maxItems) {
  var st = familyStyle('systemMedium');
  var next = items[0];
  var children = [];

  if (!next) {
    children.push(headerRow(title, today, st, themeKey));
    children.push(mkSpacer(st.gapTop));
    children.push(mkText('没有数据', st.title, 'medium', C.muted));
    return { type: 'widget', padding: st.pad, gap: 0, children: children };
  }

  var isToday = next.days === 0;
  var rColor = isToday ? C.red.light : (themeKey === 'weekend' ? C.blue.light : C.main.light);
  var progress = isToday ? 1 : ringProgress(next, null);

  var rs = st.ringSize;
  var centerIcon = isToday ? starPath(rs / 2, rs / 2, rs * 0.15, 0.42, rColor) : '';
  var ringImg = mkImage(makeRingSVG(progress, rColor, rs, centerIcon), rs, rs);

  var numRow = mkRow([
    mkText(isToday ? '今天' : String(next.days),
      isToday ? Math.round(st.num * 0.66) : st.num,
      'heavy', catColor(next.cat, isToday), { maxLines: 1, minScale: 0.5 }),
    isToday ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
  ], 2, { alignItems: 'end' });

  var leftCol = mkCol([
    ringImg,
    numRow,
    mkText(next.name, st.name, 'semibold',
      isToday ? C.red : C.sub, { maxLines: 1, minScale: 0.55, textAlign: 'center' }),
  ], 1, { alignItems: 'center', width: rs + 12 });

  // 右侧列表能放几行，按画布高度算
  var canvasH = canvasOf(ctx, 'systemMedium').h;
  var avail = canvasH - st.pad * 2 - (st.title * LINE + 4) - st.gapTop;
  var rowH = st.day * LINE;
  var maxRows = Math.max(1, Math.floor((avail + 2) / (rowH + 2)));
  var rest = items.slice(1, 1 + Math.min(maxItems || 99, maxRows));
  var rows = rest.map(function (it) {
    var d = it.days === 0 ? '今天' : it.days + '天';
    return mkRow([
      mkText(it.name, st.name, 'medium', C.sub, { maxLines: 1, minScale: 0.6, flex: 1 }),
      mkText(d, st.day, 'bold', catColor(it.cat, it.days === 0), { maxLines: 1, minScale: 0.6 }),
    ], 6);
  });
  var rightCol = mkCol(rows, 2, { flex: 1 });

  children.push(headerRow(title, today, st, themeKey));
  children.push(mkSpacer(st.gapTop));
  children.push(mkRow([leftCol, mkSpacer(8), rightCol], 0, { alignItems: 'start' }));

  return { type: 'widget', padding: st.pad, gap: 0, children: children };
}

// ── 大号布局 ─────────────────────────────────────────────────
function buildGrid(ctx, family, items, title, today, themeKey, nowMs, maxItems) {
  var size = canvasOf(ctx, family);
  var st   = familyStyle(family);
  var plan = estimateLayout(size.w, size.h, st, maxItems);
  var next = items[0];
  var rest = items.slice(1, 1 + plan.count);
  var isLarge = (family === 'systemLarge' || family === 'systemExtraLarge');
  var children = [];

  if (!next) {
    children.push(mkText('没有数据', st.title, 'medium', C.muted));
  } else {
    children.push(headerRow(title, today, st, themeKey));
    children.push(mkSpacer(st.gapTop));
    children.push(heroBlock(next, st, themeKey));
    children.push(mkSpacer(st.gapMid));

    for (var i = 0; i < rest.length; i += st.cols) {
      var rowItems = rest.slice(i, i + st.cols);
      var row = rowItems.map(function(it) {
        return isLarge ? cellLarge(it, st) : cell(it, st);
      });
      while (row.length < st.cols) row.push(mkSpacer());
      if (i > 0 && st.gapRow > 0) children.push(mkSpacer(st.gapRow));
      children.push(mkRow(row, 8));
    }
  }

  return { type: 'widget', padding: st.pad, gap: 0, children: children };
}

// ── Accessory 尺寸（原有逻辑保持不变）────────────────────────
function buildAccessory(items, family, title) {
  var next  = items[0];
  var label = next
    ? (next.days === 0 ? next.name + ' 就是今天' : next.name + ' ' + next.days + '天')
    : title;
  if (family === 'accessoryInline') {
    return { type: 'widget', children: [mkText(label, 12, 'semibold', C.main, { maxLines: 1 })] };
  }
  if (family === 'accessoryCircular') {
    return {
      type: 'widget', padding: 2,
      children: [
        mkText(next ? (next.days === 0 ? '今天' : String(next.days)) : '--',
          16, 'heavy', C.main, { maxLines: 1, textAlign: 'center', minScale: 0.6 }),
        mkText(next ? next.name : '', 8, 'medium', C.muted,
          { maxLines: 1, textAlign: 'center' }),
      ],
    };
  }
  return {
    type: 'widget', padding: 2,
    children: [
      mkText(title, 11, 'bold', C.sub, { maxLines: 1 }),
      mkText(label, 12, 'semibold', C.main, { maxLines: 1 }),
    ],
  };
}

// ── 背景（原有）──────────────────────────────────────────────
function backgroundGradient(themeKey) {
  var colors = themeKey === 'fest' ? C.bgFest
    : themeKey === 'weekend' ? C.bgWeekend
    : C.bgWorkday;
  return { type: 'linear', colors: colors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
}

function themeOf(items, today, env) {
  var forced = String(env.THEME || 'auto').toLowerCase();
  if (forced === 'fest' || forced === 'weekend' || forced === 'workday') return forced;
  if (items.length && items[0].days === 0) return 'fest';
  if (today.week === 0 || today.week === 6) return 'weekend';
  return 'workday';
}

function refreshAt(today, nowMs) {
  var DAY = 86400000;
  var nextMidnight = today.ms + DAY - 8 * 3600000;
  var delta = nextMidnight - nowMs + 120000;
  if (delta < 60000) delta = 60000;
  return new Date(nowMs + delta).toISOString();
}

// ── 入口（替换原有 export default）──────────────────────────
export default async function (ctx) {
  var env     = (ctx && ctx.env)          || {};
  var family  = (ctx && ctx.widgetFamily) || 'systemMedium';
  var nowMs   = Date.now();
  var today   = beijingToday(nowMs);       // 原有函数，保持不变
  var title   = String(env.TITLE || '节日倒数');
  var transparent = String(env.TRANSPARENT || 'false').toLowerCase() === 'true';
  var maxItems    = parseInt(env.GRID_ITEMS || '0', 10) || 0;

  var items = [];
  try { items = buildItems(today, env); } catch (e) { items = []; }

  var themeKey = themeOf(items, today, env);
  var body;

  if (family === 'accessoryRectangular' || family === 'accessoryCircular' || family === 'accessoryInline') {
    body = buildAccessory(items, family, title);
  } else if (family === 'systemSmall') {
    body = buildSmall(ctx, items, title, today, themeKey, nowMs);
  } else if (family === 'systemMedium' || family === 'medium') {
    body = buildMedium(ctx, items, title, today, themeKey, maxItems);
  } else {
    body = buildGrid(ctx, family, items, title, today, themeKey, nowMs, maxItems);
  }

  // 顶层兜一遍：任何 children 里的 null 都丢掉（mkSpacer(0) 之类）
  (function prune(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.children)) {
      node.children = node.children.filter(function (c) { return c; });
      node.children.forEach(prune);
    }
  })(body);

  body.refreshAfter = refreshAt(today, nowMs);

  var out = { type: 'widget' };
  if (!transparent) out.backgroundGradient = backgroundGradient(themeKey);
  for (var k in body) {
    if (k === 'type' || k === 'backgroundGradient') continue;
    out[k] = body[k];
  }

  if (transparent && family.indexOf('system') === 0) {
    var pad = out.padding || 10;
    delete out.padding;
    out.children = [{
      type: 'stack', direction: 'column', alignItems: 'start', gap: 0,
      padding: pad,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 'auto',
      children: out.children,
    }];
  }

  return out;
}

export { estimateLayout, familyStyle, canvasOf };
