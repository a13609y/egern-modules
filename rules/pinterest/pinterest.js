// Pinterest 去广告（Egern http_response 脚本）  v2.0.0
//
// v2 的设计原则：只「抽掉广告条目」，绝不改变 JSON 的结构形状。
// v1 会 delete 掉 ads / promoted_pins 这类容器键，也可能把按 id 索引的字典整条删掉；
// 客户端若直接读 data.ads.forEach 或依赖某个键存在，就会抛异常 →
// 「更多类似内容」整块加载不出来（首页前几分钟正常是因为走的是本地缓存）。
//
// v2 的具体变化：
//   1. 容器键不再 delete，而是换成同类型的空值（数组给 []，对象给 {}），键一定存在。
//   2. 默认只认明确的布尔标记 is_promoted / is_sponsored / is_ad === true，
//      不再用 ad_id / campaign_id / promotion_id / advertiser / type 这些启发式（易误伤）。
//   3. /related/ 路径下额外保守：连字典条目都不删，只过滤数组里的广告。
//   4. 任何异常、非 JSON、删完没变化 → 原样放行（fail open）。
//
// 排查开关（都在下面常量区）：
//   DEBUG = true        → 每次命中都往 Egern 日志打一行 URL 与删除数量（默认关闭）
//   SKIP_RELATED = true → 完全不碰 /related/ 响应（类似内容里的广告会回来，但页面保证能加载）
//   AGGRESSIVE = true   → 打开 v1 的启发式判定（只在广告漏网时临时用）

var DEBUG = false;
var SKIP_RELATED = false;
var AGGRESSIVE = false;

// 广告容器键：键保留，值清空
var CONTAINER_KEYS = {
  ads: 1, ad: 1, ad_items: 1, ad_slots: 1, ad_units: 1,
  promoted: 1, promoted_pins: 1, promoted_items: 1, promoted_results: 1,
  sponsored: 1, sponsored_pins: 1, sponsored_items: 1, sponsored_results: 1,
  shopping_ads: 1, shopping_ad_items: 1, product_ads: 1,
  brand_ads: 1, display_ads: 1,
};

var AD_TYPES = /^(ad|ads|ad_pin|promoted|promoted_pin|sponsored|sponsored_pin|shopping_ad|product_ad|brand_ad|display_ad)$/i;

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function log(msg) {
  if (!DEBUG) return;
  try { console.log('[pinterest] ' + msg); } catch (e) {}
}

// 是否是「广告条目」——默认只认明确标记
function isAd(item, depth) {
  if (!isObj(item)) return false;
  depth = depth || 0;

  if (item.is_promoted === true || item.is_promoted === 'true') return true;
  if (item.is_promoted_pin === true || item.is_promoted_pin === 'true') return true;
  if (item.is_sponsored === true || item.is_sponsored === 'true') return true;
  if (item.is_ad === true || item.is_ad === 'true') return true;

  // 外层包一层 story / wrapper，真正的 pin 在下面
  if (depth < 3) {
    if (isAd(item.pin, depth + 1)) return true;
    if (isAd(item.origin_pin, depth + 1)) return true;
    if (isAd(item.data, depth + 1)) return true;
  }

  if (!AGGRESSIVE) return false;

  // —— 以下只在 AGGRESSIVE 下生效（v1 的默认行为，容易误伤）——
  if (item.sponsored === true || item.promoted === true) return true;
  if (typeof item.type === 'string' && AD_TYPES.test(item.type)) return true;
  if (item.ad_id || item.ad_account_id || item.ad_group_id ||
      item.ad_creative_id || item.campaign_id || item.promotion_id) return true;
  if (item.advertiser || item.sponsored_by || item.promoted_by || item.promotion) return true;
  for (var k in item) {
    if (!Object.prototype.hasOwnProperty.call(item, k)) continue;
    var lk = String(k).toLowerCase();
    if (lk.indexOf('promoted') === -1 && lk.indexOf('sponsor') === -1 && lk.indexOf('advert') === -1) continue;
    var v = item[k];
    if (v === true || isObj(v) || (Array.isArray(v) && v.length > 0)) return true;
    if (typeof v === 'string' && v.length > 0) return true;
    if (typeof v === 'number' && v > 0) return true;
  }
  return false;
}

var removed = 0;

// shape-preserving clean：只抽广告条目，不改键的存在性
function clean(node, depth, conservative) {
  if (depth > 40) return node;

  if (Array.isArray(node)) {
    var out = [];
    for (var i = 0; i < node.length; i++) {
      var el = node[i];
      if (isAd(el, 0)) { removed++; continue; }
      out.push(clean(el, depth + 1, conservative));
    }
    return out;
  }

  if (isObj(node)) {
    var keys = Object.keys(node);
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      var v = node[k];

      // 广告容器：保留键，清空值
      if (CONTAINER_KEYS[k] && v && typeof v === 'object' &&
          ((Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && Object.keys(v).length > 0)) &&
          (Array.isArray(v) || isObj(v))) {
        node[k] = Array.isArray(v) ? [] : {};
        removed++;
        continue;
      }

      if (Array.isArray(v)) { node[k] = clean(v, depth + 1, conservative); continue; }

      if (isObj(v)) {
        // 形如 {"pins": {"<id>": {...}}} 的索引表：/related/ 下保守，不动条目
        if (!conservative) {
          var ids = Object.keys(v);
          for (var m = 0; m < ids.length; m++) {
            var id = ids[m];
            var child = v[id];
            if (isObj(child) && isAd(child, 0)) { delete v[id]; removed++; }
          }
        }
        clean(v, depth + 1, conservative);
        continue;
      }
    }
  }
  return node;
}

export default async function (ctx) {
  try {
    if (!ctx || !ctx.response) return; // 只在响应阶段工作

    var url = '';
    try { url = String((ctx.request && (ctx.request.url || ctx.request.uri)) || ''); } catch (e) {}

    var isRelated = /\/related\//i.test(url);
    if (isRelated && SKIP_RELATED) { log('skip related ' + url); return; }

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

    // 便宜预判：连明确标记都没有就没必要解析
    var need = AGGRESSIVE
      ? /is_promoted|is_sponsored|"ads"\s*:|promoted_pins|ad_id|campaign_id/
      : /is_promoted|is_sponsored|is_ad|"ads"\s*:|promoted_pins|sponsored_pins/;
    if (!need.test(raw)) return;

    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return; }

    removed = 0;
    obj = clean(obj, 0, isRelated);

    if (removed === 0) { log('clean 0  ' + url); return; }
    var out = JSON.stringify(obj);
    if (out === raw) return;

    log('removed ' + removed + ' len ' + raw.length + '->' + out.length + '  ' + url);
    return { body: out };
  } catch (e) {
    log('error ' + (e && e.message));
    return; // fail open
  }
}
