# 番茄小说去广告（增强版 · Egern）

替代 `ByteValley/NetTool` 的「字节净化」——那个模块只有 31 行、靠 `domain_keyword: -lf / -lq / -hl` 判断，覆盖不到番茄广告的另外几条路，所以会出现「一会儿能去、一会儿又冒出来」。

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules/main/rules/fanqie-adblock/fanqie-adblock.yaml
```

Egern → 模块 → 添加订阅 URL → 启用。

## 自动跟随上游

**这个模块不需要人来维护。** `.github/workflows/sync-fanqie.yml` 每天 03:41 UTC（北京时间 11:41）跑一次 `sync.py`：

```
上游 5 个源  →  抽取域名  →  过滤（相关性 / 具体子域 / 硬黑名单）  →  重写 fanqie-adblock.yaml  →  有变化才提交
```

| 上游 | 拉什么 | 更新频率 |
|---|---|---|
| [abclq/home-dns-adblock](https://github.com/abclq/home-dns-adblock) | `dist/clash-surge-rules.txt` + `config/adblock-fq.conf`（真机 DNS 日志验证过的精确规则、带误伤记录） | 每天 |
| [bluee1111/egern-hongguo-adblock](https://github.com/bluee1111/egern-hongguo-adblock) | `hongguo-adblock.yaml`（红果/番茄原生 Egern 模块，穿山甲拦截） | 不定期 |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) | `Surge/.../FanQieNovel.sgmodule` | 不定期 |
| [honue/rules](https://github.com/honue/rules) | `Loon/plugin/FanQieNovel.plugin` | 不定期 |

想立刻拉一次：仓库 → Actions → `sync-fanqie` → Run workflow。

### 为什么敢全自动

上游给的是「域名」，脚本只做**收紧**，不做放开：

- **只收具体子域**：段数 < 3 的一律丢弃，裸域永远不会被写进规则；
- **相关性过滤**：只保留命中 `zijieapi / snssdk / fqnovel / qznovelvod / byteimg / pstatp / pangolin …` 的条目；
- **硬黑名单 `NEVER`**：拦了必出事的串（`novel-sign`、`reading-video`、`sinf`、`gecko`、`webcast`、`douyincdn`、`fqnovelpic`、`ecombdapi` …）**哪怕上游加进来也直接丢弃**；
- **归因类降级**：`i.snssdk.com` / `applog` / `-misc-` 这类不删除，只写成 `disabled: true` 的备用档；
- **空结果保护**：解析不到 15 条就拒绝生成，防止上游改格式把模块刷成空壳；
- 工作流还会再跑一遍 YAML 校验 + 黑名单断言，任何一条泄漏都直接失败，不会提交。

### 手动跑

```sh
python3 sync.py            # 生成
python3 sync.py --check    # 有变化 exit 1
python3 sync.py --dry-run  # 只打印
```

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

`ads*` 接口被拒后，番茄的广告 SDK 会**降级到穿山甲**换一条线路再要一次广告——这就是「一会儿有、一会儿没有」的直接原因：主链路堵住了，备用链路还开着。

另外，纯 `REJECT` 是**断开连接**，SDK 看到的是超时/失败，会重试；本模块对穿山甲接口追加了 `url_rewrites → reject-dict`，直接返回 `{}`，SDK 拿到「没有广告」的正常响应就会立刻收工。

## 两层保险

除了上游域名，模块还固定生成 5 条**家族正则**：

```
^ads\d*-normal(-[a-z0-9]+)?\.zijieapi\.com$
^minigame\d*-normal(-[a-z0-9]+)?\.zijieapi\.com$
^tnc\d+-(aliec\d+|alisc\d+)\.zijieapi\.com$
^p\d+-ad-sign\.byteimg\.com$
^v\d+-(bd-daily-|se-daily-|se-sjy-daily-)?reading-ad\.qznovelvod\.com$
```

上游还没抓到的子域（`ads7-normal-lq`、`v17-reading-ad` 之类）也能被覆盖。

## 刻意没拦的（拦了会出事）

- `fqnovelvod.com` 裸域 —— 正片 CDN 主域
- `p*-novel-sign.byteimg.com` —— 正片签名 CDN（和 `-ad-sign` 一字之差）
- `*-reading-video.qznovelvod.com` —— 正片视频（广告是 `-reading-ad`）
- `api*-normal-sinfonline*.fqnovel.com` —— 反作弊风控，拦了 App 功能异常
- `is.snssdk.com`、`gecko.snssdk.com` —— 风控 / H5 离线包
- 所有 `douyincdn.com` / `douyinliving.com` / 直播域名 —— 影响短剧与直播

## 还想更狠

模块里标记 `disabled: true` 的备用档是归因/上报域（`i.snssdk.com`、`log*-applog-*`、`mon*-misc-*`）。想再少几秒开屏就在 Egern 里手动打开，代价是个别版本可能影响登录/金币判定，出问题按原样关回去。

## MITM 说明

域名规则**不装证书也能拦**。只有 `url_rewrites` 那三条需要 `mitm` 里的域名，没装 Egern 根证书时它们自动不生效，不影响其它规则。
