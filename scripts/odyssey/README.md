# 奥德赛百科同步脚本

从 https://www.yuque.com/u48069482/taiyi 抓取角色数据并生成本仓库的角色 JSON / 图标 / 夜晚顺序。
一次性工具，跑之前先读 [`docs/ODYSSEY.md`](../../docs/ODYSSEY.md)。

在一个临时工作目录里按顺序执行（脚本用相对路径读写中间产物，仓库路径写死在 `emit.py` 的 `R`）：

```bash
curl -s -A 'Mozilla/5.0' 'https://www.yuque.com/u48069482/taiyi' -o book.html
node toc.cjs        # book.html  -> toc.json（解析 window.appData，URI 解码）
node fetch.cjs      # toc.json   -> docs/<slug>.json（公开只读 API，带 0.4s 间隔）
node all.cjs        # docs/*     -> txt/*.txt（lake HTML -> 纯文本，图片转 [IMG url]）
python3 extract.py  # txt/*      -> chars.json / summary.json（按小节切分）
python3 build.py    # chars.json -> recs.json（归一化 + id 生成 + 冲突检测）
python3 emit.py     # recs.json  -> 仓库角色 JSON、图标、night-order.json、odyssey.json
```

`emit.py` 会覆盖已有的 `edition: "odyssey"` 角色文件。能力有改动时要新增 revision 而不是覆盖 `v1`，
否则 `npm run build` 的 `validate-revisions` 会报错。图标压成 400×400 PNG8（需要 ImageMagick `magick`）。

相克规则、`assets/almanac/odyssey.zh.json`、版本名注册（`catalog.ts` / `t.ts` / locales）是手工加的，不在脚本里。
