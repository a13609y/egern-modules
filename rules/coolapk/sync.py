#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把上游的 Surge/Shadowrocket 酷安去广告模块转换成 Egern 模块（YAML + JS）。

upstream (alloflights/shadowrocket-rules)
  module : modules/coolapk.sgmodule
  script : modules/scripts/coolapk.js

output (this repo)
  rules/coolapk/coolapk.yaml   模块清单（规则 / URL 重写 / MITM / 脚本声明）
  rules/coolapk/coolapk.js     上游脚本 + Egern 兼容壳（请求/响应两种模式）

用法:
  python3 sync.py            # 拉上游 → 写文件（有变化才落盘）
  python3 sync.py --check    # 只检查（有更新 exit 1）
  python3 sync.py --dry-run  # 打印生成的 YAML，不落盘
"""
import argparse
import hashlib
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAW = "https://raw.githubusercontent.com/alloflights/shadowrocket-rules/main"
SG_URL = f"{RAW}/modules/coolapk.sgmodule"
JS_URL = f"{RAW}/modules/scripts/coolapk.js"
SELF_JS = "https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/coolapk/coolapk.js"
HERE = Path(__file__).resolve().parent


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "egern-modules-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    if r.status != 200 or not data:
        raise RuntimeError(f"fetch failed {r.status} {url}")
    return data.decode("utf-8")


def split_and_conditions(inner: str):
    """`((PROTOCOL,UDP),(DST-PORT,443),(DOMAIN,api.coolapk.com))` → [[...], ...]"""
    conds, depth, cur, in_cond = [], 0, "", False
    for ch in inner:
        if ch == "(":
            depth += 1
            if depth == 2:  # 进入一个子条件
                in_cond, cur = True, ""
            elif depth > 2:
                cur += ch
            continue
        if ch == ")":
            if depth == 2 and in_cond:  # 子条件结束
                conds.append([x.strip() for x in cur.split(",")])
                in_cond, cur = False, ""
            elif depth > 2:
                cur += ch
            depth -= 1
            continue
        if in_cond:
            cur += ch
    return conds


def cond_to_egern(cond):
    """Surge 单条件 → Egern 规则片段（dict），不支持的类型返回 None。"""
    if not cond:
        return None
    kind = cond[0].upper().replace("-", "_")
    val = ",".join(cond[1:]).strip()
    table = {
        "DOMAIN": "domain",
        "DOMAIN_SUFFIX": "domain_suffix",
        "DOMAIN_KEYWORD": "domain_keyword",
        "DOMAIN_REGEX": "domain_regex",
        "DOMAIN_WILDCARD": "domain_wildcard",
        "DEST_PORT": "dest_port",
        "DST_PORT": "dest_port",
        "PROTOCOL": "protocol",
        "URL_REGEX": "url_regex",
        "USER_AGENT": "user_agent",
    }
    key = table.get(kind)
    if not key:
        return None
    if key == "protocol":
        val = val.lower()
    return {key: {"match": val}}


def parse_sgmodule(text: str):
    meta, scripts, rewrites, rules, mitm = {}, [], [], [], []
    section = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].strip().lower()
            continue
        if line.startswith("#!"):
            k, _, v = line[2:].partition("=")
            meta[k.strip().lower()] = v.strip()
            continue
        if line.startswith("#"):
            continue

        if section == "script":
            left, sep, right = line.partition("=")
            if not sep:
                continue
            kv = dict(
                (m.group(1).lower(), m.group(2).strip())
                for m in re.finditer(r"(?:^|,\s*)([\w-]+)\s*=\s*(.*?)(?=,\s*[\w-]+\s*=|$)", right.strip())
            )
            stype = kv.get("type", "").lower()
            if stype not in ("http-request", "http-response"):
                continue
            scripts.append(
                {
                    "name": left.strip(),
                    "type": stype,
                    "pattern": kv.get("pattern", ""),
                    "body_required": kv.get("requires-body", "0") not in ("0", "false"),
                    "max_size": int(kv.get("max-size", "0") or 0),
                    "timeout": int(kv.get("timeout", "10") or 10),
                }
            )
        elif section == "url rewrite":
            # Shadowrocket 写法：`<pattern> - reject-dict`；Surge 写法：`<pattern> reject`
            parts = line.split()
            if len(parts) >= 2 and parts[-2] == "-":
                pattern, action = " ".join(parts[:-2]), parts[-1].strip()
            elif len(parts) >= 2:
                pattern, action = " ".join(parts[:-1]), parts[-1].strip()
            else:
                continue
            if action.startswith("reject"):
                target = {
                    "reject": "http://reject/",
                    "reject-200": "http://reject-200/",
                    "reject-dict": "http://reject-dict/",
                    "reject-array": "http://reject-array/",
                    "reject-img": "http://reject-img/",
                    "reject-video": "http://reject-video/",
                }.get(action)
                if target:
                    rewrites.append({"match": pattern, "location": target})
        elif section == "rule":
            parts = [p.strip() for p in line.split(",")]
            if len(parts) == 3 and parts[0].upper() == "DOMAIN" and parts[2].upper() == "REJECT":
                rules.append({"domain": {"match": parts[1]}, "policy": "REJECT"})
            elif parts[0].upper() == "AND":
                inner = line.split(",", 1)[1].rsplit(",", 1)[0]
                subs = [cond_to_egern(c) for c in split_and_conditions(inner)]
                if all(subs):
                    rules.append({"and": {"match": subs}, "policy": "REJECT"})
                else:
                    print(f"  ! 跳过不支持的 AND 规则: {line}", file=sys.stderr)
        elif section == "mitm":
            k, sep, v = line.partition("=")
            if sep and k.strip().lower() == "hostname":
                v = re.sub(r"%APPEND%", "", v, flags=re.I)
                mitm += [h.strip() for h in v.split(",") if h.strip()]

    return meta, scripts, rewrites, rules, mitm


def norm_pattern(p: str) -> str:
    p = p.replace("(?>", "(?:")  # 原子组 JS 不支持
    return p


def yaml_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def build_js(upstream_js: str, sha: str, synced: str, version: str) -> str:
    body = "\n".join("      " + l if l.strip() else "" for l in upstream_js.splitlines())
    return f"""// ⚠️ 本文件由 rules/coolapk/sync.py 自动生成，请勿手动修改。
