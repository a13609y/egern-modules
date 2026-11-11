# 真实 IP 域名（real_ip_domains）

开了 **Fake IP** 之后，Egern 对域名返回的是本地虚拟地址（`198.18.x.x` 一类，不可路由），
承载连接时再用这个假地址反查域名交给代理。这对绝大多数域名都是最稳的做法，不会漏 IP、也不会污染。

但有一小撮功能**必须拿到真实 IP**：

- 门户检测 / 连通性探测（`captive.apple.com`、`*.msftconnecttest.com`、`connectivitycheck`）
- STUN / TURN（各种语音、视频通话、Nintendo 联机）
- NTP 时间同步（`ntp.*`、`time.*`）
- 游戏机与平台联机（Nintendo、PlayStation、Xbox、Battle.net、Steam）
- NAS / 远程访问（Synology、UniFi、Plex、Tailscale、RustDesk）
- Apple 推送注册、iCloud 部分接口
- 音乐 / 视频的版权校验和 CDN 鉴权（网易云、QQ音乐、酷狗、Netflix 起播）

这些域名写进 `real_ip_domains` 后，Egern 会**真的去上游查一次**，把真实 IP 返回给应用。

> `real_ip_domains` ≠ `bypass_tunnel_proxy`。
> 前者仍走隧道（规则 / 脚本 / 抓包都生效，只是不用 Fake IP）；
> 后者是连接层彻底豁免，连 Egern 都不碰。银行、运营商、支付这类要的是后者。

## 订阅

| 档位 | 内容 | 订阅地址 |
| --- | --- | --- |
| 核心 | 局域网/本地、门户检测、STUN、主机联机、NTP、Apple 推送、NAS/远程 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/real-ip-domains/real-ip-domains.yaml` |
| 扩展 | 音乐/影音版权校验、第三方游戏平台、内网穿透与工具域 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/real-ip-domains/real-ip-domains-extra.yaml` |

为什么拆两个：Egern 的 `real_ip_domains` 是**纯字符串数组**，没有 `disabled` 开关，
没法像 `rules` 那样给条目加「默认关闭」。所以只能按档位拆成两个模块，想要扩展就再订阅一个。

两个模块互相独立，重复的域名没有副作用；和 [rules/lan-bypass](../lan-bypass/) 的 `real_ip_domains` 部分也允许重叠，
同时装不会冲突（Egern 对同一数组是并集）。

## 名单从哪来

`sync.py` 每天拉一次上游，**解析 → 去重 → 分类**，不硬编码任何域名：

- **Egern 配置里的 `real_ip_domains`**：fmz200/wool_scripts、MeALiYeYe/ProxyConfigFiles、lainbo/gists-hub、
  oceanxux、kanwox、ifflagged/Romeo & Miami、Raphael689/RW、linchao10058、Jard1n、ZLam、Teakowa、
  JoySky、byyoshen、yssqtao、Matrix-CN、CaoXiaoMann、IvanSolis1989、axtyet/Luminous 等
- **Surge 的 `always-real-ip`**（语义等价）：VirgilClyne/GetSomeFries、canff/surge

自动过滤掉的东西：

| 过滤项 | 原因 |
| --- | --- |
| 银行 / 运营商 / 支付（工行、招行、银联、支付宝、10086…） | 它们要的是 `bypass_tunnel_proxy`，放进 `real_ip_domains` 只是换了真实 IP，该坏的还是坏 |
| `*.cn` `*.direct` `*.test` `*.apple.com` 等超宽泛条目 | 等于把整个域都踢出 Fake IP，收益极小、误伤极大 |
| 上游手滑拼出来的脏条目（`*.a.com*.b.net` 这类标签内混通配符） | Egern 匹配行为未定义 |
| 纯 IP / CIDR、变量占位、`%INSERT%` 之类模板残留 | `real_ip_domains` 只收域名模式 |

## 自动更新

`.github/workflows/sync-real-ip.yml`：每天 04:17 UTC（北京时间 12:17）跑一次，
`workflow_dispatch` 可手动触发；内容没变化就不提交。

**不会触发 GitHub 风控**，这是刻意设计的：

- 只 GET `raw.githubusercontent.com`（CDN），**完全不调用 `api.github.com`**；
- **不使用任何 token**，所以既不消耗 REST API 的 60/5000 次小时额度，也不碰 code search 的独立限流；
- 一天一次、约 20 个请求；请求之间固定 0.3s 间隔，失败只退避重试 1 次；
- `concurrency` 锁死同组任务 + 内容不变不提交，不会产生高频 commit。

工作流里还有一段静态校验：条数下限、必须包含 `*.lan` / `*.local` / `stun` / `ntp` 类条目、
银行类关键词零泄漏、条目格式合法、无重复。

## 手工改吗

不要改 `real-ip-domains.yaml` / `real-ip-domains-extra.yaml`——它们是生成物，下次同步会被覆盖。
要加条目，改 `sync.py` 的 `DROP_*` / 分类正则，或者直接提 issue。

## 本地运行

```bash
python3 sync.py             # 拉上游 → 重写两个 yaml
python3 sync.py --check     # 有变化 exit 1（CI 用）
python3 sync.py --dry-run   # 只打印，不落盘
```

## 已知取舍

- 加进名单的域名**不再使用 Fake IP**，意味着这些域名在代理端会以真实 IP 的形式出现（域名仍会一起传）。对隐私敏感的场景请自行删减。
- 名单是**并集**，上游谁往里加一条就会跟进来。上游如果误加银行类域名，会被 `DROP_PATTERNS` 挡住；但如果误加了别的宽泛域名，需要在这里补规则。
- 上游条目数量有波动是正常的（有人整理、有人删库），不要拿条数当稳定性指标。
