# 通用增强（合一版）

把一个模块该处理的「代理之外的基础设施」全放在一起，装一个顶三个：

| 段 | 作用 | 维护方式 |
| --- | --- | --- |
| `bypass_tunnel_proxy` | 连接层豁免：私有网段、组播、链路本地、本地域名、门户检测域名、直连更稳的国内 App —— 不进隧道、不劫持 DNS、不做 Fake IP | 静态（41 条） |
| `real_ip_domains` | 仍走隧道，但**不用 Fake IP**，Egern 真的去上游解析并返回真实 IP —— 门户检测、STUN、主机联机、NTP、推送、NAS、音乐/影音版权 | **每天跟随 GitHub 上游自动聚合**（173 条） |
| `mitm.hostnames.excludes` | 只声明「这些域名即使命中 MITM 也不解密」：证书钉扎的 App 与系统关键服务 | 静态（12 条） |

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/general-enhanced/general-enhanced.yaml
```

模块设置里只有一项：**兼容 Tailscale / ZeroTier**（默认不绕过 CGNAT 段；需要整段直连时切 `100.64.0.0/10`）。

## 合并了原来的三个模块

| 旧模块 | 现在的去处 |
| --- | --- |
| [rules/lan-bypass](../lan-bypass/) | 三段全部并入本模块（旧文件保留但不再更新） |
| [rules/real-ip-domains](../real-ip-domains/)（核心） | 并入本模块 `real_ip_domains` 段 |
| [rules/real-ip-domains-extra](../real-ip-domains/)（扩展） | 并入本模块 `real_ip_domains` 段 |

旧订阅地址还能用，但内容冻结在合并当天。**装这一个就够了，三个旧模块都要先停用**，否则重复命中（虽然 Egern 对数组是并集，不会报错，但没必要）。

合并的代价：`real_ip_domains` 是纯字符串数组，没有 per-entry 的 `disabled` 开关，所以原来「核心 / 扩展」两档在这里并成了一个列表。不想要音乐/游戏/工具那几段，删掉 yaml 对应段落即可 —— 下次同步会加回来，要长期去掉请改 `sync.py` 的 `DROP_EXACT`。

## 三段各自在干什么

### 1. bypass_tunnel_proxy（不进隧道）

Fake IP 只解决「域名怎么解析」，管不了组播、广播、链路本地这些没有域名也没法被 DNS 劫持的流量 —— 这些必须靠连接层豁免。另外运营商 App、银行 App 常主动探测代理，直连成功率更高。

命中这段的流量**完全脱管**：规则、脚本、去广告、抓包都不生效。所以这里的公网域名要克制，`www.baidu.com` 这种是上游长期验证过才留的。

### 2. real_ip_domains（走隧道，但用真实 IP）

`real_ip_domains` 不是 Fake IP 列表，而是 **Fake IP 的白名单**。官方文档定义：`List of domains that use real IP (not Fake IP)`。

不放进来的后果很具体：

- 门户检测拿到假地址 → 系统误判「无网络」或反复弹认证页
- STUN 拿到假地址 → 语音/视频通话、Switch/PS 联机匹配失败
- NTP 拿到假地址 → 校时失败，时间漂移
- 版权/音质校验拿到假地址 → 网易云变灰、Netflix 起播失败
- NAS 域名拿到假地址 → 远程访问连不上

银行 / 运营商 / 支付类**不在这一段**：它们要的是「完全不进隧道」，已经放在第 1 段。

### 3. mitm.excludes（不解密）

证书钉扎的 App（Facebook / Instagram / Twitter / 抖音系）一解密就白屏或断连；`gateway.icloud.com`、`weather-data.apple.com` 解密后系统服务直接失效。

注意：这段只做「排除」，**不会替任何域名开启 MITM**。你自己的 MITM 名单照旧。

## 自动更新

`.github/workflows/sync-general.yml`：每天 05:23 UTC（北京时间 13:23）跑一次，`workflow_dispatch` 可手动触发；内容没变化不提交。

**刻意做成不容易触发 GitHub 风控**：

- 只 GET `raw.githubusercontent.com`（CDN），**完全不调用 `api.github.com`**
- **不带 token**，不消耗 REST 额度（60/5000 每小时），不碰 code search 的独立限流
- 一天一次、约 20 个请求；间隔 0.3s，失败只退避重试 1 次
- `concurrency` 锁组 + 无变化不提交，不会高频 commit

名单来源（全部可机读，无需抓包）：

- Egern 配置的 `real_ip_domains`：fmz200/wool_scripts、MeALiYeYe/ProxyConfigFiles、lainbo/gists-hub、oceanxux、kanwox、ifflagged/Romeo & Miami、Raphael689/RW、linchao10058、Jard1n、ZLam、Teakowa、JoySky、byyoshen、yssqtao、Matrix-CN、CaoXiaoMann、IvanSolis1989、axtyet/Luminous
- Surge 的 `always-real-ip`（语义等价）：VirgilClyne/GetSomeFries、canff/surge

自动剔除：银行/运营商/支付、`*.cn` `*.apple.com` 这类超宽泛条目、上游手滑拼出来的脏条目（`*.a.com*.b.net`）、纯 IP 与 CIDR、模板残留。

## 手工改吗

- `real_ip_domains` 段**不要手改**，下次同步会覆盖；要长期增删请改 `sync.py`
- `bypass_tunnel_proxy` / `mitm` 段是脚本里的静态常量，同样改 `sync.py` 的 `BYPASS_GROUPS` / `MITM_GROUPS`

## 本地运行

```bash
python3 sync.py             # 拉上游 → 重写 general-enhanced.yaml
python3 sync.py --check     # 有变化 exit 1（CI 用）
python3 sync.py --dry-run   # 只打印，不落盘
```

## 已知取舍

- `17.0.0.0/8`（Apple 自有段）整段不进隧道，范围很大，但对部分 Apple 服务确实是必要的；介意就去掉 `sync.py` 的 `BYPASS_GROUPS` 里那一行（直接改 yaml 会被下次同步覆盖）。
- 真实 IP 段里的域名在代理端会以真实 IP 出现（域名仍会一起传），对隐私敏感的场景自行删减。
- 上游条目数会波动（有人整理、有人删库），别拿条数当稳定性指标。
