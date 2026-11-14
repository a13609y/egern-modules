/**
 * ⛽ 全国实时油价小组件 v4.1.0（Egern 模块版 · 小/中/大三尺寸重排）
 * 现价源：http://m.qiyoujiage.com/（省份 / 城市页面）
 * 历史源：BesFuel（https://github.com/BensonLaur/BesFuel）已核实的发改委调价历史（元/升，真实节点）
 * 原作者：Egern 群友 tg://user?id=5122789128 · 二次修改 iBL3ND
 *
 * 模块参数（YAML env_schema 生成设置界面，兼容手写环境变量）
 * ─────────────────────────────────────────────────────────────
 * region        省份/城市，拼音（fujian、hainan/haikou）或中文（福建、海口、广东深圳）
 * SHOW_TREND    是否显示走势图 / 调价信息：true / false
 * REFRESH_HOURS 刷新间隔小时数 1~24，默认 6（系统调度是尽力而为，不保证精确）
 * FUEL          小号大数字 / 走势图 / 加满金额使用的油品：92 / 95 / 98 / 柴油，默认 95
 * FULL_LITERS   「加满」按多少升计算，默认 50
 *
 * 数据诚实性（不要造假数据）
 * ─────────────────────────────────────────────────────────────
 * - 「最近调价」的日期 / 方向 / 幅度来自站点页面 tishi 文本（真实）
 * - 「预计下轮窗口」= 最近调价日 + 10 个工作日（国内成品油调价规则推算，界面上标注「预计」）
 * - 走势图优先用 BesFuel 快照里逐期核实的官方调价历史（地区+油号一一对应，节点日期为价格执行/公告日，
 *   阶梯线表示两次调价之间价格不变，「不作调整」公告画成空心节点）；BesFuel 未收录的地区/油号不画曲线，
 *   只用本脚本真实抓到的价格快照兜底并明确标注「本地快照」，绝不推算、不复用邻近地区数据。
 * - 站点不提供原油变化率，故「下一轮涨跌幅度」不预测，显示「暂无数据」
 */

const PAD2 = (n) => String(n).padStart(2, "0");
const MD = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
const YMD = (d) => `${d.getFullYear()}-${PAD2(d.getMonth() + 1)}-${PAD2(d.getDate())}`;

/** 10 个工作日（跳过周六周日；不含法定节假日调整，故只称「预计」） */
function addWorkdays(date, n) {
  const d = new Date(date.getTime());
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) c++;
  }
  return d;
}

function b64(str) {
  // UTF-8 字节化后再 Base64（SVG 里含中文「第N轮」，不能按 charCode 直接编码）
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
    out += C[b1 >> 2];
    out += C[((b1 & 3) << 4) | ((b2 === undefined ? 0 : b2) >> 4)];
    out += b2 === undefined ? "=" : C[((b2 & 15) << 2) | ((b3 === undefined ? 0 : b3) >> 6)];
    out += b3 === undefined ? "=" : C[b3 & 63];
  }
  return out;
}

/**
 * 官方核价历史阶梯图（纯字符串 SVG，无外部资源）。
 * 语义对齐 BesFuel：横轴为真实「价格执行/公告日期」，纵轴为元/升，阶梯线（H/V）表示价格在两次调价之间保持不变；
 * 空心点为官方「不作调整」公告（价格未变），最新点实心并标注最新价；历史缺口处断线，不把缺失期间画成价格不变。
 * points: [{ v:number, d:"YYYY-MM-DD", kind:"price"|"unchanged" }]
 * opt: { w, h, gaps:number[](断线起点索引), labels:string[] }
 */
