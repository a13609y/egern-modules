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
// 鲸鱼娘剪影（img2svg 从双色位图描出，130×130，坐标 0.1px / y 向上）
const ART_D = [
  'M524 1246 c-35 -16 -74 -61 -74 -86 0 -10 -15 -29 -34 -44 -50 -38 -87 -120 -89 -198 -2 -68 -5 -73 -55 -124 -31 -31 -35 -54 -11 -54 6 0 7 5 3 11 -5 8 6 10 35 7 22 -2 41 0 41 4 0 5 5 8 10 8 6 0 10 -9 10 ',
  '-20 0 -18 -5 -20 -40 -16 -24 3 -38 1 -35 -5 4 -5 24 -9 45 -9 21 0 42 -5 45 -10 4 -6 11 -7 17 -4 7 4 8 2 4 -5 -5 -8 -12 -9 -20 -2 -12 11 -84 -104 -72 -116 3 -3 -4 -17 -14 -31 -25 -32 -25 -53 1 -86 20 -',
  '25 20 -26 1 -26 -10 0 -24 10 -29 23 -10 21 -11 21 -19 3 -10 -25 5 -47 45 -68 18 -9 28 -19 22 -23 -6 -3 -16 -3 -22 1 -7 4 -10 -1 -7 -12 2 -12 14 -21 33 -24 24 -4 30 -10 30 -29 0 -18 8 -27 30 -34 17 -5 ',
  '42 -18 57 -28 14 -11 38 -19 52 -19 20 0 26 -5 25 -23 -3 -107 24 -159 81 -155 l35 3 1 78 c2 73 7 97 19 85 3 -2 6 -40 8 -84 l2 -79 41 -3 c57 -4 69 13 69 105 0 40 3 73 8 73 4 0 7 -4 7 -8 0 -5 17 -17 38 -',
  '27 20 -10 45 -22 54 -26 26 -13 45 -11 81 8 18 9 42 16 54 14 38 -4 93 34 93 65 0 2 -17 4 -38 4 -32 0 -41 5 -50 25 -20 42 -69 9 -60 -40 6 -31 -27 -35 -63 -6 l-23 18 29 14 c16 8 34 23 40 34 5 11 16 20 23',
  ' 21 27 2 32 4 32 14 0 5 -3 9 -8 7 -11 -3 -14 6 -7 25 6 14 10 14 32 3 40 -21 92 4 93 45 0 11 -3 11 -12 2 -17 -17 -48 -15 -48 4 0 9 14 29 30 44 37 35 39 68 5 108 -15 18 -23 36 -19 46 4 10 -5 33 -21 57 -',
  '27 42 -19 68 22 69 28 0 16 27 -24 53 -33 21 -43 32 -38 46 3 10 -1 24 -10 31 -11 9 -13 15 -5 20 28 17 -41 158 -111 230 -55 56 -209 116 -209 81 0 -6 13 -11 29 -11 58 0 201 -82 201 -116 0 -6 9 -19 20 -29',
  ' 42 -38 48 -141 6 -106 -8 7 -20 10 -26 6 -5 -3 -10 -2 -10 2 0 5 10 13 23 18 30 14 28 32 -7 55 -22 14 -34 16 -48 9 -15 -8 -26 -4 -54 20 -101 89 -239 82 -347 -18 -24 -22 -48 -37 -52 -33 -5 4 -5 2 -2 -4 ',
  '4 -6 -7 -36 -23 -65 -24 -43 -30 -49 -29 -29 0 72 41 179 58 152 4 -7 12 -3 20 11 13 20 13 21 -2 8 -10 -8 -17 -9 -17 -3 0 15 41 42 53 35 6 -3 7 -1 3 5 -3 6 3 16 14 22 11 6 18 15 15 21 -12 19 52 69 89 69',
  ' 56 0 50 -16 -12 -35 -31 -10 -61 -22 -67 -27 -7 -7 -2 -8 14 -3 15 5 27 2 33 -6 8 -11 9 -11 5 1 -2 10 9 19 32 27 48 17 51 16 51 -9 0 -19 2 -20 10 -8 42 64 -32 112 -116 76z m56 -182 c-45 -19 -50 -17 -16',
  ' 5 17 11 34 17 39 14 5 -3 -5 -12 -23 -19z m137 0 c25 -22 25 -24 3 -10 -13 9 -33 16 -43 16 -10 0 -15 5 -12 10 10 16 22 12 52 -16z m113 -63 c0 -4 -6 -8 -14 -8 -8 0 -12 6 -9 14 5 13 23 9 23 -6z m47 -1 c2',
  '3 -18 23 -20 6 -20 -19 0 -43 17 -43 32 0 13 10 9 37 -12z m-411 -19 c-8 -13 -36 -15 -36 -3 0 4 5 13 12 20 14 14 34 0 24 -17z m164 -30 c0 -6 -9 -15 -20 -21 -20 -11 -32 35 -14 53 8 7 34 -17 34 -32z m120 ',
  '18 c0 -5 -4 -9 -10 -9 -5 0 -10 7 -10 16 0 8 5 12 10 9 6 -3 10 -10 10 -16z m-230 7 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m127 -28 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3',
  ' 4 -12 1 -19z m73 -60 c0 -5 -4 -8 -10 -8 -5 0 -10 10 -10 23 0 21 19 6 20 -15z m-175 2 c3 -5 1 -10 -4 -10 -6 0 -11 5 -11 10 0 6 2 10 4 10 3 0 8 -4 11 -10z m418 -14 c8 -20 -8 -38 -29 -34 -22 4 -31 37 -1',
  '3 48 15 10 36 3 42 -14z m-602 -23 c-12 -20 -14 -14 -5 12 4 9 9 14 11 11 3 -2 0 -13 -6 -23z m194 -16 l11 -32 -37 -1 -37 -1 16 33 c20 43 34 43 47 1z m187 16 c34 -40 33 -46 -5 -41 -35 4 -65 -21 -38 -30 6',
  ' -2 9 -8 6 -12 -14 -22 7 -62 21 -43 13 17 15 17 28 0 15 -20 26 -6 26 34 0 11 5 17 10 14 14 -9 12 -49 -2 -63 -7 -7 -13 -18 -13 -25 0 -7 -25 -17 -55 -23 -31 -6 -62 -14 -70 -17 -20 -9 60 -1 82 8 13 5 20 ',
  '1 27 -16 13 -36 -124 -77 -167 -50 -18 11 -4 41 19 41 34 0 20 19 -18 25 -58 10 -88 21 -88 32 0 5 -8 17 -17 27 -22 22 -22 22 3 49 14 14 20 16 17 6 -3 -8 0 -26 8 -40 7 -13 13 -18 14 -11 0 6 9 12 19 12 11',
  ' 0 22 -6 24 -12 3 -7 6 4 6 26 1 35 3 37 18 25 15 -13 15 -12 3 11 -13 25 -13 25 8 6 12 -10 20 -22 17 -26 -2 -4 9 -7 25 -7 16 0 27 4 24 8 -8 13 29 109 42 109 6 0 18 -8 26 -17z m65 -5 c-3 -8 -6 -5 -6 6 -',
  '1 11 2 17 5 13 3 -3 4 -12 1 -19z m203 -78 c41 -1 43 -2 26 -15 -10 -8 -22 -12 -27 -10 -4 3 -10 1 -14 -5 -4 -7 -12 -7 -26 0 -10 6 -19 8 -19 4 0 -3 -7 -1 -15 6 -22 19 -18 33 8 26 12 -3 42 -6 67 -6z m-623',
  ' -32 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m500 -40 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m118 -15 c31 -36 36 -76 6 -49 -19 17 -46 76 -35 76 3 0 16 -12 29 -27z m-565 -7 c0 ',
  '-3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m-76 -45 c-21 -35 -41 -43 -23 -8 16 31 31 48 36 43 3 -3 -3 -18 -13 -35z m206 7 c0 -23 -16 -39 -32 -33 -22 9 -11 45 13 45 11 0 19 -6 ',
  '19 -12z m280 -28 c0 -5 -5 -10 -11 -10 -5 0 -7 5 -4 10 3 6 8 10 11 10 2 0 4 -4 4 -10z m-301 -34 c-1 -31 -37 -100 -42 -81 -5 20 -5 20 -6 0 0 -11 -15 -37 -32 -58 -25 -30 -30 -45 -27 -72 2 -19 1 -35 -4 -3',
  '5 -4 0 -5 -6 -2 -14 9 -23 -33 -41 -60 -26 -22 11 -32 78 -13 96 4 4 7 0 7 -9 0 -25 17 -21 24 6 11 40 7 49 -16 43 -13 -3 -17 -3 -10 0 6 3 12 10 12 15 0 5 19 29 43 52 23 23 55 57 70 74 26 31 58 36 56 9z ',
  'm234 12 c7 -7 18 -25 26 -41 8 -15 29 -42 46 -60 41 -41 51 -67 24 -60 -20 6 -28 -20 -9 -32 6 -4 8 -10 5 -15 -3 -5 -1 -11 4 -15 5 -3 14 3 20 12 9 15 12 16 20 3 6 -8 6 -19 1 -25 -5 -6 -5 -17 0 -25 7 -11 ',
  '-2 -18 -37 -32 -26 -10 -47 -16 -48 -15 -1 1 -8 13 -16 27 -8 14 -16 42 -17 62 -3 36 -40 136 -41 110 -1 -7 6 -27 15 -43 8 -17 13 -33 10 -36 -2 -3 -1 -16 5 -30 8 -22 7 -24 -13 -16 -13 4 -65 8 -115 8 -85 ',
  '0 -92 2 -87 18 3 11 -5 31 -20 52 l-26 34 21 54 21 54 46 -4 c27 -3 64 2 87 10 52 19 64 20 78 5z m277 -79 c-15 -27 -25 -24 -26 9 0 15 -4 36 -8 47 -6 15 -1 13 18 -8 21 -23 24 -32 16 -48z m-730 -22 c0 -20',
  ' -1 -20 -16 -5 -9 9 -13 21 -9 27 10 16 25 3 25 -22z m194 -35 c8 -13 -11 -35 -23 -28 -16 10 -14 36 3 36 8 0 17 -4 20 -8z m14 -84 c-6 -18 -52 -32 -74 -24 -18 7 -18 8 0 22 25 18 79 19 74 2z m192 -12 c0 -',
  '2 -7 -6 -15 -10 -8 -3 -15 -1 -15 4 0 6 7 10 15 10 8 0 15 -2 15 -4z m35 -16 c-3 -5 -1 -10 5 -10 6 0 8 -5 4 -11 -4 -8 -9 -7 -15 2 -12 19 -11 29 2 29 5 0 7 -4 4 -10z m-39 -37 c-11 -11 -17 4 -9 23 7 18 8 ',
  '18 11 1 2 -10 1 -21 -2 -24z m180 -12 c-6 -9 -46 -22 -46 -15 0 3 10 9 23 14 29 11 29 11 23 1z m-323 -47 c30 -5 35 -9 26 -20 -6 -8 -8 -14 -3 -14 5 0 10 -34 12 -75 l3 -75 -35 0 c-52 0 -78 69 -41 106 8 9 ',
  '15 22 15 31 0 9 -6 13 -15 9 -8 -3 -15 -1 -15 3 0 5 -3 16 -6 25 -7 18 1 19 59 10z m165 -21 c3 -17 0 -21 -12 -17 -10 4 -16 1 -16 -7 0 -24 17 -42 30 -34 18 11 5 -86 -13 -97 -27 -18 -72 -4 -72 22 0 21 4 2',
  '5 28 22 15 -2 27 1 27 7 0 6 -12 11 -28 11 -26 0 -35 42 -23 113 3 21 76 2 79 -20z M515 539 c-4 -6 -5 -12 -2 -15 2 -3 7 2 10 11 7 17 1 20 -8 4z M627 553 c-10 -16 26 -44 43 -33 12 8 12 10 1 10 -8 0 -19 7',
  ' -26 17 -7 10 -14 12 -18 6z M572 518 c-18 -18 -14 -38 6 -38 11 0 27 -9 37 -20 22 -24 61 -26 103 -4 38 18 40 29 10 38 -35 9 -41 7 -34 -9 9 -24 -8 -18 -42 15 -34 32 -60 38 -80 18z M751 514 c0 -11 3 -14 ',
  '6 -6 3 7 2 16 -1 19 -3 4 -6 -2 -5 -13z M566 458 c3 -5 10 -6 15 -3 13 9 11 12 -6 12 -8 0 -12 -4 -9 -9z M560 120 c0 -5 9 -10 19 -10 11 0 23 5 26 10 4 6 -5 10 -19 10 -14 0 -26 -4 -26 -10z M693 1145 c0 -8',
  ' 4 -12 9 -9 5 3 6 10 3 15 -9 13 -12 11 -12 -6z M794 176 c11 -9 31 -16 45 -15 24 1 24 2 -5 8 -17 4 -37 11 -45 15 -8 4 -5 0 5 -8z'
].join('');
const ART_VIEW = 130;

