# Pinterest 去广告（Egern 模块）

移除 Pinterest App 信息流、搜索结果、「更多类似内容」中的**推广 Pin（Promoted Pins）**，并拦掉广告与点击追踪域名。

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.yaml
```

Egern → 工具 → 模块 → `+` → 粘贴上面的地址 → 保存。
**必须开启 MITM 并在「系统设置 → 通用 → VPN 与设备管理」里信任 Egern 证书**，否则 HTTPS 响应改不了。

## v2.0.0 修了什么（重要）

v1 实测问题：**广告确实没了，但用几分钟后，从首页点开一张图，下面「更多类似内容」一直转圈加载不出来**（刚装完那几分钟正常，是因为走的是本地缓存）。

原因：v1 会把 `ads` / `promoted_pins` 这类**广告容器键整条 `delete`**，也会把按 id 索引的字典整条删项。客户端代码里往往直接写 `data.ads.forEach(...)` 或依赖该键存在，读到 `undefined` 就抛异常 → 整个响应作废，那一块 UI 就永远加载不出来。首页前几分钟没事，是因为缓存还在。

v2 改成 **shape-preserving（保持结构）**：

| v1 | v2 |
| --- | --- |
| `delete node["ads"]` | `node["ads"] = []`（键保留，值清空；对象则清成 `{}`） |
| 字典项命中也删 | 只在非 `/related/` 路径下删，`/related/` 一律不动字典 |
| 认 `ad_id` / `campaign_id` / `promotion_id` / `type` 启发式 | 默认只认明确的 `is_promoted` / `is_sponsored` / `is_ad === true`（启发式移到 `AGGRESSIVE` 开关后面） |

## 它做了什么

| 层 | 内容 |
| --- | --- |
| 响应改写 | `api.pinterest.com` 的 JSON 响应递归清理：抽掉带 `is_promoted` / `is_sponsored` / `is_ad` 标记的条目，广告容器键保留为空 `[]` / `{}` |
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
4. 「更多类似内容 / 相关推荐」加载不出来 → v2 已针对性修过。若还有：
   - 打开 `pinterest.js`，把 `var SKIP_RELATED = false;` 改成 `true` —— 该路径完全原样放行，内容一定能加载（代价是这部分广告会回来）。先确认这样是否就正常了，能正常说明还是改写逻辑的问题，把设成 `DEBUG = true` 后 Egern 日志里 `[pinterest]` 开头的行发我。
   - 若换图片时偶发，注意 v1 之外的另一个嫌疑：`REJECT api.pinterest.com 的 UDP 443` 那条规则。部分系统上 HTTP/3 连接被拒后 App 会反复重试 QUIC 而不是立刻回落 TCP，表现就是「缓存用完后新内容加载不出来」。把那条 `and` 规则注释掉试一次即可判断。
5. 白屏 / 加载失败 → 说明脚本弄坏了响应。直接关掉模块，把请求日志贴到 issue。

## 文件

- `pinterest.yaml` —— 模块本体（rules / mitm / scriptings）
- `pinterest.js` —— Egern `http_response` 脚本，`export default async function (ctx)`，返回 `{ body }` 或 `undefined`
- `test.mjs` —— 13 条用例（结构变体、字典索引、story 包装、非 JSON、空 body、误伤防护、1MB 性能），`node test.mjs` 直接跑
