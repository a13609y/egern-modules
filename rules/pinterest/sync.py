#!/usr/bin/env python3
"""跟随上游（可莉 kelee.one）重生成 Pinterest 去广告模块。

上游只有 Surge / Loon 两种写法：
  Surge:  http-response-jq <regex> '<jq>'
  Loon:   response if ${url} ~= /<regex>/i then response.json.jq("<jq>")
两者都是对固定路径的 JSON 做 `.data |= map(select(.is_promoted == false ...))`。

Egern 不支持 http-response-jq，只能等价翻译成 http_response 脚本：
  · 路径白名单 = 上游那几条 regex（去掉尾部 \\? 以免漏匹配带查询串的请求）
  · 过滤动作   = 把 data 数组里 is_promoted 为 true 的条目剔除

本脚本拉上游 → 生成 pinterest.js / pinterest.yaml，内容没变就不落盘。
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
BREW = "rules/pinterest"

SOURCES = [
    ("surge", "https://raw.githubusercontent.com/axtyet/Luminous/main/Repcz/Surge/Module/Kelee/Pinterest_remove_ads.sgmodule"),
    ("surge", "https://raw.githubusercontent.com/ifflagged/Romeo/main/Modules/Surge/Kelee/Pinterest_remove_ads.sgmodule"),
    ("surge", "https://raw.githubusercontent.com/bunizao/Mirrored/main/Chores/sgmodule/Pinterest_remove_ads.sgmodule"),
    ("loon", "https://raw.githubusercontent.com/ifflagged/Romeo/main/Modules/Loon/Kelee/Pinterest_remove_ads.lpx"),
    ("loon", "https://raw.githubusercontent.com/fkingikelee/fkikelee/main/lpx/Pinterest_remove_ads.lpx"),
]

SURGE_JQ = re.compile(r"^http-response-jq\s+(\S+)\s+'([^']*)'\s*$")
LOON_JQ = re.compile(r"response\s+if\s+\$\{url\}\s*~=\s*/(.+?)/[a-z]*\s+then\s+response\.json\.jq\(\"([^\"]*)\"\)")
HOST_LINE = re.compile(r"^hostname\s*=\s*(.+)$")
DATE_LINE = re.compile(r"^#!date=", re.M)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "egern-modules-hub-sync"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def parse(text):
    """返回 (paths, jq_exprs, hosts, upstream_date)"""
    paths, jqs, hosts = [], [], []
    upstream_date = ""
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("#!date="):
            upstream_date = s.split("=", 1)[1].strip()
            continue
        m = SURGE_JQ.match(s)
        if m:
            paths.append(m.group(1))
            jqs.append(m.group(2))
            continue
        m = LOON_JQ.search(s)
        if m:
            paths.append(m.group(1))
            jqs.append(m.group(2))
            continue
        m = HOST_LINE.match(s)
        if m:
            for h in m.group(1).replace("%APPEND%", "").split(","):
                h = h.strip()
                if h and h not in hosts:
                    hosts.append(h)
    return paths, jqs, hosts, upstream_date


def norm_path(p):
    r"""把上游 regex 变成「只在 scheme 之后」的写法，供 yaml match 与脚本共用。

    上游例：^https:\/\/api\.pinterest\.com\/v\d\/feeds\/home\/\?
    归一化：去掉开头 ^、去掉 https?:\/\/、去掉尾部 \?（允许不带查询串）
    """
    p = p.strip()
    if p.startswith("^"):
        p = p[1:]
    p = p.replace("https:\\/\\/", "").replace("http:\\/\\/", "")
    if p.endswith("\\/\\?"):
        p = p[:-4] + "\\/"
    return p


def build_js(paths, jqs, hosts, upstream_date, src_url):
    path_list = ",\n  ".join(json.dumps(p) for p in paths)
    jq_note = "\n".join("//   " + j for j in jqs)
    return f"""// Pinterest 去广告（Egern http_response 脚本）—— 自动生成，请勿手改
//
// 生成者：.github/workflows/sync-pinterest.yml
// 上游：{src_url}
// 上游版本：{upstream_date or "unknown"}
//
// 上游的 jq 表达式（等价实现）：
{jq_note}
//
// 规则：只命中上游列出的这 {len(paths)} 条路径，其余一律不接手（连 body 都不读）。
// 动作：把 JSON 里 data 数组中的 is_promoted 条目剔除，结构不做任何改变。
// 任何异常 / 非 JSON / 没删东西 → 原样放行（fail open）。

var PATH_SOURCES = [
  {path_list}
];

var PATHS = PATH_SOURCES.map(function (src) {{ return new RegExp(src, 'i'); }});

var MITM_HOSTS = {json.dumps(hosts, ensure_ascii=False)};

function isObj(v) {{ return v && typeof v === 'object' && !Array.isArray(v); }}

function isPromoted(item) {{
  if (!isObj(item)) return false;
  if (item.is_promoted === true || item.is_promoted === 'true') return true;
  // 上游 jq 只认 .is_promoted，其余标记仅在上游确实用到时才需要扩展
  return false;
}}

var removed = 0;

