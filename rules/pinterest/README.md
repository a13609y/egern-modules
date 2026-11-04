# Pinterest 去广告（Egern 模块）

移除 Pinterest App 信息流、搜索结果、「更多类似内容」中的**推广 Pin（Promoted Pins）**，并拦掉广告与点击追踪域名。

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/pinterest/pinterest.yaml
```

Egern → 工具 → 模块 → `+` → 粘贴上面的地址 → 保存。
**必须开启 MITM 并在「系统设置 → 通用 → VPN 与设备管理」里信任 Egern 证书**，否则 HTTPS 响应改不了。

## 它做了什么

| 层 | 内容 |
| --- | --- |
| 响应改写 | `api.pinterest.com` 的 JSON 响应递归清理：删掉带 `is_promoted` / `is_sponsored` / `is_ad` / `ad_id` / `campaign_id` 等标记的条目，以及 `ads` / `promoted_pins` / `sponsored_pins` / `shopping_ads` 这类广告容器 |
| 域名拦截 | `ads.` `ad.` `ct.` `trk.pinterest.com` → REJECT（ct 是转化/点击追踪） |
| 反规避 | 拒绝 `api.pinterest.com` 的 UDP 443，逼它走 TCP，否则 QUIC 绕过 MITM |

**不动的**：`i.pinimg.com` / `s.pinimg.com` 图片 CDN、`log.pinterest.com`（App 自身埋点，拦了容易触发重试）。
如果确实想连埋点一起拦，自己在模块里加一行 `domain: log.pinterest.com → REJECT`。

## 为什么不用现成的

GitHub 上没有 Egern 版，只有 Surge / Loon / Shadowrocket 的：

- **可莉（iKeLee / kelee.one）** `Pinterest_remove_ads.sgmodule` —— 事实上的上游，几乎所有镜像站都是它。用的是 Surge/Loon 的 `http-response-jq`，只钉死两个路径：
  `/v\d/feeds/home/` 和 `/v\d/pins/\d+/related/modules/`。App 接口一变就失效。
- **renvder/Proxy_Tools** 的 Shadowrocket 脚本 —— 接口匹配放开到整个 `api.pinterest.com/v3/`，递归清理，但判断里塞了「任何键名含 promoted/sponsor/advert 就算广告」的激进启发式，会误伤正常内容。

本模块用 Egern 原生 `http_response` 脚本：匹配整站、按明确字段判定、只在**确实删掉了东西**时才回写 body，其余一律原样放行（fail open）。

## 失效了怎么办

1. 先确认 MITM 证书已信任、模块已启用。
2. 广告还在，但没有任何报错 → 大概率是 Pinterest 换了广告标记字段。打开 `pinterest.js`，把顶部 `var AGGRESSIVE = false;` 改成 `true` 再试（激进模式按键名含 promoted/sponsor/advert 判定，可能误伤，只是排查手段）。
3. 接口换了域名（比如改成 `api2.pinterest.com`）→ 模块的 `match` 已经写成 `api\d*`，一般不用改；若真换了新域名，补 `mitm.hostnames` 与 `scriptings.match`。
4. 白屏 / 加载失败 → 说明脚本弄坏了响应。直接关掉模块，把请求日志贴到 issue。

## 文件

- `pinterest.yaml` —— 模块本体（rules / mitm / scriptings）
- `pinterest.js` —— Egern `http_response` 脚本，`export default async function (ctx)`，返回 `{ body }` 或 `undefined`
- `test.mjs` —— 13 条用例（结构变体、字典索引、story 包装、非 JSON、空 body、误伤防护、1MB 性能），`node test.mjs` 直接跑
