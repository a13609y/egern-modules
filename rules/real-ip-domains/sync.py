#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""真实 IP 域名（real_ip_domains）—— 跟随上游自动重生成。

为什么要这个模块
  Fake IP 模式下，Egern 对域名返回本地虚拟地址（198.18.x.x 一类，不可路由），
  连接时再用这个假地址反查域名交给代理。绝大多数域名这样最稳，但少数功能必须拿到真实 IP：
  门户检测 / STUN / NTP / 游戏机联机 / NAS、远程访问 / 音乐版权校验 / 推送注册。
  这些域名写进 real_ip_domains 后，Egern 会真的去上游查一次并把真实 IP 返回给应用，
  但仍走隧道（跟 bypass_tunnel_proxy 不一样，后者是彻底不进隧道）。

上游（每天拉一次，都是可机读的 Egern / Surge 配置）
  · Egern 配置里的 real_ip_domains（fmz200、Repcz、MeALiYeYe、lainbo 等十几个仓库）
  · Surge 的 always-real-ip（VirgilClyne GetSomeFries General 等）
  本地只做三件事：解析 → 去重 → 分类。不硬编码任何域名，名单完全跟随上游。

输出两个模块
  real-ip-domains.yaml        核心：局域网/本地、门户检测、STUN、NTP、推送、主机联机、NAS/远程
  real-ip-domains-extra.yaml  扩展：音乐/影音版权校验、第三方游戏平台、内网穿透与工具域
银行 / 运营商 / 支付类域名一律**不进本模块**：它们要的是「完全不进隧道」（bypass_tunnel_proxy），
放进 real_ip_domains 只是换了真实 IP，该坏的还是坏。这类需求见 rules/lan-bypass。

用法:
  python3 sync.py             # 拉上游 → 写两个 yaml
  python3 sync.py --check     # 有变化则 exit 1（用于 CI 判断）
  python3 sync.py --dry-run   # 只打印，不落盘
