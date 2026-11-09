# 分流：中国直连 · 其余走代理

## 订阅

模块（含分流规则）：

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/route-cn/route-cn.yaml
```

规则集本体（模块会自动拉，一般不用单独加）：

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/route-cn/cn-domains.yaml
```

## 它在做什么

```
局域网 / 私有 IP        → DIRECT
命中「中国域名清单」     → DIRECT   （112,000+ 条，每天更新）
解析到中国 IP(geoip CN) → DIRECT   （清单漏了的兜底）
其余                    → 代理      （{{{FINAL_POLICY}}}）
```

也就是 **除了中国，全都走代理**。域名清单 + IP 兜底两层，漏一个域名也不会直接连出去。

## 装完必须做的一件事

改掉兜底策略名。模块参数 `FINAL_POLICY` 默认是 `Proxy`，把它改成你配置里真实的策略组名称（比如「节点选择」「手动选择」「PROXY」）。

**名字对不上时**，Egern 找不到这个组，这条规则等于失效，流量会落到你主配置里后面的规则——不会断网，但也不会按预期走。

## 如果你主配置里已有兜底

Egern 的模块规则会合并进主配置。如果你本来就写了一条 `default`，两条会重叠——建议二选一：

- 用本模块的兜底：把你主配置里的 `default` 删掉；
- 或者禁用本模块的第 4 条规则（模块 YAML 里 `default` 那条加 `disabled: true`）。

## 规则从哪来

| 上游 | 内容 | 规模 |
|---|---|---|
| [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) | `ChinaMax_Domain` | 约 110,000 |
| [Loyalsoldier/clash-rules](https://github.com/Loyalsoldier/clash-rules) | `direct.txt` | 约 110,000 |
| [felixonmars/dnsmasq-china-list](https://github.com/felixonmars/dnsmasq-china-list) | `accelerated-domains.china.conf` | 约 109,000 |

三家合并去重后 **112,375 条**，再按后缀冗余裁剪（`a.b.com` 在 `b.com` 已存在时丢弃，匹配语义不变），按字母序输出。

## 自动更新

`.github/workflows/sync-route-cn.yml` 每天 04:17 UTC 跑一次：

```
拉 3 个上游 → 归一化 → 合并 → 去冗余 → 重写 cn-domains.yaml → 有变化才提交
```

- 只用 `raw.githubusercontent.com` 拉文本，**不调 GitHub API**，不消耗额度、不触发搜索限流；
- 每天 3 次请求，带明确 UA，请求量对 GitHub 来说可以忽略；
- 内容不变就不提交，仓库不会被日常空提交刷屏；
- 校验不过（条目太少 / 有重复 / 出现 `com`、`google.com` 之类危险条目）直接失败，不写入。

模块侧：Egern 通过 `rule_set` 的 `update_interval: 86400` 每天拉一次，**不用重装模块**，规则自己会变新。

想立刻更新一次：Actions → `sync-route-cn` → Run workflow。

## 已知取舍

- **清单越大越稳，但 Egern 加载也越慢**。1.8 MB / 11 万条属于偏大的量级，首次加载可能有一两秒延迟，之后走缓存。如果觉得重，可以把 `rule_set` 换成上游精简版（如 `China_Domain`），我这边改个参数就能出。
- **不是所有中国服务都在清单里**。所以加了 `geoip: CN` 兜底；仍然可能有「中国域名解析到海外 IP」的个例走代理，属正常。
- **Apple / 微软等服务是双栈**，部分域名在国内也在清单里，会直连；需要走代理请在主配置里加更靠前的规则（Egern 规则顺序优先）。
