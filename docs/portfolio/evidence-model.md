# Evidence Model

以 [evidence.js](../../src/evidence.js) 和 [evidence-validation.js](../../src/evidence-validation.js) 为准。下表是已存在字段，不是新的 Schema 提案。

| 字段 | 含义 / 当前取值示例 |
|---|---|
| evidence_id / id | 对象标识，实际运行如 E01；示意 E1 不代表固定编号 |
| content | 引用内容，不是独立核验结果 |
| author | CUSTOMER / SALES / AI / SYSTEM / UNKNOWN |
| source | Source ID 数组；Source 对象另存原文与来源信息 |
| semantic_role | FACT / CUSTOMER_STATEMENT / SALES_INFERENCE / AI_INFERENCE / OBSERVATION / UNVERIFIED |
| target | 如 need、pain、purchase、procurementStarted，区分支持的命题 |
| polarity | SUPPORT / CONTRADICT / NEUTRAL / UNKNOWN |
| validity | VALID / INVALIDATED / SUPERSEDED / UNVERIFIED |
| strength | strong / medium / weak / unknown，不能靠人工点选把转述升级为核验事实 |
| project_id / customer_id | 项目、客户的适用范围；项目可能仍未知 |
| created_at / time | 对象创建时间 / 对应记录时间，不可混为客户承诺节点 |
| information_id | 对应 Information |
| contradicts / supersedes | 反证与明确取代的 Evidence ID 关系 |

Information 使用 `CUSTOMER_STATED`；Evidence 的 `semantic_role` 使用 `CUSTOMER_STATEMENT`。`SOURCE` 表示出处，不是第六个事实等级。Information 的 `ACTIVE` 与 Evidence 的 `VALID` 也不是同一概念。

## 模拟反证示例

以下仅为从实际模型摘取的字段说明，E1/E2 为叙事代号；实际编号从运行中读取。

| 时点 | E1：客户表示采购流程已启动 | E2：客户纠正此前说法 |
|---|---|---|
| V2 保存时 | CUSTOMER / CUSTOMER_STATEMENT / procurementStarted / SUPPORT / VALID | 尚不存在 |
| V3 当前 | INVALIDATED；invalidated_by 指向 E2 | 同客户同项目同命题，CONTRADICT / VALID；contradicts 指向 E1 |
| 再查看 V2 快照 | 仍保留当时 VALID 的 E1 和 Stage 4 | 不被当前状态回写 |

在更新意向、范围、参与者、内部动作、流程、权限和采购节点等其他门槛已经满足的前提下，E1 可帮助阶段达到 4。E2 使采购启动条件失效，保留的项目条件仍满足阶段 3，当前 Stage 因此 4→3。不是看见 CONTRADICT 就固定减一级。

## 强度与有效性

客户转述通常为 medium；FACT 的 strong 还要满足来源校验要求。不同来源的真实性不是由本地原型联网验证。反证是针对命题和范围的，不代表客户所有话都不可信。需求的支持与反对可能共存为 MIXED，不能自动用最新话覆盖一切。

## 隔离

正式 Evidence、待审核候选、历史快照与 Roleplay 行为 Evidence 的用途不同。演练里的虚拟客户话不进入真实客户台账；独立拜访记录经人工确认才能成为正式业务依据。
