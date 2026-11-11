# 模块 · 脚本 · 分流规则合集

Egern 模块 / 脚本 / 分流规则合集。每个模块自带原始 JS、模块清单（YAML）和说明文档，直接订阅 YAML 即可。


作者：[a13609y](https://github.com/a13609y)

## 目录结构

```
widgets/            小组件类模块（generic 脚本 + widgets 声明）
├── oil-price/      全国实时油价
├── holiday-countdown/ 节日倒数（春节/中秋/国庆…，内置农历表）
├── sticky-note/     便签（文字自定义 + 9 种纸张样式）
├── ...
rules/              规则 / URL 重写 / MITM / http_response 类模块
├── lan-bypass/     通用增强（绕过隧道 + 真实 IP + MITM 排除）
├── real-ip-domains/ 真实 IP 域名（Fake IP 白名单，核心 + 扩展，跟随上游）
├── coolapk/        酷安去广告（自动跟随上游 zirawell/R-Store）
├── pinterest/      Pinterest 去广告（信息流 / 搜索 / 相关推荐推广 Pin）
├── fanqie-adblock/ 番茄小说去广告（穿山甲 / 广告计费 / 章末视频，跟随上游）
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
| [全国实时油价](widgets/oil-price/README.md) | 92/95/98/柴油油价小组件，支持调价趋势，小/中/大号自适应 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/oil-price/oil-price.yaml` |
| [节日倒数](widgets/holiday-countdown/README.md) | 距离下个节日还有几天，内置 2024–2050 农历与节气表，按画布自动排版 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/holiday-countdown/holiday-countdown.yaml` |
| [便签](widgets/sticky-note/README.md) | 桌面便签，文字自己填（标题 + 8 行 + 页脚），9 种纸张样式、颜色/装饰/横线/字体/对齐可调 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/widgets/sticky-note/sticky-note.yaml` |
| [通用增强](rules/lan-bypass/README.md) | 私有网段/组播/链路本地不走隧道 + 门户检测/联机/音乐版权等用真实 IP + 证书钉扎域名排除 MITM | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/lan-bypass/lan-bypass.yaml` |
| [真实 IP 域名（核心）](rules/real-ip-domains/README.md) | Fake IP 模式下的白名单：局域网/门户检测/STUN/主机联机/NTP/推送/NAS，名单每天跟随上游 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/real-ip-domains/real-ip-domains.yaml` |
| [真实 IP 域名（扩展）](rules/real-ip-domains/README.md) | 补充档：音乐/影音版权校验、第三方游戏平台、内网穿透与工具域 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/real-ip-domains/real-ip-domains-extra.yaml` |
| [酷安去广告](rules/coolapk/README.md) | 去酷安开屏 / 首页信息流 / 评论 / 商品推广广告，规则与脚本自动跟随上游 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/coolapk/coolapk.yaml` |
| [Pinterest 去广告](rules/pinterest/README.md) | 去 Pinterest 信息流、搜索、相关推荐里的推广 Pin，拦广告与点击追踪域名 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/pinterest/pinterest.yaml` |
| [番茄小说去广告](rules/fanqie-adblock/README.md) | 穿山甲 / 广告计费 / 广告素材 / 章末视频，域名表每天跟随上游聚合 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rules/fanqie-adblock/fanqie-adblock.yaml` |
| [国外域名规则集](rulesets/foreign-domains/README.md) | 26,000+ 条国外域名（v2fly geolocation-!cn + Loyalsoldier proxy），已剔除中国域名；纯规则集，给 `rule_set` 引用 | `https://raw.githubusercontent.com/a13609y/egern-modules-hub/main/rulesets/foreign-domains/foreign-domains.yaml` |

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
