# egern-modules

Egern 模块 / 脚本合集。每个模块自带原始 JS、模块清单（YAML）和说明文档，直接订阅 YAML 即可。

作者：[a13609y](https://github.com/a13609y)

## 目录结构

```
widgets/            小组件类模块（generic 脚本 + widgets 声明）
├── oil-price/      全国实时油价
├── ...
rules/              规则 / URL 重写 / Map Local 类模块
scripts/            独立脚本（抓包、签到、通知等）
docs/               说明与踩坑记录
```

命名约定：目录用 `kebab-case`，每个模块目录内文件名与目录同名，附一份 `README.md`。

## 模块清单

| 模块 | 说明 | 订阅地址 |
| --- | --- | --- |
| [全国实时油价](widgets/oil-price/README.md) | 92/95/98/柴油油价小组件，支持调价趋势，小/中/大号自适应 | `https://raw.githubusercontent.com/a13609y/egern-modules/main/widgets/oil-price/oil-price.yaml` |

## 安装方式

1. 复制上表里的模块地址。
2. Egern → 工具 → 模块 → `+` → 粘贴地址 → 保存。
3. 模块需要配置的项会出现在模块的「参数 / 环境变量」里（由 YAML 的 `env_schema` 生成界面）。
4. 小组件类模块：主屏幕长按 → `+` → Egern → 选尺寸 → 长按组件 → 编辑小组件 → 选择对应组件名。

## 说明

- 模块地址固定指向 `main` 分支，更新即生效，Egern 默认 24 小时检查一次模块更新。
- 本仓库模块默认不写路由规则（`rules` / `dns` 置空），避免影响你的分流策略；需要的直连规则在各自 README 里单独说明。
- 数据来自公开网页或公开接口，站点改版可能导致失效，脚本内均有缓存与错误兜底。
