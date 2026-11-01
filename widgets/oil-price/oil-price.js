/**
 * ⛽ 全国实时油价小组件 v3.1（Egern 模块版）
 * 数据源：http://m.qiyoujiage.com/
 * 原作者：Egern 群友 tg://user?id=5122789128 · 二次修改 iBL3ND
 * 模块化改造：封装为 Egern 模块，地区/趋势/刷新间隔都能在「模块设置」里改，无需手写环境变量
 *
 * 模块参数
 * ─────────────────────────────────────────────────
 * region        省份/城市，拼音（hainan/haikou）或中文（海南、海口、广东深圳）都可以
 * SHOW_TREND    是否显示调价趋势：true / false
 * REFRESH_HOURS 刷新间隔小时数，1~24，默认 6（系统调度为尽力而为，不保证精确）
 *
 * 行为说明
 * - 参数由模块 YAML 的 env_schema 生成设置界面，经 {{{region}}} 等占位符注入 ctx.env
 * - 兼容手动环境变量写法（region / REGION / city / CITY 均可识别）
 * - 中文地区名内置映射：省份、省会、主要城市；城市页 404 时自动退回省级页
 * - 网络失败回退上一次缓存；地区参数非法时明确提示，而不是悄悄用默认值
 */

export default async function (ctx) {
  const rawRegion = String(
    ctx.env.region ?? ctx.env.REGION ?? ctx.env.city ?? ctx.env.CITY ?? ""
  ).trim();

  // ── 地区参数解析 ────────────────────────────────────────────
  // 省份中文名 → 站点路径（省级页面始终存在，作为兜底）
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
  // 城市中文名 → 站点城市路径
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
  // 城市 → 所属省份中文名（用于「深圳」= 广东/深圳、「广东深圳」）
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

  // 容错：http 前缀、.shtml 后缀、反斜杠、空格、首尾斜杠
  let regionParam = rawRegion
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/\.s?html?$/i, "")
    .replace(/\\/g, "/")
    .replace(/\s+/g, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  // 中文输入：省份 / 城市 / 省份+城市 → 站点路径
  if (/[\u4e00-\u9fa5]/.test(regionParam)) {
    const segs = regionParam.split(/[\/、,，]/).filter(Boolean);
    const cn = [...new Set(segs)].join("");
    if (PROV[cn]) {
      regionParam = PROV[cn];                                   // 海南
    } else if (segs.length === 2 && PROV[segs[0]] && CITY[segs[1]]) {
      regionParam = PROV[segs[0]] + "/" + CITY[segs[1]];         // 广东/深圳
    } else if (cn.length > 2 && PROV[cn.slice(0, 2)] && CITY[cn.slice(2)]) {
      regionParam = PROV[cn.slice(0, 2)] + "/" + CITY[cn.slice(2)]; // 广东深圳
    } else if (CITY[cn]) {
      regionParam = (CITY_PROV[cn] ? PROV[CITY_PROV[cn]] + "/" : "") + CITY[cn]; // 深圳
    } else {
      regionParam = "";
    }
  }

  const validRegion = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(regionParam);
  const regionInvalid = !validRegion;      // 参数写错时明确报错，而不是悄悄用默认值
  if (!validRegion) regionParam = "hainan/haikou";

  // 城市页可能不存在时，退回省级页
  const regionCandidates = regionParam.includes("/")
    ? [regionParam, regionParam.split("/")[0]]
    : [regionParam];

  const trendRaw = String(ctx.env.SHOW_TREND ?? "true").trim().toLowerCase();
  const SHOW_TREND = !["false", "0", "no", "off", "hide", "隐藏"].includes(trendRaw);

  // ✅ 按文档：ctx.widgetFamily，值为 "systemSmall"
  const isSmall = ctx.widgetFamily === "systemSmall";

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  // 刷新间隔：模块参数 REFRESH_HOURS，限定 1~24 小时，非法值回退 6
  let refreshHours = parseFloat(String(ctx.env.REFRESH_HOURS ?? "6"));
  if (!isFinite(refreshHours) || refreshHours < 1 || refreshHours > 24) refreshHours = 6;
  const refreshTime = new Date(Date.now() + refreshHours * 3600 * 1000).toISOString();

  const backgroundColor = { light: "#FFFFFF", dark: "#1C1C1E" };

  const COLORS = {
    primary:     { light: "#1A1A1A", dark: "#FFFFFF" },
    secondary:   { light: "#666666", dark: "#CCCCCC" },
    tertiary:    { light: "#999999", dark: "#888888" },
    card:        { light: "#F5F5F7", dark: "#2C2C2E" },
    cardBorder:  { light: "#E0E0E0", dark: "#3A3A3C" },
    p92:         { light: "#FF9F0A", dark: "#FFB347" },
    p95:         { light: "#FF6B35", dark: "#FF8A5C" },
    p98:         { light: "#FF3B30", dark: "#FF6B6B" },
    diesel:      { light: "#30D158", dark: "#5CD67D" },
    trend:       { light: "#2C2C2E", dark: "#FFFFFF" },
  };

  const CACHE_KEY = `oilprice_v31_${regionInvalid ? "__invalid__" : regionParam}`;
  let prices = { p92:null, p95:null, p98:null, diesel:null };
  let regionName = "";
  let trendInfo  = "";
  let hasCache   = false;

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY);
    if (cached && cached.prices) {
      prices     = cached.prices;
      regionName = cached.regionName || "";
      trendInfo  = cached.trendInfo  || "";
      hasCache   = true;
    }
  } catch(_){}

  let fetchError = false;
  let errorMsg   = "";

  if (regionInvalid) {
    fetchError = true;
    errorMsg   = "地区参数无效";
  } else try {
    let html = "";
    let lastStatus = 0;
    for (const cand of regionCandidates) {
      const resp = await ctx.http.get(`http://m.qiyoujiage.com/${cand}.shtml`, {
        headers: {
          referer:    "http://m.qiyoujiage.com/",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        timeout: 15000
      });
      lastStatus = resp.status;
      if (resp.status === 200) { html = await resp.text(); break; }
    }

    if (!html) throw new Error(`HTTP ${lastStatus}: 页面不存在`);

    const titleMatch = html.match(/<title>([^_]+)_/);
    if (titleMatch?.[1]) {
      regionName = titleMatch[1].trim().replace(/(油价|实时|今日|最新|查询|价格)/g, '').trim();
    }

    const regPrice = /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm;
    const priceList = [];
    let m = null;
    while ((m = regPrice.exec(html)) !== null) {
      if (m.index === regPrice.lastIndex) regPrice.lastIndex++;
      priceList.push({ name: m[1].trim(), value: m[2].trim() });
    }

    if (priceList.length >= 3) {
      const nameMap = {
        "92 号":"p92","92":"p92",
        "95 号":"p95","95":"p95",
        "98 号":"p98","98":"p98",
        "0 号":"diesel","柴油":"diesel"
      };
      prices = { p92:null, p95:null, p98:null, diesel:null };
      priceList.forEach(item => {
        const key = Object.keys(nameMap).find(k => item.name.includes(k));
        if (key) {
          const v = parseFloat(item.value);
          if (!isNaN(v)) prices[nameMap[key]] = v;
        }
      });

      if (SHOW_TREND) {
        const trendMatch = html.match(/<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/);
        if (trendMatch?.length >= 3) {
          const datePart  = trendMatch[1].split('价')[1]?.slice(0, -2) || "";
          const valuePart = trendMatch[2];
          const dir       = (valuePart.includes('下调') || valuePart.includes('下跌')) ? '↓' : '↑';
          let amount = "";
          const allL = valuePart.match(/([\d\.]+)\s*元\/升/g);
          if (allL?.length >= 2) {
            amount = allL.map(p => p.match(/([\d\.]+)/)[1]).join('-');
          } else {
            const allT = valuePart.match(/([\d]+)\s*元(?:\/吨)?/g);
            if (allT?.length >= 2) amount = allT.map(p => p.match(/([\d]+)/)[1]).join('-') + '元/吨';
            else {
              const s = valuePart.match(/([\d\.]+)\s*元\/升/);
              if (s) amount = s[1] + '元/L';
            }
          }
          trendInfo = `${datePart}调整 ${dir} ${amount}`.trim();
        }
      }

      ctx.storage.setJSON(CACHE_KEY, { prices, regionName, trendInfo });
    } else {
      if (!hasCache) { fetchError = true; errorMsg = "解析失败"; }
    }
  } catch (e) {
    if (!hasCache) { fetchError = true; errorMsg = e.message; }
  }

  const titleText = regionName ? `${regionName}实时油价` : "实时油价";

  const allRows = [
    { label:"92号", price:prices.p92,    color:COLORS.p92    },
    { label:"95号", price:prices.p95,    color:COLORS.p95    },
    { label:"98号", price:prices.p98,    color:COLORS.p98    },
    { label:"柴油",  price:prices.diesel, color:COLORS.diesel },
  ];

  // ════════════════════════════════════════════════════════════
  // 小尺寸（systemSmall）专用布局：2×2 田字格
  // ════════════════════════════════════════════════════════════
  if (isSmall) {

    // 单个田字格卡片：上方标签 + 下方价格，撑满格子
    function gridCell(row) {
      return {
        type: "stack",
        direction: "column",
        alignItems: "center",
        flex: 1,
        padding: [6, 4, 6, 4],
        backgroundColor: COLORS.card,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: COLORS.cardBorder,
        gap: 3,
        children: [
          // 油品标签（带色条背景）
          {
            type: "stack",
            direction: "row",
            alignItems: "center",
            padding: [2, 6, 2, 6],
            backgroundColor: { light: row.color.light + "22", dark: row.color.dark + "22" },
            borderRadius: 5,
            borderWidth: 0.5,
            borderColor: { light: row.color.light + "55", dark: row.color.dark + "55" },
            children: [{
              type: "text",
              text: row.label,
              font: { size: "caption2", weight: "bold" },
              textColor: row.color,
              textAlign: "center",
              maxLines: 1
            }]
          },
          // 价格数字
          {
            type: "text",
            text: row.price !== null ? row.price.toFixed(2) : "--",
            font: { size: "title3", weight: "semibold" },
            textColor: COLORS.primary,
            textAlign: "center",
            maxLines: 1,
            minScale: 0.7
          }
        ]
      };
    }

    // 用前4条数据填充田字格（不足时用占位格）
    const cells = [0, 1, 2, 3].map(i => {
      const row = allRows[i];
      if (row) return gridCell(row);
      // 空格占位
      return {
        type: "stack",
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: COLORS.cardBorder,
        children: []
      };
    });

    // 第一行：92、95
    const row1 = {
      type: "stack",
      direction: "row",
      flex: 1,
      gap: 5,
      children: [cells[0], cells[1]]
    };

    // 第二行：98、柴油
    const row2 = {
      type: "stack",
      direction: "row",
      flex: 1,
      gap: 5,
      children: [cells[2], cells[3]]
    };

    // 错误占位
    const errorView = {
      type: "stack",
      direction: "column",
      alignItems: "center",
      flex: 1,
      gap: 4,
      children: [
        { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 20, height: 20, color: COLORS.p98 },
        { type: "text", text: regionInvalid ? "地区参数错误" : (fetchError ? "获取失败" : "暂无数据"), font: { size: "caption2" }, textColor: COLORS.secondary }
      ]
    };

    return {
      type: "widget",
      padding: [10, 10, 8, 10],
      gap: 5,
      backgroundColor: backgroundColor,
      refreshAfter: refreshTime,
      children: [

        // ── 顶部：图标 + 地区 + 时间 ─────────────────────────────
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 4,
          children: [
            {
              type: "image",
              src: "sf-symbol:fuelpump.fill",
              width: 11,
              height: 11,
              color: COLORS.p92
            },
            {
              type: "text",
              text: regionName ? `${regionName}油价` : "油价",
              font: { size: "caption2", weight: "semibold" },
              textColor: COLORS.secondary,
              maxLines: 1,
              minScale: 0.85
            },
            { type: "spacer" },
            {
              type: "image",
              src: "sf-symbol:arrow.clockwise",
              width: 10,
              height: 10,
              color: { light: "#BBBBBB", dark: "#666666" }
            },
            {
              type: "text",
              text: timeStr,
              font: { size: "caption2" },
              textColor: { light: "#BBBBBB", dark: "#666666" },
              maxLines: 1
            }
          ]
        },

        // ── 调价趋势（可选，显示在标题下方）─────────────────────────
        ...(SHOW_TREND && trendInfo ? [{
          type: "stack",
          direction: "row",
          alignItems: "center",
          children: [{
            type: "text",
            text: trendInfo,
            font: { size: "caption2" },
            textColor: { light: "#888888", dark: "#777777" },
            maxLines: 1,
            minScale: 0.8
          }]
        }] : []),

        // ── 2×2 田字格主体 ────────────────────────────────────
        ...(allRows.some(r => r.price !== null)
          ? [row1, row2]
          : [errorView]
        )

      ]
    };
  }

  // ════════════════════════════════════════════════════════════
  // 中/大尺寸：原始逻辑完全不动
  // ════════════════════════════════════════════════════════════

  const rows = allRows.filter(r => r.price !== null);

  function priceCard(row) {
    return {
      type: "stack",
      direction: "column",
      alignItems: "center",
      flex: 1,
      padding: [8,4,8,4],
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: COLORS.cardBorder,
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          width: 44, height: 22,
          backgroundColor: { light: row.color.light + "28", dark: row.color.dark + "28" },
          borderRadius: 6,
          borderWidth: 0.5,
          borderColor: { light: row.color.light + "55", dark: row.color.dark + "55" },
          children: [{
            type: "text",
            text: row.label,
            font: { size: "caption2", weight: "bold" },
            textColor: row.color,
            textAlign: "center"
          }]
        },
        {
          type: "text",
          text: row.price !== null ? row.price.toFixed(2) : "--",
          font: { size: "title3", weight: "semibold" },
          textColor: COLORS.primary,
          textAlign: "center",
          maxLines: 1,
          minScale: 0.7
        }
      ]
    };
  }

  return {
    type: "widget",
    padding: [10,8,10,8],
    gap: 5,
    backgroundColor: backgroundColor,
    refreshAfter: refreshTime,
    children: [
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 4,
        padding: [0,4,0,4],
        children: [
          { type:"image", src:"sf-symbol:fuelpump.fill", width:13, height:13, color:COLORS.p92 },
          { type:"text", text:titleText, font:{size:"caption2",weight:"semibold"}, textColor:COLORS.secondary },
          { type:"spacer" },
          ...(SHOW_TREND && trendInfo ? [{
            type: "text",
            text: trendInfo,
            font: { size:"caption2" },
            textColor: COLORS.trend,
            textAlign: "right",
            maxLines: 1,
            minScale: 0.8
          }] : []),
          ...(fetchError ? [{
            type: "text", text: errorMsg, font: { size:"caption2" }, textColor: COLORS.p98
          }] : [])
        ].filter(Boolean)
      },
      rows.length > 0 ? {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 6,
        padding: [6,0,6,0],
        children: rows.map(priceCard)
      } : {
        type: "stack",
        direction: "column",
        alignItems: "center",
        padding: [20,10,20,10],
        children: [
          { type:"image", src:"sf-symbol:exclamationmark.triangle.fill", width:24, height:24, color:COLORS.p98 },
          { type:"text", text: regionInvalid?"地区参数错误，请在模块设置里修改":(fetchError?"数据获取失败":"暂无数据"), font:{size:"body"}, textColor:COLORS.secondary }
        ]
      },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        padding: [0,4,0,4],
        children: [
          { type:"text", text:`${timeStr} 更新`, font:{size:"caption2"}, textColor:COLORS.tertiary },
          { type:"spacer" },
          { type:"text", text:"元/升", font:{size:"caption2"}, textColor:COLORS.tertiary }
        ]
      }
    ]
  };
}
