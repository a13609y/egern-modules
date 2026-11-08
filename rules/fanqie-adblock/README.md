# 番茄小说去广告（增强版 · Egern）

替代 `ByteValley/NetTool` 的「字节净化」——那个模块只有 31 行、靠 `domain_keyword: -lf / -lq / -hl` 判断，覆盖不到番茄广告的另外几条路，所以会出现「一会儿能去、一会儿又冒出来」。

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/fanqie-adblock/fanqie-adblock.yaml
```

Egern → 模块 → 添加订阅 URL → 启用。

## 启用后必做

1. 完全退出番茄小说（上滑杀掉，不是返回桌面）。
2. 清一次 App 缓存 / 或重装一次。
3. 重开番茄，等首页加载。

已经下载到本地的广告视频/配置会再播几次才彻底消失，这不是规则失效。

## 为什么原来的模块时灵时不灵

番茄的广告不止一条链路，原模块只堵了其中一条：

| 广告路径 | 原模块（-lf/-lq/-hl 关键词） | 本模块 |
|---|---|---|
| `ads3-normal-lq.zijieapi.com` 广告计费 | ✅ 命中 | ✅ |
| `minigame5-normal-hl.zijieapi.com` 小游戏广告位 | ✅ 命中 | ✅ |
| **穿山甲 SDK**（`pangolin-sdk-toutiao.com` / `pglstatp-toutiao.com` / `pangle.io`） | ❌ **漏** | ✅ |
| **广告图片签名** `p{3,6,9}-ad-sign.byteimg.com` | ❌ **漏** | ✅ |
| **章末/前贴片广告视频** `v*-reading-ad.qznovelvod.com` | ❌ **漏** | ✅ |
| 激励视频弹窗 `praisewindow.ugsdk.cn` | ❌ **漏** | ✅ |

`ads*` 接口被拒后，番茄的广告 SDK 会**降级到穿山甲**换一条线路再要一次广告——这就是「一会儿有、一会儿没有」的直接原因：拦住了主链路，备用链路还开着。

另外，纯 `REJECT` 是**断开连接**，SDK 看到的是超时/失败，会重试；本模块对穿山甲接口追加了 `url_rewrites → reject-dict`，直接返回 `{}`，SDK 拿到「没有广告」的正常响应就会立刻收工。

## 规则怎么来的

| 来源 | 用到的部分 |
|---|---|
| [abclq/home-dns-adblock](https://github.com/abclq/home-dns-adblock) | 45 条经真机 DNS 日志验证的精确域名，以及一份**实测误伤清单**（哪些域绝对不能拦） |
| [bluee1111/egern-hongguo-adblock](https://github.com/bluee1111/egern-hongguo-adblock) | 穿山甲拦截 + `reading-ad` 与 `reading-video` 的区分写法 |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) | 番茄小说 / 字节跳动 Surge 模块里的海外 CDN 与埋点域 |
| [honue/rules](https://github.com/honue/rules) | Loon 版 FanQieNovel 插件的 URL-REGEX 思路 |

## 刻意没拦的（拦了会出事）

- `fqnovelvod.com` 裸域 —— 正片 CDN 主域
- `p*-novel-sign.byteimg.com` —— 正片签名 CDN（和 `-ad-sign` 一字之差）
- `*-reading-video.qznovelvod.com` —— 正片视频（广告是 `-reading-ad`）
- `api*-normal-sinfonline*.fqnovel.com` —— 反作弊风控，拦了 App 功能异常
- `is.snssdk.com`、`gecko.snssdk.com` —— 风控 / H5 离线包
- 所有 `douyincdn.com` / `douyinliving.com` / 直播域名 —— 影响短剧与直播

## 还想更狠

模块里第 6、7 组规则是 `disabled: true`（埋点上报、`i.snssdk.com` 归因）。想再少几秒开屏就在 Egern 里把这几条打开，代价是个别版本可能影响登录/金币判定，出问题按原样关回去。

## MITM 说明

第 1~5 组是纯域名规则，**不装证书也能拦**。只有 `url_rewrites` 那三条需要 `mitm` 里的域名，没装 Egern 根证书时它们自动不生效，不影响其它规则。
