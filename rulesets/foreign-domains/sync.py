#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""国外域名规则集（Egern rule_set）—— 跟随上游自动生成。

上游（每天 4 次请求，全部走 raw / codeload，不碰 GitHub API）
  1. v2fly/domain-list-community   geolocation-!cn（"在中国大陆没有接入点的域名"）
     用 codeload 的 tar 包一次拿全仓 1555 个 data 文件（344 KB），本地递归解析 include，
     避免为了 210 个 include 发 210 次请求。
  2. Loyalsoldier/clash-rules      proxy.txt（社区维护的「必须走代理」域名）
  3. Loyalsoldier/clash-rules      direct.txt（中国域名，用于从国外集合里剔除，避免左右互搏）

输出
  foreign-domains.yaml   Egern 规则集（domain_suffix_set / domain_set / domain_keyword_set / domain_regex_set）
  foreign-domains.txt    通用文本（DOMAIN-SUFFIX,xxx），给 Clash / Surge / Loon 复用

用法
  python3 sync.py             # 生成
  python3 sync.py --check     # 有变化 exit 1
  python3 sync.py --dry-run   # 只打印统计
"""
import argparse
import io
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_YAML = HERE / "foreign-domains.yaml"
OUT_TXT = HERE / "foreign-domains.txt"

TARBALL = "https://codeload.github.com/v2fly/domain-list-community/tar.gz/refs/heads/master"
PROXY_TXT = "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt"
DIRECT_TXT = "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt"
ISO_CSV = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv"
UA = "egern-rules-sync/1.0 (+https://github.com/a13609y/egern-modules-hub)"

LABEL = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
DOMAIN_OK = re.compile(r"^[a-z0-9.][a-z0-9.\-]{1,251}$")
# 命中即丢弃：这些一旦进「代理」名单会出事
NEVER_SUBSTR = ("localhost", "127.0.0.1", "0.0.0.0", ".cn", "cn.com", "chinanet")

import os


def fetch(url: str, binary: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=90) as r:
        if r.status != 200:
            raise RuntimeError(f"{r.status} {url}")
        return r.read() if binary else r.read().decode("utf-8", "replace")


def norm_domain(raw: str):
    d = raw.strip().lower()
    for p in ("+.", "*.", ".", "-"):
        if d.startswith(p):
            d = d[len(p):]
    d = d.rstrip(".").strip("'\"")
    if not d or "." not in d or len(d) > 253:
        return None
    if not DOMAIN_OK.match(d):
        return None
    for lbl in d.split("."):
        if not LABEL.match(lbl):
            return None
    if any(x in d for x in NEVER_SUBSTR):
        return None
    return d


class DLC:
    """本地解析 domain-list-community 的 data 目录，递归展开 include。"""

    def __init__(self, data_dir: Path):
        self.dir = data_dir
        self.cache = {}

    def node(self, name: str):
        if name in self.cache:
            return self.cache[name]
        f = self.dir / name
        res = {"suffix": set(), "exact": set(), "keyword": set(), "regex": set()}
        self.cache[name] = res  # 先占位，防循环 include
        if not f.exists():
            return res
        for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.split("#", 1)[0].strip()
            if not line:
                continue
            # 去掉 v2ray 属性标记（@cn / @ads 等），本规则集不做变体区分
            line = line.split("@", 1)[0].strip()
            if line.startswith("include:"):
                child = line[len("include:"):].strip()
                sub = self.node(child)
                for k in res:
                    res[k] |= sub[k]
            elif line.startswith("domain:"):
                d = norm_domain(line[7:])
                if d:
                    res["suffix"].add(d)
            elif line.startswith("full:"):
                d = norm_domain(line[5:])
                if d:
                    res["exact"].add(d)
            elif line.startswith("keyword:"):
                k = line[8:].strip().lower()
                if 1 < len(k) <= 60:
                    res["keyword"].add(k)
            elif line.startswith("regexp:"):
                r = line[7:].strip()
                if 3 < len(r) <= 120:
                    res["regex"].add(r)
            elif ":" not in line:
                # v2fly 的写法：不带前缀的裸域名 = 后缀匹配（等价 domain:）
                d = norm_domain(line)
                if d:
                    res["suffix"].add(d)
        return res

    def resolve(self, name: str):
        return self.node(name)


def parse_clash_list(text: str):
    out = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("payload"):
            continue
        m = re.match(r"^-\s*['\"]?(.+?)['\"]?\s*$", line)
        if m:
            d = norm_domain(m.group(1))
            if d:
                out.add(d)
    return out


def prune_subsumed(items, keep_exact=()):
    """父后缀已存在时丢弃其子域（精确条目除外）。"""
    items = sorted(items, key=lambda x: (x.count("."), len(x), x))
    kept, kept_set = [], set()
    for d in items:
        parts = d.split(".")
        covered = False
        if d not in keep_exact:
            for i in range(1, len(parts) - 1):
                if ".".join(parts[i:]) in kept_set:
                    covered = True
                    break
        if covered:
            continue
        kept.append(d)
        kept_set.add(d)
    return sorted(kept)


def collect():
    report = []

    raw = fetch(TARBALL, binary=True)
    tf = tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz")
    data_dir = None
    for name in tf.getnames():
        if "/data" == "/" + name.split("/")[-1] and name.count("/") == 1:
            data_dir = name
            break
    if data_dir is None:
        raise RuntimeError("tar 包里找不到 data 目录")
    tmp = HERE / ".dlc"
    tmp.mkdir(exist_ok=True)
    tf.extractall(tmp)
    dlc = DLC(tmp / data_dir)
    cn = dlc.resolve("geolocation-!cn")
    report.append(f"v2fly geolocation-!cn: 后缀 {len(cn['suffix'])}, 精确 {len(cn['exact'])}, 关键词 {len(cn['keyword'])}, 正则 {len(cn['regex'])}")

    proxy_set = parse_clash_list(fetch(PROXY_TXT))
    report.append(f"Loyalsoldier proxy.txt: {len(proxy_set)} 条")

    cn_set = parse_clash_list(fetch(DIRECT_TXT))
    report.append(f"Loyalsoldier direct.txt（中国，用于剔除）: {len(cn_set)} 条")

    # IP 侧：GeoIP 国家代码，取「除 CN 以外的全部国家/地区」
    import csv
    rows = list(csv.DictReader(fetch(ISO_CSV).splitlines()))
    codes = sorted({r["alpha-2"].strip().upper() for r in rows if r.get("alpha-2")} - {"CN"})
    codes = [c for c in codes if len(c) == 2 and c.isalpha()]
    report.append(f"GeoIP 国家代码（剔除 CN）: {len(codes)} 个")

    suffix = (cn["suffix"] | proxy_set) - cn_set
    exact = cn["exact"] - cn_set
    exact -= suffix  # 精确项若已被后缀覆盖，丢掉
    suffix = set(prune_subsumed(suffix, keep_exact=exact))
    report.append(f"剔除中国域名后：后缀 {len(suffix)} / 精确 {len(exact)} / 关键词 {len(cn['keyword'])} / 正则 {len(cn['regex'])}")

    # 正则先本地编译一遍，编不过的直接丢掉（宁可少一条，也不让整个规则集加载失败）
    good_re = set()
    for r in cn["regex"]:
        try:
            re.compile(r)
            good_re.add(r)
        except re.error:
            pass
    if len(good_re) != len(cn["regex"]):
        report.append(f"正则编译失败丢弃 {len(cn['regex']) - len(good_re)} 条")

    import shutil
    shutil.rmtree(tmp, ignore_errors=True)
    return suffix, exact, cn["keyword"], good_re, codes, report


def build(suffix, exact, keyword, regex, codes):
    L, A = [], None
    A = L.append
    A("# 国外域名规则集（Egern rule_set）")
    A("# 自动生成，请勿手改。生成器：rulesets/foreign-domains/sync.py")
    A("# 上游：v2fly/domain-list-community · Loyalsoldier/clash-rules")
    A(f"# 后缀 {len(suffix)} / 精确 {len(exact)} / 关键词 {len(keyword)} / 正则 {len(regex)}")
    A(f"# GeoIP 国家/地区 {len(codes)} 个（除 CN 以外的全部）")
    A("")
    A("# 只对「已知目的 IP」的流量生效，不为了让 IP 规则命中而额外做 DNS 解析")
    A("no_resolve: true")
    A("")
    A("domain_suffix_set:")
    A("\n".join(f"  - {d}" for d in suffix))
    A("")
    if exact:
        A("domain_set:")
        A("\n".join(f"  - {d}" for d in exact))
        A("")
    if keyword:
        A("domain_keyword_set:")
        A("\n".join(f"  - {k}" for k in sorted(keyword)))
        A("")
    if regex:
        A("domain_regex_set:")
        A("\n".join("  - '" + r.replace("'", "''") + "'" for r in sorted(regex)))
        A("")
    if codes:
        A("geoip_set:")
        A("\n".join(f"  - {c}" for c in codes))
        A("")
    return "\n".join(L)


def build_txt(suffix, exact, keyword, regex, codes):
    L = ["# 国外域名规则集（通用文本，DOMAIN-SUFFIX / DOMAIN）",
         "# 生成器：rulesets/foreign-domains/sync.py",
         f"# 后缀 {len(suffix)} / 精确 {len(exact)} / 关键词 {len(keyword)} / 正则 {len(regex)}", ""]
    L += [f"DOMAIN-SUFFIX,{d}" for d in suffix]
    L += [f"DOMAIN,{d}" for d in exact]
    L += [f"DOMAIN-KEYWORD,{k}" for k in sorted(keyword)]
    L += [f"DOMAIN-REGEX,{r}" for r in sorted(regex)]
    L += [f"GEOIP,{c}" for c in codes]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    suffix, exact, keyword, regex, codes, report = collect()
    for line in report:
        print("  " + line)

    total = len(suffix) + len(exact)
    if total < 5000:
        print(f"ERROR: 只聚合到 {total} 条，明显异常，拒绝写入")
        return 2

    y = build(suffix, exact, keyword, regex, codes)
    t = build_txt(suffix, exact, keyword, regex, codes)
    if a.dry_run:
        print(f"YAML 约 {len(y)/1024:.0f} KB，TXT 约 {len(t)/1024:.0f} KB")
        return 0

    old_y = OUT_YAML.read_text(encoding="utf-8") if OUT_YAML.exists() else ""
    old_t = OUT_TXT.read_text(encoding="utf-8") if OUT_TXT.exists() else ""
    if y == old_y and t == old_t:
        print("无变化")
        return 0
    if a.check:
        print("有变化")
        return 1
    OUT_YAML.write_text(y, encoding="utf-8")
    OUT_TXT.write_text(t, encoding="utf-8")
    print(f"已写入：{OUT_YAML.name} {len(y)/1024:.0f} KB / {OUT_TXT.name} {len(t)/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
