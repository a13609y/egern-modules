# 酷安去广告（Egern）

去除酷安 App 的开屏推广、首页信息流广告、评论广告、商品推广卡等。规则与脚本**自动跟随上游** [zirawell/R-Store](https://github.com/zirawell/R-Store)，本仓库只做格式转换，不自己魔改逻辑。

## 订阅地址

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/coolapk/coolapk.yaml
```

## 安装

1. Egern → 工具 → 模块 → `+` → 粘贴上面的地址 → 保存。
2. 打开该模块（默认启用）。
3. 酷安 App **杀掉重开**；如果还有残留广告，清一次酷安缓存或重装（上游说明：部分广告位缓存在本地）。

> 需要 Egern 开启 MITM 并已安装/信任证书，否则 HTTPS 响应读不到，模块等于没装。

## 它做了什么

| 类型 | 内容 |
| --- | --- |
| MITM | `api.coolapk.com` |
| `http_response` 脚本 | `/v\d/feed/(detail\|replyList)`、`/v\d/main/(dataList\|indexV\|init)`、`/v\d/page/dataList` |
| 处理 | 过滤 `entityTemplate: sponsorCard`、无 `id` 的占位回复、"值得买 / 红包 / 酷安热搜"条目、`detailSponsorCard` / `include_goods(_ids)`、首页 Tab / 热门搜索 / 开屏配置项（entityId 944/945/6390） |

上游脚本里 `max-size=0`（不限）在 Egern 侧落成 `max_size: 8388608`（8 MB），避免信息流响应过大被跳过。

## 自动更新：两层

```
zirawell/R-Store  ──(每天 03:23 UTC, GitHub Actions)──▶  本仓库 coolapk.js + coolapk.yaml
                                                              │
                                                     (Egern 每 24h 拉一次模块/脚本)
                                                              ▼
                                                          你的设备
```

- **上游 → 本仓库**：`.github/workflows/sync-coolapk.yml` 每天跑 `rules/coolapk/sync.py`，把上游 Surge 模块转换成 Egern 格式；内容有变化才提交（不会产生空提交），转换结果还要过 JS 语法检查 + 7 条行为测试 + YAML 结构断言才允许提交。
- **本仓库 → 设备**：模块里 `update_interval: 86400`，Egern 默认 24 小时检查一次模块更新；脚本也跟着模块一起拉。想立刻生效就在模块页手动刷新/重新导入。

想临时关掉同步：去仓库 Actions 里停用 `sync-coolapk` 即可，已发布的文件保持不动。

## 转换做了什么（为什么不能直接用上游文件）

上游是 Surge 写法：`$request` / `$response` / `$done`。Egern 的 `http_response` 是 `export default async function (ctx)`，响应体要用 `await ctx.response.text()` 读。

`sync.py` 生成的 `coolapk.js` 是一个**薄兼容壳**：把上游脚本原样嵌进去，提供 `$request` / `$response` / `$done`，其中 `$done()` 用哨兵异常模拟 Surge 的"立即结束"。

失败行为是 **fail open**：上游脚本抛错（JSON 解析失败、字段结构变了、正则不匹配）时直接放行原始响应，不会把酷安的页面弄坏。

顺带修了上游的一处正则写法：`(?>` 原子组 JS 不支持，转换时降级成 `(?:`。

## 已知边界

- **上游没做的，这里也没有**：开屏广告的 Map Local（屏蔽热搜）在 R-Store 里是注释状态，转换时同样不启用；`www.coolapk.com/link` 跳转脚本也没带（那个属于链接修复，不是去广告）。
- 只在 **iOS + Egern** 验证到静态/行为测试层面；酷安版本迭代快，若某天广告回归，先看上游有没有更新，再提 issue。
- 只匹配 `api.coolapk.com` 的这几条路径，不动分流规则（`rules` 为空），不影响你自己的策略组。

## 本地验证

```sh
cd rules/coolapk
python3 sync.py --dry-run          # 看会生成什么
python3 sync.py                    # 重新生成
cp coolapk.js coolapk.mjs && node test.mjs   # 7 条行为测试
```

## 出处与致谢

- 上游规则/脚本：[zirawell/R-Store](https://github.com/zirawell/R-Store)（`Rule/Surge/Adblock/App/K/酷安` + `Res/Scripts/AntiAd/coolapk.js`）
- 上游脚本原始逻辑来自 RuCu6 等社区作者，仅作格式转换，未改动筛选逻辑。
