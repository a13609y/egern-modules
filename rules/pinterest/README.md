# Pinterest 去广告（Egern 模块）

跟随上游 **可莉（kelee.one）** 的 `Pinterest_remove_ads` 自动同步的 Egern 版本。

## 订阅

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.yaml
```

Egern → 工具 → 模块 → `+` → 粘贴地址 → 保存。
需要开启 MITM 并在系统里信任 Egern 证书。

## 自动同步上游

`.github/workflows/sync-pinterest.yml` 每天北京时间 11:53 跑一次 `rules/pinterest/sync.py`：

1. 依次尝试上游的 Surge / Loon 源（多个镜像，第一个成功的为准）；
2. 解析其中的 `http-response-jq`（Surge）与 `response if ${url} ~= /…/ then response.json.jq(…)`（Loon）规则；
3. 把「路径白名单 + `.data |= map(select(.is_promoted == false …))`」等价翻译成 Egern 的 `http_response` 脚本；
4. 重新生成 `pinterest.js` 与 `pinterest.yaml`，内容没变就不提交。

所以上游改了接口路径，这边**下一天自动跟上**，不用手动改代码。

## 它做了什么

| 层 | 内容 |
| --- | --- |
| 路径 | 只命中上游那两条：`/v\d/feeds/home/`、`/v\d/pins/<id>/related/modules/`。其余路径（包括 `/v3/visual_search/…/module/`）**不接手、连 body 都不读** |
| 动作 | 把 JSON 里 `data` 数组中的 `is_promoted` 条目剔除，不改任何键的存在性；解析失败 / 非 JSON / 没删东西 → 原样放行 |
| 域名 | `ads` / `ad` / `ct` / `trk`.pinterest.com → REJECT |

## 已知问题（真机实测，2026-11-10）

pin 详情页下方的「更多类似内容」有时会一直显示灰色骨架屏。**已确认与本模块无关**：
把所有 Pinterest 相关模块全部关闭后问题依旧，上游原版模块在 Egern 上也同样坏。
真实接口是 `https://api.pinterest.com/v3/visual_search/stela/pins/<id>/module/`，属于 App / 网络链路侧的问题。

## 文件

- `pinterest.yaml` —— 模块本体（由 `sync.py` 生成）
- `pinterest.js` —— Egern `http_response` 脚本（由 `sync.py` 生成，请勿手改）
- `sync.py` —— 拉上游 + 等价翻译 + 落盘
- `icon.png` —— 图标

## 上游参考

```
http-response-jq ^https:\/\/api\.pinterest\.com\/v\d\/feeds\/home\/\? '.data |= map(select(.is_promoted == false or .is_promoted == "false"))'
http-response-jq ^https:\/\/api\.pinterest\.com\/v\d\/pins\/\d+\/related\/modules\/\? 同上
```

镜像：`axtyet/Luminous`、`ifflagged/Romeo`、`bunizao/Mirrored`、`fkingikelee/fkikelee`。
