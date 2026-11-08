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
// 鲸鱼娘剪影（img2svg 从双色位图描出，220×220，坐标 0.1px / y 向上）
const ART_D = [
  'M887 2106 c-79 -39 -141 -115 -121 -148 6 -9 -40 -59 -64 -70 -41 -18 -123 -154 -134 -223 -29 -167 -31 -195 -18 -220 7 -14 10 -28 7 -32 -4 -3 -7 2 -7 12 0 17 -1 17 -20 0 -11 -10 -20 -25 -20 -34 0 -18 -49 -71 -66 -71 -7 0 -',
  '20 -7 -29 -16 -18 -18 3 -54 32 -54 7 0 25 -7 38 -16 14 -9 35 -14 48 -11 12 4 28 2 36 -2 8 -5 20 -7 28 -4 26 10 12 18 -39 21 -29 2 -57 7 -63 11 -5 5 -23 12 -40 16 -27 7 -24 9 35 19 49 8 66 8 68 -1 2 -6 10 -14 19 -17 14 -6',
  ' 14 -4 2 10 -11 13 -11 18 -1 21 7 3 13 24 13 51 2 40 3 37 9 -23 10 -84 25 -129 42 -119 6 4 8 3 4 -4 -3 -5 -1 -12 5 -14 26 -9 -34 -148 -73 -169 -29 -16 -15 22 33 90 37 51 38 54 22 78 l-16 24 -13 -31 c-8 -17 -30 -57 -49 -8',
  '9 -21 -33 -37 -73 -38 -94 -2 -21 -12 -46 -25 -60 -45 -48 -35 -136 18 -170 27 -16 25 -27 -5 -27 -33 0 -68 35 -60 61 8 25 -11 25 -25 0 -32 -61 21 -131 99 -131 34 0 39 -11 15 -34 -10 -10 -24 -14 -40 -10 -32 8 -31 -9 3 -36 2',
  '1 -16 37 -20 60 -17 l32 6 -5 -43 c-6 -42 -6 -42 37 -60 73 -30 82 -35 129 -61 25 -14 61 -25 82 -25 l37 0 -1 -47 c-3 -186 29 -253 121 -253 79 0 79 0 74 156 -4 127 -3 134 15 134 26 0 31 -30 28 -160 -4 -126 -1 -130 78 -130 8',
  '3 0 97 12 108 91 17 137 19 179 9 179 -6 0 -11 7 -11 15 0 20 5 19 35 -9 34 -32 88 -57 155 -73 l55 -13 -75 3 c-45 2 -88 11 -107 21 -18 9 -33 12 -33 7 0 -57 258 -52 322 6 12 11 27 14 49 9 49 -9 103 10 138 49 34 39 42 71 14 ',
  '61 -9 -4 -31 -2 -49 4 -24 8 -39 8 -54 0 -17 -9 -20 -8 -20 8 0 23 -28 82 -39 82 -42 0 -89 -84 -73 -130 14 -39 -35 -43 -89 -7 -44 29 -43 48 3 69 39 18 64 52 60 79 -2 12 5 14 33 11 34 -4 65 10 65 30 0 5 -9 7 -19 3 -28 -9 -3',
  '3 7 -13 46 l17 34 23 -24 c45 -45 149 -16 174 48 12 33 -4 46 -27 21 -17 -19 -70 -28 -78 -12 -10 17 15 69 42 86 75 50 80 131 12 200 -32 33 -38 44 -30 59 16 27 2 70 -42 130 -44 63 -46 67 -21 67 78 2 120 71 60 99 -67 31 -114',
  ' 77 -99 95 15 18 3 45 -35 75 -15 12 -22 21 -16 21 6 0 14 -5 17 -10 23 -37 32 30 10 73 -8 16 -24 59 -35 97 -11 37 -35 87 -53 110 -49 65 -163 180 -178 180 -7 0 -20 7 -29 15 -41 37 -250 85 -250 58 0 -6 26 -13 59 -17 67 -8 1',
  '61 -40 176 -60 6 -7 20 -16 32 -20 49 -16 172 -159 173 -201 0 -15 2 -17 9 -6 12 19 31 -17 31 -58 0 -16 5 -33 10 -36 16 -10 12 -36 -7 -50 -17 -13 -63 -1 -63 16 0 16 -42 -5 -50 -25 -7 -16 -9 -17 -9 -4 -1 9 4 20 9 23 6 4 8 1',
  '1 5 16 -4 5 3 9 14 9 38 0 90 57 67 75 -10 8 -23 12 -28 9 -10 -7 -45 36 -40 49 1 4 -18 33 -43 63 -25 31 -45 60 -45 65 0 5 -4 9 -9 9 -5 0 -4 -13 2 -29 6 -17 14 -28 19 -25 4 3 15 -8 25 -23 10 -15 23 -32 30 -36 21 -13 15 -27',
  ' -11 -27 -14 0 -31 -9 -39 -20 -14 -20 -14 -20 -33 2 -10 11 -45 40 -76 63 -39 29 -53 46 -46 53 5 5 8 18 5 28 -4 16 -5 15 -6 -4 -1 -31 -22 -36 -67 -16 -52 23 -193 23 -264 -1 -44 -15 -54 -15 -62 -4 -8 11 -9 10 -5 -3 10 -28 ',
  '-61 -64 -80 -41 -13 16 -13 16 -3 -4 9 -20 6 -27 -25 -55 -55 -48 -121 -138 -161 -220 l-35 -73 4 65 c9 123 48 250 77 250 6 0 10 6 10 13 0 21 121 129 136 123 9 -3 14 2 14 15 0 53 75 133 135 145 70 13 133 -41 120 -103 l-6 -2',
  '8 20 24 c89 101 -53 195 -192 127z m142 -275 c11 -7 4 -12 -25 -20 -22 -6 -60 -25 -84 -43 -35 -25 -41 -27 -25 -9 49 58 107 89 134 72z m179 -21 c23 -16 46 -40 53 -52 10 -19 6 -17 -24 9 -20 18 -56 37 -79 43 -30 9 -38 14 -27 ',
  '21 22 14 33 11 77 -21z m202 -128 c0 -12 -4 -12 -20 3 -11 10 -20 25 -20 33 0 12 4 12 20 -3 11 -10 20 -25 20 -33z m51 29 c0 11 2 11 6 1 3 -8 19 -22 37 -33 l31 -19 -34 0 c-40 0 -71 24 -71 54 1 21 1 21 15 2 11 -15 15 -16 16 ',
  '-5z m-677 -2 c-3 -6 -1 -15 6 -19 9 -6 9 -12 1 -29 -7 -12 -16 -19 -22 -15 -5 3 -17 0 -25 -7 -27 -22 -27 0 0 41 22 34 60 61 40 29z m592 -36 c-7 -7 -26 7 -26 19 0 6 6 6 15 -2 9 -7 13 -15 11 -17z m-333 -23 c22 -26 22 -66 0 -',
  '74 -10 -3 -23 -9 -30 -12 -18 -8 -26 33 -13 71 13 40 19 42 43 15z m221 4 c10 -26 7 -32 -14 -27 -22 6 -22 6 -14 27 8 20 20 20 28 0z m-394 -13 c-5 -11 -15 -23 -20 -26 -14 -9 -12 19 2 33 19 19 30 14 18 -7z m232 -43 c-13 -13 ',
  '-26 8 -17 30 6 16 7 16 17 -1 7 -13 7 -22 0 -29z m48 16 c0 -8 -4 -12 -10 -9 -5 3 -10 10 -10 16 0 5 5 9 10 9 6 0 10 -7 10 -16z m-223 -36 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m656 -28 c-7 -28 -13 -25 -13 6 0 ',
  '14 4 23 9 20 5 -3 7 -15 4 -26z m-55 -29 c16 12 16 12 0 -6 -21 -23 -34 -13 -43 30 -6 30 -6 30 10 -4 13 -29 17 -32 33 -20z m-314 -8 c6 -17 3 -23 -8 -23 -12 0 -16 10 -16 38 1 38 10 32 24 -15z m-294 -3 c0 -20 -5 -30 -15 -30 ',
  '-18 0 -18 2 -3 35 15 32 18 32 18 -5z m447 -2 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-590 -40 c-2 -13 -4 -5 -4 17 -1 22 1 32 4 23 2 -10 2 -28 0 -40z m827 41 c57 -27 30 -98 -34 -89 -36 4 -48 52 -21 79 25 25 2',
  '3 24 55 10z m-988 -60 c-7 -37 -12 -46 -17 -32 -5 11 -8 13 -8 4 -1 -8 -4 -12 -7 -9 -5 5 32 88 39 88 2 0 -1 -23 -7 -51z m325 -34 l16 -54 -46 1 c-25 1 -57 -2 -71 -6 -19 -5 -21 -5 -10 3 8 6 14 14 14 18 -1 4 7 25 17 46 11 21 ',
  '18 41 15 46 -3 4 7 6 22 3 23 -3 30 -12 43 -57z m299 55 c0 -5 16 -27 35 -49 46 -50 45 -51 -22 -51 -43 0 -54 3 -43 11 12 8 11 10 -5 7 -11 -2 -20 -8 -20 -15 0 -6 -3 -15 -7 -19 -13 -12 -9 -36 5 -31 9 3 11 -6 9 -32 -6 -66 11 ',
  '-91 63 -91 51 0 84 45 71 96 -5 18 -3 22 9 18 8 -4 15 -17 15 -31 0 -15 4 -22 11 -17 21 12 -21 -54 -46 -74 -32 -25 -32 -36 1 -29 39 7 15 -9 -41 -27 -133 -42 -326 -38 -418 11 l-32 17 25 6 c25 6 25 7 3 14 -12 4 -31 22 -43 40',
  ' -24 40 -25 50 -5 42 10 -4 15 1 15 14 0 11 8 24 19 29 16 9 18 6 18 -30 0 -24 6 -45 14 -50 8 -5 10 -9 4 -9 -13 -1 26 -30 39 -30 6 0 3 5 -6 11 -25 14 -11 39 21 39 34 0 44 -9 30 -27 -8 -9 -8 -13 -1 -13 21 0 34 42 28 83 -6 3',
  '9 -6 40 11 25 37 -31 41 -27 16 17 -30 54 -25 72 6 20 11 -19 28 -38 36 -41 11 -4 12 -10 6 -18 -8 -9 2 -12 39 -12 52 0 58 4 38 24 -10 10 -9 18 4 40 9 15 24 53 33 85 15 52 65 89 65 47z m140 -77 c0 -28 -3 -54 -7 -56 -5 -3 -8',
  ' 16 -8 41 0 26 -4 61 -8 77 -8 28 -8 29 7 10 9 -12 15 -41 16 -72z m-613 10 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m-220 -70 c-2 -16 -4 -5 -4 22 0 28 2 40 4 28 2 -13 2 -35 0 -50z m30 45 c-3 -8 -6 -5 -6 6 -1 1',
  '1 2 17 5 13 3 -3 4 -12 1 -19z m1013 -65 c14 -2 63 -5 110 -8 46 -4 86 -8 88 -10 6 -6 -61 -35 -83 -35 -11 0 -25 -4 -31 -10 -11 -11 -72 7 -98 29 -14 12 -16 10 -17 -15 0 -16 -5 -38 -10 -49 -8 -17 -9 -17 -4 5 2 14 5 57 6 95 1',
  ' 52 3 61 8 35 5 -28 11 -35 31 -37z m-808 27 c3 -16 1 -30 -4 -30 -4 0 -8 14 -8 30 0 17 2 30 4 30 2 0 6 -13 8 -30z m-215 -17 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m113 -123 c11 -21 24 -41 30 -45 5 -3 10 -13 ',
  '10 -22 0 -29 31 -81 53 -87 11 -3 18 -8 14 -12 -12 -12 -54 24 -66 58 -7 18 -28 63 -47 99 -25 48 -34 78 -33 110 l1 44 9 -53 c5 -29 18 -70 29 -92z m580 120 c0 -5 -4 -10 -10 -10 -5 0 -10 5 -10 10 0 6 5 10 10 10 6 0 10 -4 10 ',
  '-10z m-330 -10 c0 -5 -4 -10 -10 -10 -5 0 -10 5 -10 10 0 6 5 10 10 10 6 0 10 -4 10 -10z m344 -66 c30 -11 18 -34 -17 -34 -40 0 -51 8 -36 27 12 14 29 16 53 7z m238 -36 c-2 -21 -7 -36 -12 -33 -4 2 -20 -9 -35 -25 -16 -17 -38 ',
  '-30 -49 -30 -30 0 -43 -11 -61 -50 l-16 -35 6 33 c6 28 4 32 -14 32 -12 0 -21 4 -21 9 0 4 11 6 25 3 14 -2 39 4 60 17 20 12 33 17 30 11 -3 -5 -2 -10 4 -10 14 0 71 72 71 91 0 14 11 33 15 27 1 -2 0 -20 -3 -40z m-688 -53 c8 -2',
  '9 4 -26 -27 17 -28 39 -28 39 -3 21 13 -10 27 -27 30 -38z m545 15 c-36 -45 -45 -51 -27 -18 11 19 48 57 56 58 2 0 -12 -18 -29 -40z m374 -73 c4 -10 4 -23 1 -28 -3 -6 0 -17 8 -27 7 -9 -4 -3 -25 13 -44 35 -62 65 -72 120 l-8 4',
  '0 44 -49 c24 -27 47 -58 52 -69z m-234 26 c-28 -65 -101 -141 -95 -98 3 19 16 32 16 15 0 -19 38 17 57 55 10 19 12 30 5 33 -6 2 -8 10 -5 18 3 7 9 12 13 9 5 -3 11 -1 15 5 16 25 12 6 -6 -37z m-696 -7 c9 -3 17 -10 17 -15 0 -5 ',
  '-17 -1 -37 9 -20 10 -43 16 -50 13 -7 -3 -13 2 -13 11 0 14 4 14 33 2 17 -8 40 -17 50 -20z m144 -23 c23 -19 23 -16 -14 -82 -1 -2 -16 2 -33 9 -22 9 -28 16 -21 23 6 6 11 21 11 33 0 19 10 30 30 33 3 1 16 -7 27 -16z m331 -13 c',
  '2 -14 9 -31 15 -39 10 -12 9 -14 -4 -9 -9 3 -36 -3 -60 -14 -65 -29 -235 -46 -255 -25 -25 25 20 78 65 77 61 -2 72 1 36 10 l-30 8 32 1 c17 0 34 -3 37 -8 3 -4 29 0 58 10 71 24 102 21 106 -11z m-429 -55 c0 -5 -6 1 -14 15 -8 1',
  '4 -14 30 -14 35 0 6 6 -1 14 -15 8 -14 14 -29 14 -35z m710 5 c11 -24 11 -24 -3 -6 -9 11 -16 24 -16 30 0 12 5 7 19 -24z m-645 -78 c-9 -20 -25 -59 -36 -87 -10 -27 -24 -54 -29 -60 -13 -13 -12 -7 11 53 22 58 25 76 10 67 -5 -3',
  ' -10 -12 -10 -20 0 -32 -21 -70 -30 -55 -6 10 -8 3 -4 -20 5 -31 0 -41 -41 -88 -51 -57 -67 -111 -45 -152 16 -31 1 -43 -34 -25 -16 8 -33 15 -40 15 -6 -1 6 -10 27 -21 41 -22 45 -36 19 -69 -20 -24 -83 -23 -98 2 -5 8 0 9 17 4 ',
  '61 -16 76 -17 44 -2 -16 9 -45 15 -64 16 -26 0 -32 3 -27 16 3 9 6 19 6 24 0 5 8 17 18 26 16 17 16 18 -1 11 -22 -8 -32 13 -23 48 9 34 23 31 31 -5 6 -26 9 -29 22 -19 8 7 13 20 10 29 -2 8 2 21 10 28 20 19 16 52 -6 52 -11 0 -',
  '23 -5 -26 -10 -4 -6 -11 -7 -17 -4 -6 4 -7 9 0 13 5 3 17 21 26 39 9 17 21 32 26 32 11 0 110 100 110 111 0 5 9 14 20 21 11 7 20 17 20 22 0 31 65 73 93 59 27 -13 27 -14 11 -51z m403 42 c14 -15 29 -36 34 -48 23 -49 48 -82 11',
  '2 -147 20 -20 37 -45 37 -53 0 -9 5 -16 11 -16 5 0 7 -5 4 -10 -4 -7 -12 -7 -25 0 -10 5 -23 10 -29 10 -15 0 -14 -57 2 -67 6 -4 12 -17 12 -28 0 -31 30 -24 33 8 4 35 20 31 42 -11 10 -17 20 -28 24 -25 4 4 4 -1 0 -12 -5 -11 -9',
  ' -14 -12 -7 -2 7 -13 12 -25 12 -19 0 -19 -1 -4 -12 26 -21 33 -68 11 -68 -11 0 -46 -12 -79 -25 -63 -26 -70 -25 -80 15 -5 21 0 28 30 44 19 11 33 21 31 23 -2 2 -20 -6 -40 -18 -46 -27 -49 -25 -63 74 -11 78 -74 280 -80 260 -6',
  ' -16 24 -117 46 -162 22 -41 20 -68 -2 -54 -7 3 -4 -2 5 -13 27 -31 36 -79 12 -69 -41 17 -121 36 -159 37 -49 1 -196 -12 -207 -18 -11 -7 -10 3 3 25 12 18 -33 131 -52 131 -4 0 -14 11 -23 25 -11 16 -12 23 -3 20 8 -4 23 22 43 ',
  '76 l31 82 104 1 c80 1 117 7 159 23 71 27 69 27 97 -3z m456 -56 c23 -27 22 -67 -5 -95 -30 -32 -33 -30 -30 27 3 38 -1 59 -18 87 l-21 36 28 -17 c15 -10 36 -27 46 -38z m-1191 -3 c-17 -35 -32 -45 -32 -23 0 10 38 58 47 58 1 0 ',
  '-5 -16 -15 -35z m1132 -100 l6 -30 -11 30 c-6 17 -30 50 -53 75 l-41 45 47 -45 c28 -27 49 -57 52 -75z m-1036 51 c-13 -19 -24 -33 -26 -31 -5 4 37 65 44 65 2 0 -6 -15 -18 -34z m-143 -10 c14 -14 18 -76 5 -76 -16 0 -39 48 -33 ',
  '69 6 25 10 26 28 7z m1021 -37 c8 -16 14 -34 13 -41 0 -7 -5 -2 -10 11 -5 13 -19 37 -31 55 -17 23 -18 27 -4 17 9 -8 24 -27 32 -42z m-688 -61 c30 -30 -4 -77 -41 -57 -21 12 -22 33 -1 53 19 19 26 20 42 4z m696 -42 c-3 -14 -10',
  ' -24 -14 -21 -5 3 -3 16 3 29 15 31 20 27 11 -8z m163 2 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-97 1 c0 -6 -14 -24 -30 -41 -17 -16 -27 -34 -24 -40 4 -7 2 -8 -4 -4 -17 10 -15 36 2 36 8 0 23 14 33 30 19 32 23 ',
  '36 23 19z m-1052 -29 c-7 -10 -14 -17 -17 -15 -4 4 18 35 25 35 2 0 -1 -9 -8 -20z m323 -82 c-18 -51 -106 -73 -143 -36 -22 22 -22 23 -3 26 11 2 29 7 40 12 11 5 38 11 60 13 22 2 43 4 47 5 4 1 4 -8 -1 -20z m310 -39 c-26 -16 -',
  '36 -18 -42 -8 -12 20 -1 29 39 29 l37 0 -34 -21z m-99 -24 c2 -19 0 -35 -4 -35 -4 0 -8 16 -8 35 0 19 2 35 4 35 2 0 6 -16 8 -35z m188 24 c12 -9 10 -10 -9 -6 l-23 6 21 -23 c20 -21 19 -36 0 -36 -8 0 -39 52 -39 65 0 9 34 5 50 ',
  '-6z m-74 -55 c-4 -18 -11 -34 -17 -34 -19 0 -20 28 -3 62 20 38 29 24 20 -28z m-464 -33 c-15 -32 -28 -55 -30 -50 -3 8 45 109 53 109 2 0 -8 -26 -23 -59z m215 2 c-3 -10 -5 -2 -5 17 0 19 2 27 5 18 2 -10 2 -26 0 -35z m-60 15 c',
  '-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-59 -31 c12 -3 10 -5 -6 -6 -17 -1 -24 -9 -28 -31 -4 -16 -10 -30 -14 -30 -5 0 -1 23 8 52 10 28 18 44 20 35 2 -8 11 -18 20 -20z m273 -7 c5 0 4 -6 -3 -14 -16 -17 -28 -2 -2',
  '0 28 5 18 7 18 10 4 2 -10 8 -18 13 -18z m409 21 c0 -10 -73 -41 -97 -41 -31 0 18 26 95 49 1 1 2 -3 2 -8z m-633 -43 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m60 -20 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1',
  ' -19z m413 8 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m267 -18 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-393 -22 c8 -14 8 -20 -1 -23 -7 -3 -13 -9 -13 -14 0 -4 7 -6 16 -2 12 4 15 ',
  '2 12 -8 -3 -9 -15 -13 -31 -11 -23 3 -27 0 -27 -22 0 -14 5 -26 10 -26 6 0 10 -7 10 -15 0 -18 12 -19 29 -2 17 16 10 -148 -7 -165 -15 -15 -123 -22 -142 -9 -12 8 -13 17 -3 53 6 24 9 67 7 96 -3 44 -1 52 14 53 15 1 15 2 1 6 -5',
  '0 13 -27 41 33 42 33 0 63 2 66 5 3 4 -22 6 -55 6 -47 0 -62 4 -67 16 -9 23 -5 25 56 34 69 10 79 9 92 -14z m-285 8 c65 -7 96 -44 36 -44 -14 0 -25 -4 -25 -8 0 -5 12 -7 28 -4 30 4 44 -65 18 -97 -8 -12 -8 -13 2 -7 9 5 12 -5 1',
  '3 -41 1 -26 3 -58 4 -71 6 -56 -142 -57 -150 -1 -10 64 -13 152 -6 140 5 -7 14 -10 20 -7 6 4 9 12 6 17 -4 5 -1 9 4 9 6 0 11 12 11 26 0 23 -3 25 -25 20 -14 -4 -25 -2 -25 4 0 5 15 11 33 12 l32 1 -32 4 c-18 2 -33 8 -33 13 0 5',
  ' -3 15 -6 24 -7 18 2 19 95 10z m491 -28 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m20 -40 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z M890 949 c0 -5 5 -7 10 -4 6 3 ',
  '10 8 10 11 0 2 -4 4 -10 4 -5 0 -10 -5 -10 -11z M808 873 c-19 -22 -32 -56 -18 -48 6 3 10 11 10 17 0 6 7 20 17 30 9 10 14 18 11 18 -3 0 -12 -8 -20 -17z M750 772 c0 -6 -10 -21 -22 -33 l-23 -21 23 11 c24 13 39 38 28 48 -3 4 ',
  '-6 1 -6 -5z M666 754 c-5 -14 -4 -15 9 -4 17 14 19 20 6 20 -5 0 -12 -7 -15 -16z M694 748 l-19 -23 23 19 c21 18 27 26 19 26 -2 0 -12 -10 -23 -22z M1250 955 c0 -11 5 -27 10 -35 8 -12 10 -12 10 5 0 11 -5 27 -10 35 -8 12 -10 ',
  '12 -10 -5z M1056 932 c-3 -4 6 -20 20 -35 26 -28 74 -37 74 -14 0 21 -11 27 -31 17 -14 -8 -18 -6 -21 12 -3 23 -32 37 -42 20z M983 888 c-57 -28 -50 -129 11 -137 96 -14 184 -6 210 18 14 14 26 21 26 17 0 -4 9 -2 20 4 30 16 25',
  ' 40 -8 40 -15 0 -34 6 -40 12 -18 18 -34 -9 -21 -34 18 -33 -21 -20 -59 20 -64 68 -95 81 -139 60z m51 -103 c39 -37 35 -41 -26 -25 -32 9 -58 33 -58 54 0 19 53 1 84 -29z M980 789 c0 -5 5 -7 10 -4 6 3 10 8 10 11 0 2 -4 4 -10 ',
  '4 -5 0 -10 -5 -10 -11z M1310 886 c0 -2 8 -10 18 -17 15 -13 16 -12 3 4 -13 16 -21 21 -21 13z M1387 829 c4 -13 8 -18 11 -10 2 7 -1 18 -6 23 -8 8 -9 4 -5 -13z M1341 829 c-1 -9 7 -23 17 -30 15 -12 16 -12 6 1 -6 8 -14 22 -17 ',
  '30 -5 13 -6 12 -6 -1z M1409 772 c5 -10 18 -25 27 -33 11 -9 9 -2 -6 19 -26 35 -36 42 -21 14z M1372 756 c2 -10 14 -25 28 -33 17 -10 20 -11 9 -2 -8 8 -21 23 -28 34 -11 19 -12 19 -9 1z M1160 310 c0 -5 5 -10 11 -10 5 0 7 5 4 ',
  '10 -3 6 -8 10 -11 10 -2 0 -4 -4 -4 -10z M1143 203 c2 -31 76 -22 77 10 0 4 -18 7 -39 7 -32 0 -39 -4 -38 -17z M973 303 c9 -2 23 -2 30 0 6 3 -1 5 -18 5 -16 0 -22 -2 -12 -5z M983 222 c-34 -3 -38 -8 -25 -29 5 -7 13 -9 21 -3 8',
  ' 4 20 6 26 4 13 -5 29 23 17 28 -4 2 -22 2 -39 0z M935 2016 c-99 -35 -115 -43 -115 -57 0 -5 12 -3 28 4 15 7 47 19 72 27 25 7 59 19 77 26 17 8 36 14 43 14 6 0 8 5 5 10 -8 13 -5 14 -110 -24z M1110 2000 c0 -13 11 -13 30 0 12',
  ' 8 11 10 -7 10 -13 0 -23 -4 -23 -10z M1163 1994 c-3 -9 -1 -25 5 -34 6 -10 9 -26 8 -36 -2 -11 -1 -13 1 -6 3 6 9 12 14 12 5 0 3 11 -6 24 -8 13 -13 31 -9 40 3 9 3 16 0 16 -4 0 -9 -7 -13 -16z M975 1993 c-44 -10 -105 -36 -105',
  ' -46 0 -6 4 -6 13 0 6 6 26 14 42 18 17 5 35 10 40 11 6 2 26 8 45 13 37 10 6 13 -35 4z M1206 1985 c4 -11 10 -12 18 -6 18 15 39 -3 32 -27 -4 -12 -2 -23 5 -28 8 -4 9 -3 5 4 -4 6 -2 20 3 30 8 16 6 21 -15 31 -35 16 -55 14 -48',
  ' -4z M1315 1940 c10 -11 20 -18 23 -15 7 6 -18 35 -31 35 -5 0 -2 -9 8 -20z M830 1935 c-7 -8 -9 -15 -6 -15 4 0 14 7 22 15 9 8 11 15 6 15 -5 0 -15 -7 -22 -15z M1222 1900 c0 -14 2 -19 5 -12 2 6 2 18 0 25 -3 6 -5 1 -5 -13z M9',
  '10 1901 c0 -5 5 -13 10 -16 6 -3 10 -2 10 4 0 5 -4 13 -10 16 -5 3 -10 2 -10 -4z M1340 1903 c0 -6 4 -15 10 -18 5 -3 7 -19 4 -34 -3 -16 -2 -31 2 -34 13 -8 10 55 -4 78 -6 11 -12 15 -12 8z M760 1885 c-20 -24 -6 -28 15 -5 10 1',
  '1 13 20 8 20 -6 0 -16 -7 -23 -15z M683 1803 c-36 -46 -53 -77 -52 -95 0 -7 4 -4 9 7 7 16 9 17 9 3 1 -9 5 -19 10 -22 5 -4 7 11 4 34 -4 31 -2 41 11 46 9 3 16 12 16 20 0 7 8 17 17 23 10 5 15 12 12 16 -4 3 -20 -11 -36 -32z M1',
  '402 1809 c1 -29 4 -34 14 -25 6 6 9 16 4 21 -4 6 -10 17 -13 25 -3 8 -5 -1 -5 -21z M750 1800 c0 -5 5 -10 11 -10 5 0 7 5 4 10 -3 6 -8 10 -11 10 -2 0 -4 -4 -4 -10z M686 1737 c3 -10 9 -15 12 -12 3 3 0 11 -7 18 -10 9 -11 8 -5 ',
  '-6z M630 1676 c0 -8 4 -17 9 -20 5 -4 7 3 4 14 -6 23 -13 26 -13 6z M610 1630 c0 -5 5 -10 11 -10 5 0 7 5 4 10 -3 6 -8 10 -11 10 -2 0 -4 -4 -4 -10z'
].join('');
const ART_VIEW = 220;