function chartSVG(points, opt) {
  const W = Math.max(120, Math.round(opt.w));
  const H = Math.max(40, Math.round(opt.h));
  const n = points.length;
  const vals = points.map((p) => p.v);
  const padL = 25, padR = 7, padB = 12;
  const padT = Math.max(9, Math.round(H * 0.14));
  const iw = W - padL - padR, ih = H - padT - padB;
  const dmin = Math.min(...vals), dmax = Math.max(...vals);
  const span = dmax - dmin;
  let lo = dmin, hi = dmax;
  if (span < 0.04) { lo = dmin - 0.05; hi = dmax + 0.05; } else { lo = dmin - span * 0.2; hi = dmax + span * 0.2; }
  const X = (i) => (n === 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1));
  const Y = (v) => padT + ih * (1 - (v - lo) / (hi - lo));
  const line = "#2E9E6B", accent = "#FF9F0A", grid = "#8E8E93", txt = "#8E8E93";
  const gaps = Array.isArray(opt.gaps) ? opt.gaps : [];
  let s = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>`;

  // 网格 + Y 轴刻度（高图三条，矮图只留上下两条）
  const ticks = H >= 60 ? [dmax, (dmax + dmin) / 2, dmin] : [dmax, dmin];
  ticks.forEach((v, i) => {
    const y = Y(v).toFixed(1);
    if (i > 0) s += `<line x1='${padL}' y1='${y}' x2='${W - padR}' y2='${y}' stroke='${grid}' stroke-opacity='0.22' stroke-width='0.7' stroke-dasharray='2 3'/>`;
    s += `<text x='${padL - 4}' y='${(+y + 2.6).toFixed(1)}' font-size='7' fill='${txt}' text-anchor='end'>${v.toFixed(2)}</text>`;
  });

  // 最新价水平参考线（虚线）
  const lastY = Y(vals[n - 1]).toFixed(1);
  s += `<line x1='${padL}' y1='${lastY}' x2='${W - padR}' y2='${lastY}' stroke='${line}' stroke-opacity='0.35' stroke-width='0.7' stroke-dasharray='3 3'/>`;

  // 阶梯线：水平段表示价格维持，垂直段表示调价生效；缺口处 M 重新起笔
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = X(i).toFixed(1), y = Y(vals[i]).toFixed(1);
    if (i === 0 || gaps.includes(i)) d += ` M${x} ${y}`;
    else d += ` H${x} V${y}`;
  }
  s += `<path d='${d.trim()}' fill='none' stroke='${line}' stroke-width='${H >= 60 ? 2.1 : 1.8}' stroke-linejoin='round' stroke-linecap='round'/>`;

  // 节点：普通实心，官方「不调整」空心，最新点用强调色
  for (let i = 0; i < n; i++) {
    const x = X(i).toFixed(1), y = Y(vals[i]).toFixed(1);
    const isLast = i === n - 1;
    if (points[i].kind === "unchanged") {
      s += `<circle cx='${x}' cy='${y}' r='${isLast ? 3.2 : 2.1}' fill='none' stroke='${isLast ? accent : line}' stroke-width='1.2'/>`;
    } else {
      s += `<circle cx='${x}' cy='${y}' r='${isLast ? 3.2 : 2}' fill='${isLast ? accent : line}'/>`;
    }
  }

  // 最新价数值（贴近末点，越界时自动下方/左对齐）
  const lastX = X(n - 1);
  const anchor = lastX > W - 34 ? "end" : "middle";
  const ty = Y(vals[n - 1]) - 6 < padT + 5 ? Y(vals[n - 1]) + 10 : Y(vals[n - 1]) - 5;
  s += `<text x='${lastX.toFixed(1)}' y='${ty.toFixed(1)}' font-size='8.5' font-weight='700' fill='${line}' text-anchor='${anchor}'>${vals[n - 1].toFixed(2)}</text>`;

  // 横轴：首 / 尾真实日期（M/D）
  if (opt.labels && opt.labels.length === n) {
    s += `<text x='${padL}' y='${H - 2.5}' font-size='7' fill='${txt}' text-anchor='start'>${opt.labels[0]}</text>`;
    if (n > 1) s += `<text x='${W - padR}' y='${H - 2.5}' font-size='7' fill='${txt}' text-anchor='end'>${opt.labels[n - 1]}</text>`;
  }

  s += "</svg>";
  return "data:image/svg+xml;base64," + b64(s);
}

export default async function (ctx) {
  // ════════════════════════════════════════════════════════════
  // 1. 参数解析（地区 / 趋势 / 刷新间隔 / 油品 / 升数）
  // ════════════════════════════════════════════════════════════
  const rawRegion = String(
    ctx.env.region ?? ctx.env.REGION ?? ctx.env.city ?? ctx.env.CITY ?? ""
  ).trim();

  const PROV = {
    "北京":"beijing","上海":"shanghai","天津":"tianjin","重庆":"chongqing",
    "广东":"guangdong","江苏":"jiangsu","浙江":"zhejiang","山东":"shandong",
    "河南":"henan","河北":"hebei","四川":"sichuan","湖北":"hubei","湖南":"hunan",
    "安徽":"anhui","福建":"fujian","江西":"jiangxi","辽宁":"liaoning",
    "陕西":"shanxi-3","海南":"hainan","山西":"shanxi","吉林":"jilin",
    "黑龙江":"heilongjiang","云南":"yunnan","贵州":"guizhou","广西":"guangxi",
    "甘肃":"gansu","青海":"qinghai","宁夏":"ningxia","新疆":"xinjiang",
    "西藏":"xizang","内蒙古":"neimenggu",
  };
  const CITY = {
    "广州":"guangzhou","深圳":"shenzhen","珠海":"zhuhai","东莞":"dongguan","佛山":"foshan",
    "南京":"nanjing","苏州":"suzhou","无锡":"wuxi","常州":"changzhou","杭州":"hangzhou",
    "宁波":"ningbo","温州":"wenzhou","济南":"jinan","青岛":"qingdao","烟台":"yantai",
    "郑州":"zhengzhou","洛阳":"luoyang","石家庄":"shijiazhuang","唐山":"tangshan",
    "保定":"baoding","成都":"chengdu","绵阳":"mianyang","武汉":"wuhan","宜昌":"yichang",
    "长沙":"changsha","株洲":"zhuzhou","合肥":"hefei","芜湖":"wuhu","福州":"fuzhou",
    "厦门":"xiamen","泉州":"quanzhou","南昌":"nanchang","赣州":"ganzhou","沈阳":"shenyang",
    "大连":"dalian","西安":"xian","海口":"haikou","三亚":"sanya","太原":"taiyuan",
    "长春":"changchun","哈尔滨":"haerbin","昆明":"kunming","贵阳":"guiyang",
    "南宁":"nanning","桂林":"guilin","兰州":"lanzhou","西宁":"xining",
    "银川":"yinchuan","乌鲁木齐":"wulumuqi","拉萨":"lasa","呼和浩特":"huhehaote",
  };
  const CITY_PROV = {
    "广州":"广东","深圳":"广东","珠海":"广东","东莞":"广东","佛山":"广东",
    "南京":"江苏","苏州":"江苏","无锡":"江苏","常州":"江苏",
    "杭州":"浙江","宁波":"浙江","温州":"浙江",
    "济南":"山东","青岛":"山东","烟台":"山东",
    "郑州":"河南","洛阳":"河南","石家庄":"河北","唐山":"河北","保定":"河北",
    "成都":"四川","绵阳":"四川","武汉":"湖北","宜昌":"湖北",
    "长沙":"湖南","株洲":"湖南","合肥":"安徽","芜湖":"安徽",
    "福州":"福建","厦门":"福建","泉州":"福建","南昌":"江西","赣州":"江西",
    "沈阳":"辽宁","大连":"辽宁","西安":"陕西","海口":"海南","三亚":"海南",
    "太原":"山西","长春":"吉林","哈尔滨":"黑龙江","昆明":"云南","贵阳":"贵州",
    "南宁":"广西","桂林":"广西","兰州":"甘肃","西宁":"青海","银川":"宁夏",
    "乌鲁木齐":"新疆","拉萨":"西藏","呼和浩特":"内蒙古",
  };

  let regionParam = rawRegion
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/\.s?html?$/i, "")
    .replace(/\\/g, "/")
    .replace(/\s+/g, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  if (/[\u4e00-\u9fa5]/.test(regionParam)) {
    const segs = regionParam.split(/[\/、,，]/).filter(Boolean);
    const cn = [...new Set(segs)].join("");
    if (PROV[cn]) regionParam = PROV[cn];
    else if (segs.length === 2 && PROV[segs[0]] && CITY[segs[1]]) regionParam = PROV[segs[0]] + "/" + CITY[segs[1]];
    else if (cn.length > 2 && PROV[cn.slice(0, 2)] && CITY[cn.slice(2)]) regionParam = PROV[cn.slice(0, 2)] + "/" + CITY[cn.slice(2)];
    else if (CITY[cn]) regionParam = (CITY_PROV[cn] ? PROV[CITY_PROV[cn]] + "/" : "") + CITY[cn];
    else regionParam = "";
  }

  const validRegion = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(regionParam);
  const regionInvalid = !validRegion;
  if (!validRegion) regionParam = "hainan/haikou";
  const regionCandidates = regionParam.includes("/")
    ? [regionParam, regionParam.split("/")[0]]
    : [regionParam];

  // ── BesFuel 官方核价历史：地区/油品映射 ─────────────────────────
  // BesFuel（MIT 代码）把各地发改委公告逐期核成 data/prices.json 的 region.grades[].history，
  // 节点是「价格执行日 + 元/升」，这才是真实逐轮历史；本组件只读取该快照，不自行推算价格。
  const revProv = {};
  Object.keys(PROV).forEach((cn) => { revProv[PROV[cn]] = cn; });
  const revCity = {};
  Object.keys(CITY).forEach((cn) => { revCity[CITY[cn]] = cn; });
  let cnProv = revProv[regionParam.split("/")[0]] || "";
  let cnCity = "";
  if (regionParam.includes("/")) {
    const c = revCity[regionParam.split("/")[1]];
    if (c) { cnCity = c; if (!cnProv) cnProv = CITY_PROV[c] || ""; }
  }
  // 省级默认价区（BesFuel 无「全省唯一价」时取该省主价区，图注会显示 BesFuel 的完整价区名）
  const BF_PROV = {
    "北京": "beijing", "天津": "tianjin", "上海": "shanghai", "重庆": "chongqing",
    "河北": "hebei", "山西": "shanxi", "内蒙古": "inner-mongolia-east", "吉林": "jilin",
    "黑龙江": "heilongjiang-south", "江苏": "jiangsu", "浙江": "zhejiang", "安徽": "anhui",
    "福建": "fujian", "江西": "jiangxi", "山东": "shandong", "河南": "henan", "湖南": "hunan",
    "广东": "guangdong", "广西": "guangxi", "海南": "hainan", "四川": "sichuan-zone1",
    "贵州": "guizhou-zone1", "云南": "yunnan-kunming", "西藏": "xizang-lhasa",
    "陕西": "shaanxi-midnorth", "青海": "qinghai-zone1", "宁夏": "ningxia",
    "新疆": "xinjiang-karamay-main",
  };
  const BF_CITY = {
    "西安": "shaanxi-xian", "汉中": "shaanxi-south", "安康": "shaanxi-south", "商洛": "shaanxi-south",
    "昆明": "yunnan-kunming", "曲靖": "yunnan-zone2", "楚雄": "yunnan-zone2", "玉溪": "yunnan-zone2",
    "昭通": "yunnan-zone3", "红河": "yunnan-zone3", "文山": "yunnan-zone3", "大理": "yunnan-zone3",
    "普洱": "yunnan-zone4", "保山": "yunnan-zone4", "丽江": "yunnan-zone4",
    "西双版纳": "yunnan-zone5", "德宏": "yunnan-zone5", "迪庆": "yunnan-zone5", "怒江": "yunnan-zone5", "临沧": "yunnan-zone5",
    "拉萨": "xizang-lhasa", "昌都": "xizang-changdu", "阿里": "xizang-ngari",
    "克拉玛依": "xinjiang-karamay-main", "独山子": "xinjiang-dushanzi",
    "呼和浩特": "inner-mongolia-west", "包头": "inner-mongolia-west", "鄂尔多斯": "inner-mongolia-west",
    "乌海": "inner-mongolia-west", "巴彦淖尔": "inner-mongolia-west", "阿拉善": "inner-mongolia-west",
  };
  const bfKey = regionInvalid ? null : (cnCity && BF_CITY[cnCity]) || BF_PROV[cnProv] || null;
  const BF_GRADE = { p92: "92", p95: "95", p98: "98", diesel: "diesel" };
  const BF_URLS = [
    "https://raw.githubusercontent.com/BensonLaur/BesFuel/main/data/prices.json",
    "https://gcore.jsdelivr.net/gh/BensonLaur/BesFuel@main/data/prices.json",
    "https://bensonlaur.github.io/BesFuel/data/prices.json",
  ];
  const BF_TTL = 6 * 3600 * 1000;
  const BF_CACHE = `oilprice_bf_v1_${bfKey || "none"}`;
  const bfHostOf = (u) => (String(u).match(/^https?:\/\/([^/]+)/) || [])[1] || "BesFuel";

  /** 从 BesFuel 快照里摘出本地区的四种油品历史（只保留事实字段，附带来源域名与核对日期） */
  function bfSlice(json, key) {
    if (!json || typeof json !== "object" || !json.regions || typeof json.regions !== "object") return null;
    const r = json.regions[key];
    if (!r || !r.grades || typeof r.grades !== "object") return null;
    const gaps = (Array.isArray(r.historyGaps) ? r.historyGaps : [])
      .filter((g) => g && /^\d{4}-\d{2}-\d{2}$/.test(String(g.date)))
      .map((g) => String(g.date));
    const checked = String(r.checkedAt || json.checkedAt || "");
    const notice = r.latestNotice && typeof r.latestNotice === "object" ? r.latestNotice : {};
    const grades = {};
    for (const gk of ["92", "95", "98", "diesel"]) {
      const e = r.grades[gk];
      if (!e || !Array.isArray(e.history)) continue;
      const pts = e.history
        .filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) && isFinite(x.price) && x.price >= 0)
        .map((x) => ({ date: String(x.date), price: +x.price, kind: "price" }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      if (!pts.length) continue;
      const last = pts[pts.length - 1];
      // 与 BesFuel lib/history.js 同一规则：已核实的「不作调整」是观察节点（空心），不是新的价格生效日
      if (notice.kind === "unchanged" && /^\d{4}-\d{2}-\d{2}$/.test(String(notice.date)) &&
          String(notice.date) > last.date && /^\d{4}-\d{2}-\d{2}$/.test(checked) &&
          String(notice.date) <= checked && notice.sourceUrl &&
          isFinite(e.price) && Math.abs(+e.price - last.price) < 0.005 &&
          !gaps.some((d) => d > last.date && d <= String(notice.date))) {
        pts.push({ date: String(notice.date), price: last.price, kind: "unchanged" });
      }
      grades[gk] = { price: isFinite(e.price) ? +e.price : last.price, history: pts.slice(-36) };
    }
    if (!Object.keys(grades).length) return null;
    const na = json.nationalAdjustment && typeof json.nationalAdjustment === "object" ? json.nationalAdjustment : {};
    const nw = na.nextAdjustment && typeof na.nextAdjustment === "object" ? na.nextAdjustment : {};
    return {
      key, name: String(r.name || key), checkedAt: checked,
      priceScope: String(r.priceScope || ""), gaps, grades,
      nextDate: /^\d{4}-\d{2}-\d{2}$/.test(String(nw.date || "")) ? String(nw.date) : "",
      nextLabel: String(nw.dateLabel || ""),
    };
  }

  /** 读取并缓存历史切片；6 小时内复用缓存，源失效时退回旧缓存并标记 stale */
  async function bfLoad() {
    let cached = null;
    try { cached = ctx.storage.getJSON(BF_CACHE); } catch (_) {}
    const usable = cached && cached.grades && cached.grades[BF_GRADE[FUEL_KEY]];
    if (usable && cached.fetchedAt && Date.now() - cached.fetchedAt < BF_TTL) {
      return { slice: cached, stale: false, err: "" };
    }
    const started = Date.now();
    let err = "";
    for (const url of BF_URLS) {
      if (Date.now() - started > 13000) { err = err || "历史源总超时"; break; }
      try {
        const resp = await ctx.http.get(url, {
          headers: { "user-agent": "EgernOilWidget/4.1 (BesFuel official-price history)", accept: "application/json" },
          timeout: 6000,
        });
        if (!resp || resp.status !== 200) { err = `HTTP ${resp ? resp.status : "?"}`; continue; }
        const txt = await resp.text();
        if (!txt || txt.length < 1000) { err = "响应过短"; continue; }
        let json = null;
        try { json = JSON.parse(txt); } catch (_) { err = "JSON 解析失败"; continue; }
        const slice = bfSlice(json, bfKey);
        if (!slice) { err = "缺少该地区数据"; continue; }
        slice.fetchedAt = Date.now();
        slice.source = bfHostOf(url);
        slice.sourceUrl = url;
        try { ctx.storage.setJSON(BF_CACHE, slice); } catch (_) {}
        return { slice, stale: false, err: "" };
      } catch (e) { err = (e && e.message) || "网络错误"; }
    }
    if (usable) return { slice: cached, stale: true, err };
    return { slice: null, stale: true, err };
  }

  const trendRaw = String(ctx.env.SHOW_TREND ?? "true").trim().toLowerCase();
  const SHOW_TREND = !["false", "0", "no", "off", "hide", "隐藏"].includes(trendRaw);

  const fuelRaw = String(ctx.env.FUEL ?? "95").trim().toLowerCase();
  const FUEL_KEY = /98/.test(fuelRaw) ? "p98"
    : /92/.test(fuelRaw) ? "p92"
    : /(柴油|0号|diesel)/.test(fuelRaw) ? "diesel"
    : "p95";
  const FUEL_LABEL = { p92: "92号", p95: "95号", p98: "98号", diesel: "柴油" }[FUEL_KEY];

  let liters = parseFloat(String(ctx.env.FULL_LITERS ?? "50"));
  if (!isFinite(liters) || liters <= 0 || liters > 200) liters = 50;

  const family = String(ctx.widgetFamily ?? "systemMedium");
  const isSmall = family === "systemSmall";
  const isLarge = family === "systemLarge" || family === "systemExtraLarge";
  const isAccessory = /^accessory/.test(family);

  const now = new Date();
  const timeStr = `${PAD2(now.getHours())}:${PAD2(now.getMinutes())}`;
  let refreshHours = parseFloat(String(ctx.env.REFRESH_HOURS ?? "6"));
  if (!isFinite(refreshHours) || refreshHours < 1 || refreshHours > 24) refreshHours = 6;
  const refreshTime = new Date(Date.now() + refreshHours * 3600 * 1000).toISOString();

  // ════════════════════════════════════════════════════════════
  // 2. 调色板（深浅色自适应）
  // ════════════════════════════════════════════════════════════
  const backgroundColor = { light: "#FFFFFF", dark: "#1C1C1E" };
  const COLORS = {
    primary:    { light: "#111111", dark: "#FFFFFF" },
    secondary:  { light: "#6B6B70", dark: "#C7C7CC" },
    tertiary:   { light: "#9A9A9F", dark: "#8E8E93" },
    card:       { light: "#F7F7F9", dark: "#2C2C2E" },
    cardBorder: { light: "#E8E8EC", dark: "#3A3A3C" },
    up:         { light: "#FF3B30", dark: "#FF6B6B" },
    down:       { light: "#16A34A", dark: "#34D399" },
    p92:        { light: "#FF9F0A", dark: "#FFB347" },
    p95:        { light: "#FF7A1A", dark: "#FF8F4D" },
    p98:        { light: "#FF3B30", dark: "#FF6B6B" },
    diesel:     { light: "#2E9E4B", dark: "#4CD07A" },
  };
  const tint = (c, a) => ({ light: c.light + a, dark: c.dark + a });

  // ════════════════════════════════════════════════════════════
  // 3. 缓存读取 + 抓取（保持原有接口 / 超时 / 兜底策略）
  // ════════════════════════════════════════════════════════════
  const CACHE_KEY = `oilprice_v31_${regionInvalid ? "__invalid__" : regionParam}`;
  let prices = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = "";
  let adj = null;                       // { month, day, dir, range, unit }
  let hist = [];                        // [{ d:"YYYY-MM-DD", v:{p92..} }]
  let hasCache = false;

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY);
    if (cached && cached.prices) {
      prices = cached.prices;
      regionName = cached.regionName || "";
      adj = cached.adj || null;
      hist = Array.isArray(cached.hist) ? cached.hist.filter((h) => h && h.d && h.v) : [];
      hasCache = true;
    }
  } catch (_) {}

  let fetchError = false;
  let errorMsg = "";

  if (regionInvalid) {
    fetchError = true;
    errorMsg = "地区参数无效";
  } else try {
    let html = "";
    let lastStatus = 0;
    for (const cand of regionCandidates) {
      const resp = await ctx.http.get(`http://m.qiyoujiage.com/${cand}.shtml`, {
        headers: {
          referer: "http://m.qiyoujiage.com/",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        timeout: 15000,
      });
      lastStatus = resp.status;
      if (resp.status === 200) { html = await resp.text(); break; }
    }
    if (!html) throw new Error(`HTTP ${lastStatus}: 页面不存在`);

    const titleMatch = html.match(/<title>([^_]+)_/);
    if (titleMatch?.[1]) {
      regionName = titleMatch[1].trim().replace(/(油价|实时|今日|最新|查询|价格)/g, "").trim();
    }

    // 汽柴油价格
    const regPrice = /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm;
    const priceList = [];
    let m = null;
    while ((m = regPrice.exec(html)) !== null) {
      if (m.index === regPrice.lastIndex) regPrice.lastIndex++;
      priceList.push({ name: m[1].trim(), value: m[2].trim() });
    }

    if (priceList.length >= 3) {
      const nameMap = {
        "92 号": "p92", "92": "p92",
        "95 号": "p95", "95": "p95",
        "98 号": "p98", "98": "p98",
        "0 号": "diesel", "柴油": "diesel",
      };
      const next = { p92: null, p95: null, p98: null, diesel: null };
      priceList.forEach((item) => {
        const key = Object.keys(nameMap).find((k) => item.name.includes(k));
        if (key) {
          const v = parseFloat(item.value);
          if (!isNaN(v)) next[nameMap[key]] = v;
        }
      });
      prices = next;

      // 调价信息（站点 tishi 文本，真实数据；不含变化率，所以不做幅度预测）
      if (SHOW_TREND) {
        const tIdx = html.indexOf('class="tishi"');
        const seg = tIdx >= 0 ? html.slice(tIdx, tIdx + 900) : "";
        if (seg) {
          const segText = seg
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ");
          const dm = segText.match(/(\d{1,2})月(\d{1,2})日/);
          const dirWord = (segText.match(/(下跌|下调|上涨|上调|搁浅)/) || [])[1] || "";
          const perL = (segText.match(/([\d.]+)\s*元\/升/g) || []).map((x) => x.match(/([\d.]+)/)[1]);
          let range = "", unit = "元/升";
          if (perL.length >= 2) range = `${perL[0]}-${perL[1]}`;
          else if (perL.length === 1) range = perL[0];
          else {
            const perT = (segText.match(/([\d.]+)\s*元(?:\/吨)?/g) || []).map((x) => x.match(/([\d.]+)/)[1]);
            if (perT.length >= 2) { range = `${perT[0]}-${perT[1]}`; unit = "元/吨"; }
            else if (perT.length === 1) { range = perT[0]; unit = "元/吨"; }
          }
          if (dm) {
            adj = {
              month: +dm[1],
              day: +dm[2],
              dir: /下跌|下调|搁浅/.test(dirWord) ? (dirWord === "搁浅" ? "flat" : "down")
                 : /上涨|上调/.test(dirWord) ? "up" : "flat",
              range,
              unit,
            };
          }
        }
      }

      // 真实价格快照：点日期用网页给出的最近调价日（真实），无则用今天。
      // 同日期只更新数值；价格没变不新增点（不重复填点、不伪造历史）。
      let pd = YMD(now);
      if (adj && adj.month && adj.day) {
        const ad = new Date(now.getFullYear(), adj.month - 1, adj.day);
        if (ad.getTime() - now.getTime() > 45 * 86400000) ad.setFullYear(now.getFullYear() - 1);
        if (ad.getTime() <= now.getTime()) pd = YMD(ad);
      }
      const snap = { p92: prices.p92, p95: prices.p95, p98: prices.p98, diesel: prices.diesel };
      if (hist.length === 0) {
        hist.push({ d: pd, v: snap });
      } else {
        const lastRec = hist[hist.length - 1];
        const changed = ["p92", "p95", "p98", "diesel"].some(
          (k) => snap[k] !== null && lastRec.v[k] !== null && lastRec.v[k] !== undefined && Math.abs(snap[k] - lastRec.v[k]) >= 0.005
        );
        if (lastRec.d === pd) lastRec.v = snap;
        else if (changed) hist.push({ d: pd > lastRec.d ? pd : YMD(now), v: snap });
        else { /* 价格未变：不新增点，避免用重复点人为拉长曲线 */ }
      }
      if (hist.length > 12) hist = hist.slice(hist.length - 12);

      ctx.storage.setJSON(CACHE_KEY, { prices, regionName, adj, hist });
    } else {
      if (!hasCache) { fetchError = true; errorMsg = "解析失败"; }
    }
  } catch (e) {
    if (!hasCache) { fetchError = true; errorMsg = e.message; }
  }

  // 官方核价历史（BesFuel 快照，独立于现价源：现价失败也照常尝试，历史失败也不影响现价）
  let bf = null, bfStale = false, bfErr = "", bfReason = "";
  if (SHOW_TREND && !isSmall && !isAccessory && !regionInvalid) {
    if (!bfKey) bfReason = "uncovered";
    else {
      const r = await bfLoad();
      bf = r.slice; bfStale = !!r.stale; bfErr = r.err || "";
      if (!bf) bfReason = "fail";
    }
  }

  // ════════════════════════════════════════════════════════════
  // 4. 派生数据（调价日期 / 下轮窗口 / 走势点）
  // ════════════════════════════════════════════════════════════
  let adjDate = null;
  if (adj) {
    adjDate = new Date(now.getFullYear(), adj.month - 1, adj.day);
    if (adjDate.getTime() - now.getTime() > 45 * 86400000) adjDate.setFullYear(now.getFullYear() - 1); // 跨年
  }
  let nextDate = null, daysLeft = null, nextSource = "local";
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bfNextD = bf && /^\d{4}-\d{2}-\d{2}$/.test(bf.nextDate || "") ? new Date(`${bf.nextDate}T00:00:00`) : null;
  if (bfNextD && !isNaN(bfNextD.getTime()) && bfNextD.getTime() >= today0.getTime()) {
    nextDate = bfNextD;
    nextSource = "besfuel";                 // BesFuel 快照里的官方规则+放假安排推算窗口
  } else if (adjDate) {
    nextDate = addWorkdays(adjDate, 10);    // 退回本地规则推算（标注「预计」）
  }
  if (nextDate) {
    daysLeft = Math.round((new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).getTime()
      - today0.getTime()) / 86400000);
  }

  const allRows = [
    { key: "p92", label: "92号", price: prices.p92, color: COLORS.p92 },
    { key: "p95", label: "95号", price: prices.p95, color: COLORS.p95 },
    { key: "p98", label: "98号", price: prices.p98, color: COLORS.p98 },
    { key: "diesel", label: "柴油", price: prices.diesel, color: COLORS.diesel },
  ];
  const hasAnyPrice = allRows.some((r) => r.price !== null && r.price !== undefined);

  const focusRow = allRows.find((r) => r.key === FUEL_KEY && r.price !== null) || allRows.find((r) => r.price !== null) || allRows[1];
  const focusPrice = focusRow && focusRow.price !== null ? focusRow.price : null;
  const fmt = (v) => (v === null || v === undefined || isNaN(v) ? "--" : v.toFixed(2));
  const titleText = regionName ? `${regionName}实时油价` : "实时油价";

  const adjTxt = adj && adj.range
    ? `${adj.dir === "down" ? "↓" : adj.dir === "up" ? "↑" : "→"}${adj.range}`
    : "暂无数据";
  const adjUnit = adj && adj.unit ? adj.unit : "";
  const adjTxtSmall = adjUnit && adj && adj.range ? `${adjTxt} ${adjUnit}` : adjTxt;
  const adjColor = adj && adj.dir === "up" ? COLORS.up : adj && adj.dir === "down" ? COLORS.down : COLORS.secondary;

  // 走势：优先用 BesFuel 已核实的官方调价历史（真实价格节点 · 元/升，阶梯线）；
  // 历史源失效且无缓存时，退回本脚本自己抓到的价格快照并明确标注；都没有就显示「暂无历史」，绝不画推测曲线。
  let series = [], seriesKind = "none";
  if (SHOW_TREND) {
    const g = bf && bf.grades ? bf.grades[BF_GRADE[FUEL_KEY]] : null;
    if (g && Array.isArray(g.history) && g.history.length >= 2) {
      series = g.history.map((p) => ({ v: p.price, d: p.date, kind: p.kind || "price" }));
      seriesKind = "official";
    } else {
      series = hist
        .filter((h) => h.v && h.v[FUEL_KEY] !== null && h.v[FUEL_KEY] !== undefined && !isNaN(h.v[FUEL_KEY]))
        .map((h) => ({ v: h.v[FUEL_KEY], d: h.d, kind: "price" }));
      if (series.length >= 2) seriesKind = "local"; else series = [];
    }
  }
  const mdLabel = (d) => {
    const part = String(d).split("-");
    return part.length === 3 ? `${+part[1]}/${+part[2]}` : String(d);
  };
  const seriesLabels = series.map((p) => mdLabel(p.d));
  const seriesGaps = seriesKind === "official" && bf && Array.isArray(bf.gaps)
    ? series.map((p, i) => (i > 0 && bf.gaps.some((d) => d > series[i - 1].d && d < p.d) ? i : -1)).filter((i) => i > 0)
    : [];

  // 最新官方核价与涨跌语义（同价重复的「不调整」节点不算涨跌）
  const bfGradeMissing = !!(bf && bf.grades && !bf.grades[BF_GRADE[FUEL_KEY]]);
  if (bfGradeMissing && !series.length) bfReason = "grade";
  const bfLatest = seriesKind === "official" ? series[series.length - 1] : null;
  const bfPrev = bfLatest ? [...series].reverse().find((p) => Math.abs(p.v - bfLatest.v) >= 0.005) : null;
  const bfDelta = bfLatest ? (bfLatest.kind === "unchanged" ? 0 : bfPrev ? bfLatest.v - bfPrev.v : 0) : null;
  const bfArrow = bfDelta === null ? "" : bfDelta > 0.004 ? "↑" : bfDelta < -0.004 ? "↓" : "→";
  const bfDateLabel = bfLatest ? `${+bfLatest.d.slice(5, 7)}/${+bfLatest.d.slice(8, 10)}` : "";
  const bfDeltaTxt = bfLatest ? (bfLatest.kind === "unchanged" ? "官方不调整" : `${bfArrow}${Math.abs(bfDelta).toFixed(2)}`) : "";
  const bfColor = bfDelta !== null && bfDelta > 0.004 ? COLORS.up : bfDelta !== null && bfDelta < -0.004 ? COLORS.down : COLORS.secondary;
  const bfRangeTxt = seriesKind === "official" && series.length
    ? `${mdLabel(series[0].d)}-${mdLabel(series[series.length - 1].d)} · ${series.length} 个官方节点`
    : "";
  const bfCapShort = bfLatest
    ? `${FUEL_LABEL}官方核价 ${bfLatest.v.toFixed(2)}元/升 · ${bfDateLabel} ${bfDeltaTxt}${bfStale ? " · 缓存" : ""}`
    : bfReason === "uncovered"
      ? "BesFuel 未收录该地区 · 只显示当前价"
      : bfReason === "grade"
        ? `BesFuel 未核价 ${FUEL_LABEL} · 不做推算`
        : bfReason === "fail"
          ? "官方核价历史暂不可用 · 现价照常"
          : "暂无官方核价历史";
  const bfCapLong = bfLatest
    ? `${FUEL_LABEL} · 官方核价历史（元/升）· 最新 ${bfLatest.v.toFixed(2)} · ${bfDateLabel} 生效 · 较上轮 ${bfDeltaTxt}`
    : bfReason === "uncovered"
      ? "BesFuel 尚未收录该价区的官方核价历史，本组件只显示当前价，不猜测曲线"
      : bfReason === "grade"
        ? `BesFuel 未收录 ${FUEL_LABEL} 官方核价（该油号未逐期核价），不推算曲线`
        : bfReason === "fail"
          ? "官方核价历史暂不可用：现价与调价信息照常显示，下次刷新自动重试"
          : "暂无官方核价历史数据";
  const bfMetaTxt = seriesKind === "official"
    ? `BesFuel ${bf.name} · 核对 ${bf.checkedAt ? `${bf.checkedAt.slice(5, 7)}/${bf.checkedAt.slice(8, 10)}` : "—"} · ${series.length} 个官方节点${bfStale ? " · 缓存" : ""} · 数据为公告事实`
    : seriesKind === "local"
      ? "本地快照走势（官方历史源不可用，仅显示本机真实抓到的调价快照）"
      : "";



  // ════════════════════════════════════════════════════════════
  // 5. 通用构件（只用官方支持字段：无 justifyContent，无 alignItems:'stretch'）
  //    - alignItems 仅 start / end / center
  //    - 竖直居中用对称 spacer；横向撑满用显式 width（不依赖 stretch）
  //    - divider 带一个 spacer 子节点，不产生空 children
  // ════════════════════════════════════════════════════════════
  const hDivider = { type: "stack", height: 1, backgroundColor: COLORS.cardBorder, children: [{ type: "spacer" }] };
  const vDivider = (h) => ({ type: "stack", width: 1, height: h, backgroundColor: COLORS.cardBorder, children: [{ type: "spacer" }] });

  function headerNode(iconSize, titleSize) {
    return {
      type: "stack", direction: "row", alignItems: "center", gap: 4,
      children: [
        { type: "image", src: "sf-symbol:fuelpump.fill", width: iconSize, height: iconSize, color: COLORS.p92 },
        { type: "text", text: titleText, flex: 1, font: { size: titleSize, weight: "semibold" }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.7 },
        { type: "image", src: "sf-symbol:arrow.clockwise", width: iconSize - 2, height: iconSize - 2, color: COLORS.tertiary },
        { type: "text", text: timeStr, font: { size: titleSize }, textColor: COLORS.tertiary, maxLines: 1 },
      ],
    };
  }

  function fuelCard(row, o) {
    return {
      type: "stack", direction: "column", alignItems: "center", flex: 1, height: o.h,
      gap: o.gap, padding: o.padding,
      backgroundColor: tint(row.color, "1F"), borderRadius: o.radius,
      children: [
        { type: "spacer" },
        {
          type: "stack", direction: "row", alignItems: "center", padding: [1, 5, 1, 5],
          backgroundColor: tint(row.color, "33"), borderRadius: 6,
          children: [{ type: "text", text: row.label, font: { size: o.labelSize, weight: "bold" }, textColor: row.color, maxLines: 1, minScale: 0.8 }],
        },
        { type: "text", text: fmt(row.price), font: { size: o.priceSize, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.6 },
        { type: "spacer" },
      ],
    };
  }

  function fuelRow(o) {
    return {
      type: "stack", direction: "row", alignItems: "center", width: o.w, gap: o.gap,
      children: allRows.map((r) => fuelCard(r, o)),
    };
  }

  function adjBlock(o) {
    return {
      type: "stack", direction: "column", alignItems: "start", width: o.w, gap: o.gap,
      children: [
        { type: "text", text: "最近调价（全国）", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
        { type: "text", text: adjTxt, font: { size: o.valueSize, weight: "bold" }, textColor: adjColor, maxLines: 1, minScale: 0.55 },
        { type: "text", text: adjDate ? `${MD(adjDate)} 24时` : "日期暂无数据", font: { size: o.labelSize }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.7 },
        ...(o.showWindow ? [
          { type: "stack", height: 1, width: 56, backgroundColor: COLORS.cardBorder, children: [{ type: "spacer" }] },
          { type: "text", text: "预计下轮", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
          { type: "text", text: nextDate ? MD(nextDate) : "暂无数据", font: { size: o.labelSize + 3, weight: "semibold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.65 },
          { type: "text", text: nextDate ? (daysLeft >= 0 ? `还有 ${daysLeft} 天` : "待更新") : "窗口待更新", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
        ] : []),
      ],
    };
  }

  function emptyNode(msg, size, w) {
    return {
      type: "stack", direction: "column", alignItems: "center", flex: 1, width: w || 300, gap: 3,
      children: [
        { type: "spacer" },
        { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 18, height: 18, color: COLORS.p98 },
        { type: "text", text: msg, width: (w || 300) - 8, font: { size: size || 11 }, textColor: COLORS.secondary, maxLines: 2, textAlign: "center", minScale: 0.8 },
        { type: "spacer" },
      ],
    };
  }

  const errText = regionInvalid ? "地区参数错误" : fetchError ? "获取失败" : "暂无数据";

  // ── 锁屏 accessory 尺寸（避免返回非法结构）────────────────────
  if (isAccessory) {
    return {
      type: "widget", padding: 2, refreshAfter: refreshTime,
      backgroundColor: { light: "#00000000", dark: "#00000000" },
      children: [{ type: "text", text: `${FUEL_LABEL} ${fmt(focusPrice)}`, font: { size: 13, weight: "semibold" }, maxLines: 1, minScale: 0.7 }],
    };
  }

  // ════════════════════════════════════════════════════════════
  // 6. 小号：居中 2×2 田字格（92/95 · 98/柴油），左右对称
  //    - 外层 column 与两行 row 都 alignItems:'center'
  //    - 每个格子显式宽高，四格同宽；标签/价格 textAlign:'center'
  // ════════════════════════════════════════════════════════════
  if (isSmall) {
    const SW = 138;                      // 158 - 左右 padding 各 10
    const GAP = 6;
    const CELL_W = (SW - GAP) / 2;       // 66：两列严格等宽
    const CELL_H = 40;
    const TXT_W = CELL_W - 8;
    const cell = (r) => ({
      type: "stack", direction: "column", alignItems: "center",
      width: CELL_W, height: CELL_H, gap: 1, padding: [2, 2, 2, 2],
      backgroundColor: tint(r.color, "1F"), borderRadius: 10,
      children: [
        { type: "spacer" },
        { type: "text", text: r.label, width: TXT_W, font: { size: 10, weight: "semibold" }, textColor: r.color, maxLines: 1, minScale: 0.8, textAlign: "center" },
        { type: "text", text: fmt(r.price), width: TXT_W, font: { size: 15, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.5, textAlign: "center" },
        { type: "spacer" },
      ],
    });
    const gridRow = (a, b) => ({
      type: "stack", direction: "row", alignItems: "center", width: SW, gap: GAP,
      children: [cell(a), cell(b)],
    });
    return {
      type: "widget",
      padding: [10, 10, 10, 10], gap: 4, backgroundColor, refreshAfter: refreshTime,
      children: [
        {
          type: "stack", direction: "column", alignItems: "center", width: SW, gap: 1,
          children: [
            { type: "text", text: `${regionName || "全国"}油价`, width: SW, font: { size: 12, weight: "semibold" }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.8, textAlign: "center" },
            { type: "text", text: hasAnyPrice ? `更新 ${timeStr}${hasCache && fetchError ? " · 缓存" : ""}` : timeStr, width: SW, font: { size: 9 }, textColor: COLORS.tertiary, maxLines: 1, textAlign: "center" },
          ],
        },
        hasAnyPrice
          ? {
              type: "stack", direction: "column", alignItems: "center", flex: 1, width: SW, gap: 4,
              children: [
                { type: "spacer" },
                gridRow(allRows[0], allRows[1]),
                gridRow(allRows[2], allRows[3]),
                { type: "spacer" },
              ],
            }
          : {
              type: "stack", direction: "column", alignItems: "center", flex: 1, width: SW, gap: 4,
              children: [
                { type: "spacer" },
                { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 16, height: 16, color: COLORS.p98 },
                { type: "text", text: errText, width: SW, font: { size: 12 }, textColor: COLORS.secondary, maxLines: 2, textAlign: "center", minScale: 0.8 },
                { type: "text", text: "等系统下次刷新重试", width: SW, font: { size: 9 }, textColor: COLORS.tertiary, maxLines: 1, textAlign: "center" },
                { type: "spacer" },
              ],
            },
      ],
    };
  }

  // 7. 中号：四油品 + 极简 SVG 折线 + 调价两栏（显式宽度）
  // ════════════════════════════════════════════════════════════
  if (!isLarge) {
    const CARD_W_M = 48, CHART_W_M = 205, CHART_H_M = 50, RIGHT_W = 94;
    const cardH_M = 42, pad = [9, 10, 7, 10];
    const contentW = 338 - pad[1] - pad[3];        // 318
    const leftW = contentW - RIGHT_W - 1 - 16;      // 8 间距 ×2 + 1px 分隔
    const chartNodeM = SHOW_TREND && series.length >= 2
      ? { type: "image", src: chartSVG(series, { w: CHART_W_M, h: CHART_H_M, gaps: seriesGaps, labels: seriesLabels }), width: CHART_W_M, height: CHART_H_M }
      : {
          type: "stack", direction: "column", alignItems: "center", width: leftW, height: CHART_H_M, gap: 2,
          children: [
            { type: "spacer" },
            { type: "text", text: SHOW_TREND ? (bfLatest ? "官方核价历史不足 2 点" : (bfReason === "uncovered" ? "BesFuel 未收录该价区" : bfReason === "grade" ? "BesFuel 未核价该油号" : "官方历史源暂不可用")) : "走势已关闭", font: { size: 9 }, textColor: COLORS.tertiary, maxLines: 1, textAlign: "center", minScale: 0.7 },
            { type: "text", text: SHOW_TREND ? (bfLatest ? "官方核对后自动扩展" : "当前价照常显示，下次刷新重试") : "可在设置里打开", font: { size: 8 }, textColor: COLORS.tertiary, maxLines: 1, textAlign: "center", minScale: 0.7 },
            { type: "spacer" },
          ],
        };
    const capNodeM = {
      type: "text", text: bfCapShort, width: leftW, font: { size: 8.5, weight: "medium" },
      textColor: bfLatest ? bfColor : COLORS.tertiary, maxLines: 1, minScale: 0.55,
    };


    return {
      type: "widget",
      padding: pad, gap: 6, backgroundColor, refreshAfter: refreshTime,
      children: [
        headerNode(13, 12),
        hasAnyPrice
          ? {
              type: "stack", direction: "row", alignItems: "center", gap: 8, flex: 1, width: contentW,
              children: [
                {
                  type: "stack", direction: "column", alignItems: "start", gap: 4, width: leftW,
                  children: [
                    fuelRow({ w: leftW, h: cardH_M, cardW: CARD_W_M, gap: 5, labelSize: 10, priceSize: 15, radius: 10, padding: [3, 1, 3, 1] }),
                    chartNodeM,
                    ...(series.length >= 2 ? [capNodeM] : []),
                  ],
                },
                vDivider(96),
                adjBlock({ w: RIGHT_W, labelSize: 9, valueSize: 13, gap: 2, showWindow: true }),
              ],
            }
          : emptyNode(errText, 12, contentW),
      ],
    };
  }

  // ════════════════════════════════════════════════════════════
  // 8. 大号：完整信息（四油品大卡 / 大折线 / 调价 + 加满金额）
  // ════════════════════════════════════════════════════════════
  const padL = [14, 14, 10, 14];
  const contentW_L = 338 - padL[1] - padL[3];       // 310
  const CHART_W_L = 300, CHART_H_L = 92;
  const fillCost = focusPrice !== null ? focusPrice * liters : null;
  const chartNodeL = SHOW_TREND && series.length >= 2
    ? { type: "image", src: chartSVG(series, { w: CHART_W_L, h: CHART_H_L, gaps: seriesGaps, labels: seriesLabels }), width: CHART_W_L, height: CHART_H_L }
    : {
        type: "stack", direction: "column", alignItems: "center", width: contentW_L, height: CHART_H_L, gap: 3,
        backgroundColor: COLORS.card, borderRadius: 12,
        children: [
          { type: "spacer" },
          { type: "text", text: SHOW_TREND ? bfCapLong : "走势已关闭", font: { size: 11 }, textColor: COLORS.secondary, maxLines: 2, textAlign: "center", minScale: 0.75 },
          { type: "text", text: SHOW_TREND ? (bfReason === "uncovered" ? "BesFuel 只收录已核价的价区；当前价仍来自汽油价格网" : bfReason === "grade" ? "BesFuel 未对 98 号逐期核价，不使用邻近油号推算" : "当前价与调价信息照常显示，下次刷新自动重试") : "可在模块设置里打开", font: { size: 9.5 }, textColor: COLORS.tertiary, maxLines: 1, textAlign: "center", minScale: 0.7 },
          { type: "spacer" },
        ],
      };
  const capNodeLCap = {
    type: "stack", direction: "column", alignItems: "start", width: CHART_W_L, gap: 1,
    children: [
      { type: "text", text: bfCapLong, width: CHART_W_L, font: { size: 10.5, weight: "semibold" }, textColor: bfLatest ? bfColor : COLORS.secondary, maxLines: 1, minScale: 0.6 },
      { type: "text", text: bfMetaTxt || "历史节点来自官方公告核对，现价来自汽油价格网", width: CHART_W_L, font: { size: 9 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.55 },
    ],
  };



  const colW_L = (contentW_L - 1 - 20) / 2;         // 两栏 + 1px 分隔 + 10×2 间距

  return {
    type: "widget",
    padding: padL, gap: 8, backgroundColor, refreshAfter: refreshTime,
    children: [
      headerNode(16, 15),
      hasAnyPrice
        ? {
            type: "stack", direction: "column", alignItems: "center", gap: 8, flex: 1,
            children: [
              fuelRow({ w: contentW_L, h: 78, gap: 7, labelSize: 12, priceSize: 23, radius: 14, padding: [6, 1, 6, 1] }),
              chartNodeL,
              ...(series.length >= 2 ? [capNodeLCap] : []),
              hDivider,
              {
                type: "stack", direction: "row", alignItems: "center", width: contentW_L, gap: 10,
                children: [
                  ...(SHOW_TREND ? [{
                    type: "stack", direction: "column", alignItems: "start", width: colW_L, gap: 2,
                    children: [
                      { type: "text", text: "调价信息（全国）", font: { size: 11 }, textColor: COLORS.tertiary, maxLines: 1 },
                      { type: "text", text: adjTxt, font: { size: 21, weight: "bold" }, textColor: adjColor, maxLines: 1, minScale: 0.5 },
                      { type: "text", text: adjDate ? `${MD(adjDate)} 24时` : "日期暂无数据", font: { size: 11 }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.75 },
                      { type: "text", text: nextDate ? `预计 ${MD(nextDate)} · ${daysLeft >= 0 ? `还有 ${daysLeft} 天` : "待更新"}` : "下轮窗口暂无数据", font: { size: 11 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.7 },
                    ],
                  }, vDivider(58)] : []),
                  {
                    type: "stack", direction: "column", alignItems: "start", width: SHOW_TREND ? colW_L : contentW_L, gap: 2,
                    children: [
                      {
                        type: "stack", direction: "row", alignItems: "center", gap: 3,
                        children: [
                          { type: "image", src: "sf-symbol:fuelpump.fill", width: 11, height: 11, color: COLORS.tertiary },
                          { type: "text", text: `${focusRow.label}加满 ${liters}L`, font: { size: 11 }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.8 },
                        ],
                      },
                      { type: "text", text: fillCost !== null ? `¥${fillCost.toFixed(2)}` : "暂无数据", font: { size: 24, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.5 },
                      { type: "text", text: focusPrice !== null ? `单价 ${focusPrice.toFixed(2)} 元/升` : "单价暂无数据", font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1 },
                    ],
                  },
                ],
              },
            ],
          }
        : emptyNode(errText, 13, contentW_L),
      {
        type: "stack", direction: "row", alignItems: "center", width: contentW_L,
        children: [
          { type: "text", text: `更新 ${timeStr}${hasCache && fetchError ? " · 缓存数据" : ""}`, font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.8 },
          { type: "spacer" },
          { type: "text", text: "现价 汽油价格网 · 历史 BesFuel", font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.8 },
        ],
      },
    ],
  };
}