"""
import argparse
import re
import sys
import time
import urllib.request
from urllib.parse import quote
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_CORE = HERE / "real-ip-domains.yaml"
OUT_EXTRA = HERE / "real-ip-domains-extra.yaml"
RAW = "https://raw.githubusercontent.com/%s/%s"

# ── 上游：Egern 配置里的 real_ip_domains ───────────────────────
EGERN_SOURCES = [
    ("fmz200/wool_scripts", "main", "Egern/config/Egern_iOS.yaml"),
    ("MeALiYeYe/ProxyConfigFiles", "main", "Egern/module/skipproxy.yaml"),
    ("lainbo/gists-hub", "master", "src/Egern/egern.local.yaml"),
    ("oceanxux/Rule_configuration", "main", "Egern.yaml"),
    ("kanwox/Proxy-Rule", "main", "Egern/Egern.yaml"),
    ("ifflagged/Romeo", "main", "Modules/Egern/fmz200/Egern_iOS.yaml"),
    ("ifflagged/Miami", "main", "Modules/Egern/fmz200/Egern_iOS.yaml"),
    ("Raphael689/RW", "main", "Egern/Raphael.yaml"),
    ("linchao10058/iOS-PROXY", "main", "Egern/Profile/Egern_linchao10058.yaml"),
    ("Jard1n/VPN_Tool", "main", "Egern/Egern.yaml"),
    ("ZLam/VPN", "main", "egern/config.yaml"),
    ("397552789/SR-Self-use-conf-module", "main", "egern.yaml"),
    ("Teakowa/Rules", "master", "templates/egern-lazy.yaml"),
    ("JoySky/proxy-rules", "main", "Egern/Egern-config.yaml"),
    ("byyoshen/Blink", "main", "Profiles/Egern.yaml"),
    ("yssqtao/plugins", "main", "conf/egern.conf"),
    ("anybodyiskiller-cpu/Profile", "main", "Egern/Egern.yaml"),
    ("Matrix-CN/IOS-Rules", "main", "Egern/Egern.yaml"),
    ("CaoXiaoMann/XiaoMan", "main", "Egern/XiaoManEgern3.0.yaml"),
    ("IvanSolis1989/Smart-Config-Kit", "main", "独立内核系/Egern/Egern.yaml"),
    ("axtyet/Luminous", "main", "wool_scripts/Egern/config/Egern_iOS.yaml"),
]

# ── 上游：Surge 的 always-real-ip（等价语义）───────────────────
SURGE_SOURCES = [
    ("VirgilClyne/GetSomeFries", "main", "sgmodule/General.sgmodule"),
    ("canff/surge", "main", "modules/skip-proxy.sgmodule"),
]

# ── 永不收录：银行 / 运营商 / 支付 ────────────────────────────
# 这类域名属于「不进隧道」，要写进 bypass_tunnel_proxy，见 rules/lan-bypass。
DROP_PATTERNS = re.compile(
    r"(bank|abchina|psbc|cmb|ccb\b|boc\.|icbc|unionpay|alipay|antgroup|aliyunpay|"
    r"tenpay|pingan|spdb|ecitic|\bcib\b|hxb|cgb|cbhb|cebbank|bankcomm|chinatelecom|"
    r"chinaunicom|cmcc|10086|10010|10099|189\.cn|wo\.cn|wosms|microdone|jegotrip|"
    r"icitymobile|nishub|enrichgw|id6\.me|id\.mail|opencloud|mdn\.open|hmrz|"
    r"cmpassport|weixin|ptlogin2|passport)", re.I)

# 超宽泛 / 官方示例占位，收进来只会误伤
DROP_EXACT = {
    "*.cn", "*.direct", "*.test", "*.example", "*.invalid", "*.microsoft.com",
    "*", "*.com", "*.net", "*.org", "*.apple.com", "*.icloud.com", "*.qq.com",
}

# 合法条目：字母数字连字符组成的标签，允许 * 与 ? 通配（整段或段内均可）
LABEL = r"(\*|\*[a-z0-9?\-]+|[a-z0-9?\-]+)"
DOMAIN_RE = re.compile(r"^" + LABEL + r"(\." + LABEL + r"){0,6}$", re.I)

# ── 分类 ──────────────────────────────────────────────────────
CORE_RULES = [
    ("lan", r"\.lan$|\.local$|localhost|home\.arpa|localdomain|ipv6\.microsoft|"
            r"\.example\.|routerlogin|\.direct$"),
    ("portal", r"stun|msftncsi|msftconnecttest|detectportal|connectivitycheck|captive|"
               r"network-test|resolver\d*\.opendns|nintendo|playstation|xbox|"
               r"battle\.net|battlenet|blzstatic|blizzard|turn\.twilio|turn\.cloudflare"),
    ("ntp", r"\bntp[0-9?]*\.|^ntp|\.ntp|time[0-9?]*\.|time\.(com|gov|edu|apple|android|windows)|"
            r"pool\.ntp|timezone"),
    ("push", r"push\.apple|gateway\.icloud|weather-data|itunes|apple\.com|icloud"),
    ("nas", r"synology|unifi|plex|qnap|rustdesk|tailscale|gl-inet|ddns|"
            r"\.myds\.me|zerotier|wireguard"),
]

EXTRA_RULES = [
    ("music", r"music|163\.com|126\.net|kugou|kuwo|migu|joox|xiami|qqmusic|"
              r"y\.qq|stream\.qq|bilivideo|bilibili|netflix|appboot|spotify|"
              r"youtube|soundcloud|deezer|tidal"),
    ("games", r"steam|ea\.com|epicgames|riotgames|origin\.com|wargaming|wotgame|"
              r"wowsgame|wggames|bnetshop|bnet\.cn|pscdn|psnprofiles|game|"
              r"ubisoft|garena|supercell|mihoyo|hoyoverse"),
    ("misc", r"sslip|nip\.io|golang|proxy\.|xoyocdn|lancache|syncthing|"
             r"no-ip|dyndns"),
]

def classify(domain: str):
    d = domain.lower()
    for name, pat in CORE_RULES:
        if re.search(pat, d):
            return "core", name
    for name, pat in EXTRA_RULES:
        if re.search(pat, d):
            return "extra", name
    # 兜底：内网工具 / 免登录类归扩展
    return "extra", "misc"


def clean(domain: str) -> str:
    d = domain.strip()
    d = re.split(r"\s#", d)[0]            # 行尾注释
    d = d.strip().strip("\"',").strip()  # 引号 / 逗号，可能有多个
    d = re.sub(r"^\$\{?[A-Za-z_]+\}?$", "", d)  # 变量占位
    return d.lower()


def acceptable(d: str) -> bool:
    if not d or len(d) > 120:
        return False
    if any(c in d for c in " \t:()"):
        return False
    if d.lower() in DROP_EXACT:
        return False
    if re.fullmatch(r"[\d./]+", d):      # 纯 IP / CIDR
        return False
    if DROP_PATTERNS.search(d):
        return False
    if not DOMAIN_RE.match(d):          # 上游手滑拼出来的脏条目
        return False
    return True


def parse_blocks(text: str):
    """抓 real_ip_domains / always-real-ip 的取值（YAML 列表 + 行内 flow 列表 + '=' 赋值）。"""
    out = []
    lines = text.splitlines()
    key_re = re.compile(
        r"^(\s*)[\"'#\[\]]?[\s]*(real[_-]ip[_-]domains|always[_-]real[_-]ip)[\"']?\s*([:=])\s*(.*)$",
        re.I)
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            continue
        m = key_re.match(line)
        if not m:
            continue
        indent = len(m.group(1))
        rest = m.group(4).strip()
        # 行内 flow 列表
        if rest.startswith("["):
            body, j = rest, i + 1
            while "]" not in body and j < len(lines):
                body += " " + lines[j].strip()
                j += 1
            if "]" in body:
                inner = body[1:body.rfind("]")]
                out += [clean(x) for x in inner.split(",")]
            continue
        if rest:
            # Surge: always-real-ip = %INSERT% a, b, c
            rest = rest.replace("%INSERT%", "")
            out += [clean(x) for x in rest.split(",")]
            continue
        j = i + 1
        while j < len(lines):
            ln = lines[j]
            if not ln.strip():
                j += 1
                continue
            ind = len(ln) - len(ln.lstrip())
            s = ln.strip()
            if ind < indent:
                break
            if ind == indent and not s.startswith("- "):
                break
            if s.startswith("- "):
                out.append(clean(s[2:].strip()))
            elif s.startswith("#"):
                pass
            else:
                break
            j += 1
    return out


def fetch(url: str, retries: int = 1) -> str:
    """被动拉取 raw.githubusercontent，不碰 API、不带 token。

    每天只跑一次、二十来个请求，属于 GitHub 完全不关注的量级；
    这里仍然加 0.3s 间隔与一次退避重试，纯粹是为了不把上游打疼。
    """
    req = urllib.request.Request(url, headers={"User-Agent": "egern-real-ip-sync/1.0"})
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if attempt == retries:
                print(f"   ! {url.split('/')[4]}: {e}", file=sys.stderr)
                return ""
            time.sleep(2)


def collect():
    found = {}
    for repo, branch, path in EGERN_SOURCES + SURGE_SOURCES:
        url = (RAW % (repo, branch)) + "/" + quote(path, safe="/")
        text = fetch(url)
        time.sleep(0.3)
        if not text:
            continue
        got = [d for d in parse_blocks(text) if acceptable(d)]
        for d in got:
            found.setdefault(d.lower(), set()).add(repo)
        print(f"   {repo}: {len(got)}")
    return found


def render(found, tier, header_extra):
    groups = {}
    for d in found:
        t, g = classify(d)
        if t != tier:
            continue
        groups.setdefault(g, []).append(d)
    total = sum(len(v) for v in groups.values())
    titles = {
        "lan": "局域网 / 本地 / 内网命名",
        "portal": "门户检测 · STUN · 主机联机（Nintendo / PlayStation / Xbox / Battle.net）",
        "ntp": "NTP / 时间同步",
        "push": "Apple 推送 / iCloud / iTunes",
        "nas": "NAS / 远程访问 / 内网穿透",
        "music": "音乐 / 影音版权校验",
        "games": "第三方游戏平台（Steam / EA / Epic / Riot / Wargaming）",
        "misc": "工具 / 免登录 / 其他",
    }
    order = ["lan", "portal", "ntp", "push", "nas"] if tier == "core" else ["music", "games", "misc"]
    lines = []
    for g in order:
        items = sorted(groups.get(g, []), key=str.lower)
        if not items:
            continue
        lines.append(f"  # ── {titles[g]}：{len(items)} 条")
        for d in items:
            lines.append(f'  - "{d}"')
        lines.append("")
    while lines and not lines[-1].strip():
        lines.pop()
    return total, "\n".join(lines)


def build_yaml(name, desc, manual, body, total):
    return f"""name: {name}
