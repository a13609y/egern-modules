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

// ── 配色（取自「时光倒数」，亮/暗各一套）────────────────────────
var C = {
  bgWorkday: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
  bgWeekend: [{ light: '#F4F8FF', dark: '#111827' }, { light: '#E6F2FF', dark: '#0B0F19' }],
  bgFest: [{ light: '#FFF8EC', dark: '#2A1F0E' }, { light: '#FFEFD5', dark: '#1A1208' }],
  main: { light: '#1C1C1E', dark: '#FFFFFF' },
  sub: { light: '#48484A', dark: '#D1D1D6' },
  muted: { light: '#8E8E93', dark: '#8E8E93' },
  gold: { light: '#B58A28', dark: '#D6A53A' },
  red: { light: '#CA3B32', dark: '#FF453A' },
  green: { light: '#5C7A5C', dark: '#8FBF8F' },
};

var DAY = 86400000;

// ── 工具 ────────────────────────────────────────────────────
function mkText(text, size, weight, color, opts) {
  var o = { type: 'text', text: String(text == null ? '' : text), font: { size: size, weight: weight }, textColor: color };
  if (opts) for (var k in opts) o[k] = opts[k];
  return o;
}
function mkRow(children, gap, opts) {
  var o = { type: 'stack', direction: 'row', alignItems: 'center', gap: gap || 4, children: children };
  if (opts) for (var k in opts) o[k] = opts[k];
  return o;
}
function mkCol(children, gap, opts) {
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

// 北京时间的「今天」零点（用 UTC 天数做整数比较，避免时区/DST 误差）
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

function daysLabel(d) {
  if (d === 0) return '今天';
  if (d === 1) return '明天';
  return String(d);
}

// ── 背景 ───────────────────────────────────────────────────
function backgroundGradient(themeKey) {
  var colors = themeKey === 'fest' ? C.bgFest : themeKey === 'weekend' ? C.bgWeekend : C.bgWorkday;
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
  // today.ms 是「北京日期」的 UTC 零点，换回真实时刻要减 8 小时
  var nextMidnight = today.ms + DAY - 8 * 3600000;
  var delta = nextMidnight - nowMs + 120000; // 过零点 2 分钟后再刷新
  if (delta < 60000) delta = 60000;
  return new Date(nowMs + delta).toISOString();
}

// ── 布局预算 ───────────────────────────────────────────────
// 参考做法（lylywayr / jnlaoshu 的「时光倒数」）：
//   先量画布 → 扣掉头部和标题块 → 算还剩几行 → 行数决定放几条。
//   行高按 fontSize * 1.5 估（iOS 中文字形实际占位接近这个值），
//   所有文字都带 maxLines:1 + minScale，宁少一条也不溢出。

var LINE = 1.5;          // 行高系数
var SAFETY = 6;          // 预留安全高度

function canvasOf(ctx, family) {
  var size = ctx && ctx.size;
  var w = size && size.width ? size.width : (family === 'systemSmall' ? 155 : family === 'systemLarge' || family === 'systemExtraLarge' ? 329 : 329);
  var h = size && size.height ? size.height : (family === 'systemSmall' ? 155 : family === 'systemLarge' || family === 'systemExtraLarge' ? 345 : 155);
  return { w: w, h: h };
}

var FAMILY_STYLE = {
  systemSmall: { pad: 9, cols: 2, name: 9, day: 10, num: 28, unit: 10, title: 11, heroName: 12, gapRow: 3, gapTop: 1, gapMid: 3 },
  systemMedium: { pad: 9, cols: 3, name: 9, day: 10, num: 26, unit: 10, title: 11, heroName: 19, gapRow: 4, gapTop: 1, gapMid: 6 },
  systemLarge: { pad: 13, cols: 3, name: 11, day: 14, num: 42, unit: 14, title: 13, heroName: 24, gapRow: 6, gapTop: 3, gapMid: 9 },
};

function familyStyle(family) {
  if (family === 'systemSmall') return FAMILY_STYLE.systemSmall;
  if (family === 'systemLarge' || family === 'systemExtraLarge') return FAMILY_STYLE.systemLarge;
  return FAMILY_STYLE.systemMedium;
}

// 估算：头部 + 大数字块 + N 行格子，总高是否放得下
function estimateLayout(w, h, st, maxItems) {
  var innerH = h - st.pad * 2;
  var headerH = st.title * LINE + 4;
  var heroH = st.num * LINE;
  var avail = innerH - headerH - heroH - (st.gapTop || 0) - (st.gapMid || 0) - SAFETY;
  var cellH = st.name * LINE + st.day * LINE;
  var perRow = cellH + st.gapRow;
  var rows = avail <= cellH ? 0 : Math.floor((avail + st.gapRow) / perRow);
  rows = Math.max(0, rows);
  var count = Math.min(rows * st.cols, maxItems || rows * st.cols);
  var usedH = headerH + heroH + (st.gapTop || 0) + (st.gapMid || 0) + rows * cellH + Math.max(0, rows - 1) * st.gapRow;
  return { rows: rows, cols: st.cols, count: count, cellH: cellH, usedH: usedH, innerH: innerH, fits: usedH <= innerH };
}

// ── 渲染 ───────────────────────────────────────────────────
var DISPLAY_NAME = { '元旦': '元旦', '春节': '春节', '清明': '清明节', '劳动节': '劳动节', '端午': '端午节', '中秋': '中秋节', '国庆': '国庆节' };
var PILL_BG = { light: 'rgba(0,0,0,0.055)', dark: 'rgba(255,255,255,0.12)' };

function catColor(cat, isToday) {
  if (isToday) return C.red;
  if (cat === 'term') return C.green;
  if (cat === 'west') return C.gold;
  return C.main;
}

function mdToCn(md) {
  var parts = String(md || '').split('/');
  if (parts.length < 2) return md;
  return parseInt(parts[0], 10) + '月' + parseInt(parts[1], 10) + '日';
}

// 每个 text 都必须 maxLines: 1，否则高度估算会失效
function headerRow(title, today, st) {
  return mkRow([
    mkIcon('hourglass.circle.fill', C.gold, Math.round(st.title * 0.9)),
    mkText(title, st.title, 'heavy', C.main, { maxLines: 1, minScale: 0.7 }),
    mkSpacer(),
    mkText(today.m + '/' + today.d, Math.round(st.title * 0.8), 'medium', C.muted, { maxLines: 1 }),
  ], 4);
}

function bigNumber(it, st, nameSize) {
  var isToday = it.days === 0;
  // 三段固定间距、整组居中：名字和「天」都贴着数字，外侧留白由两个弹性空位平分
  var gapIn = Math.round(st.num * 0.42);   // 名字 ↔ 数字
  var gapUnit = Math.round(st.num * 0.2);  // 数字 ↔ 天
  var kids = [
    { type: 'spacer', flex: 1 },
    mkText(it.name, nameSize, 'heavy', isToday ? C.red : C.main, { maxLines: 1, minScale: 0.55 }),
    mkSpacer(gapIn),
    mkText(isToday ? '今天' : String(it.days), isToday ? Math.round(st.num * 0.85) : st.num, 'heavy',
      catColor(it.cat, isToday), { maxLines: 1, minScale: 0.4 }),
  ];
  if (!isToday) {
    kids.push(mkSpacer(gapUnit));
    kids.push(mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }));
  }
  kids.push({ type: 'spacer', flex: 1 });
  return mkRow(kids, 0, { alignItems: 'end' });
}