// ── 鲸鱼娘剪影 ─────────────────────────────────────────────

// 运行时配置（由入口写入）
var ART_CFG = {
  color: '',
  size: '', sizeS: '', sizeM: '', sizeL: '',
  x: '', xS: '', xM: '', xL: '',
  y: '', yS: '', yM: '', yL: ''
};

// 各尺寸取自己的值，没填就用通用值，再没有就用默认（100 / 50 / 50）
function cfgFor(family) {
  var k = family === 'systemSmall' ? 'S'
    : (family === 'systemLarge' || family === 'systemExtraLarge') ? 'L' : 'M';
  function pick(g, suffix) {
    var v = parseFloat(ART_CFG[suffix]);
    if (isFinite(v)) return v;
    var gg = parseFloat(g);
    return isFinite(gg) ? gg : null;
  }
  var size = pick(ART_CFG.size, 'size' + k);
  var x = pick(ART_CFG.x, 'x' + k);
  var y = pick(ART_CFG.y, 'y' + k);
  return {
    scale: (size === null || size < 20 || size > 400) ? 100 : size,
    x: (x === null || x < -200 || x > 300) ? 50 : x,
    y: (y === null || y < -200 || y > 300) ? 50 : y
  };
}

function artColorOf() {
  // 默认深灰；想要别的颜色在「主图颜色」里填 #RRGGBB
  return ART_CFG.color || '#3A3A3C';
}

