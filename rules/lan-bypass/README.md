# 通用增强（General Enhanced）

三件事合在一个模块里：

1. **绕过隧道**（`bypass_tunnel_proxy`）——私有网段、组播、广播、链路本地、本地域名不走隧道，直接物理链路发出。
2. **真实 IP 解析**（`real_ip_domains`）——仍走隧道，但返回真实 IP 而不是 Fake IP。
3. **MITM 排除**（`mitm.hostnames.excludes`）——证书钉扎与系统关键服务不解密。

订阅地址：

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/lan-bypass/lan-bypass.yaml
```

当前条目：绕过 41 条、真实 IP 83 条、MITM 排除 12 条。

---

## 1. 绕过隧道

| 目标 | 为什么必须直连 |
| --- | --- |
| `224.0.0.0/4`、`ff00::/8` | 组播（mDNS / SSDP / DLNA），代理协议无法承载，设备发现直接失灵 |
| `255.255.255.255/32` | 广播（DHCP、NetBIOS 名字服务） |
| `fe80::/10` | IPv6 链路本地，带接口作用域，跨接口必失败（NDP 因此断掉） |
| `169.254.0.0/16` | IPv4 链路本地，无 DHCP 时的自动地址 |
| `fc00::/7`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | 内网单播：NAS、路由器管理页、打印机、内网系统 |
| `100.64.0.0/10` | CGNAT：Tailscale / ZeroTier 组网 |
| `127.0.0.0/8`、`::1/128` | 环回 |

组播、广播、链路本地**不产生「域名 + 端口」意义上的连接判定**，`rules` 里的 `ip_cidr → DIRECT` 兜不住，只能在这一层豁免。bypass 的语义是"不解析、不劫持 DNS、不做 Fake IP"，最接近"没开 VPN"；`DIRECT` 规则仍由 Egern 建连、走 Egern 的 DNS。

最后一段是**会主动检测代理的国内 App**（银行、政务、运营商、网盘类）。命中后同样不受去广告/脚本管控，也不需要的话整段删掉即可。

## 2. 真实 IP 解析

Fake IP 会把这些服务解析到一个假地址：联机匹配失败、CDN 调度错、版权区判定错、免流自服务认不出手机号、NTP 校时错乱、门户登录页弹不出来。分七组：

- 本地与门户检测（`*.msftconnecttest.com`、`*.msftncsi.com`、`detectportal.firefox.com`、`network-test.debian.org`、`*.push.apple.com`）
- 时区校时（`pool.ntp.org`、`time.*`、`*.ntp.org.cn`）
- 游戏联机（Switch / PlayStation / Xbox / 暴雪）
- NAT 穿透（`stun.*`、`stun.l.google.com`、Twilio、`stun.syncthing.net`）
- 流媒体（Netflix 的 `appboot` 与 `*.prod.cloud.netflix.com`、B 站 `*.mcdn.bilivideo.cn`）
- 音乐版权（网易云、QQ 音乐、酷狗、酷我、咪咕、Joox、虾米）
- 运营商免流自服务（`id6.me`、`*.10099.com.cn`、`*.cmpassport.com`、`*.wosms.cn` …）
- 金融（平安、招行）、本地回环（`localhost.*.weixin.qq.com`）、开发（`*.sslip.io`、`*.nip.io`、`proxy.golang.org`）

## 3. MITM 排除

- 证书钉扎：`*.facebook.com`、`*.instagram.com`、`*.twitter.com`、`*.snssdk.com`、`*.pstatp.com` —— 解密即白屏/断连。
- 系统关键服务：`gateway.icloud.com(.cn)`、`weather-data.apple.com`、`buy.itunes.apple.com`、`play.itunes.apple.com`、`play-edge.itunes.apple.com`、`ios.chat.openai.com`。

只声明**排除**，不会替你把任何域名放进 MITM；主配置里 MITM 开没开、包含哪些域名都不受影响。

---

## 与公开清单的差异

参考并去重合并了这些来源：

| 来源 | 用途 | 情况 |
| --- | --- | --- |
| [VirgilClyne/GetSomeFries `General.sgmodule`](https://github.com/VirgilClyne/GetSomeFries/blob/main/sgmodule/General.sgmodule)（及 beta 版） | skip-proxy / always-real-ip / MITM | 完整移植，但**不全**：见下 |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) Egern 配置 | bypass / real-ip 写法参照 | 条目很少（6 / 12），补了 `*.battle.net`、`*.battlenet.com` 两组 |
| [dler-io/Rules `MitM.conf`](https://github.com/dler-io/Rules) | hostname-disabled | 与 Fries 相同，少 `ios.chat.openai.com` |
| [DualSubs/Universal `DualSubs.Apple`](https://github.com/DualSubs/Universal) | Apple 播放域名 | 补 `play.itunes.apple.com`、`play-edge.itunes.apple.com` |
| [Rabbit-Spec/Surge](https://github.com/Rabbit-Spec/Surge) | real-ip / skip-proxy | 补 `stun.syncthing.net`、`*.sslip.io`、`*.nip.io` |
| [TributePaulWalker/Profiles](https://github.com/TributePaulWalker/Profiles) | real-ip | 补 Netflix 的 `appboot` 系、`stun.l.google.com` |
| [canff/surge `skip-proxy`](https://github.com/canff/surge) | real-ip | 补 `easy-login.10099.com.cn`、`*-update.xoyocdn.com` |

**Fries 那份缺的东西（已补）：**

- 少 `224.0.0.0/4`、`255.255.255.255/32`、`169.254.0.0/16`、`fc00::/7`、`ff00::/8`、`100.64.0.0/10`、`*.home.arpa`、`*.lan`、`*.crashlytics.com` —— 组播和链路本地这几条是最影响局域网可用的。
- `skip-proxy` 里有 `193.168.0.1/32`，明显是 `192.168.0.1` 的笔误，未收录。
- `always-real-ip` 缺 Netflix 起播域名（Fake IP 下 Netflix 会报错）、`stun.syncthing.net`、`*.battle.net` / `*.battlenet.com`（只有 `logon` 子域）、`*.sslip.io` / `*.nip.io`（本地开发）。
- MITM 排除缺 iTunes 播放域名（`play*`），补上了。

**顺带说明 Fries beta 版多出来的 `always-raw-tcp-hosts`（Google + Telegram 的 IP 段）没有收录**：Egern 模块的配置内容字段只支持 `dns` / `rules` / 各种 rewrite / `map_locals` / `scriptings` / `mitm` / `http_captures` / `widgets` / `bypass_tunnel_proxy` / `real_ip_domains`，**没有**"原始 TCP 主机"这个字段。需要的话只能在 Egern 设置 → 原始 TCP 主机里手动填：`www.google.com, 91.108.*, 149.154.1*, 91.105.1*, 5.28.195.*, 185.76.151.*`。

## 用法

1. 复制订阅地址，Egern → 工具 → 模块 → `+` → 保存。
2. 无参数，启用即生效；禁用即完全还原。
3. 若开着「设置 → 系统网络流量控制 → 包含所有网络流量」，越需要这个模块把局域网救回来。

## 注意

- 命中 `bypass_tunnel_proxy` 的连接**完全脱离管控**（规则、脚本、抓包、去广告都不生效），别往里塞自己还想管的公网域名。
- 只想"直连但仍受 Egern 管"→ 用主配置 `rules` 的 `ip_cidr → DIRECT`（带 `no_resolve: true`），不要加到这里。
