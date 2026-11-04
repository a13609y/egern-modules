#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把上游的 Surge 酷安去广告模块转换成 Egern 模块（YAML + JS）。

upstream (Surge)
  module : Rule/Surge/Adblock/App/K/酷安/coolapk.sgmodule
  script : Res/Scripts/AntiAd/coolapk.js

output (this repo)
  rules/coolapk/coolapk.yaml   模块清单
  rules/coolapk/coolapk.js     上游脚本 + Egern 兼容壳

用法:
  python3 sync.py            # 拉上游 → 写文件
  python3 sync.py --check    # 只检查是否有更新（有更新 exit 1，供 CI 用）
  python3 sync.py --dry-run  # 打印将要生成的内容，不落盘
"""
import argparse
import hashlib
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SG_URL = "https://raw.githubusercontent.com/zirawell/R-Store/main/Rule/Surge/Adblock/App/K/%E9%85%B7%E5%AE%89/coolapk.sgmodule"
JS_URL = "https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/coolapk.js"
SELF_JS = "https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/coolapk/coolapk.js"
HERE = Path(__file__).resolve().parent


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "egern-modules-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    if r.status != 200 or not data:
        raise RuntimeError(f"fetch failed {r.status} {url}")
    return data.decode("utf-8")


def parse_sgmodule(text: str):
    """返回 (meta, scripts, rejects, mitm) 。

    scripts: [{'name','pattern','body','timeout','max_size'}]
    rejects: [pattern]  (Map Local 里返回 {} 的条目)
    """
    meta, scripts, rejects, mitm = {}, [], [], []
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
        # Surge 里以 ; 开头的 Map Local 条目是「作者禁用的规则」，照抄不启用
        disabled = line.startswith(";")
        if disabled:
            line = line[1:].strip()

        if section == "script":
            left, sep, right = line.partition("=")
            if not sep:
                continue
            kv = dict(
                (m.group(1).lower(), m.group(2).strip())
                for m in re.finditer(r"(?:^|,\s*)([\w-]+)\s*=\s*(.*?)(?=,\s*[\w-]+\s*=|$)", right.strip())
            )
            if kv.get("type", "").lower() != "http-response":
                continue
            if disabled:
                continue
            scripts.append(
                {
                    "name": left.strip(),
                    "pattern": kv.get("pattern", ""),
                    "body_required": kv.get("requires-body", "1") not in ("0", "false"),
                    "max_size": int(kv.get("max-size", "0") or 0),
                    "timeout": int(kv.get("timeout", "30") or 30),
                }
            )
        elif section == "map local":
            if disabled:
                continue
            pattern = line.split()[0]
            if 'data="{}"' in line or "reject-dict" in line:
                rejects.append(pattern)
        elif section == "mitm":
            k, sep, v = line.partition("=")
            if sep and k.strip().lower() == "hostname":
                v = re.sub(r"%APPEND%", "", v, flags=re.I)
                mitm += [h.strip() for h in v.split(",") if h.strip()]

    return meta, scripts, rejects, mitm


def norm_pattern(p: str) -> str:
    """Surge/QuanX 正则 → JS 正则。"""
    p = p.replace("(?>", "(?:")          # 原子组 JS 不支持
    p = re.sub(r"\\/", "/", p)           # 多余转义的斜杠
    return p


def yaml_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def build_js(upstream_js: str, sha: str, synced: str) -> str:
    body = "\n".join("      " + l if l.strip() else "" for l in upstream_js.splitlines())
    return f"""// ⚠️ 本文件由 rules/coolapk/sync.py 自动生成，请勿手动修改。