// 主图：外层是**固定宽**的槽（宽度永远 = ringSize），
// 图本身按 S 缩放后可以比槽大，SwiftUI 不会裁剪，于是能压到文字上，
// 但外层槽宽不变 → 文字一格都不会移动。
function heroImage(slot, family) {
  var c = cfgFor(family);
  var draw = Math.max(16, Math.round(slot * c.scale / 100));
  // 画布留 60% 余量：图可以偏出槽外，也不会被 SVG 视口裁掉
  var box = Math.round(draw * 1.6);
  var s2 = (draw / ART_VIEW * 0.1).toFixed(6);
  var dx = (c.x - 50) / 100 * draw * 0.8;
  var dy = (c.y - 50) / 100 * draw * 0.8;
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + box + ' ' + box + "'>" +
    "<g transform='translate(" + (box / 2 + dx - draw / 2).toFixed(2) + ' ' +
    (box / 2 + dy - draw / 2).toFixed(2) + ")'>" +
    "<g transform='translate(0 " + draw + ") scale(" + s2 + ' ' + (-s2) + ")'>" +
    "<path fill='" + artColorOf() + "' fill-rule='evenodd' d='" + ART_D + "'/></g></g></svg>";
  // 外层槽宽固定 = ringSize；里面图比槽大，靠溢出画出去，布局不受影响
  return {
    type: 'stack', direction: 'row', alignItems: 'center',
    width: slot, height: slot, gap: 0,
    children: [{ type: 'image', src: svgDataURI(svg), width: box, height: box }]
  };
}

