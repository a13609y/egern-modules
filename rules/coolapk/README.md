# 酷安去广告（Egern）

彻底去掉酷安的开屏广告、热启动开屏、首页/动态详情/评论区的赞助卡片和热搜。规则与脚本**自动跟随上游** [alloflights/shadowrocket-rules](https://github.com/alloflights/shadowrocket-rules)，本仓库只做 Surge → Egern 的格式转换。

## 订阅地址

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/coolapk/coolapk.yaml
```

## 安装

1. Egern → 工具 → 模块 → `+` → 粘贴上面的地址 → 保存，确认模块已启用。
2. Egern 里 **开启 MITM 并已安装、信任证书**（`api.coolapk.com` / `api2.coolapk.com`）。
3. **删除重装酷安一次**（上游原话：部分广告位和开屏配置缓存在本地，不重装看不到效果）。

## 它做了什么

| 类型 | 内容 | 为什么必须有 |
| --- | --- | --- |
| `rules` | `UDP + 443 + api.coolapk.com/api2.coolapk.com → REJECT` | 酷安会走 QUIC(HTTP/3)。QUIC 不经过 MITM，**不拦住它脚本永远不跑**，这是"装了没效果"的头号原因 |
| `rules` | `ad.api.coolapk.com → REJECT` | 广告专用子域 |
| `url_rewrites` | `search?type=hotSearch → {}` | 热搜推广位 |
| `http_request` | `/v6/main/init` 去掉 `If-None-Match` / `If-Modified-Since` | 否则服务端回 304，客户端继续用带广告的旧缓存，响应脚本连数据都拿不到 |
| `http_response` | `/v6/main/init` | 删掉开屏卡（`imageCard`）、把配置卡 6390 的 `SplashAd.*` 改成"不启用 / 0 秒 / 热启动关闭" |
| `http_response` | `/v6/(main/(indexV\d+\|dataList)\|page/dataList\|feed/(detail\|replyList\|index))` | 按广告模板名、已知广告位 entityId、广告标记字段删卡片；评论区过滤无 `id` 的占位回复 |

MITM 只覆盖 `api.coolapk.com`、`api2.coolapk.com` 两个域名，不写分流规则以外的任何东西。

## 自动更新：两层

```
alloflights/shadowrocket-rules ──每天 03:23 UTC──▶ 本仓库 coolapk.js + yaml ──Egern 每 24h──▶ 设备
                                 (GitHub Actions)                        (update_interval)
```

- **上游 → 本仓库**：`.github/workflows/sync-coolapk.yml` 每天跑 `rules/coolapk/sync.py`，把上游的 Surge/Shadowrocket 模块拆成 Egern 的 `rules` / `url_rewrites` / `mitm` / `scriptings`；内容有变化才提交。生成结果必须先过 `node --check` + 10 条行为测试 + YAML 断言，否则不提交。
- **本仓库 → 设备**：模块里 `update_interval: 86400`，Egern 默认 24 小时检查一次模块更新，脚本跟着模块一起拉。

想手动催一次：仓库 Actions → `sync-coolapk` → Run workflow。连续推送时工作流开了 `cancel-in-progress`，只跑最新一次。

## 转换做了什么（为什么不能直接订阅上游）

上游是 Surge / Shadowrocket 写法：`$request` / `$response` / `$done`，同一份 JS 同时承担请求脚本和响应脚本。
Egern 是 `export default async function (ctx)`，请求/响应分成两种声明，响应体要 `await ctx.response.text()` 读。

`sync.py` 生成的 `coolapk.js` 是**薄兼容壳**：上游脚本原样嵌入，壳负责

- 有 `ctx.response` → 响应模式，把响应体塞进 `$response.body`
- 没有 → 请求模式，把 Headers 转成普通对象供上游增删
- `$done(x)` 用哨兵异常模拟 Surge 的"立即结束"

> ⚠️ 坑：上游普遍写成 `try { ... $done(结果) } catch (e) { $done({}) }`。哨兵异常会被上游自己的 `catch` 吞掉，然后补调一次 `$done({})`，把正确结果覆盖成空。所以壳里的 `$done` **只认第一次调用**（先到先得），后续调用只抛哨兵、不改结果。

失败行为是 **fail open**：上游抛错（JSON 解析失败、字段结构变了）→ 原样放行，不会把酷安弄坏。

## 已知边界

- **首次生效需要重装酷安**，这不是模块的问题，是客户端缓存。
- 只到「静态 + 行为测试」验证，没有真机跑过；上游每天都在改，若某个广告位回归，先看上游有没有更新。
- 上游对"值得买 / 红包"这类关键词只在 `entityType === "card"` 时才删（避免误删正常动态）。如果你看到正文里出现这两个词，那是正常的，不是漏删。

## 本地验证

```sh
cd rules/coolapk
python3 sync.py --dry-run                     # 看会生成什么
python3 sync.py                               # 重新生成
cp coolapk.js coolapk.mjs && node test.mjs    # 10 条行为测试
```

## 出处与致谢

- 上游：[alloflights/shadowrocket-rules](https://github.com/alloflights/shadowrocket-rules)（`modules/coolapk.sgmodule` + `modules/scripts/coolapk.js`，v3.3.x）
- 早期版本曾用 zirawell/R-Store 的上游，但它不覆盖 `api2` 子域、不拦 QUIC、也没有请求阶段的去缓存处理，实测会残留广告，已弃用。