// ── 鲸鱼娘剪影 ─────────────────────────────────────────────

// 运行时配置（由入口写入）
var ART_CFG = { color: '', size: '', sizeS: '', sizeM: '', sizeL: '', x: '', xS: '', xM: '', xL: '', y: '', yS: '', yM: '', yL: '' };

function artColorOf() {
  // 默认深灰；想要别的颜色在「主图颜色」里填 #RRGGBB
  return ART_CFG.color || '#3A3A3C';
}

function artSize(base) {
  return Math.max(24, Math.round(base * ART_CFG.scale / 100));
}

// 图标画进背景层：Egern 的 DSL 没有 z-index / 绝对定位，
// 只有 backgroundImage 能不占排版空间，所以把图形画在背景 SVG 里，
// 这样调大小/位置都不会推动文字。
// 图标画在**背景层**：Egern 的 DSL 没有 z-index / 绝对定位，
// 只有 backgroundImage 能不占排版空间、还能压在文字上（其实是文字压在图上，
// 但调整大小/位置时不会推动任何文字）。
// 自动位置 = 版式里那个图标槽的中心（按各尺寸的 padding / header 高度算出来的）
// small: pad10 + 标题行 21 + 槽/2 26 ≈ 57 / 155
// medium: pad13 + 标题 20.5 + gap 2 + 槽/2 40 ≈ 75.5 / 155
// large: pad15 + 标题 23.5 + gap 2 + 槽/2 44 ≈ 84.5 / 345
var DEFAULT_POS = {
  systemSmall: { x: 50, y: 37 },
  systemMedium: { x: 16, y: 49 },
  systemLarge: { x: 18, y: 24.5 },
  systemExtraLarge: { x: 18, y: 24.5 }
};