function svgDataURI(svg) {
  return 'data:image/svg+xml;base64,' + b64(svg);
}

// Egern 的 JS 运行时不一定有 btoa，这里自己实现一份（UTF-8 → base64）
function b64(str) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var bytes = utf8Bytes(str);
  var out = '';
  for (var i = 0; i < bytes.length; i += 3) {
    var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | ((b1 || 0) >> 4)];
    out += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | ((b2 || 0) >> 6)] : '=';
    out += i + 2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return out;
}

function utf8Bytes(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
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
  var size = st.ringSize;
  var heroImg = heroImage(st.ringSize, 'systemLarge');

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

  return mkRow([heroImg, rightCol], st.gapHero || 12, { alignItems: 'center' });

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
    name: 9, day: 11, num: 30, unit: 12,
    title: 11, heroName: 19, heroW: 98, heroLabel: 14, cellW: 100,
    gapRow: 4, gapTop: 2, gapMid: 4,
    ringSize: 80, gapHero: 12, heroH: 62,
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
  var sIcon    = st.ringSize;
  var heroImg  = heroImage(sIcon, 'systemSmall');

  // 节日名：加粗 + 按类别着色（今天红 / 节气绿 / 现代节日金），右上角跟日期
  children.push(mkRow([
    mkText(next.name, st.heroName, 'heavy',
      catColor(next.cat, isToday), { maxLines: 1, minScale: 0.55, flex: 1 }),
    mkText(today.m + '/' + today.d, Math.round(st.title * 0.75), 'medium', C.muted, { maxLines: 1 }),
  ], 4));

  children.push(null);

  // 圆环居中
  children.push(mkRow([mkSpacer(), heroImg, mkSpacer()], 0));

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
  var usedH = st.heroName * LINE + sIcon + st.num * LINE + st.gapMid + 2;
  var cellH = st.name * LINE + st.day * LINE;
  if (rest.length > 0 && usedH + cellH <= canvasH - st.pad * 2) {
    var rowKids = rest.map(function(it) { return cell(it, st); });
    while (rowKids.length < 2) rowKids.push(mkSpacer());
    children.push(mkRow(rowKids, 8));
  }

  return { type: 'widget', padding: st.pad, gap: 0, children: children };
}

