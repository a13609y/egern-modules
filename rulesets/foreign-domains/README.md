# 国外域名规则集

**这是规则集，不是模块。** 只包含「国外域名」，中国域名一条都没有——中国站默认直连，不需要在这里出现。

## 地址

```yaml
# Egern rule_set
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rulesets/foreign-domains/foreign-domains.yaml

# 通用文本（Clash / Surge / Loon 也能用）
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rulesets/foreign-domains/foreign-domains.txt
```

## 怎么用（Egern）

在你的主配置 `rules:` 里加一条，放在中国规则之后：

```yaml
rules:
  # 1. 中国域名 → 直连（用你原来的中国规则集）
  - rule_set:
      match: "https://example.com/china-domains.yaml"
      policy: DIRECT
      update_interval: 86400

  # 2. 国外域名 → 代理
  - rule_set:
      match: "https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rulesets/foreign-domains/foreign-domains.yaml"
      policy: Proxy          # ← 改成你策略组的名字
      update_interval: 86400

  # 3. 其余兜底
  - default:
      policy: DIRECT
```

规则按顺序匹配，命中即停。所以**中国规则要在这条前面**，否则 `google.com` 之类没问题，但中国域名不会受影响（因为本集里根本没有中国域名，互不干扰）。

其实只有本规则集 + `default: DIRECT` 也能跑：国外域名走代理，其余直连。

## 里面有什么

| 字段 | 条数 | 含义 |
|---|---|---|
| `domain_suffix_set` | 26,466 | 后缀匹配（`example.com` 同时匹配其所有子域） |
| `domain_set` | 131 | 精确匹配（只匹配域名本身） |
| `domain_regex_set` | 158 | 正则匹配（v2fly 里用正则表达的服务） |
| `geoip_set` | 248 | IP 侧：**除 CN 以外的全部国家/地区代码** |
| `no_resolve` | `true` | IP 规则只用「已知目的 IP」判断，不为了匹配而做 DNS 解析 |

合计 **26,755 条域名** + **248 个国家/地区**，YAML 约 490 KB，文本版约 750 KB。

### IP 部分是怎么表达「国外」的

没有「国外 IP 段清单」这种东西——IPv4 有上百万个段，没人能列完。所以用 GeoIP 反向表达：

```yaml
no_resolve: true
geoip_set: [AD, AE, AF, AG, ... ]   # 249 个 ISO 代码里去掉 CN
```

只要目的 IP 归属地是「除 CN 以外的任何国家」，就算命中。这比列 CIDR 完整得多，也比「列中国段再取反」稳（取反不是所有客户端都支持）。

`no_resolve: true` 的实际含义：**当请求只有域名、IP 还没解析出来时，不去为了匹配这条 IP 规则而额外做一次 DNS 解析**。所以它只对「App 直接连 IP」或「已经解析过」的流量生效，不会拖慢域名请求，也不会泄漏 DNS。

## 数据从哪来

| 上游 | 内容 |
|---|---|
| [v2fly/domain-list-community](https://github.com/v2fly/domain-list-community) | `geolocation-!cn`：「在中国大陆没有接入点的域名」，含 210 个 include 子类（AI、流媒体、社交、开发工具…） |
| [Loyalsoldier/clash-rules](https://github.com/Loyalsoldier/clash-rules) | `proxy.txt`：社区维护的「必须走代理」清单 |
| 同上 | `direct.txt`：中国域名，仅用于**从上面两个集合里剔除**，避免同一个域名既在代理集又在直连集 |

## 自动更新（每天一次，不会触发风控）

`.github/workflows/sync-foreign-domains.yml`，每天 05:23 UTC：

```
1 次 codeload tar 包（344 KB，一次拿全仓 1555 个 data 文件，避免 210 次 include 请求）
+ 2 次 raw.githubusercontent 文本
= 每天 3 个请求
```

- **不调用 GitHub API**，不消耗 60 次/小时的额度，也不用 token；
- 内容不变就不提交，仓库不会被空提交刷屏；
- 校验不过就不写：条目 < 5000、出现中国域名残留、正则编译失败 → 直接失败；
- `concurrency` 串行，连续触发只跑最新一次。

Egern 侧靠 `update_interval: 86400` 每天自动拉新，**规则集更新不需要改配置**。

## 取舍

- **「全部国外域名」不存在有限清单**。这里覆盖的是「已知的、有名字的」国外服务（约 2.6 万），长尾的新域名不会自动进来——这是任何国外域名清单的固有上限。
- 所以建议保留 `geoip: CN → DIRECT` 作为兜底：清单漏掉的域名，只要解析到中国 IP 仍然直连。
- **GeoIP 归属不等于「服务归属」**：部分中国站点的 CDN 边缘节点在海外，会被判成国外走代理；反之亦然。这是 geoip 方案的固有误差，需要的话在更靠前的规则里单独放行。
- **正则条目会和 Egern 的正则引擎匹配**。上游用的是 Go/RE2 语法，我在生成时用 Python `re` 预编译过滤过一遍，编不过的直接丢弃，避免一条坏正则导致整个规则集加载失败。
