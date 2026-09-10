# 文档站字体资源

字体已接入站点样式；`web/` 为按 Unicode 分片的网页字体，保留所有原始字形覆盖。

## 已确认的视觉方向（2026-09-10）

- 浅色：背景 `#F5F0E6`，正文 `#30332F`，浮层 `#FBF8F1`。
- 深色：背景 `#252724`，正文 `#E9E4DA`，浮层 `#2E312C`。
- 中文正文使用思源宋体常规字重，标题使用中等或半粗字重，强调使用真实粗体。
- 西文正文与标题使用 Newsreader。
- 导航、目录和小标签使用思源黑体或系统黑体。
- 标识性内容使用思源黑体 Heavy；手写体仅保留为少量签名或短句的可选方向，具体字体尚未指定。
- 代码采用 Maple Mono，保留现有等宽字体作为回退。
- 单一强调色采用亮青：浅色 `#00B8D4`，深色 `#22D3EE`；浅色小字链接使用同色系 `#006778` 保证可读性。
- 保留布局与首页 hover、鼠标跟随等动效的运动及交互逻辑。
- 文章内部荧光笔、强调文字和信息框等颜色保持原样；接入时需将相关颜色与新的全站强调色解耦。

## 字体来源

- `source-han-serif/`：Adobe Source Han Serif 简体中文可变 WOFF2，官方 release 树 `7889f11bf31170b5d092a083b357c8c8130f89e0`，`Variable/WOFF2/OTF/SourceHanSerifSC-VF.otf.woff2`。
- `source-han-sans/`：Adobe Source Han Sans 简体中文可变 WOFF2，官方 release 树 `a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2`，`Variable/WOFF2/OTF/SourceHanSansSC-VF.otf.woff2`。
- `newsreader/`：Google Fonts 官方 `ofl/newsreader`，可变正体与斜体，包含字重与光学尺寸轴；下载时该目录最新提交为 `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`。
- `maple-mono/`：官方 v7.9 的 `woff2/var`，可变 WOFF2 正体和斜体，覆盖完整字重范围。Release 压缩包连接失败后，改从同版本官方源文件下载。

各字体保留其原始 OFL 许可与版权声明。`font-manifest.json` 记录本地文件大小、SHA-256、字体名和可变轴，供后续接入核对。

可变字体覆盖多个字重，无需为每个常规字重重复下载静态文件。原始字体保留，网页按 Unicode 范围加载分片。更换上游字体后运行 `python scripts/build-fonts.py`（需要 fonttools[woff]）；新增文章不需要重新生成分片。

首页大标题固定使用正文墨色（浅色石墨、深色浅墨），粒子光晕同色；首页主按钮保留亮青。
