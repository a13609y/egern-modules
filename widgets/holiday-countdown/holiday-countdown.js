// 节日倒数 · Egern 小组件
//
// 结构参考：lylywayr/NetWork-Module「时光倒数」（布局与配色表）
// 透明模式参考：pronounAI/Egern Countdown-Widget
// 但日期数据不再是硬编码的一两年：农历节日表一次性生成到 2050 年，固定节日与清明按公式算，
// 所以 2050 年之前都不需要维护。
//
// 支持的家庭：systemSmall / systemMedium / systemLarge / accessoryRectangular / accessoryCircular / accessoryInline

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

// 每条：key, 名称, 图标, 类型
//   fixed  → 固定公历 MM-DD
//   lunar  → 农历节日，idx 是 LUNAR_FEST 里那一列
//   term   → 节气（目前只有清明，用 21 世纪公式算）
var FESTIVALS = [
  { key: 'newyear', name: '元旦', icon: 'sparkles', kind: 'fixed', md: '01-01' },
  { key: 'chunjie', name: '春节', icon: 'house.fill', kind: 'lunar', idx: 0 },
  { key: 'yuanxiao', name: '元宵', icon: 'moon.stars.fill', kind: 'lunar', idx: 1 },
  { key: 'qingming', name: '清明', icon: 'leaf.fill', kind: 'term' },
  { key: 'labor', name: '劳动节', icon: 'hammer.fill', kind: 'fixed', md: '05-01' },
  { key: 'duanwu', name: '端午', icon: 'sailboat.fill', kind: 'lunar', idx: 2 },
  { key: 'qixi', name: '七夕', icon: 'heart.fill', kind: 'lunar', idx: 3 },
  { key: 'zhongqiu', name: '中秋', icon: 'moon.fill', kind: 'lunar', idx: 4 },
  { key: 'chongyang', name: '重阳', icon: 'figure.walk', kind: 'lunar', idx: 5 },
  { key: 'guoqing', name: '国庆', icon: 'flag.fill', kind: 'fixed', md: '10-01' },
  { key: 'chuxi', name: '除夕', icon: 'party.popper.fill', kind: 'lunar', idx: 6 },
];

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

// 21 世纪清明：day = floor(yy*0.2422 + 4.81) - floor(yy/4)
function qingmingDay(y) {
  var yy = y % 100;
  return Math.floor(yy * 0.2422 + 4.81) - Math.floor(yy / 4);
}

// 某年某节日对应的公历 {m,d}，没有数据返回 null
function festDate(f, y) {
  if (f.kind === 'fixed') {
    return { m: parseInt(f.md.slice(0, 2), 10), d: parseInt(f.md.slice(3, 5), 10) };
  }
  if (f.kind === 'term') {
    return { m: 4, d: qingmingDay(y) };
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
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(val);
    if (m) {
      out.push({ name: name, icon: 'heart.fill', once: { y: +m[1], m: +m[2], d: +m[3] }, raw: val });
      return;
    }
    m = /^(\d{1,2})-(\d{1,2})$/.exec(val);
    if (m) {
      out.push({ name: name, icon: 'star.fill', md: { m: +m[1], d: +m[2] }, raw: val });
      return;
    }
    // 只有名字 → 当作今天起算的「第 N 天」没意义，忽略
  });
  return out;
}