// ── 中号布局：hero 照大号（圆环 + 右侧「今天」+ 节日胶囊），右边一列放后面的节日 ──
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
  var rs = st.ringSize;
  var heroImg = heroImage(rs, 'systemMedium');

  // hero 右列：大数字 + 节日胶囊（和大号同一套）
  var numRow = mkRow([
    mkText(isToday ? '今天' : String(next.days),
      isToday ? Math.round(st.num * 0.76) : st.num,
      'heavy', catColor(next.cat, isToday), { maxLines: 1, minScale: 0.45 }),
    isToday ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
  ], isToday ? 0 : Math.round(st.num * 0.12), { alignItems: 'end' });

  var heroCol = mkCol([numRow, pill(next, st, isToday)], Math.round(st.num * 0.1), { width: st.heroW });
  var hero = mkRow([heroImg, heroCol], st.gapHero || 12, { alignItems: 'center' });

  // 右侧一列：后面的节日，行距摊开铺满高度（扣掉顶部标题行）
  var canvasH = canvasOf(ctx, 'systemMedium').h;
  var avail = canvasH - st.pad * 2 - (st.title * LINE + 4) - st.gapTop;
  var rowH = st.day * LINE;
  var minGap = 6;
  var maxRows = Math.max(1, Math.floor((avail + minGap) / (rowH + minGap)));
  var rest = items.slice(1, 1 + Math.min(maxItems || 99, maxRows));
  var gapRow = rest.length > 1
    ? Math.max(minGap, Math.min(16, (avail - rest.length * rowH) / (rest.length - 1)))
    : 2;

  var rows = rest.map(function (it) { return cellInline(it, st); });
  var listCol = mkCol(rows, Math.round(gapRow), { flex: 1 });

  children.push(headerRow(title, today, st, themeKey));
  children.push(mkSpacer(st.gapTop));
  children.push(mkRow([hero, listCol], 10, { alignItems: 'center' }));

  return { type: 'widget', padding: st.pad, gap: 0, children: children };
}

