#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""番茄小说去广告（增强版）—— 跟随上游自动重生成。

上游来源（全部可机读、每天都在更新）
  1. abclq/home-dns-adblock   dist/clash-surge-rules.txt（真机 DNS 日志验证的精确规则）
                             config/adblock-fq.conf（带白名单注释的手工版本）
  2. bluee1111/egern-hongguo-adblock   hongguo-adblock.yaml（红果/番茄原生 Egern，穿山甲）
  3. fmz200/wool_scripts      Surge/module/split/partF/FanQieNovel.sgmodule
  4. honue/rules              Loon/plugin/FanQieNovel.plugin

策略
  · 上游给的是「域名」，本地只做过滤：只保留字节/番茄系、且是具体子域（>=3 段）的条目。
  · 有两条硬黑名单：NEVER（拦了必出事，永久丢弃）、DISABLED（留下但默认关闭）。
  · 广告家族类（ads* / minigame* / tnc* / reading-ad / ad-sign）额外生成正则，
    上游没写到的子域也能被覆盖——这是「跟随上游」之外的第二层保险。
  · 输出保持确定性（排序、无时间戳），内容不变时工作流不会产生空提交。

用法:
  python3 sync.py             # 拉上游 → 写 fanqie-adblock.yaml
  python3 sync.py --check     # 只检查是否有变化（有变化 exit 1）
  python3 sync.py --dry-run   # 打印生成的 YAML，不落盘
