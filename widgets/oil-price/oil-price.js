/**
 * ⛽ 全国实时油价小组件 v4.0（Egern 模块版 · 小/中/大三尺寸重排）
 * 数据源：http://m.qiyoujiage.com/（省份 / 城市页面）
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
 * - 走势图只画本脚本真实抓到的价格快照（每变化一次记一「轮」），不足 2 个点显示「暂无历史」
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
 * 折线图 SVG（纯字符串生成，无外部资源）。
 * 配色取「明暗背景都接受」的中间调：品牌橙 + 半透明面积 + 灰轴线/灰文字。
 */
function chartSVG(vals, labels, opt) {
  const W = Math.max(120, Math.round(opt.w));
  const H = Math.max(44, Math.round(opt.h));
  const padL = 27, padR = 9, padT = 7, padB = 13;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = vals.length;
  const dmin = Math.min(...vals);
  const dmax = Math.max(...vals);
  let lo = dmin, hi = dmax;
  const span = dmax - dmin;
  if (span < 0.06) { lo = dmin - 0.05; hi = dmax + 0.05; } else { lo = dmin - span * 0.16; hi = dmax + span * 0.16; }
  const X = (i) => (n === 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1));
  const Y = (v) => padT + ih * (1 - (v - lo) / (hi - lo));

  const line = "#FF9F0A", area = "#FF9F0A", grid = "#8E8E93", txt = "#8E8E93", last = "#34C759";
  let s = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>`;

  // 三条参考虚线（数据的最小 / 中 / 最大值）
  const ticks = [dmax, (dmax + dmin) / 2, dmin];
  ticks.forEach((v, i) => {
    const y = Y(v).toFixed(1);
    if (i > 0) s += `<line x1='${padL}' y1='${y}' x2='${W - padR}' y2='${y}' stroke='${grid}' stroke-opacity='0.22' stroke-width='0.7' stroke-dasharray='2 3'/>`;
    s += `<text x='${padL - 4}' y='${(+y + 3).toFixed(1)}' font-size='7.5' fill='${txt}' text-anchor='end'>${v.toFixed(2)}</text>`;
  });

  // 面积 + 折线
  let d = "";
  for (let i = 0; i < n; i++) d += `${i ? " L" : "M"}${X(i).toFixed(1)} ${Y(vals[i]).toFixed(1)}`;
  const base = (padT + ih).toFixed(1);
  s += `<path d='${d} L${X(n - 1).toFixed(1)} ${base} L${X(0).toFixed(1)} ${base} Z' fill='${area}' fill-opacity='0.16'/>`;
  s += `<path d='${d}' fill='none' stroke='${line}' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>`;

  // 数据点（最后一个用绿色强调）
  for (let i = 0; i < n; i++) {
    const c = i === n - 1 ? last : line;
    const r = i === n - 1 ? 3 : 2.1;
    s += `<circle cx='${X(i).toFixed(1)}' cy='${Y(vals[i]).toFixed(1)}' r='${r}' fill='${c}'/>`;
  }

  // x 轴标签：首 / 中 / 尾
  if (labels && labels.length === n) {
    const idx = n >= 3 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
    idx.forEach((i, k) => {
      const anchor = k === 0 && idx.length > 1 ? "start" : (k === idx.length - 1 && idx.length > 1 ? "end" : "middle");
      s += `<text x='${X(i).toFixed(1)}' y='${H - 3}' font-size='7.5' fill='${txt}' text-anchor='${anchor}'>${labels[i]}</text>`;
    });
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

      // 真实价格快照：同一天重复抓取只更新，价格变化才追加一条「轮次」
      const today = YMD(now);
      const snap = { p92: prices.p92, p95: prices.p95, p98: prices.p98, diesel: prices.diesel };
      if (hist.length === 0) {
        hist.push({ d: today, v: snap });
      } else {
        const lastRec = hist[hist.length - 1];
        const changed = ["p92", "p95", "p98", "diesel"].some(
          (k) => snap[k] !== null && lastRec.v[k] !== null && lastRec.v[k] !== undefined && Math.abs(snap[k] - lastRec.v[k]) >= 0.005
        );
        if (lastRec.d === today) lastRec.v = snap;
        else if (changed) hist.push({ d: today, v: snap });
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

  // ════════════════════════════════════════════════════════════
  // 4. 派生数据（调价日期 / 下轮窗口 / 走势点）
  // ════════════════════════════════════════════════════════════
  let adjDate = null;
  if (adj) {
    adjDate = new Date(now.getFullYear(), adj.month - 1, adj.day);
    if (adjDate.getTime() - now.getTime() > 45 * 86400000) adjDate.setFullYear(now.getFullYear() - 1); // 跨年
  }
  let nextDate = null, daysLeft = null;
  if (adjDate) {
    nextDate = addWorkdays(adjDate, 10);
    daysLeft = Math.round((new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).getTime()
      - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
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

  // 走势：取真实快照里该油品的点
  let series = [];
  if (SHOW_TREND) {
    series = hist
      .filter((h) => h.v && h.v[FUEL_KEY] !== null && h.v[FUEL_KEY] !== undefined && !isNaN(h.v[FUEL_KEY]))
      .map((h) => ({ v: h.v[FUEL_KEY], d: h.d }));
    if (series.length < 2) series = [];
  }
  const seriesLabels = series.map((p, i) => `第${i + 1}轮`);

  // 通用小组件节点
  function headerNode(iconSize, titleSize) {
    return {
      type: "stack", direction: "row", alignItems: "center", gap: 4,
      children: [
        { type: "image", src: "sf-symbol:fuelpump.fill", width: iconSize, height: iconSize, color: COLORS.p92 },
        { type: "text", text: titleText, font: { size: titleSize, weight: "semibold" }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.75, flex: 1 },
        { type: "image", src: "sf-symbol:arrow.clockwise", width: iconSize - 2, height: iconSize - 2, color: COLORS.tertiary },
        { type: "text", text: timeStr, font: { size: titleSize }, textColor: COLORS.tertiary, maxLines: 1 },
      ],
    };
  }

  function fuelCard(row, o) {
    return {
      type: "stack", direction: "column", alignItems: "center", justifyContent: "center",
      flex: 1, gap: o.gap, padding: o.padding,
      backgroundColor: tint(row.color, "1F"),
      borderRadius: o.radius,
      children: [
        {
          type: "stack", direction: "row", alignItems: "center",
          padding: [1, 5, 1, 5],
          backgroundColor: tint(row.color, "33"),
          borderRadius: 6,
          children: [{ type: "text", text: row.label, font: { size: o.labelSize, weight: "bold" }, textColor: row.color, maxLines: 1, minScale: 0.8 }],
        },
        { type: "text", text: fmt(row.price), font: { size: o.priceSize, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.6 },
      ],
    };
  }

  function emptyNode(msg, size) {
    return {
      type: "stack", direction: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 3,
      children: [
        { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 18, height: 18, color: COLORS.p98 },
        { type: "text", text: msg, font: { size: size || 11 }, textColor: COLORS.secondary, maxLines: 2, textAlign: "center", minScale: 0.8 },
      ],
    };
  }

  const errText = regionInvalid ? "地区参数错误" : fetchError ? "获取失败" : "暂无数据";

  // ── 锁屏小尺寸（顺手兜底，避免返回非法结构）──────────────────
  if (isAccessory) {
    return {
      type: "widget", padding: 2, backgroundColor: { light: "#00000000", dark: "#00000000" }, refreshAfter: refreshTime,
      children: [{
        type: "text", text: `${FUEL_LABEL} ${fmt(focusPrice)}`, font: { size: 13, weight: "semibold" }, maxLines: 1, minScale: 0.7,
      }],
    };
  }

  // ════════════════════════════════════════════════════════════
  // 5. 小号：单油品大数字 + 更新时间 + 调价信息
  // ════════════════════════════════════════════════════════════
  if (isSmall) {
    return {
      type: "widget",
      padding: [12, 12, 10, 12],
      gap: 3,
      backgroundColor,
      refreshAfter: refreshTime,
      children: [
        headerNode(12, 11),
        hasAnyPrice && focusPrice !== null
          ? {
              type: "stack", direction: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 2,
              children: [
                {
                  type: "stack", direction: "row", alignItems: "center", padding: [2, 8, 2, 8],
                  backgroundColor: tint(focusRow.color, "2E"), borderRadius: 8,
                  children: [{ type: "text", text: focusRow.label, font: { size: 12, weight: "bold" }, textColor: focusRow.color, maxLines: 1 }],
                },
                { type: "text", text: fmt(focusPrice), font: { size: 36, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.6 },
                SHOW_TREND ? { type: "text", text: adjTxtSmall, font: { size: 12, weight: "semibold" }, textColor: adjColor, maxLines: 1, minScale: 0.7 } : { type: "spacer" },
              ],
            }
          : emptyNode(regionInvalid ? "地区参数错误" : fetchError ? "获取失败" : "暂无数据", 11),
        {
          type: "text",
          text: nextDate ? `${MD(nextDate)} 调价 · ${daysLeft >= 0 ? `还有 ${daysLeft} 天` : "待更新"}` : (hasCache ? "调价信息待更新" : "等待首次同步"),
          font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.75, textAlign: "center",
        },
      ],
    };
  }

  // 中/大号共用：四油品一排
  function fuelRow(o) {
    return {
      type: "stack", direction: "row", alignItems: "stretch", gap: o.rowGap || 6,
      ...(o.height ? { height: o.height } : {}),
      children: allRows.map((r) => fuelCard(r, o)),
    };
  }

  // 中/大号共用：调价信息块（真实上轮 + 推算下轮窗口）
  function adjBlock(o) {
    return {
      type: "stack", direction: "column", alignItems: "start", gap: o.gap,
      children: [
        { type: "text", text: "最近调价", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
        { type: "text", text: adjTxt, font: { size: o.valueSize, weight: "bold" }, textColor: adjColor, maxLines: 1, minScale: 0.55 },
        { type: "text", text: adjDate ? `${MD(adjDate)} 24时` : "日期暂无数据", font: { size: o.labelSize }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.75 },
        ...(o.showWindow ? [
          { type: "stack", height: 0.5, width: 60, backgroundColor: COLORS.cardBorder, children: [] },
          { type: "text", text: "预计下轮", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
          { type: "text", text: nextDate ? MD(nextDate) : "暂无数据", font: { size: o.labelSize + 3, weight: "semibold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.7 },
          { type: "text", text: nextDate ? (daysLeft >= 0 ? `还有 ${daysLeft} 天` : "待更新") : "", font: { size: o.labelSize }, textColor: COLORS.tertiary, maxLines: 1 },
        ] : []),
      ],
    };
  }

  const vline = (h) => ({ type: "stack", width: 0.5, height: h, backgroundColor: COLORS.cardBorder, children: [] });

  // ════════════════════════════════════════════════════════════
  // 6. 中号：四油品 + 趋势折线 + 调价信息
  // ════════════════════════════════════════════════════════════
  if (!isLarge) {
    const chartW = 200, chartH = 52;
    return {
      type: "widget",
      padding: [10, 10, 8, 10],
      gap: 6,
      backgroundColor,
      refreshAfter: refreshTime,
      children: [
        headerNode(13, 12),
        hasAnyPrice
          ? {
              type: "stack", direction: "row", alignItems: "stretch", gap: 8, flex: 1,
              children: [
                {
                  type: "stack", direction: "column", alignItems: "stretch", gap: 4, flex: 1,
                  children: [
                    fuelRow({ labelSize: 10, priceSize: 16, gap: 1, padding: [4, 2, 4, 2], radius: 10, rowGap: 5 }),
                    SHOW_TREND && series.length >= 2
                      ? { type: "image", src: chartSVG(series.map((p) => p.v), seriesLabels, { w: chartW, h: chartH }), width: chartW, height: chartH, resizeMode: "contain" }
                      : {
                          type: "stack", direction: "row", alignItems: "center", justifyContent: "center", height: chartH,
                          children: [{
                            type: "text",
                            text: SHOW_TREND ? "走势暂无历史 · 每次调价后自动记录" : "走势已关闭",
                            font: { size: 9 }, textColor: COLORS.tertiary, maxLines: 2, textAlign: "center", minScale: 0.7,
                          }],
                        },
                  ],
                },
                ...(SHOW_TREND ? [vline(0), {
                  type: "stack", direction: "column", alignItems: "start", justifyContent: "center", width: 94, gap: 2,
                  children: [adjBlock({ labelSize: 9, valueSize: 13, gap: 1, showWindow: true })],
                }] : []),
              ],
            }
          : emptyNode(errText, 12),
      ],
    };
  }

  // ════════════════════════════════════════════════════════════
  // 7. 大号：接近参考图的完整信息（四油品 / 大折线 / 调价 / 加满金额）
  // ════════════════════════════════════════════════════════════
  const chartW = 306, chartH = 104;
  const fillCost = focusPrice !== null ? (focusPrice * liters) : null;

  return {
    type: "widget",
    padding: [14, 14, 10, 14],
    gap: 8,
    backgroundColor,
    refreshAfter: refreshTime,
    children: [
      headerNode(16, 15),
      hasAnyPrice
        ? {
            type: "stack", direction: "column", alignItems: "stretch", gap: 8, flex: 1,
            children: [
              fuelRow({ labelSize: 13, priceSize: 26, gap: 2, padding: [7, 2, 7, 2], radius: 14, rowGap: 7, height: 84 }),
              SHOW_TREND && series.length >= 2
                ? { type: "image", src: chartSVG(series.map((p) => p.v), seriesLabels, { w: chartW, h: chartH }), width: chartW, height: chartH, resizeMode: "contain" }
                : {
                    type: "stack", direction: "row", alignItems: "center", justifyContent: "center", height: chartH,
                    backgroundColor: COLORS.card, borderRadius: 12,
                    children: [{
                      type: "text",
                      text: SHOW_TREND ? "走势暂无历史数据\n每次真实调价后自动记录一轮" : "走势已关闭",
                      font: { size: 11 }, textColor: COLORS.tertiary, maxLines: 2, textAlign: "center", minScale: 0.7,
                    }],
                  },
              { type: "stack", height: 0.5, backgroundColor: COLORS.cardBorder, children: [] },
              {
                type: "stack", direction: "row", alignItems: "center", gap: 10, flex: 1,
                children: [
                  ...(SHOW_TREND ? [{
                    type: "stack", direction: "column", alignItems: "start", justifyContent: "center", flex: 1, gap: 2,
                    children: [
                      { type: "text", text: "调价信息", font: { size: 11 }, textColor: COLORS.tertiary, maxLines: 1 },
                      { type: "text", text: adjTxt, font: { size: 22, weight: "bold" }, textColor: adjColor, maxLines: 1, minScale: 0.55 },
                      { type: "text", text: adjDate ? `${MD(adjDate)} 24时` : "日期暂无数据", font: { size: 11 }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.75 },
                      { type: "text", text: nextDate ? `预计 ${MD(nextDate)} · ${daysLeft >= 0 ? `还有 ${daysLeft} 天` : "待更新"}` : "下轮窗口暂无数据", font: { size: 11 }, textColor: COLORS.tertiary, maxLines: 1, minScale: 0.7 },
                    ],
                  }, vline(0)] : []),
                  {
                    type: "stack", direction: "column", alignItems: "start", justifyContent: "center", flex: 1, gap: 2,
                    children: [
                      {
                        type: "stack", direction: "row", alignItems: "center", gap: 3,
                        children: [
                          { type: "image", src: "sf-symbol:fuelpump.fill", width: 11, height: 11, color: COLORS.tertiary },
                          { type: "text", text: `${focusRow.label}加满 ${liters}L`, font: { size: 11 }, textColor: COLORS.secondary, maxLines: 1 },
                        ],
                      },
                      { type: "text", text: fillCost !== null ? `¥${fillCost.toFixed(2)}` : "暂无数据", font: { size: 24, weight: "bold" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.55 },
                      { type: "text", text: focusPrice !== null ? `单价 ${focusPrice.toFixed(2)} 元/升` : "", font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1 },
                    ],
                  },
                ],
              },
            ],
          }
        : emptyNode(errText, 13),
      {
        type: "stack", direction: "row", alignItems: "center",
        children: [
          { type: "text", text: `更新 ${timeStr}${hasCache && fetchError ? " · 缓存数据" : ""}`, font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1 },
          { type: "spacer" },
          { type: "text", text: "元/升 · 数据源 汽油价格网", font: { size: 10 }, textColor: COLORS.tertiary, maxLines: 1 },
        ],
      },
    ],
  };
}
