// Pinterest 去广告（Egern http_response 脚本）—— 自动生成，请勿手改
//
// 生成者：.github/workflows/sync-pinterest.yml
// 上游：https://raw.githubusercontent.com/axtyet/Luminous/main/Repcz/Surge/Module/Kelee/Pinterest_remove_ads.sgmodule
// 上游版本：2026-06-01 17:11:35
//
// 上游的 jq 表达式（等价实现）：
//   .data |= map(select(.is_promoted == false or .is_promoted == "false"))
//   .data |= map(select(.is_promoted == false or .is_promoted == "false"))
//
// 规则：只命中上游列出的这 2 条路径，其余一律不接手（连 body 都不读）。
// 动作：把 JSON 里 data 数组中的 is_promoted 条目剔除，结构不做任何改变。
// 任何异常 / 非 JSON / 没删东西 → 原样放行（fail open）。

var PATH_SOURCES = [
  "api\\.pinterest\\.com\\/v\\d\\/feeds\\/home\\/",
  "api\\.pinterest\\.com\\/v\\d\\/pins\\/\\d+\\/related\\/modules\\/"
];

var PATHS = PATH_SOURCES.map(function (src) { return new RegExp(src, 'i'); });

var MITM_HOSTS = ["api.pinterest.com"];

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function isPromoted(item) {
  if (!isObj(item)) return false;
  if (item.is_promoted === true || item.is_promoted === 'true') return true;
  // 上游 jq 只认 .is_promoted，其余标记仅在上游确实用到时才需要扩展
  return false;
}

var removed = 0;

function clean(node, depth) {
  if (depth > 32) return node;
  if (Array.isArray(node)) {
    var out = [];
    for (var i = 0; i < node.length; i++) {
      var el = node[i];
      if (isPromoted(el)) { removed++; continue; }
      out.push(clean(el, depth + 1));
    }
    return out;
  }
  if (isObj(node)) {
    var keys = Object.keys(node);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var v = node[key];
      // 只处理名为 data 的数组（上游就是 .data |= map(...)），别的一律不动
      if (key === 'data' && Array.isArray(v)) { node[key] = clean(v, depth + 1); continue; }
      if (isObj(v)) clean(v, depth + 1);
    }
  }
  return node;
}

function allowed(url) {
  for (var i = 0; i < PATHS.length; i++) {
    if (PATHS[i].test(url)) return true;
  }
  return false;
}

export default async function (ctx) {
  try {
    if (!ctx || !ctx.response) return;

    var url = '';
    try { url = String((ctx.request && (ctx.request.url || ctx.request.uri)) || ''); } catch (e) {}
    if (!url) return;
    if (!allowed(url)) return; // 不在上游路径白名单里 → 不读 body、不改写

    var headers = ctx.response.headers;
    var ct = '';
    try {
      if (headers && typeof headers.get === 'function') ct = headers.get('content-type') || '';
      else if (headers && headers['content-type']) ct = headers['content-type'];
    } catch (e) {}
    if (ct && String(ct).toLowerCase().indexOf('json') === -1) return;

    var raw = await ctx.response.text();
    if (!raw || raw.length < 4) return;
    if (raw.indexOf('is_promoted') === -1) return; // 便宜的预判

    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return; }

    removed = 0;
    obj = clean(obj, 0);
    if (removed === 0) return;

    var out = JSON.stringify(obj);
    if (out === raw) return;
    return { body: out };
  } catch (e) {
    return; // fail open
  }
}
