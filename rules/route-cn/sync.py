#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""中国域名清单（Egern 规则集）—— 跟随上游自动生成。

思路
  把「所有中国域名」整理成一份 domain_suffix_set 规则集，
  分流的最终形态是：命中清单 → DIRECT；geoip CN → DIRECT；其余 → 代理。
  也就是「除了中国以外全部走代理」。

上游（全部是纯文本/YAML，走 raw.githubusercontent，不用 API，不消耗额度）
  1. blackmatrix7/ios_rule_script   ChinaMax_Domain.yaml   （约 11 万条，最全）
  2. Loyalsoldier/clash-rules       direct.txt             （约 11 万条）
  3. felixonmars/dnsmasq-china-list accelerated-domains.china.conf

处理
  · 归一化：小写、去掉 '+.' / '*.' / '.' 前缀、校验字符合法性
  · 合并去重
  · 去掉被父后缀覆盖的子域（a.b.example.com 在 example.com 已存在时丢弃），
    这一步通常能砍掉 40% 以上体积，且匹配语义完全不变
  · 输出 domain_suffix_set，按字母序，确定性输出（内容不变则不产生提交）

用法
  python3 sync.py             # 生成 cn-domains.yaml
  python3 sync.py --check     # 有变化 exit 1
  python3 sync.py --dry-run   # 只打印统计
"""
import argparse
import gzip
import io
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "cn-domains.yaml"

SOURCES = [
    ("blackmatrix7/ChinaMax",
     "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/ChinaMax/ChinaMax_Domain.yaml"),
    ("Loyalsoldier/direct",
     "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt"),
    ("felixonmars/china-list",
     "https://raw.githubusercontent.com/felixonmars/dnsmasq-china-list/master/accelerated-domains.china.conf"),
]

# 单个标签的字符合法性（IDN 已由上游转成 punycode）
LABEL = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")

# 绝不写进清单的东西：公共顶级域、单段域名、明显不是中国域的
DENY_EXACT = {"com", "net", "org", "io", "cn.com", "gov", "edu"}
DENY_SUBSTR = ("google.com", "youtube.com", "facebook.com", "twitter.com",
               "github.com", "wikipedia.org", "cloudflare", "amazonaws",
               "openai.com", "anthropic")

# 保底加入（上游偶尔会漏，这些是国内高频核心域）
PINNED = [
    "qq.com", "tencent.com", "weixin.qq.com", "wechat.com", "baidu.com", "bdstatic.com",
    "aliyun.com", "taobao.com", "tmall.com", "alipay.com", "alicdn.com", "aliyuncs.com",
    "jd.com", "bilibili.com", "hdslb.com", "weibo.com", "weibo.cn", "zhihu.com",
    "163.com", "126.com", "netease.com", "douyin.com", "toutiao.com", "bytedance.com",
    "xiaomi.com", "mi.com", "meituan.com", "dianping.com", "ctrip.com", "qunar.com",
    "iqiyi.com", "youku.com", "kuaishou.com", "pinduoduo.com", "yangkeduo.com",
    "csdn.net", "cnblogs.com", "gitee.com", "oschina.net", "51cto.com",
    "huawei.com", "hicloud.com", "oppo.com", "vivo.com", "honor.com",
    "chinanews.com", "xinhuanet.com", "people.com.cn", "cctv.com", "sina.com.cn",
    "sohu.com", "ifeng.com", "caixin.com", "36kr.com", "hupu.com", "douban.com",
    "dingtalk.com", "feishu.cn", "larkoffice.com", "wps.cn", "kdocs.cn",
    "fqnovel.com", "qidian.com", "hongxiu.com", "jjwxc.net", "zongheng.com",
]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "egern-rules-sync/1.0 (+https://github.com/a13609y/egern-modules)",
        "Accept-Encoding": "gzip",
    })
    with urllib.request.urlopen(req, timeout=45) as r:
        if r.status != 200:
            raise RuntimeError(f"{r.status} {url}")
        data = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
    return data.decode("utf-8", "replace")


def norm(raw: str) -> str | None:
    d = raw.strip().lower()
    for p in ("+.", "*.", ".", "-"):
        if d.startswith(p):
            d = d[len(p):]
    d = d.rstrip(".").strip("'\"")
    if not d or d.count(".") < 1 or len(d) > 253:
        return None
    if d in DENY_EXACT:
        return None
    for lbl in d.split("."):
        if not LABEL.match(lbl):
            return None
    if any(x in d for x in DENY_SUBSTR):
        return None
    return d


def parse_clash_yaml(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("payload"):
            continue
        m = re.match(r"^-\s*['\"]?(.+?)['\"]?\s*$", line)
        if m:
            out.append(m.group(1))
    return out


def parse_plain_list(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("payload"):
            continue
        m = re.match(r"^-\s*['\"]?(.+?)['\"]?\s*$", line) or re.match(r"^(.+?)$", line)
        if m:
            out.append(m.group(1))
    return out


def parse_dnsmasq(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^server=/[^/]+/([^/]+)$", line)
        if m:
            for d in m.group(1).split(","):
                out.append(d)
    return out


PARSERS = {
    "blackmatrix7/ChinaMax": parse_clash_yaml,
    "Loyalsoldier/direct": parse_plain_list,
    "felixonmars/china-list": parse_dnsmasq,
}


def prune_subsumed(items: list[str]) -> list[str]:
    """去掉被父后缀覆盖的子域：a.b.com 在 b.com 已存在时丢弃。"""
    items = sorted(items, key=lambda x: (x.count("."), len(x), x))
    kept, kept_set = [], set()
    for d in items:
        parts = d.split(".")
        covered = False
        for i in range(1, len(parts) - 1):   # 逐级父后缀，不含裸 TLD
            if ".".join(parts[i:]) in kept_set:
                covered = True
                break
        if covered:
            continue
        kept.append(d)
        kept_set.add(d)
    return sorted(kept)


def collect():
    domains, report = [], []
    for name, url in SOURCES:
        try:
            text = fetch(url)
        except Exception as exc:
            report.append(f"{name}: 失败（{exc}）")
            continue
        parser = PARSERS[name]
        raw = [d for d in (norm(x) for x in parser(text)) if d]
        domains.extend(raw)
        report.append(f"{name}: {len(raw)} 条")
    domains.extend(PINNED)
    uniq = sorted(set(domains))
    kept = prune_subsumed(uniq)
    report.append(f"合并去重 {len(uniq)} → 去子域冗余 {len(kept)}")
    return kept, report


def build(items: list[str]) -> str:
    L = []
    A = L.append
    A("# 中国域名清单（Egern rule_set）")
    A("# 自动生成，请勿手改。生成器：rules/route-cn/sync.py")
    A("# 上游：blackmatrix7/ChinaMax · Loyalsoldier/clash-rules · felixonmars/dnsmasq-china-list")
    A(f"# 条目：{len(items)}")
    A("")
    A("domain_suffix_set:")
    for d in items:
        A(f"  - {d}")
    A("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    items, report = collect()
    for line in report:
        print("  " + line)
    if len(items) < 20000:
        print(f"ERROR: 只聚合到 {len(items)} 条，明显异常，拒绝写入")
        return 2

    text = build(items)
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if a.dry_run:
        print(f"体积约 {len(text)/1024:.0f} KB，前 5 条：{items[:5]}")
        return 0
    if text == old:
        print("无变化")
        return 0
    if a.check:
        print("有变化")
        return 1
    OUT.write_text(text, encoding="utf-8")
    print(f"已写入 {OUT.name}：{len(items)} 条，{len(text)/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
