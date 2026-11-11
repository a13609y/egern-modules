#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""通用增强（合一版）—— 绕过隧道 + 真实 IP + MITM 排除，一个模块搞定。

合并了原来三个模块：
  rules/lan-bypass            （bypass_tunnel_proxy + 一部分 real_ip + mitm 排除）
  rules/real-ip-domains       （real_ip_domains 核心）
  rules/real-ip-domains-extra （real_ip_domains 扩展）

三段各自怎么维护
  1. bypass_tunnel_proxy  连接层豁免：不进隧道、不劫持 DNS、不做 Fake IP。组播 / 广播 /
                          链路本地只能走这一层，规则 DIRECT 兜不住。**静态**（不常变）。
  2. real_ip_domains      仍走隧道，但不用 Fake IP，Egern 会真的去上游解析并返回真实 IP。
                          **自动跟随上游**：每天从 GitHub 聚合并重生成。
  3. mitm.excludes        只声明「别解密这些域名」，不会替任何域名开启 MITM。**静态**。

合并的代价：`real_ip_domains` 是纯字符串数组，没有 per-entry 的 disabled 开关，
所以原「核心 / 扩展」两档在这里并成一个列表。不想要音乐/游戏/工具那几段，
删掉 yaml 对应段落即可，但下次同步会加回来 —— 要长期去掉请改本文件里的 DROP_EXACT。

上游（只读 raw.githubusercontent，不调 API、不带 token）
  · Egern 配置的 real_ip_domains：fmz200、MeALiYeYe、lainbo、oceanxux、kanwox、Raphael689 等
  · Surge 的 always-real-ip：VirgilClyne/GetSomeFries、canff/surge

用法:
  python3 sync.py             # 拉上游 → 重写 general-enhanced.yaml
  python3 sync.py --check     # 有变化 exit 1（CI 用）
  python3 sync.py --dry-run   # 只打印，不落盘