description: >-
{desc}
author: a13609y
homepage: https://github.com/a13609y/egern-modules-hub/tree/main/rules/real-ip-domains
manual: {manual}
icon: network

# 本文件由 sync.py 自动生成，请勿手改（改了下次同步会被覆盖）。
# 共 {total} 条，全部来自 GitHub 上游聚合：
#   Egern 配置的 real_ip_domains + Surge 的 always-real-ip
# 语义：这些域名不用 Fake IP，Egern 会真的去上游解析、返回真实 IP（仍走隧道）。
# 银行 / 运营商 / 支付类不在本模块 —— 它们要进 bypass_tunnel_proxy，见 rules/lan-bypass。

real_ip_domains:
{body}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print("拉上游:")
    found = collect()
    print(f"去重后 {len(found)} 条可用域名（已剔除银行/运营商/支付/占位）")

    core_total, core_body = render(found, "core", None)
    extra_total, extra_body = render(found, "extra", None)

    core = build_yaml(
        "真实 IP 域名（核心）",
        "    该用真实 IP 的域名：局域网/本地、门户检测、STUN、主机联机、NTP 时间同步、\n"
        "    Apple 推送与 iCloud、NAS/远程访问。开了 Fake IP 后这些功能才不会解析失败。\n"
        "    名单由 rules/real-ip-domains/sync.py 每天从 GitHub 上游聚合。",
        "https://github.com/a13609y/egern-modules-hub/blob/main/rules/real-ip-domains/README.md",
        core_body, core_total)
    extra = build_yaml(
        "真实 IP 域名（扩展）",
        "    核心之外的补充档：音乐/影音版权校验、第三方游戏平台、内网穿透与工具域。\n"
        "    按需装：装了能修好对应 App 的联机/版权问题，不装也不会影响上网。\n"
        "    名单由 rules/real-ip-domains/sync.py 每天从 GitHub 上游聚合。",
        "https://github.com/a13609y/egern-modules-hub/blob/main/rules/real-ip-domains/README.md",
        extra_body, extra_total)

    print(f"核心 {core_total} 条 / 扩展 {extra_total} 条")

    if args.dry_run:
        print(core)
        print(extra)
        return

    changed = False
    for path, content in ((OUT_CORE, core), (OUT_EXTRA, extra)):
        old = path.read_text(encoding="utf-8") if path.exists() else ""
        if old != content:
            path.write_text(content, encoding="utf-8")
            changed = True
            print(f"写入 {path.name}")
            continue
        print(f"{path.name} 无变化")
    if args.check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