// 上游脚本 : {JS_URL}
// 上游 hash : {sha}
// 生成时间 : {synced}
//
// 上游是 Surge 写法（$request / $response / $done），这里套一层 Egern http-response 兼容壳：
//   · ctx.response.text() 读出原始响应体 → $response.body
//   · 上游调用 $done(obj) 时抛哨兵异常来中止，模拟 Surge 的「立即结束」
//   · 上游抛错 / 没调用 $done → 原样放行（fail open，绝不弄坏酷安）
export default async function (ctx) {{
  const response = ctx.response;
  if (!response) return;

  let raw;
  try {{
    raw = await response.text();
  }} catch (e) {{
    return;
  }}
  if (!raw) return;

  const DONE = Symbol('surge-done');
  const $request = {{
    url: ctx.request ? ctx.request.url : '',
    method: ctx.request ? ctx.request.method : 'GET',
    headers: ctx.request ? ctx.request.headers : {{}},
  }};
  const $response = {{ status: response.status, headers: response.headers, body: raw }};
  let result = null;

  const $done = (v) => {{
    const e = new Error('surge-done');
    e[DONE] = true;
    e.value = v || {{}};
    throw e;
  }};

  try {{
    (function () {{
      // ===================== 上游脚本开始 =====================
{body}
      // ===================== 上游脚本结束 =====================
    }})();
  }} catch (e) {{
    if (e && e[DONE]) {{
      result = e.value;
    }} else {{
      return; // 上游异常 → 不接管，原样返回
    }}
  }}

  if (!result || typeof result.body !== 'string') return;
  if (result.body === raw) return;
  return {{ body: result.body }};
}}
"""


def build_yaml(meta, scripts, rejects, mitm, sha, synced) -> str:
    name = meta.get("name") or "酷安去广告"
    desc = "去除酷安开屏 / 首页信息流 / 评论 / 商品推广等广告（规则与脚本自动跟随上游 zirawell/R-Store）"
    lines = [
        f"name: {name}",
        f"description: {desc}",
        "author: a13609y",
        "homepage: https://github.com/a13609y/egern-modules/tree/main/rules/coolapk",
        f"icon: {(meta.get('icon') or 'https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Icon/App/coolapk.png').strip()}",
        "",
        "# ⚠️ 本文件由 rules/coolapk/sync.py 自动生成，请勿手动修改。",
        f"# 上游模块 : {SG_URL}",
        f"# 上游脚本 : {JS_URL}",
        f"# 上游 hash : {sha}",
        f"# 生成时间 : {synced}",
        "",
    ]
    if mitm:
        lines.append("mitm:")
        lines.append("  hostnames:")
        lines += [f"    - {h}" for h in mitm]
        lines.append("")
    if rejects:
        lines.append("url_rewrites:")
        for p in rejects:
            lines.append(f"  - match: {yaml_str(norm_pattern(p))}")
            lines.append("    location: http://reject-dict/")
        lines.append("")
    lines.append("scriptings:")
    for i, s in enumerate(scripts, 1):
        lines += [
            "  - http_response:",
            f"      name: coolapk-{i}",
            f"      match: {yaml_str(norm_pattern(s['pattern']))}",
            f"      script_url: {SELF_JS}",
            f"      body_required: {'true' if s['body_required'] else 'false'}",
            # 上游写 max-size=0（不限），Egern 需要具体值，给 8MB
            f"      max_size: {s['max_size'] or 8388608}",
            f"      timeout: {max(s['timeout'], 10)}",
            "      update_interval: 86400",
        ]
    lines.append("")
    lines.append("dns: {}")
    lines.append("")
    return "\n".join(lines)


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

    meta, scripts, rejects, mitm = parse_sgmodule(sg)
    if not scripts:
        print("✗ 没解析到任何 http-response 脚本，上游格式可能变了", file=sys.stderr)
        return 2

    sha = hashlib.sha256(js.encode()).hexdigest()[:12]
    synced = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    yaml_out = build_yaml(meta, scripts, rejects, mitm, sha, synced)
    js_out = build_js(js, sha, synced)

    yaml_path = HERE / "coolapk.yaml"
    js_path = HERE / "coolapk.js"

    changed = []
    for p, content in ((yaml_path, yaml_out), (js_path, js_out)):
        old = p.read_text(encoding="utf-8") if p.exists() else ""
        # 只有内容真变了才写盘（忽略生成时间行，避免每次同步都产生空提交）
        if strip_stamp(old) != strip_stamp(content):
            changed.append(p.name)
            if not args.dry_run and not args.check:
                p.write_text(content, encoding="utf-8")

    print(f"上游脚本 hash={sha}  脚本 {len(scripts)} 条  拦截 {len(rejects)} 条  MITM {mitm}")
    if args.dry_run:
        print(yaml_out)
    if changed:
        print("有更新: " + ", ".join(changed))
        return 1 if args.check else 0
    print("已是最新")
    return 0


def strip_stamp(s: str) -> str:
    return re.sub(r"^(// 生成时间|# 生成时间) : .*$", "", s, flags=re.M)


if __name__ == "__main__":
    sys.exit(main())