"""
import argparse
import re
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
OUT = HERE / "general-enhanced.yaml"
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

# ── 永不收录进 real_ip_domains：银行 / 运营商 / 支付 ───────────
# 这类域名属于「不进隧道」，已经放在上面的 bypass_tunnel_proxy 里。
DROP_PATTERNS = re.compile(
    r"(bank|abchina|psbc|cmb|ccb\b|icbc|unionpay|alipay|antgroup|aliyunpay|"
    r"tenpay|pingan|spdb|ecitic|\bcib\b|hxb|cgb|cbhb|cebbank|bankcomm|chinatelecom|"
    r"chinaunicom|cmcc|10086|10010|10099|189\.cn|wo\.cn|wosms|microdone|jegotrip|"
    r"icitymobile|nishub|enrichgw|id6\.me|id\.mail|opencloud|mdn\.open|hmrz|"
    r"cmpassport|weixin|ptlogin2|passport|boc\.)", re.I)

# 超宽泛 / 官方示例占位，收进来只会误伤
DROP_EXACT = {
    "*.cn", "*.direct", "*.test", "*.example", "*.invalid", "*.microsoft.com",
    "*", "*.com", "*.net", "*.org", "*.apple.com", "*.icloud.com", "*.qq.com",
}

# 合法条目：字母数字连字符组成的标签，允许 * 与 ? 通配
LABEL = r"(\*|\*[a-z0-9?\-]+|[a-z0-9?\-]+)"
DOMAIN_RE = re.compile(r"^" + LABEL + r"(\." + LABEL + r"){0,7}$", re.I)

# ── 分类（决定输出里的分段与注释，不影响是否收录）─────────────
GROUPS = [
    ("lan", "局域网 / 本地 / 内网命名",
     r"\.lan$|\.local$|localhost|home\.arpa|localdomain|ipv6\.microsoft|routerlogin|\.direct$"),
    ("portal", "门户检测 · STUN · 主机联机（Nintendo / PlayStation / Xbox / Battle.net）",
     r"stun|turn\.|msftncsi|msftconnecttest|detectportal|connectivitycheck|captive|"
     r"network-test|resolver\d*\.opendns|nintendo|playstation|xbox|battle\.net|battlenet|"
     r"blzstatic|blizzard|syncthing"),
    ("ntp", "NTP / 时间同步",
     r"\bntp[0-9?]*\.|^ntp|\.ntp|time[0-9?]*\.|time\.(com|gov|edu|apple|android|windows)|"
     r"pool\.ntp|timezone"),
    ("push", "Apple 推送 / iCloud / iTunes",
     r"push\.apple|gateway\.icloud|weather-data|itunes|apple\.com|icloud|apple-dns"),
    ("nas", "NAS / 远程访问 / 内网穿透",
     r"synology|unifi|plex|qnap|rustdesk|tailscale|gl-inet|ddns|myds\.me|zerotier|wireguard"),
    ("media", "音乐 / 影音版权校验",
     r"music|163\.com|126\.net|kugou|kuwo|migu|joox|xiami|qqmusic|y\.qq|stream\.qq|"
     r"bilivideo|bilibili|bilicdn|netflix|appboot|spotify|youtube|soundcloud|deezer|tidal|"
     r"huya|douyu"),
    ("games", "第三方游戏平台（Steam / EA / Epic / Riot / Wargaming）",
     r"steam|ea\.com|epicgames|riotgames|origin\.com|wargaming|wotgame|wowsgame|wggames|"
     r"bnetshop|bnet\.cn|pscdn|psnprofiles|ubisoft|garena|supercell|mihoyo|hoyoverse|pvp\.net"),
    ("misc", "工具 / 免登录 / 其他",
     r"sslip|nip\.io|golang|xoyocdn|lancache|no-ip|dyndns|adguard|yinxiang|digicert|"
     r"letsencrypt|lencr\.org|doh\.|ocsp|safebrowsing|nvidia|myqcloud|asus\.com|"
     r"cable\.auth|auth\.com|jjvip|teredo|bing\.com|douyu"),
]


def classify(domain: str):
    d = domain.lower()
    for key, _title, pat in GROUPS:
        if re.search(pat, d):
            return key
    return "misc"


def clean(domain: str) -> str:
    d = domain.strip()
    d = re.split(r"\s#", d)[0]             # 行尾注释
    d = d.strip().strip("\"',").strip()    # 引号 / 逗号（可能叠着）
    d = re.sub(r"^\$\{?[A-Za-z_]+\}?$", "", d)  # 变量占位
    return d.lower()


def acceptable(d: str) -> bool:
    if not d or len(d) > 120:
        return False
    if any(c in d for c in " \t:()"):
        return False
    if d.lower() in DROP_EXACT:
        return False
    if re.fullmatch(r"[\d./:]+", d):       # 纯 IP / CIDR
        return False
    if DROP_PATTERNS.search(d):
        return False
    if not DOMAIN_RE.match(d):             # 上游手滑拼出来的脏条目
        return False
    return True


def parse_blocks(text: str):
    """抓 real_ip_domains / always-real-ip 的取值（YAML 列表 / 行内 flow / '=' 赋值）。"""
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
        if rest.startswith("["):           # 行内 flow 列表
            body, j = rest, i + 1
            while "]" not in body and j < len(lines):
                body += " " + lines[j].strip()
                j += 1
            if "]" in body:
                out += [clean(x) for x in body[1:body.rfind("]")].split(",")]
            continue
        if rest:                           # Surge: always-real-ip = %INSERT% a, b
            out += [clean(x) for x in rest.replace("%INSERT%", "").split(",")]
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
            elif not s.startswith("#"):
                break
            j += 1
    return out


def fetch(url: str, retries: int = 1) -> str:
    """被动拉取 raw.githubusercontent，不碰 API、不带 token。

    每天只跑一次、二十来个请求，属于 GitHub 完全不关注的量级；
    这里仍然加 0.3s 间隔与一次退避重试，纯粹是为了不把上游打疼。
    """
    req = urllib.request.Request(url, headers={"User-Agent": "egern-general-enhanced-sync/1.0"})
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
            found.setdefault(d, set()).add(repo)
        print(f"   {repo}: {len(got)}")
    return found

# ── 静态段 1：绕过隧道（连接层豁免）────────────────────────────
BYPASS_GROUPS = [
    ("本地与内网名字", [
        "localhost", "*.localhost", "*.local", "*.lan", "*.direct", "*.home.arpa",
    ]),
    ("IPv4 私有 / 保留", [
        "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
        "192.168.122.1/32",   # QEMU/libvirt 默认网关
        "169.254.0.0/16",     # 链路本地
        "127.0.0.0/8",
    ]),
    ("CGNAT / Apple 自有段", [
        "{{{TAILSCALE_CIDR}}}",  # 由模块设置里的开关控制，默认 0.0.0.0/32 = 不绕过
        "17.0.0.0/8",            # Apple 部分服务对代理敏感
    ]),
    ("IPv4 组播 / 广播（mDNS、SSDP、DHCP、NetBIOS）", [
        "224.0.0.0/4", "255.255.255.255/32",
    ]),
    ("IPv6", [
        "::1/128", "fe80::/10", "fc00::/7", "ff00::/8",
    ]),
    ("连通性检测与崩溃上报（被劫持会误判「无网络」）", [
        "captive.apple.com", "*.captive.apple.com", "e.crashlytics.com", "*.crashlytics.com",
    ]),
    ("会主动检测代理、直连成功率更高的国内 App（不需要可整段删）", [
        "www.baidu.com", "www.163.com", "passenger.t3go.cn", "gate.lagou.com",
        "www.shanbay.com", "www.boc.com", "www.abchina.com.cn", "*.abchina.com.cn",
        "www.ccb.com", "*.ccb.com", "yunbusiness.ccb.com", "*.psbc.com",
        "login-service.mobile-bank.psbc.com", "mobile-bank.psbc.com",
        "wxh.wo.cn", "emm.deltaww.com.cn", "id6.me",
    ]),
]

# ── 静态段 3：MITM 排除 ───────────────────────────────────────
MITM_GROUPS = [
    ("证书钉扎，解密即断连", [
        "*.facebook.com", "*.instagram.com", "*.twitter.com",
        "*.snssdk.com", "*.pstatp.com",
    ]),
    ("系统关键服务，不能碰", [
        "gateway.icloud.com", "gateway.icloud.com.cn", "weather-data.apple.com",
        "buy.itunes.apple.com", "play.itunes.apple.com",
        "play-edge.itunes.apple.com", "ios.chat.openai.com",
    ]),
]


def render_real_ip(found) -> str:
    groups = {}
    for d in found:
        groups.setdefault(classify(d), []).append(d)
    lines = []
    for key, title, _pat in GROUPS:
        items = sorted(groups.get(key, []), key=str.lower)
        if not items:
            continue
        lines.append(f"  # ── {title}：{len(items)} 条")
        lines += [f'  - "{d}"' for d in items]
        lines.append("")
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def render_static(groups, indent: int = 2) -> str:
    pad = " " * indent
    lines = []
    for title, items in groups:
        lines.append(f"{pad}# —— {title} ——")
        lines += [f'{pad}- "{x}"' for x in items]
        lines.append("")
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def build(found) -> str:
    total = len(found)
    bypass_n = sum(len(v) for _t, v in BYPASS_GROUPS)
    mitm_n = sum(len(v) for _t, v in MITM_GROUPS)
    return f"""name: 通用增强（合一版 · General Enhanced）