// 各尺寸的独立覆盖（没填就用全局 ART_SIZE / ART_X / ART_Y）
function cfgFor(family) {
  var key = family === 'systemSmall' ? 'S' : (family === 'systemLarge' || family === 'systemExtraLarge') ? 'L' : 'M';
  function pick(global, suf) {
    var v = parseFloat(ART_CFG[suf]);
    if (v >= -20 && v <= 200) return v;
    var g = parseFloat(global);
    return (g >= -20 && g <= 200) ? g : null;
  }
  var size = pick(ART_CFG.size, 'size' + key);
  var x = pick(ART_CFG.x, 'x' + key);
  var y = pick(ART_CFG.y, 'y' + key);
  var dflt = DEFAULT_POS[family] || DEFAULT_POS.systemMedium;
  return {
    scale: (size === null || size < 40) ? 100 : size,
    x: x === null ? dflt.x : x,
    y: y === null ? dflt.y : y
  };
}

function heroLayerSVG(canvasW, canvasH, family, themeKey) {
  var st = familyStyle(family);
  var c = cfgFor(family);
  var size = Math.max(24, Math.round(st.ringSize * c.scale / 100));
  var cx = canvasW * c.x / 100;
  var cy = canvasH * c.y / 100;
  var x = cx - size / 2;
  var y = cy - size / 2;
  var s2 = (size / ART_VIEW * 0.1).toFixed(6);
  return "<g transform='translate(" + x.toFixed(1) + ' ' + y.toFixed(1) + ")'>" +
    "<g transform='translate(0 " + size + ") scale(" + s2 + ' ' + (-s2) + ")'>" +
    "<path fill='" + artColorOf() + "' fill-rule='evenodd' d='" + ART_D + "'/></g></g>";
}

