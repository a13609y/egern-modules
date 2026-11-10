// Pinterest 去广告（Egern http_response 脚本）  v4.0.0
//
// ⚠️ 排查用版本：新增 MODE 开关，可以先「只记日志、不改写」把问题定位下来。
//
// MODE:
//   'clean' 正常改写（默认）
//   'log'   只解析并打日志，一个字节都不改 —— 用来判断「到底是不是脚本改坏的」
//   'off'   完全不干活，立刻返回
//
// v2.0.0 的关键设计（别改回去）：
//   1. 广告容器键不 delete，改成空值 [] 或 {}，键一定存在。
//   2. 默认只认明确布尔标记 is_promoted / is_sponsored / is_ad === true。
//   3. /related/ 路径保守处理：连字典条目都不删，只过滤数组里的广告。
//   4. 异常 / 非 JSON / 删完没变化 → 原样放行（fail open）。

var MODE = 'clean';
// v4：只处理信息流 / 搜索结果。其余路径（尤其是 /v3/visual_search/…/module/，
// 就是「更多类似内容」的真实接口）一律不接手，连 body 都不读。
var ALLOW_PATH = /\/v\d+\/(feeds|search)\//i;
var SKIP_RELATED = false;   // true → /related/ 响应完全原样放行
var AGGRESSIVE = false;     // true → 启用 v1 的启发式判定（易误伤，仅临时排查）

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
  try { console.log('[pinterest] ' + msg); } catch (e) {}
}

function isAd(item, depth) {
  if (!isObj(item)) return false;
  depth = depth || 0;

  if (item.is_promoted === true || item.is_promoted === 'true') return true;
  if (item.is_promoted_pin === true || item.is_promoted_pin === 'true') return true;
  if (item.is_sponsored === true || item.is_sponsored === 'true') return true;
  if (item.is_ad === true || item.is_ad === 'true') return true;

  if (depth < 3) {
    if (isAd(item.pin, depth + 1)) return true;
    if (isAd(item.origin_pin, depth + 1)) return true;
    if (isAd(item.data, depth + 1)) return true;
  }

  if (!AGGRESSIVE) return false;

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

      if (CONTAINER_KEYS[k] && v && typeof v === 'object' &&
          ((Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && Object.keys(v).length > 0))) {
        node[k] = Array.isArray(v) ? [] : {};
        removed++;
        continue;
      }

      if (Array.isArray(v)) { node[k] = clean(v, depth + 1, conservative); continue; }

      if (isObj(v)) {
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

// 日志用：描述结构骨架（不打印内容，避免刷屏/泄露）
function sketch(node, depth) {
  if (depth > 2) return '...';
  if (Array.isArray(node)) return '[' + node.length + (node.length ? '×' + sketch(node[0], depth + 1) : '') + ']';
  if (isObj(node)) {
    var ks = Object.keys(node);
    var shown = ks.slice(0, 8).map(function (k) { return k + ':' + sketch(node[k], depth + 1); });
    return '{' + shown.join(',') + (ks.length > 8 ? ',…+' + (ks.length - 8) : '') + '}';
  }
  if (typeof node === 'string') return '"' + (node.length > 24 ? node.slice(0, 24) + '…' : node) + '"';
  return String(node);
}

export default async function (ctx) {
  try {
    if (!ctx || !ctx.response) return;
    if (MODE === 'off') return;

    var url = '';
    try { url = String((ctx.request && (ctx.request.url || ctx.request.uri)) || ''); } catch (e) {}

    var isRelated = /related/i.test(url);

    if (!ALLOW_PATH.test(url)) { log('skip-path  ' + url.slice(0, 100)); return; }

    var headers = ctx.response.headers;
    var ct = '';
    try {
      if (headers && typeof headers.get === 'function') ct = headers.get('content-type') || '';
      else if (headers && headers['content-type']) ct = headers['content-type'];
    } catch (e) {}

    // log 模式下，连 JSON 判定都记下来（诊断第一现场）
    var raw = '';
    try { raw = await ctx.response.text(); } catch (e) { raw = ''; }

    var tag = (isRelated ? 'RELATED ' : 'FEED ') + url.slice(0, 120) + ' ct=' + ct + ' len=' + (raw ? raw.length : 0);

    if (!raw || raw.length < 4) { log('empty  ' + tag); return; }
    if (ct && String(ct).toLowerCase().indexOf('json') === -1) { log('skip-nonjson  ' + tag); return; }

    var obj;
    try { obj = JSON.parse(raw); } catch (e) { log('BAD-JSON  ' + tag); return; }

    var shape = sketch(obj, 0);
    if (MODE === 'log') { log('shape  ' + tag + '  shape=' + shape); return; }

    if (isRelated && SKIP_RELATED) { log('skip-related  ' + tag); return; }

    var need = AGGRESSIVE
      ? /is_promoted|is_sponsored|"ads"\s*:|promoted_pins|ad_id|campaign_id/
      : /is_promoted|is_sponsored|is_ad|"ads"\s*:|promoted_pins|sponsored_pins/;
    if (!need.test(raw)) { log('no-ads-marker  ' + tag + '  shape=' + shape); return; }

    removed = 0;
    obj = clean(obj, 0, isRelated);

    if (removed === 0) { log('removed=0  ' + tag); return; }
    var out = JSON.stringify(obj);
    if (out === raw) return;

    log('REMOVED ' + removed + ' ' + raw.length + '->' + out.length + '  ' + tag);
    return { body: out };
  } catch (e) {
    log('ERROR ' + (e && e.message));
    return;
  }
}