function clean(node, depth) {{
  if (depth > 32) return node;
  if (Array.isArray(node)) {{
    var out = [];
    for (var i = 0; i < node.length; i++) {{
      var el = node[i];
      if (isPromoted(el)) {{ removed++; continue; }}
      out.push(clean(el, depth + 1));
    }}
    return out;
  }}
  if (isObj(node)) {{
    var keys = Object.keys(node);
    for (var k = 0; k < keys.length; k++) {{
      var key = keys[k];
      var v = node[key];
      // 只处理名为 data 的数组（上游就是 .data |= map(...)），别的一律不动
      if (key === 'data' && Array.isArray(v)) {{ node[key] = clean(v, depth + 1); continue; }}
      if (isObj(v)) clean(v, depth + 1);
    }}
  }}
  return node;
}}

function allowed(url) {{
  for (var i = 0; i < PATHS.length; i++) {{
    if (PATHS[i].test(url)) return true;
  }}
  return false;
}}

export default async function (ctx) {{
  try {{
    if (!ctx || !ctx.response) return;

    var url = '';
    try {{ url = String((ctx.request && (ctx.request.url || ctx.request.uri)) || ''); }} catch (e) {{}}
    if (!url) return;
    if (!allowed(url)) return; // 不在上游路径白名单里 → 不读 body、不改写

    var headers = ctx.response.headers;
    var ct = '';
    try {{
      if (headers && typeof headers.get === 'function') ct = headers.get('content-type') || '';
      else if (headers && headers['content-type']) ct = headers['content-type'];
    }} catch (e) {{}}
    if (ct && String(ct).toLowerCase().indexOf('json') === -1) return;

    var raw = await ctx.response.text();
    if (!raw || raw.length < 4) return;
    if (raw.indexOf('is_promoted') === -1) return; // 便宜的预判

    var obj;
    try {{ obj = JSON.parse(raw); }} catch (e) {{ return; }}

    removed = 0;
    obj = clean(obj, 0);
    if (removed === 0) return;

    var out = JSON.stringify(obj);
    if (out === raw) return;
    return {{ body: out }};
  }} catch (e) {{
    return; // fail open
  }}
}}
"""


def build_yaml(paths, hosts, upstream_date, src_url):
    alt = "|".join("(?:%s)" % p for p in paths)
    host_lines = "\n".join("    - %s" % h for h in hosts) or "    - api.pinterest.com"
    rule_hosts = "\n".join(
        "  - domain:\n      match: %s\n      policy: REJECT" % h
        for h in ["ads.pinterest.com", "ad.pinterest.com", "ct.pinterest.com", "trk.pinterest.com"]
    )
    return f"""name: Pinterest 去广告
description: 跟随上游可莉模块自动同步。只清 /v\\d/feeds/home/ 与 /v\\d/pins/<id>/related/modules/ 里的推广 Pin（is_promoted），其余路径不接手、不改写。图片 CDN 不动。
author: a13609y
homepage: https://github.com/a13609y/egern-modules-hub/tree/main/rules/pinterest
icon: https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/icon.png

# ---------------------------------------------------------------
# 本文件由 sync.py 自动生成（.github/workflows/sync-pinterest.yml 每天跑一次）。
# 上游：{src_url}
# 上游版本：{upstream_date or "unknown"}
# 路径白名单：
{chr(10).join("  #   " + p for p in paths)}
# ---------------------------------------------------------------

rules:
{rule_hosts}

mitm:
  hostnames:
{host_lines}

scriptings:
  - http_response:
      name: pinterest_remove_ads
      match: '^https?:\\/\\/({alt})'
      script_url: https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.js
      body_required: true
      max_size: 8388608
      timeout: 20
      update_interval: 86400

dns: {{}}
"""


def main():
    last_err = None
    for kind, url in SOURCES:
        try:
            text = fetch(url)
        except Exception as e:  # noqa: BLE001
            last_err = f"{url} → {e}"
            print(f"跳过 {url}: {e}", file=sys.stderr)
            continue
        paths, jqs, hosts, upstream_date = parse(text)
        paths = [norm_path(p) for p in paths]
        # 去重保序
        seen, uniq = set(), []
        for p in paths:
            if p not in seen:
                seen.add(p)
                uniq.append(p)
        paths = uniq
        if not paths:
            last_err = f"{url} 未解析出 http-response-jq 行"
            print(last_err, file=sys.stderr)
            continue

        js = build_js(paths, jqs, hosts or ["api.pinterest.com"], upstream_date, url)
        yml = build_yaml(paths, hosts or ["api.pinterest.com"], upstream_date, url)

        changed = False
        for name, content in (("pinterest.js", js), ("pinterest.yaml", yml)):
            p = HERE / name
            old = p.read_text(encoding="utf-8") if p.exists() else ""
            if old != content:
                p.write_text(content, encoding="utf-8")
                changed = True
                print(f"写入 {name} ({len(content)} bytes)")
        print(f"上游 {url}")
        print(f"路径 {len(paths)} 条：{paths}")
        print(f"MITM {hosts}")
        print("有变化" if changed else "内容一致，未改动")
        return 0

    print(f"所有上游都失败：{last_err}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