// 背景层 = 渐变底 + 图标（backgroundImage 会覆盖 backgroundGradient，所以底色也画进来）
function buildWidgetBackground(canvasW, canvasH, family, themeKey, transparent) {
  var colors = themeKey === 'fest' ? C.bgFest : themeKey === 'weekend' ? C.bgWeekend : C.bgWorkday;
  var c1 = colors[0].light, c2 = colors[1].light;
  var icon = heroLayerSVG(canvasW, canvasH, family, themeKey);
  if (!icon && transparent) return '';
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + canvasW + ' ' + canvasH +
    "' width='" + canvasW + "' height='" + canvasH + "'>" +
    "<defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='" + c1 + "'/><stop offset='1' stop-color='" + c2 + "'/>" +
    "</linearGradient></defs>" +
    (transparent ? '' : "<rect width='" + canvasW + "' height='" + canvasH + "' fill='url(#bg)'/>") +
    icon + '</svg>';
  return svgDataURI(svg);
}

function svgDataURI(svg) {
  return 'data:image/svg+xml;base64,' + b64(svg);
}

// 把路径画成 data URI：颜色在运行时注入，所以同一个常量能出任何颜色
function heroArtURI(color) {
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + ART_VIEW + ' ' + ART_VIEW + "'>" +
    "<g transform='translate(0," + ART_VIEW + ") scale(0.1,-0.1)'>" +
    "<path fill='" + color + "' fill-rule='evenodd' d='" + ART_D + "'/></g></svg>";
  return 'data:image/svg+xml;base64,' + b64(svg);
}