function pill(it, st) {
  return mkRow([
    mkIcon('paperplane.fill', C.sub, Math.round(st.title * 0.7)),
    mkText((DISPLAY_NAME[it.name] || it.name) + ' · ' + mdToCn(it.md), st.title * 0.85, 'semibold', C.main, { maxLines: 1, minScale: 0.6 }),
  ], 4, { padding: [3, 8], backgroundColor: PILL_BG, borderRadius: 10, flex: 0 });
}

function cell(it, st) {
  var isToday = it.days === 0;
  return mkCol([
    mkText(it.name, st.name, 'medium', isToday ? C.red : C.sub, { maxLines: 1, minScale: 0.65 }),
    mkText(isToday ? '今天' : it.days + '天', st.day, 'bold', catColor(it.cat, isToday), { maxLines: 1, minScale: 0.6 }),
  ], 0, { flex: 1 });
}

function buildAccessory(items, family, title) {
  var next = items[0];
  var label = next ? (next.days === 0 ? next.name + ' 就是今天' : next.name + ' ' + next.days + '天') : title;
  if (family === 'accessoryInline') {
    return { type: 'widget', children: [mkText(label, 12, 'semibold', C.main, { maxLines: 1 })] };
  }
  if (family === 'accessoryCircular') {
    return {
      type: 'widget',
      padding: 2,
      children: [
        mkText(next ? (next.days === 0 ? '今天' : String(next.days)) : '--', 16, 'heavy', C.main, { maxLines: 1, textAlign: 'center', minScale: 0.6 }),
        mkText(next ? next.name : '', 8, 'medium', C.muted, { maxLines: 1, textAlign: 'center' }),
      ],
    };
  }
  return {
    type: 'widget',
    padding: 2,
    children: [
      mkText(title, 11, 'bold', C.sub, { maxLines: 1 }),
      mkText(label, 12, 'semibold', C.main, { maxLines: 1 }),
    ],
  };
}

