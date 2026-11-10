# Pinterest 去广告（Egern 模块）

## 先说结论（2026-11-10 真机实测）

**在 Egern 上，只要对 `api.pinterest.com` 开启 MITM，「更多类似内容」这一块就会永久转圈。**

实测证据：

| 测试 | 结果 |
| --- | --- |
| 只开 MITM，脚本 match 指向不存在的域名（永不运行） | **仍然坏** |
| 上游可莉版（Surge sgmodule 导入 Egern） | **同样坏** |
| 全部模块关掉 | 正常 |

所以问题不在改写逻辑，**在于这个域名被拦截本身**。Pinterest App 在 pin 详情页会请求
`https://api.pinterest.com/v3/visual_search/stela/pins/<id>/module/`（这是「更多类似内容」的真实接口），
响应经过 MITM 之后客户端就不认了。

## 两种用法（二选一，不要同时装）

### A. 纯域名版（推荐，零副作用）

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest-domain-only.yaml
```

不启用 MITM、不挂脚本，只 REJECT 明确的广告/追踪域名（`ads` / `ad` / `ads-api` / `ct` / `trk`.pinterest.com）。
页面完全正常，代价是瀑布流里的推广 Pin 去不掉（它们混在正常 JSON 里，不改写响应拿不掉）。

### B. MITM 改写版（广告优先，有副作用）

```
https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.yaml
```

只命中 `/v\d/feeds/home/` 与 `/v\d/pins/<id>/related/modules/`（与上游可莉版一致），按 `is_promoted` 过滤 `data` 数组。
首页、搜索的推广 Pin 会被去掉；**但 pin 详情页下方的「更多类似内容」会一直显示灰色骨架屏**。
如果你用的是 Surge / Loon，那套上游原版在那边是正常工作的，问题只出现在 Egern。

## 必须知道的两个 Egern 坑

1. **`script_url` 有 24 小时缓存**。改了脚本内容但文件名不变，Egern 会一直跑旧代码。要换文件名（比如 `pinterest-v5.js`）才能强制重新下载。
2. **模块更新后要确认真的生效**：重新打开模块看一眼 `script_url` 指向的文件名是否是新版，必要时删掉模块重新添加。

## 文件

- `pinterest-domain-only.yaml` —— 纯域名版（不 MITM）
- `pinterest.yaml` —— MITM 改写版（v5.0.0，脚本 `pinterest-v5.js`）
- `pinterest-v5.js` —— 改写脚本，只处理 feeds/home 与 pins/related/modules
- `pinterest.js` / `pinterest-diag.js` —— 历史版本与诊断版（`MODE = 'log'`，只记日志不改写），排查问题时用

## 上游参考

可莉（kelee.one）的 Surge / Loon 模块是事实标准，几乎所有镜像都同源：

```
http-response-jq ^https:\/\/api\.pinterest\.com\/v\d\/feeds\/home\/\? '.data |= map(select(.is_promoted == false or .is_promoted == "false"))'
http-response-jq ^https:\/\/api\.pinterest\.com\/v\d\/pins\/\d+\/related\/modules\/\? 同上
```

镜像：`axtyet/Luminous`、`ifflagged/Romeo`、`bunizao/Mirrored`。