// 上游脚本 : {JS_URL}  ({version})
// 上游 hash : {sha}
// 生成时间 : {synced}
//
// 上游是 Surge / Shadowrocket 写法（$request / $response / $done），这里套一层 Egern 兼容壳，
// 同一个文件被 http_request 和 http_response 两条声明共用：
//   · 有 ctx.response → 响应模式，读出响应体交给上游的 $response.body
//   · 没有 ctx.response → 请求模式，把 headers 转成普通对象交给上游改
//   · 上游调用 $done(x) 时抛哨兵异常中止，模拟 Surge 的「立即结束」
//   · 上游抛错 / 没调用 $done → 原样放行（fail open，绝不弄坏酷安）
export default async function (ctx) {{
  const isResponse = !!ctx.response;

  const plainHeaders = (h) => {{
    const o = {{}};
    if (!h) return o;
    if (typeof h.forEach === 'function') {{
      h.forEach((v, k) => {{ o[k] = v; }});
    }} else if (typeof h === 'object') {{
      Object.keys(h).forEach((k) => {{ o[k] = h[k]; }});
    }}
    return o;
  }};

  const $request = {{
    url: ctx.request ? ctx.request.url : '',
    method: ctx.request ? ctx.request.method : 'GET',
    headers: plainHeaders(ctx.request ? ctx.request.headers : null),
  }};

  let raw = null;
  let $response;
  if (isResponse) {{
    try {{
      raw = await ctx.response.text();
    }} catch (e) {{
      return;
    }}
    if (!raw) return;
    $response = {{
      status: ctx.response.status,
      headers: plainHeaders(ctx.response.headers),
      body: raw,
    }};
  }}

  // 上游普遍写成 try {{ ... $done(...) }} catch (e) {{ $done({{}}) }}，
  // 所以哨兵异常会被上游自己的 catch 吞掉再补一次 $done({{}})。
  // 对策：$done 只认第一次调用（先到先得），后续调用只抛哨兵、不改写结果。
  const DONE = {{ sentinel: true }};
  let result = null;
  let finished = false;
  const $done = (v) => {{
    if (!finished) {{
      finished = true;
      result = v || {{}};
    }}
    throw DONE;
  }};

  try {{
    (function () {{
      // ===================== 上游脚本开始 =====================
{body}
      // ===================== 上游脚本结束 =====================
    }})();
  }} catch (e) {{
    if (e !== DONE) return; // 上游真实异常 → 不接管，原样返回
  }}

  if (!result) return;

  if (isResponse) {{
    if (typeof result.body !== 'string') return;
    if (result.body === raw) return;
    return {{ body: result.body }};
  }}

  // 请求模式：上游只改 headers
  if (result.headers && typeof result.headers === 'object') {{
    return {{ headers: result.headers }};
  }}
  return;
}}
"""


def build_yaml(meta, scripts, rewrites, rules, mitm, sha, synced) -> str:
    name = meta.get("name") or "酷安去广告"
    desc = meta.get("desc") or "酷安去广告"
    lines = [
        f"name: {name}",
        f"description: {desc}",
        "author: a13609y",
        "homepage: https://github.com/a13609y/egern-modules/tree/main/rules/coolapk",
        "icon: https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Icon/App/coolapk.png",
        "",
        "# ⚠️ 本文件由 rules/coolapk/sync.py 自动生成，请勿手动修改。",
        f"# 上游模块 : {SG_URL}",
        f"# 上游脚本 : {JS_URL}",
        f"# 上游 hash : {sha}",
        f"# 生成时间 : {synced}",
        "",
    ]
    if rules:
        lines.append("# 阻断 QUIC（UDP 443）与广告域名，否则酷安走 HTTP/3 时 MITM 抓不到，脚本永远不跑")
        lines.append("rules:")
        for r in rules:
            if "and" in r:
                lines.append("  - and:")
                lines.append("      match:")
                for sub in r["and"]["match"]:
                    ((k, v),) = sub.items()
                    lines.append(f"        - {k}:")
                    lines.append(f"            match: {yaml_str(v['match'])}")
            else:
                ((k, v),) = [(k, v) for k, v in r.items() if k != "policy"]
                lines.append(f"  - {k}:")
                lines.append(f"      match: {v['match']}")
            lines.append("      policy: REJECT")
        lines.append("")
    if mitm:
        lines.append("mitm:")
        lines.append("  hostnames:")
        lines += [f"    - {h}" for h in mitm]
        lines.append("")
    if rewrites:
        lines.append("url_rewrites:")
        for r in rewrites:
            lines.append(f"  - match: {yaml_str(norm_pattern(r['match']))}")
            lines.append(f"    location: {r['location']}")
        lines.append("")
    lines.append("scriptings:")
    for s in scripts:
        key = "http_request" if s["type"] == "http-request" else "http_response"
        lines += [
            f"  - {key}:",
            f"      name: {s['name']}",
            f"      match: {yaml_str(norm_pattern(s['pattern']))}",
            f"      script_url: {SELF_JS}",
            f"      body_required: {'true' if s['body_required'] else 'false'}",
        ]
        if s["body_required"]:
            # 上游 max-size 是硬上限；给一点余量，避免信息流大响应被跳过
            lines.append(f"      max_size: {max(s['max_size'], 1048576)}")
        lines.append(f"      timeout: {max(s['timeout'], 10)}")
        lines.append("      update_interval: 86400")
    lines.append("")
    lines.append("dns: {}")
    lines.append("")
    return "\n".join(lines)


def strip_stamp(s: str) -> str:
    return re.sub(r"^(// 生成时间|# 生成时间) : .*$", "", s, flags=re.M)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="有更新则 exit 1")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sg = fetch(SG_URL)
    js = fetch(JS_URL)
    if "jsjiami" in js or "_0x4d5bbc" in js:
        print("✗ 上游脚本被混淆了，拒绝生成（无法审阅）", file=sys.stderr)
        return 2

    meta, scripts, rewrites, rules, mitm = parse_sgmodule(sg)
    if not scripts:
        print("✗ 没解析到任何脚本，上游格式可能变了", file=sys.stderr)
        return 2

    version = ""
    m = re.search(r"#\s*(v[\d.]+)", sg)
    if m:
        version = m.group(1)
    sha = hashlib.sha256(js.encode()).hexdigest()[:12]
    synced = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    yaml_out = build_yaml(meta, scripts, rewrites, rules, mitm, sha, synced)
    js_out = build_js(js, sha, synced, version)

    yaml_path, js_path = HERE / "coolapk.yaml", HERE / "coolapk.js"
    changed = []
    for p, content in ((yaml_path, yaml_out), (js_path, js_out)):
        old = p.read_text(encoding="utf-8") if p.exists() else ""
        if strip_stamp(old) != strip_stamp(content):
            changed.append(p.name)
            if not args.dry_run and not args.check:
                p.write_text(content, encoding="utf-8")

    print(
        f"上游 {version or '?'} hash={sha}  脚本 {len(scripts)} 条  "
        f"重写 {len(rewrites)} 条  规则 {len(rules)} 条  MITM {mitm}"
    )
    if args.dry_run:
        print(yaml_out)
    if changed:
        print("有更新: " + ", ".join(changed))
        return 1 if args.check else 0
    print("已是最新")
    return 0


if __name__ == "__main__":
    sys.exit(main())