function buildGrid(ctx, family, items, title, today, nowMs, maxItems) {
  var size = canvasOf(ctx, family);
  var st = familyStyle(family);
  var plan = estimateLayout(size.w, size.h, st, maxItems);
  var next = items[0];
  var rest = items.slice(1, 1 + plan.count);
  var children = [];

  if (!next) {
    children.push(mkText('没有数据', st.title, 'medium', C.muted));
  } else {
    if (family === 'systemSmall') {
      // 小号太窄，名字放进头部，主行只放大数字，胶囊省略
      children.push(mkRow([
        mkIcon('calendar', C.muted, 10),
        mkText(next.name, st.title, 'heavy', next.days === 0 ? C.red : C.main, { maxLines: 1, minScale: 0.7 }),
        mkSpacer(),
        mkText(today.m + '/' + today.d, st.title * 0.8, 'medium', C.muted, { maxLines: 1 }),
      ], 4));
      children.push(mkSpacer(st.gapTop));
      children.push(mkRow([
        { type: 'spacer', flex: 1 },
        mkText(next.days === 0 ? '今天' : String(next.days), next.days === 0 ? Math.round(st.num * 0.85) : st.num, 'heavy',
          catColor(next.cat, next.days === 0), { maxLines: 1, minScale: 0.4 }),
        next.days === 0 ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
        { type: 'spacer', flex: 1 },
      ].filter(Boolean), 3, { alignItems: 'end' }));
      children.push(mkSpacer(st.gapMid));
    } else {
      children.push(headerRow(title, today, st));
      children.push(mkSpacer(st.gapTop));
      children.push(bigNumber(next, st, st.heroName));
      children.push(mkSpacer(st.gapMid));
    }

    for (var i = 0; i < rest.length; i += st.cols) {
      var row = rest.slice(i, i + st.cols).map(function (it) { return cell(it, st); });
      while (row.length < st.cols) row.push({ type: 'spacer', flex: 1 });
      if (i > 0) children.push(mkSpacer(st.gapRow));
      children.push(mkRow(row, 8));
    }
  }

  return { type: 'widget', padding: st.pad, gap: 0, children: children, refreshAfter: refreshAt(today, nowMs) };
}

// ── 入口 ───────────────────────────────────────────────────
export default async function (ctx) {
  var env = (ctx && ctx.env) || {};
  var family = (ctx && ctx.widgetFamily) || 'systemMedium';
  var nowMs = Date.now();
  var today = beijingToday(nowMs);
  var title = String(env.TITLE || '节日倒数');
  var transparent = String(env.TRANSPARENT || 'false').toLowerCase() === 'true';
  var maxItems = parseInt(env.GRID_ITEMS || '0', 10) || 0;

  var items = [];
  try {
    items = buildItems(today, env);
  } catch (e) {
    items = [];
  }

  var themeKey = themeOf(items, today, env);
  var body;
  if (family === 'accessoryRectangular' || family === 'accessoryCircular' || family === 'accessoryInline') {
    body = buildAccessory(items, family, title);
  } else {
    body = buildGrid(ctx, family, items, title, today, nowMs, maxItems);
  }

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
      type: 'stack',
      direction: 'column',
      alignItems: 'start',
      gap: 0,
      padding: pad,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      borderRadius: 'auto',
      children: out.children,
    }];
  }

  return out;
}

export { estimateLayout, familyStyle, canvasOf };
