# 模块 · 脚本 · 分流规则合集

Egern 模块 / 脚本 / 分流规则合集。每个模块自带原始 JS、模块清单（YAML）和说明文档，直接订阅 YAML 即可。


作者：[a13609y](https://github.com/a13609y)

## 目录结构

```
widgets/            小组件类模块（generic 脚本 + widgets 声明）
├── oil-price/      全国实时油价（小/中/大号三套布局）
├── holiday-countdown/ 节日倒数（春节/中秋/国庆…，内置农历表）
├── sticky-note/     便签（文字自定义 + 9 种纸张样式）
├── ...
rules/              规则 / URL 重写 / MITM / http_response 类模块
├── general-enhanced/ 通用增强（合一版：绕过隧道 + 真实 IP + MITM 排除，跟随上游）
├── lan-bypass/     已合并进 general-enhanced（保留兼容）
├── real-ip-domains/ 已合并进 general-enhanced（保留兼容）
├── coolapk/        酷安去广告（自动跟随上游 zirawell/R-Store）
├── pinterest/      Pinterest 去广告（信息流 / 搜索 / 相关推荐推广 Pin）
├── fanqie-adblock/ 番茄小说去广告（穿山甲 / 广告计费 / 章末视频，跟随上游）
├── pingme/         PingMe 签到 + 看视频奖励（拆成两条独立定时任务，可单独开关）
rulesets/           纯规则集（不含模块，直接给 rule_set 引用）
├── foreign-domains/ 国外域名规则集（26,000+ 条，每天更新）
scripts/            独立脚本（抓包、签到、通知等）
docs/               说明与踩坑记录
.github/workflows/  上游同步（每天拉一次上游，有变化才提交）
```

命名约定：目录用 `kebab-case`，每个模块目录内文件名与目录同名，附一份 `README.md`。

## 模块清单

| 模块 | 说明 | 订阅地址 |
| --- | --- | --- |
| [全国实时油价](widgets/oil-price/README.md) | 92/95/98/柴油实时油价，小/中/大号三套布局（单油品大数字 / 四油品+走势折线 / 完整信息+加满金额）；走势只用真实抓取记录，下轮窗口按 10 个工作日推算 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/oil-price/oil-price.yaml` |
| [节日倒数](widgets/holiday-countdown/README.md) | 距离下个节日还有几天，内置 2024–2050 农历与节气表，按画布自动排版 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/holiday-countdown/holiday-countdown.yaml` |
| [便签](widgets/sticky-note/README.md) | 桌面便签，文字自己填（标题 + 8 行 + 页脚），9 种纸张样式、颜色/装饰/横线/字体/对齐可调 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/sticky-note/sticky-note.yaml` |
| [通用增强（合一版）](rules/general-enhanced/README.md) | 三合一：私有网段/组播不走隧道 + 门户检测/STUN/联机/NTP/推送/NAS 等用真实 IP（每天跟随上游聚合）+ MITM 排除 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/general-enhanced/general-enhanced.yaml` |
| [酷安去广告](rules/coolapk/README.md) | 去酷安开屏 / 首页信息流 / 评论 / 商品推广广告，规则与脚本自动跟随上游 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/coolapk/coolapk.yaml` |
| [Pinterest 去广告](rules/pinterest/README.md) | 去 Pinterest 信息流、搜索、相关推荐里的推广 Pin，拦广告与点击追踪域名 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.yaml` |
| [番茄小说去广告](rules/fanqie-adblock/README.md) | 穿山甲 / 广告计费 / 广告素材 / 章末视频，域名表每天跟随上游聚合 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/fanqie-adblock/fanqie-adblock.yaml` |
| [PingMe 签到 + 看视频奖励](rules/pingme/README.md) | 签到（滚动签到小时 + 当天追赶制）与看视频得奖励拆成两条独立定时任务，各自 cron / 超时 / 开关，支持多账号 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pingme/pingme.yaml` |
| [国外域名规则集](rulesets/foreign-domains/README.md) | 26,000+ 条国外域名（v2fly geolocation-!cn + Loyalsoldier proxy），已剔除中国域名；纯规则集，给 `rule_set` 引用 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rulesets/foreign-domains/foreign-domains.yaml` |

> 注：`lan-bypass`、`real-ip-domains`、`real-ip-domains-extra` 已合并为 **通用增强（合一版）**，旧订阅仍可用但不再更新。

## 安装方式

1. 复制上表里的模块地址。
2. Egern → 工具 → 模块 → `+` → 粘贴地址 → 保存。
3. 模块需要配置的项会出现在模块的「参数 / 环境变量」里（由 YAML 的 `env_schema` 生成界面）。
4. 小组件类模块：主屏幕长按 → `+` → Egern → 选尺寸 → 长按组件 → 编辑小组件 → 选择对应组件名。

## 说明

- 模块地址固定指向 `main` 分支，更新即生效，Egern 默认 24 小时检查一次模块更新。
- 本仓库模块默认不写路由规则（`rules` / `dns` 置空），避免影响你的分流策略；需要的直连规则在各自 README 里单独说明。
- 数据来自公开网页或公开接口，站点改版可能导致失效，脚本内均有缓存与错误兜底。
- 需要 MITM 的模块（如酷安去广告）会显式声明 `mitm.hostnames`，并在各自 README 里注明。
- 依赖第三方上游的模块由 GitHub Actions 定时同步，转换脚本与测试都在模块目录内，可自行复跑。
