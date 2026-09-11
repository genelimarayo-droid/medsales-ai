# Design Decisions

## 1. Raw Text 与 Evidence 分离

**Problem：** 一段笔记可能同时含客户表达、销售预测和未知。  
**Decision：** 保留 Source/Information，再建立带作者、命题和方向的 Evidence。  
**Reason：** 可追溯到“谁说、对什么命题、何时、哪个项目”。  
**Trade-off：** 增加结构化录入负担；没有把有限解析包装成通用 AI 理解。

## 2. Human Confirmation 不可跳过

**Problem：** 接受 AI 输出不等于证据可靠。  
**Decision：** 原文、作者与语义分开审核；改动后重新接受。  
**Reason：** 阻止销售判断被洗成客户原话，保留未知而非补答案。  
**Trade-off：** Demo 比一键聊天慢；人工仍可能判断错误，系统不能替代事实核验。

## 3. Pain ≠ Project

**Problem：** “维修麻烦”不能证明院内已有设备更新项目。  
**Decision：** 痛点、需求、更新意向、项目范围、内部动作独立表达。  
**Reason：** 下一步应验证缺口，不是急于推销。  
**Trade-off：** 阶段升级更谨慎；这些是本原型规则，不声称通用于所有采购组织。

## 4. Stage 每次重新计算

**Problem：** 旧乐观判断可能在采购反证出现后继续保留。  
**Decision：** 从当前有效 Evidence 重新检查门槛并保留审计。  
**Reason：** 客户的最新可靠信息应能改变行动优先级。  
**Trade-off：** 阶段可能下降；销售需要解释变化，而不是维护漂亮漏斗。

## 5. 历史 Version 是独立快照

**Problem：** 当前失效操作若回写历史，就无法解释当时为何做判断。  
**Decision：** 保存时深拷贝，保留 V2 与当前 V3 的不同事实状态。  
**Reason：** 支持复盘、审计和面试中可见的产品故事。  
**Trade-off：** JSON 快照占用本地存储，不是生产级防篡改或长期审计仓库。

## 6. Roleplay 不直接进入正式 Evidence

**Problem：** 虚拟客户回复若被当成真实沟通，会制造采购证据。  
**Decision：** 场景、行为 Evidence、评分独立；拜访记录必须另录并人工确认。  
**Reason：** 训练与销售事实的边界比“自动填充得快”更重要。  
**Trade-off：** 不能直接把演练转成真实拜访；行为评分依赖人工标注，不等于自动能力测评。
