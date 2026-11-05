# 局域网直连（Bypass Tunnel）

把**私有网段、组播、广播、链路本地地址和本地域名**从隧道理出来，直接走物理链路。开了 Egern 之后局域网设备「消失」、投屏/打印/内网系统连不上、机场酒店 WiFi 弹不出登录页，基本都是这个原因。

订阅地址：

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/lan-bypass/lan-bypass.yaml
```

## 它到底做了什么

Egern 拿到一条连接后先分三岔：明文 HTTP 交给 HTTP 引擎、命中 MITM 的 TLS 交给解密、其余按原始 TCP 转发。**但这条判断的前提是连接已经被隧道接管了**。网络层里这些东西根本进不了隧道：

| 目标 | 为什么必须直连 |
| --- | --- |
| `224.0.0.0/4`、`ff00::/8` | 组播（mDNS / SSDP / DLNA），代理协议无法承载，设备发现直接失灵 |
| `255.255.255.255/32` | 广播（DHCP、NetBIOS 名字服务） |
| `fe80::/10` | IPv6 链路本地，带接口作用域，跨接口必失败（NDP 因此断掉） |
| `169.254.0.0/16` | IPv4 链路本地，没有 DHCP 时的自动地址 |
| `fc00::/7`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | 内网单播：NAS、路由器管理页、打印机、内网系统 |
| `127.0.0.0/8`、`::1/128` | 环回 |
| `100.64.0.0/10` | CGNAT 段：Tailscale / ZeroTier 组网、部分运营商共享地址 |

所以模块里写的是 `bypass_tunnel_proxy`（连接层豁免），不是 `rules` 里的 `ip_cidr → DIRECT`：

- 组播、广播、链路本地**不产生「域名 + 端口」意义上的连接判定**，规则兜不住，只能在这一层豁免；
- bypass 的语义是「不解析、不劫持 DNS、不做 Fake IP」，最接近「没开 VPN」；
- 规则 `DIRECT` 仍然由 Egern 建连、走 Egern 的 DNS，只适合公网域名。

`real_ip_domains` 那部分解决另一半问题：门户检测域名（`captive.apple.com` 等）和 `*.lan` 若返回 Fake IP，系统连通性检测会误判「无网络」，机场登录页也弹不出来；NTP 与微信本地回环域名同理。

## 用法

1. 复制上面的订阅地址，Egern → 工具 → 模块 → `+` → 粘贴 → 保存。
2. 模块无参数，启用即生效；禁用它即可完全还原。
3. 建议同时确认「设置 → 系统网络流量控制」里的 `包含所有网络流量` 是否开启——开启后接管越彻底，越需要这个模块把局域网救回来。

## 需要自己补的情况

命中 bypass 的连接**完全脱离管控**（规则、脚本、抓包、去广告都不生效），所以别往里塞公网域名。以下按需自行加到模块的 `bypass_tunnel_proxy`：

- 公司/校园内网有特殊段（如 `198.18.0.0/15`、私有机房段）→ 直接追加 CIDR
- 自建 DNS / 内网 Git / 内部 Wiki 的域名 → 追加域名
- 家里路由器管理域名（`router.asus.com`、`asusrouter.com`、`oasisauth.h3c.com` 等）→ 追加域名，或改用 `rules` 里的 `domain_suffix → DIRECT`

只想直连但仍受 Egern 管（要出现在分析页、要能被规则覆盖）→ 不要加到这里，改成在主配置 `rules` 里加：

```yaml
rules:
  - ip_cidr:
      match: 192.168.0.0/16
      policy: DIRECT
      no_resolve: true
```

## 备注

- 这套设置与 Surge 的 `skip-proxy` / `always-real-ip`、VirgilClyne 的 [General.sgmodule](https://github.com/VirgilClyne/GetSomeFries/blob/main/sgmodule/General.sgmodule) 同源，但 `.sgmodule` 是 Surge 格式（`[General] skip-proxy=`），Egern 无法直接订阅，必须转成这里的 YAML 键（`bypass_tunnel_proxy` / `real_ip_domains`）。
- Egern 官方文档：模块文件可直接包含 `bypass_tunnel_proxy`（数组）与 `real_ip_domains`（数组）两个字段，与本模块用法一致。
- 模块不含任何 `rules` / `dns` 配置，不影响你的分流策略。