"""
import argparse
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "fanqie-adblock.yaml"

SOURCES = [
    ("abclq/clash-surge",
     "https://raw.githubusercontent.com/abclq/home-dns-adblock/main/dist/clash-surge-rules.txt"),
    ("abclq/fq-conf",
     "https://raw.githubusercontent.com/abclq/home-dns-adblock/main/config/adblock-fq.conf"),
    ("bluee1111/hongguo",
     "https://raw.githubusercontent.com/bluee1111/egern-hongguo-adblock/main/hongguo-adblock.yaml"),
    ("fmz200/sgmodule",
     "https://raw.githubusercontent.com/fmz200/wool_scripts/main/Surge/module/split/partF/FanQieNovel.sgmodule"),
    ("honue/loon",
     "https://raw.githubusercontent.com/honue/rules/master/Loon/plugin/FanQieNovel.plugin"),
]

# ── 只保留字节 / 番茄相关的域名 ────────────────────────────────
RELEVANT = re.compile(
    r"(zijieapi|snssdk|fqnovel|qznovelvod|byteimg|pstatp|bytedance|toutiao|douyin|"
    r"ixigua|pangle|pangolin|ugsdk|bdurl|awemeughun|ksyuncdn|chengzijianzhan|"
    r"wmzfylgdsz|ecombd|byted\.org|byteoversea)", re.I)

# ── 拦了必出事：永久丢弃（哪怕上游加了也不跟）────────────────
NEVER = (
    "novel-sign",        # 正片签名 CDN，和 -ad-sign 一字之差
    "reading-video",     # 正片视频
    "sinf",              # 反作弊风控（sinfonline / sinfnormal）
    "gecko",             # H5 离线包
    "webcast",           # 直播（图/流都可能误伤）
    "douyincdn",         # 短剧/正片流
    "douyinliving",
    "fqnovelpic",        # 小说图床
    "douyinpic",
    "volcengineapi",     # 火山引擎主域
    "ixigua",            # 西瓜，正片域
    "ecombdimg",
    "ecombdapi",
    "dsa.cdnbuild",      # 实为 CNAME 真身，上游若给裸域会误伤
)

# ── 归因/上报类：保留但默认关闭 ───────────────────────────────
RISKY = (
    "is.snssdk.com", "i.snssdk.com", "i-lq.snssdk.com", "mcs.snssdk.com",
    "security-lq.snssdk.com", "vas-lf-x.snssdk.com", "applog", "-misc-",
    "-lq.snssdk.com", "-lf.snssdk.com", "tnc3-bjlgy",
)

# ── 必须是具体子域（>=3 段），否则丢弃（裸域一律不拦）──────────
MIN_LABELS = 3

# ── 手工钉住的条目（上游没有、或必须保底）──────────────────────
PINNED = [
    "ad.toutiao.com",
    "activity-ag.awemeughun.com",
    "dig.bdurl.net",
    "l2-toutiao-quic-ipv6-ml.gslb.ksyuncdn.com",
    "sf3-ttcdn-tos.pstatp.com",
    "wmzfylgdsz.com",
    "www.chengzijianzhan.com",
    "praisewindow.ugsdk.cn",
    "praisewindow-sinfonlinea.ugsdk.cn",
    "zlink.ugsdk.cn",
    "msync-im1-vip6-std.easemob.com",
    "apd-pcdnwxlogin.teg.tencent-cloud.net",
    "api.iegadp.qq.com",
    "pangolin-sdk-toutiao.com",
    "pangolin-sdk-toutiao1.com",
    "pglstatp-toutiao.com",
    "pangle.io",
]

# ── 家族正则（额外覆盖上游还没抓到的子域）────────────────────
FAMILIES = [
    ("广告计费接口 ads*-normal", r"^ads[0-9]*-normal(?:-[a-z0-9]+)?\.zijieapi\.com$"),
    ("小游戏广告位", r"^minigame[0-9]*-normal(?:-[a-z0-9]+)?\.zijieapi\.com$"),
    ("广告位调度 TNC", r"^tnc[0-9]+-(?:aliec[0-9]+|alisc[0-9]+)\.zijieapi\.com$"),
    ("广告图片签名", r"^p[0-9]+-ad-sign\.byteimg\.com$"),
    ("章末/前贴片广告视频（正片是 reading-video，不动）",
     r"^v[0-9]+-(?:(?:bd|se|se-sjy)-daily-)?reading-ad\.qznovelvod\.com$"),
]

ONLY_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", re.I)
DOMAIN_TOKEN = re.compile(
    r"(?:address=/|\bDOMAIN-SUFFIX,|\bDOMAIN,|DOMAIN-SUFFIX:\s*match:\s*[\"']?|"
    r"domain:\s*match:\s*[\"']?|domain_suffix:\s*match:\s*[\"']?)"
    r"([a-z0-9][a-z0-9.\-]*\.[a-z]{2,})", re.I)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "egern-modules-sync/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        if r.status != 200:
            raise RuntimeError(f"fetch {r.status} {url}")
        return r.read().decode("utf-8", "replace")


def labels(d: str) -> int:
    return d.count(".") + 1


def accept(d: str) -> str | None:
    """返回 'active' / 'risky' / None（丢弃）。"""
    d = d.strip().strip("*.").strip(".").lower()
    if not d or not ONLY_RE.match(d):
        return None
    if any(x in d for x in NEVER):
        return "never"
    if any(d == x or d.endswith("." + x) for x in RISKY):
        return "risky"
    if any(x in d for x in RISKY):
        return "risky"
    if re.match(r"^tnc[0-9]+-[a-z0-9]+\.snssdk\.com$", d):
        return "risky"
    if labels(d) < MIN_LABELS:
        return None
    if not RELEVANT.search(d):
        return None
    return "active"


def collect():
    active, risky, report = set(), set(), []
    for name, url in SOURCES:
        try:
            text = fetch(url)
        except Exception as exc:  # 单个上游挂了不影响整体
            report.append(f"{name}: FAILED ({exc})")
            continue
        found = set()
        for m in DOMAIN_TOKEN.finditer(text):
            verdict = accept(m.group(1))
            if verdict == "active":
                found.add(m.group(1).lower())
            elif verdict == "risky":
                risky.add(m.group(1).lower())
        active |= found
        report.append(f"{name}: {len(found)} 条")
    for d in PINNED:  # 手工钉住的允许 2 段域名（pangle.io 之类）
        d = d.lower()
        if ONLY_RE.match(d) and not any(x in d for x in NEVER):
            active.add(d)
    active -= {d for d in active if any(x in d for x in NEVER)}
    return sorted(active), sorted(risky - active), report


def yaml_quote(s: str) -> str:
    return '"' + s.replace('"', '\\"') + '"'


def sq(s: str) -> str:
    """单引号标量：正则里的反斜杠不用二次转义。"""
    return "'" + s.replace("'", "''") + "'"


def build(active, risky, report) -> str:
    L = []
    A = L.append
    A("name: 番茄小说去广告（增强版）")
    A("description: >-")
    A("  精确拦截番茄/红果/字节系广告：广告计费接口、穿山甲 SDK、广告素材签名、章末广告视频。")
    A("  域名表由 rules/fanqie-adblock/sync.py 每天从上游聚合，正片/图床/风控域名有硬黑名单保护。")
    A("author: a13609y")
    A("homepage: https://github.com/a13609y/egern-modules/tree/main/rules/fanqie-adblock")
    A("")
    A("# 本文件由 sync.py 自动生成，请勿手改（改了下次同步会被覆盖）。")
    A(f"# 激活规则 {len(FAMILIES) + len(active)} 条；备用（默认关闭）{len(risky)} 条")
    A("# 上游：" + "、".join(s[0] for s in SOURCES))
    A("")
    A("# 用法：导入后彻底退出番茄小说 → 清一次缓存 → 重开。")
    A("# 已缓存到本地的广告会再播几次才消失，不是规则失效。")
    A("")
    A("rules:")
    A("  # ── 1. 广告家族正则（覆盖上游还没抓到的子域）")
    for title, rx in FAMILIES:
        A("  - domain_regex:")
        A(f"      match: {sq(rx)}")
        A("      policy: REJECT")
        A(f"      name: {yaml_quote(title)}")
    A("")
    A("  # ── 2. 上游聚合的精确广告域名")
    for d in active:
        A("  - domain_suffix:")
        A(f"      match: {yaml_quote(d)}")
        A("      policy: REJECT")
    A("")
    if risky:
        A("  # ── 3. 归因/上报（默认关闭；想再少几秒开屏就打开，出问题关回去）")
        for d in risky:
            A("  - domain_suffix:")
            A(f"      match: {yaml_quote(d)}")
            A("      policy: REJECT")
            A("      disabled: true")
        A("")
    A("url_rewrites:")
    A("  # 穿山甲广告接口直接返回空 JSON：SDK 立刻进入「无广告」分支。")
    A("  # 比单纯 REJECT（断连 → SDK 换线路重试）更稳。")
    A("  - match: " + sq(r"^https?://[^/]*\.pangolin-sdk-toutiao(?:1)?\.com/api/ad/union/sdk/(?:get_ads|stats|settings)/"))
    A('    location: "http://reject-dict/"')
    A("  - match: " + sq(r"^https?://[^/]*\.pglstatp-toutiao\.com/.+/toutiao\.mp4"))
    A('    location: "http://reject-video/"')
    A("  - match: " + sq(r"^https?://[^/]*\.pglstatp-toutiao\.com/(?:obj|img)/(?:ad-app-package|ad|ad-pattern)/"))
    A('    location: "http://reject-video/"')
    A("")
    A("# 只有上面的 url_rewrites 需要 MITM；域名规则不装证书也生效。")
    A("mitm:")
    A("  hostnames:")
    A("    includes:")
    for h in ("*.pangolin-sdk-toutiao.com", "*.pangolin-sdk-toutiao1.com",
              "*.pglstatp-toutiao.com"):
        A(f'      - "{h}"')
    A("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    active, risky, report = collect()
    for line in report:
        print("  " + line)
    if not active:
        print("ERROR: 上游一条都没解析到，拒绝生成（防止把模块刷成空壳）")
        return 2
    if len(active) < 15:
        print(f"WARN: 只聚合到 {len(active)} 条，明显偏少，仍然生成但请人工看一眼")

    text = build(active, risky, report)
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if a.dry_run:
        print(text)
        return 0
    if text == old:
        print("无变化")
        return 0
    if a.check:
        print("有变化")
        return 1
    OUT.write_text(text, encoding="utf-8")
    print(f"已写入 {OUT.name}：激活 {len(FAMILIES) + len(active)} 条，备用 {len(risky)} 条")
    return 0


if __name__ == "__main__":
    sys.exit(main())