// 定宽盒子：text 本身不能设宽，靠弹性 spacer 在固定宽度的 stack 里顶到一侧
function boxText(node, w, align) {
  var kids = align === 'right' ? [mkSpacer(), node] : [node, mkSpacer()];
  return { type: 'stack', direction: 'row', alignItems: 'center', gap: 0, width: w, children: kids };
}

// 列表一格：名字（左对齐）+ 天数（右对齐 → 「天」竖着对齐）
function cellInline(it, st) {
  var isToday = it.days === 0;
  return mkRow([
    boxText(mkText(it.name, st.name, 'medium', C.sub, { maxLines: 1, minScale: 0.5 }), 52, 'left'),
    boxText(mkText(isToday ? '今天' : it.days + '天', st.day, 'bold',
      catColor(it.cat, isToday), { maxLines: 1, minScale: 0.45 }), 40, 'right'),
  ], 8, { width: st.cellW });
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

  var artColor = String(env.ART_COLOR || '').trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(artColor)) artColor = '';
  ART_CFG.color = artColor;
  ['size', 'x', 'y'].forEach(function (k) {
    ART_CFG[k] = String(env['ART_' + k.toUpperCase()] || '').trim();
    ART_CFG[k + 'S'] = String(env['ART_' + k.toUpperCase() + '_S'] || '').trim();
    ART_CFG[k + 'M'] = String(env['ART_' + k.toUpperCase() + '_M'] || '').trim();
    ART_CFG[k + 'L'] = String(env['ART_' + k.toUpperCase() + '_L'] || '').trim();
  });
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