// ── 计算接下来要显示的条目 ────────────────────────────────────
function buildItems(today, env) {
  var items = [];

  FESTIVALS.forEach(function (f) {
    for (var y = today.y; y <= today.y + 2; y++) {
      var dt = festDate(f, y);
      if (!dt) continue;
      var ms = Date.UTC(y, dt.m - 1, dt.d);
      if (ms < today.ms) continue;
      items.push({
        name: f.name,
        icon: f.icon,
        days: Math.round((ms - today.ms) / DAY),
        md: dt.m + '/' + dt.d,
      });
      return;
    }
  });

  parseCustom(env.ANNIVERSARIES).forEach(function (c) {
    if (c.once) {
      var ms = Date.UTC(c.once.y, c.once.m - 1, c.once.d);
      if (ms < today.ms) return; // 一次性纪念日过了就不显示
      items.push({ name: c.name, icon: c.icon, days: Math.round((ms - today.ms) / DAY), md: c.once.m + '/' + c.once.d });
      return;
    }
    var thisYear = Date.UTC(today.y, c.md.m - 1, c.md.d);
    var ms2 = thisYear >= today.ms ? thisYear : Date.UTC(today.y + 1, c.md.m - 1, c.md.d);
    items.push({ name: c.name, icon: c.icon, days: Math.round((ms2 - today.ms) / DAY), md: c.md.m + '/' + c.md.d });
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
function backgroundProps(themeKey, transparent) {
  if (transparent) return { bg: null, extra: null };
  var colors = themeKey === 'fest' ? C.bgFest : themeKey === 'weekend' ? C.bgWeekend : C.bgWorkday;
  return {
    bg: { type: 'linear', colors: colors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    // 透明模式才需要描边；这里非透明返回 null
    extra: null,
  };
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

// ── 布局 ───────────────────────────────────────────────────
function headerRow(title, today) {
  return mkRow([
    mkIcon('hourglass.circle.fill', C.gold, 14),
    mkText(title, 13, 'heavy', C.main, { maxLines: 1 }),
    mkSpacer(),
    mkText(today.m + '/' + today.d, 10, 'medium', C.muted, { maxLines: 1 }),
  ], 5);
}

function buildSmall(items, title, today, nowMs) {
  var next = items[0];
  var second = items[1];
  var children = [headerRow(title, today)];

  if (!next) {
    children.push(mkSpacer(8), mkText('没有数据', 12, 'medium', C.muted));
  } else {
    children.push(mkSpacer(6));
    children.push(mkRow([
      mkIcon(next.icon, C.gold, 13),
      mkText(next.name, 12, 'semibold', C.sub, { maxLines: 1 }),
    ], 4));
    children.push(mkSpacer(2));
    if (next.days === 0) {
      children.push(mkText('今天', 30, 'heavy', C.red, { maxLines: 1, minScale: 0.6 }));
    } else {
      children.push(mkRow([
        mkText(String(next.days), 34, 'heavy', C.red, { maxLines: 1, minScale: 0.5 }),
        mkText('天', 13, 'medium', C.sub),
      ], 3));
    }
    if (second) {
      children.push(mkSpacer(2));
      children.push(mkText('下一个 ' + second.name + ' ' + daysLabel(second.days), 9, 'medium', C.muted, { maxLines: 1, minScale: 0.8 }));
    }
  }

  return {
    type: 'widget',
    padding: 12,
    gap: 0,
    children: children,
    refreshAfter: refreshAt(today, nowMs),
  };
}

function buildMedium(items, title, today, nowMs) {
  var next = items[0];
  var rest = items.slice(1, 4);

  var children = [headerRow(title, today), mkSpacer(8)];

  if (!next) {
    children.push(mkText('没有可显示的节日', 12, 'medium', C.muted));
  } else {
    children.push(mkRow([
      mkCol([
        mkText(next.name, 18, 'heavy', C.main, { maxLines: 1 }),
        mkText(next.md, 10, 'medium', C.muted, { maxLines: 1 }),
      ], 1),
      mkSpacer(),
      next.days === 0
        ? mkText('今天', 24, 'heavy', C.red, { maxLines: 1 })
        : mkRow([
            mkText(String(next.days), 30, 'heavy', C.red, { maxLines: 1, minScale: 0.6 }),
            mkText('天', 12, 'medium', C.sub),
          ], 2),
    ], 6));
  }

  if (rest.length) {
    children.push(mkSpacer(10));
    children.push(mkRow(rest.map(function (it) {
      return mkCol([
        mkText(it.name, 11, 'medium', C.sub, { maxLines: 1 }),
        mkText(daysLabel(it.days) === '今天' ? '今天' : it.days + '天', 14, 'bold', C.main, { maxLines: 1, minScale: 0.7 }),
      ], 1, { flex: 1 });
    }), 8));
  }

  return {
    type: 'widget',
    padding: 14,
    children: children,
    refreshAfter: refreshAt(today, nowMs),
  };
}

function buildLarge(items, title, today, nowMs, maxItems) {
  var limit = Math.max(2, Math.min(items.length, maxItems || 8));
  var show = items.slice(0, limit);
  var rows = [];

  for (var i = 0; i < show.length; i += 2) {
    var pair = show.slice(i, i + 2);
    var cells = pair.map(function (it) {
      var isToday = it.days === 0;
      return mkRow([
        mkIcon(it.icon, isToday ? C.red : C.gold, 13),
        mkText(it.name, 13, 'semibold', C.main, { maxLines: 1 }),
        mkSpacer(),
        mkText(daysLabel(it.days), isToday ? 13 : 15, 'heavy', isToday ? C.red : C.main, { maxLines: 1, minScale: 0.7 }),
        isToday ? null : mkText('天', 9, 'medium', C.muted),
      ].filter(Boolean), 4, { flex: 1 });
    });
    if (cells.length === 1) cells.push(mkRow([], 0, { flex: 1 }));
    rows.push(mkRow(cells, 14, { flex: 1 }));
  }

  return {
    type: 'widget',
    padding: 16,
    children: [headerRow(title, today), mkSpacer(8)].concat(
      rows.length ? rows : [mkText('没有可显示的节日', 12, 'medium', C.muted)]
    ),
    refreshAfter: refreshAt(today, nowMs),
  };
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

// ── 入口 ───────────────────────────────────────────────────
export default async function (ctx) {
  var env = (ctx && ctx.env) || {};
  var family = (ctx && ctx.widgetFamily) || 'systemMedium';
  var nowMs = Date.now();
  var today = beijingToday(nowMs);
  var title = String(env.TITLE || '节日倒数');
  var transparent = String(env.TRANSPARENT || 'false').toLowerCase() === 'true';
  var maxItems = parseInt(env.GRID_ITEMS || '8', 10) || 8;

  var items = [];
  try {
    items = buildItems(today, env);
  } catch (e) {
    items = [];
  }

  var themeKey = themeOf(items, today, env);
  var props = backgroundProps(themeKey, transparent);

  var body;
  if (family === 'systemSmall') body = buildSmall(items, title, today, nowMs);
  else if (family === 'systemLarge' || family === 'systemExtraLarge') body = buildLarge(items, title, today, nowMs, maxItems);
  else if (family === 'accessoryRectangular' || family === 'accessoryCircular' || family === 'accessoryInline') body = buildAccessory(items, family, title);
  else body = buildMedium(items, title, today, nowMs);

  var out = { type: 'widget' };
  if (props.bg) out.backgroundGradient = props.bg;
  for (var k in body) if (k !== 'type' && k !== 'backgroundGradient') out[k] = body[k];

  // 透明模式：不给背景，只用一圈极淡描边勾出边界（stack 级边框，文档支持）
  if (transparent && family.indexOf('system') === 0) {
    var padding = out.padding || 12;
    delete out.padding;
    out.children = [{
      type: 'stack',
      direction: 'column',
      alignItems: 'start',
      gap: 0,
      padding: padding,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      borderRadius: 'auto',
      children: out.children,
    }];
  }

  return out;
}