description: >-
  三合一：①私有网段/组播/链路本地/本地域名不走隧道 ②门户检测、STUN、主机联机、NTP、
  推送、NAS、音乐版权等用真实 IP 解析（不用 Fake IP）③证书钉扎与系统关键服务不做 MITM。
  真实 IP 名单每天从 GitHub 上游聚合重生成；绕过与 MITM 段静态维护。
author: a13609y
homepage: https://github.com/a13609y/egern-modules-hub/tree/main/rules/general-enhanced
manual: https://github.com/a13609y/egern-modules-hub/blob/main/rules/general-enhanced/README.md
icon: network

compat_arguments:
  TAILSCALE_CIDR: "0.0.0.0/32"

env_schema:
  TAILSCALE_CIDR:
    name: 兼容 Tailscale / ZeroTier
    description: >-
      默认「不绕过」：100.64.0.0/10 照常由 Egern 处理，tailnet 主机可以正常走策略
      （0.0.0.0/32 只是空占位，不匹配任何真实流量）。改成 100.64.0.0/10 则整段直连、不进隧道，
      只有在不用组网、又想让运营商 CGNAT 地址完全脱管时才需要。
    options:
      - "0.0.0.0/32"
      - "100.64.0.0/10"

# ============================================================
# 本文件的 real_ip_domains 段由 sync.py 自动生成，请勿手改
# （改了下次同步会被覆盖）。bypass_tunnel_proxy 与 mitm 段是静态的，
# 要改请改 sync.py 里的 BYPASS_GROUPS / MITM_GROUPS。
# 当前：绕过 {bypass_n} 条 · 真实 IP {total} 条 · MITM 排除 {mitm_n} 条
# ============================================================

# ============================================================
# 1. 绕过隧道（连接层豁免）
# 命中这里的目标不进入隧道：不解析 HTTP、不劫持 DNS、不做 Fake IP，直接由物理链路发出。
# 组播 / 广播 / 链路本地只能走这一层，rules 里的 DIRECT 兜不住。
# ============================================================
bypass_tunnel_proxy:
{render_static(BYPASS_GROUPS)}

# ============================================================
# 2. 真实 IP 解析（仍走隧道，但不用 Fake IP）
# Fake IP 会让这些服务拿到虚假地址：联机匹配失败、CDN 调度错、版权/音质校验失败、
# 免流自服务认不出手机号、NTP 校时错乱、推送注册失败。
# 名单每天从上游聚合；银行 / 运营商 / 支付不在这里（它们要的是上面第 1 段）。
# ============================================================
real_ip_domains:
{render_real_ip(found)}

# ============================================================
# 3. MITM 排除
# 这些域名即使被主配置的 MITM 命中也不解密：证书钉扎的 App 一解密就白屏/断连。
# 只声明排除，不会替你把任何域名放进 MITM。
# ============================================================
mitm:
  hostnames:
    excludes:
{render_static(MITM_GROUPS, 6)}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print("拉上游:")
    found = collect()
    content = build(found)
    real_n = len(found)
    print(f"去重后 real_ip_domains {real_n} 条（已剔除银行/运营商/支付/占位）")

    if args.dry_run:
        print(content)
        return

    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if old != content:
        OUT.write_text(content, encoding="utf-8")
        print(f"写入 {OUT.name}")
    else:
        print(f"{OUT.name} 无变化")
        if args.check:
            return
    if args.check and old != content:
        sys.exit(1)


if __name__ == "__main__":
    main()
