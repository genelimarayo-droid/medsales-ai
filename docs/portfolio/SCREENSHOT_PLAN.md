# Screenshot Plan and Provenance

全部图片来自冻结 V1.1 的真实本地 Chrome 页面；SIMULATED 案例，没有修改 DOM、CSS 或注入最终商机状态来美化截图。显示名称、版式与技术字段均为当前实际实现。

| 文件 | 页面/状态 | 目的与面试价值 |
|---|---|---|
| 01-dashboard.png | V2 保存后的客户工作台 | 客户、真实阶段和当前信息摘要 |
| 02-customer-understanding.png | V1 后客户理解 | 区分维护痛点和未知需求 |
| 03-visit-preparation.png | 拜访计划 | 销售提问来自信息缺口 |
| 04-roleplay.png | 三轮模拟对话 | 展示有限 Mock、未知保留和隔离提示 |
| 05-evidence.png | V2 商机检查的 E 面板 | 来源、有效证据与技术详情的实际展示 |
| 06-opportunity-stage.png | Stage 4 | 阶段条件和缺口，不是成交概率 |
| 07-version-history.png | V3 刷新后的版本历史 | 不可回写的 V1/V2 快照 |
| 08-contradiction-stage-change.png | V3 保存前的跳转审计 | 采购反证让当前 Stage 4→3 |
| 09-mobile.png | V3 历史页，390×844 | 窄屏真实页面，无页面级横向溢出 |

桌面 1440×900；截图可能滚动到对应模块，不是所有图都为首屏。`capture-results.json` 记录运行时间、浏览器版本、阶段、图片清单、错误与历史断言结果。时序按 demo-script.md；01 的 V2 画面与 02 的 V1 画面不是同一时点。

## 复现工具

`capture-screenshots.cjs` 是文档素材工具，不是新产品功能，也不替代被冻结的验收测试。它通过隔离浏览器 UI 录入模拟资料和人工选择，读取状态仅用于断言；不会更改用户常用浏览器的客户数据。

前提：启动本地应用，另有可用的 Playwright 与 Chrome/Chromium。应用本身不需要这些额外依赖。工具支持显式路径环境变量，避免把原开发机绝对路径写进文档工具：

```powershell
$env:PLAYWRIGHT_MODULE=(Resolve-Path './node_modules/playwright').Path
$env:CHROME_PATH=(Get-Command chrome -ErrorAction Stop).Source
$env:MEDSALES_URL='http://127.0.0.1:4173'
node docs/portfolio/capture-screenshots.cjs
```

如果 Playwright 已在 Node 模块路径且已安装它的 Chromium，可以不指定前两个变量。取图工具会重新生成截图，不会执行部署或修改 src/tests。文件仅代表该次模拟运行。

上例要求 Chrome 在 PATH；否则由运行者提供自己机器上的可执行文件位置，不使用原开发者个人路径。
