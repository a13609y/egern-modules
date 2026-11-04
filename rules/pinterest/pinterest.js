// Pinterest 去广告（Egern http_response 脚本）
//
// 思路来源：
//   · 可莉（iKeLee / kelee.one）的 Surge/Loon 版 http-response-jq 规则，只处理两个固定接口：
//       /v\d/feeds/home/ 与 /v\d/pins/\d+/related/modules/ —— 新版 App 接口一变就失效。
//   · renvder/Proxy_Tools 的 Shadowrocket 版脚本，放开了接口匹配、递归清理整棵 JSON。
//   本脚本取两者之长：匹配整个 api.pinterest.com（接口路径变了也照样生效），
//   但只在「确实删掉了东西」时才回写 body，其余一律原样放行（fail open）。
//
// 安全边界：
//   · 只挂在 api.pinterest.com 的响应上，不碰 i.pinimg.com / s.pinimg.com 图片 CDN。
//   · 解析失败、body 为空、content-type 不是 JSON、删完没变化 → 直接 return，不改一个字。
//   · 不做域名级 REJECT（那部分在 yaml 的 rules 里，只针对明确的广告/点击追踪域名）。

// 激进模式：把任何键名含 promoted / sponsor / advert 且值非空的对象也算广告。
// 默认关闭 —— 会误伤带 sponsor 字样的正常内容；官方接口字段改名导致失效时再打开。
var AGGRESSIVE = false;

// 明确的广告容器键：整块删掉
var CONTAINER_KEYS = {
  ads: 1,
  ad: 1,
  ad_items: 1,
  ad_slots: 1,
  ad_units: 1,
  promoted: 1,
  promoted_pins: 1,
  promoted_items: 1,
  promoted_results: 1,
  sponsored: 1,
  sponsored_pins: 1,
  sponsored_items: 1,
  sponsored_results: 1,
  shopping_ads: 1,
  shopping_ad_items: 1,
  product_ads: 1,
  brand_ads: 1,
  display_ads: 1,
};

// 明确的广告类型（字符串枚举）
var AD_TYPES = /^(ad|ads|ad_pin|promoted|promoted_pin|sponsored|sponsored_pin|shopping_ad|product_ad|brand_ad|display_ad)$/i;

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// 单个节点是不是「一个广告」
function isAdItem(item, depth) {
  if (!isObj(item)) return false;
  depth = depth || 0;

  if (item.is_promoted === true || item.is_promoted === 'true') return true;
  if (item.is_promoted_pin === true || item.is_promoted_pin === 'true') return true;
  if (item.is_ad === true || item.is_ad === 'true') return true;
  if (item.is_sponsored === true || item.is_sponsored === 'true') return true;
  if (item.sponsored === true || item.promoted === true) return true;

  if (typeof item.type === 'string' && AD_TYPES.test(item.type)) return true;

  // 广告才有的一组 id，抽到任意一个即可（正常 pin 不会带这些）
  if (item.ad_id || item.ad_account_id || item.ad_group_id ||
      item.ad_creative_id || item.campaign_id || item.promotion_id) return true;

  if (item.advertiser || item.sponsored_by || item.promoted_by || item.promotion) return true;

  // 外层包一层 story/wrapper，真正的 pin 在下面
  if (depth < 3) {
    if (isAdItem(item.pin, depth + 1)) return true;
    if (isAdItem(item.origin_pin, depth + 1)) return true;
    if (isAdItem(item.data, depth + 1)) return true;
    if (isObj(item.data) && (item.data.is_promoted === true || item.data.sponsored === true)) return true;
  }

  if (AGGRESSIVE) {
    for (var k in item) {
      if (!Object.prototype.hasOwnProperty.call(item, k)) continue;
      var lk = String(k).toLowerCase();
      if (lk.indexOf('promoted') === -1 && lk.indexOf('sponsor') === -1 && lk.indexOf('advert') === -1) continue;
      var v = item[k];
      if (v === true || (v && typeof v === 'object')) return true;
      if (typeof v === 'string' && v.length > 0) return true;
      if (typeof v === 'number' && v > 0) return true;
    }
  }
  return false;
}

var removed = 0;

// 递归清理：边删边计数
function clean(node, depth) {
  if (depth > 40) return node;

  if (Array.isArray(node)) {
    var out = [];
    for (var i = 0; i < node.length; i++) {
      var el = node[i];
      if (isAdItem(el)) { removed++; continue; }
      out.push(clean(el, depth + 1));
    }
    return out;
  }

  if (isObj(node)) {
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (CONTAINER_KEYS[k]) { removed++; delete node[k]; continue; }
      var v = node[k];

      if (Array.isArray(v)) {
        node[k] = clean(v, depth + 1);
        continue;
      }

      // 形如 {"pins": {"<id>": {...}}} 的按 id 索引表：值本身就是广告项时整条删
      if (isObj(v)) {
        var ids = Object.keys(v);
        for (var j = 0; j < ids.length; j++) {
          var id = ids[j];
          if (CONTAINER_KEYS[id] || isAdItem(v[id])) { removed++; delete v[id]; continue; }
        }
        clean(v, depth + 1);
        continue;
      }
    }
  }
  return node;
}

export default async function (ctx) {
  try {
    if (!ctx || !ctx.response) return; // 只在响应阶段工作

    // 只处理 JSON
    var headers = ctx.response.headers;
    var ct = '';
    try {
      if (headers && typeof headers.get === 'function') ct = headers.get('content-type') || '';
      else if (headers && headers['content-type']) ct = headers['content-type'];
    } catch (e) {}
    if (ct && String(ct).toLowerCase().indexOf('json') === -1) return;

    var raw = await ctx.response.text();
    if (!raw || raw.length < 4) return;

    // 便宜的预判：整段里连关键词都没有就不用解析
    if (!/is_promoted|is_sponsored|sponsored|ad_id|campaign_id|ad_account_id|"ads"\s*:|promoted_pins/.test(raw)) return;

    var obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      return; // 不是 JSON → 原样放行
    }

    removed = 0;
    obj = clean(obj, 0);

    if (removed === 0) return; // 没删东西 → 一个字节都不改

    var out = JSON.stringify(obj);
    if (out === raw) return;
    return { body: out };
  } catch (e) {
    return; // 任何异常 → fail open
  }
}