// Egern 的 JS 运行时不一定有 btoa，这里自己实现一份
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
  // 图标画在背景层：这里只留一个**固定宽**的空槽（不随 ART_SIZE 变化），
  // 所以调大小/位置只动图，不会把文字挤走。
  var slot = { type: 'stack', direction: 'column', width: st.ringSize, height: st.ringSize, gap: 0, children: [] };

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

  return mkRow([slot, rightCol], st.gapHero || 12, { alignItems: 'center' });

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
  var slot     = { type: 'stack', direction: 'column', width: sIcon, height: sIcon, gap: 0, children: [] };

  // 节日名：加粗 + 按类别着色（今天红 / 节气绿 / 现代节日金），右上角跟日期
  children.push(mkRow([
    mkText(next.name, st.heroName, 'heavy',
      catColor(next.cat, isToday), { maxLines: 1, minScale: 0.55, flex: 1 }),
    mkText(today.m + '/' + today.d, Math.round(st.title * 0.75), 'medium', C.muted, { maxLines: 1 }),
  ], 4));

  children.push(null);

  // 圆环居中
  children.push(mkRow([mkSpacer(), slot, mkSpacer()], 0));

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
  var slot = { type: 'stack', direction: 'column', width: rs, height: rs, gap: 0, children: [] };

  // hero 右列：大数字 + 节日胶囊（和大号同一套）
  var numRow = mkRow([
    mkText(isToday ? '今天' : String(next.days),
      isToday ? Math.round(st.num * 0.76) : st.num,
      'heavy', catColor(next.cat, isToday), { maxLines: 1, minScale: 0.45 }),
    isToday ? null : mkText('天', st.unit, 'medium', C.sub, { maxLines: 1 }),
  ], isToday ? 0 : Math.round(st.num * 0.12), { alignItems: 'end' });

  var heroCol = mkCol([numRow, pill(next, st, isToday)], Math.round(st.num * 0.1), { width: st.heroW });
  var hero = mkRow([slot, heroCol], st.gapHero || 12, { alignItems: 'center' });

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
  ART_CFG.size = String(env.ART_SIZE || '').trim();
  ART_CFG.sizeS = String(env.ART_SIZE_S || '').trim();
  ART_CFG.sizeM = String(env.ART_SIZE_M || '').trim();
  ART_CFG.sizeL = String(env.ART_SIZE_L || '').trim();
  ART_CFG.x = String(env.ART_X || '').trim();
  ART_CFG.xS = String(env.ART_X_S || '').trim();
  ART_CFG.xM = String(env.ART_X_M || '').trim();
  ART_CFG.xL = String(env.ART_X_L || '').trim();
  ART_CFG.y = String(env.ART_Y || '').trim();
  ART_CFG.yS = String(env.ART_Y_S || '').trim();
  ART_CFG.yM = String(env.ART_Y_M || '').trim();
  ART_CFG.yL = String(env.ART_Y_L || '').trim();
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
  var canvas = canvasOf(ctx, family);
  var bgLayer = buildWidgetBackground(canvas.w, canvas.h, family, themeKey, transparent);
  if (bgLayer) out.backgroundImage = bgLayer;
  else if (!transparent) out.backgroundGradient = backgroundGradient(themeKey);
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
