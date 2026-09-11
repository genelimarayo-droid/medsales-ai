# MedSales AI V1.1 Portfolio Productization Report

## 1. Product Positioning
已整理为“AI Medical Device Sales Copilot · AI医疗器械销售助手”。所有材料明确 Portfolio Prototype、单用户本地、Mock AI、Manual Confirmation；没有声称真实 LLM、临床验证、医院集成或自动采购能力。

## 2. README Changes
根目录原无 README，本轮新增 [README](../../README.md)。包括所要求的 18 节、静态 Prototype/Frozen/Mock 徽章、本地启动与测试命令、真实截图、工作流、核心产品故事、架构链接和实现限制。没有 CI passing 或 Production ready 徽章。

## 3. Portfolio Documentation
新增 8 份核心文档：

- [产品概览](product-overview.md)
- [产品架构](product-architecture.md)
- [业务工作流](business-workflow.md)
- [Evidence 模型](evidence-model.md)
- [演示脚本](demo-script.md)
- [设计决策](design-decisions.md)
- [已知限制](limitations.md)
- [差异化定位](competitive-positioning.md)

## 4. Demo Script
固定案例“医疗器械设备更新机会”，模拟 A 院 · ICU。提供 00:00–08:00 操作、展示内容、讲解和价值说明，以及可直接录入的资料、命题映射和反证记录。8 分钟是预演目标，不声称新手能在八分钟内完成所有手动审核。5 分钟可结合真实预备截图，需向面试官说明演示准备情况。

## 5. Architecture Documentation
核实为原生 JavaScript/CSS、Node 内置静态服务、localStorage、node:test 和 Playwright/Chrome；没有虚构 React、云数据库或真实 LLM API。架构图区分候选 Evidence、人工确认、有效 Evidence、假设/阶段、模板行动和版本；演练行为证据与客户证据分开。

## 6. Evidence Documentation
字段以当前 evidence.js 为准。解释 Information 的 CUSTOMER_STATED 与 Evidence 的 CUSTOMER_STATEMENT、Source 与事实等级、ACTIVE 与 VALID 的区别。强调 E1/E2 只是叙事代号；实际 ID 在页面中读取。同项目采购启动被反证后，其他项目门槛仍成立，才会出现 Stage 4→3，而非固定下降一级。

## 7. Design Decisions
六个决策均按 Problem / Decision / Reason / Trade-off 描述：原文和证据分离、人工确认、Pain≠Project、阶段重算、独立快照、演练隔离。没有把使用成本、主观标注和存储限制隐藏掉。

## 8. Known Limitations
明确本地单用户、Mock、有限语义、人工结构化、没有敏感数据保护基础设施、没有真实医院/采购接入、不是通用 NLP 或医疗决策工具。30/30 当前回归与 29 项历史契约失败分开呈现；不重新宣称全历史集合通过。

## 9. Competitive Positioning
采用对话辅助、CRM 自动化、销售 Agent、Sales Intelligence 四个能力方向作概念比较，不编造具体产品功能或市场份额，不声称行业唯一或胜过成熟 CRM。项目重点是医疗器械销售、证据商机管理和 Human-in-the-loop 的设计案例。

## 10. Screenshot Plan
已真实生成 9 张 PNG，不是占位图或重绘：Dashboard、客户理解、拜访准备、Roleplay、Evidence、Stage、历史、反证审计、移动端。

查看 [截图清单与复现说明](SCREENSHOT_PLAN.md)、[生成结果](screenshots/capture-results.json)。桌面 1440×900，移动端 390×844。取图使用隔离 Chrome 的现有 UI，未改 DOM/CSS 或直接注入最终业务状态；等待保存提示自然消失后截图。

本次实际案例：V1 Stage 未评估，V2 Stage 4，V3 Stage 3。历史 deepEqual、演练 Evidence 隔离、刷新和移动无溢出断言通过，页面/Console/请求失败列表为空。视觉检查保留当前产品的技术字段与低对比度问题，没有以修图掩盖。

## 11. Modified Files
新增根 README.md；新增 docs/portfolio 下核心文档、此报告、SCREENSHOT_PLAN.md、截图及取图/文档检查工具和生成的检查记录。本轮没有创建 PPT、部署配置、线上服务或新业务功能。

文档工具 capture-screenshots.cjs 支持通过环境变量配置 Playwright/Chrome，供素材复现；不是对既有测试的修改。verify-docs.cjs 检查文档链接、常见凭据特征、PNG 与保护文件哈希。

## 12. Unchanged Core Files
所有 src/ 与 tests/ 文件与本轮基线哈希比较，结果见 [documentation-checks.json](documentation-checks.json)。没有修改 Evidence、Validation、Stage、Hypothesis、Scoring、Version、Persistence、多项目、Roleplay、旧测试或 Mock fixtures。package.json、server.mjs 仅读取，未编辑。

## 13. Security Check
新增文档和模拟录入资料经过人工复核：没有真实患者、医院采购内部数据、客户联系方式或真实 API Key。文档自动扫描覆盖常见 API Key/私钥格式，非完整安全审计；验证结果见检查记录。截图素材只来自明示模拟案例。哈希清单使用仓库相对路径，避免把开发者 home 路径写入作品集记录。

README 的徽章是静态状态说明，访问 GitHub 渲染时可能向 shields.io 请求图片，不携带客户数据。没有向外部服务上传案例，没有提交 GitHub 或部署。既有测试的开发机路径限制被如实说明，未擅自修改。

## 14. Final Recommendation
本轮交付可供招聘方阅读产品定位、浏览真实截图、按脚本演示并讨论证据设计取舍。V1.1 核心继续 FROZEN。本轮未重新验收所有业务或重开修复轮；测试数字引用最终冻结报告，额外真实 UI 操作用于生成并核对素材。

停止本轮工作，不自行发布 GitHub、部署、启动 V2 或增加功能。后续等待用户指令。
