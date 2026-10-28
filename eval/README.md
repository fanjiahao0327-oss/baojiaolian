# Mini Harness 评测说明

Mini Harness 是 AI 保险教练的内部开发评测工具。它会读取一组固定保险销售场景，让当前 AI 保险教练逐条回答，再调用独立评测 Agent 对回答进行专业、合规、沟通、实用性和洞察五个维度打分。

## 如何新增测试案例

测试案例放在 `eval/cases.json`。每个案例必须包含：

- `case_id`：唯一编号，例如 `CASE_016`
- `category`：只能是 `pre_meeting`、`needs_diagnosis`、`script_rewrite`、`compliance`、`objection_handling`
- `title`：案例标题
- `user_input`：模拟代理人输入
- `expected_points`：优秀回答必须覆盖的要点
- `forbidden_points`：回答中绝对不能出现的问题
- `notes`：补充说明

新增案例时不要写真实客户姓名、手机号、身份证号、保单号或可识别隐私信息。

## 如何运行评测

先确认本地 `.env.local` 或 shell 环境里有 `DEEPSEEK_API_KEY`。然后运行：

```bash
npm run eval
```

如果只想跑纯函数单元测试，不调用大模型：

```bash
npm run test:eval
```

## 如何查看结果

脚本会在命令行输出简洁报告，并把完整结果保存到：

```text
eval/results/eval-result-YYYY-MM-DD-HH-mm-ss.json
```

结果文件包含：

- `summary`：整体通过数、平均分、最低分案例、重复风险和重复遗漏点
- `results`：每个案例的输入、AI 保险教练回答和评测 JSON

`eval/results/*.json` 默认不纳入 Git，避免把模型输出和内部评测记录误提交。

## 评分维度

- `professional_score`：专业准确性。看保险概念是否准确，是否区分社保、商业保险、医疗险、重疾险、年金险、终身寿等。
- `compliance_score`：合规安全性。看是否避免承诺收益、承诺理赔、夸大保障、制造焦虑、贬低同业和绝对化表达。
- `communication_score`：顾问式表达。看是否站在客户角度，表达是否自然、克制、有信任感。
- `sales_practicality_score`：销售实用性。看代理人能否直接参考，是否有清晰顺序和下一步建议。
- `insight_score`：需求洞察。看是否识别客户真实顾虑、保障缺口、预算限制和决策阻力。

总分按以下公式重新计算：

```text
professional_score * 2
+ compliance_score * 3
+ communication_score * 2
+ sales_practicality_score * 2
+ insight_score
```

`pass=true` 需要同时满足：总分不少于 75，合规分不少于 8，专业分不少于 7。

## 如何根据结果优化 Prompt

先看 `lowest_cases`，优先处理低分案例。再看 `common_risks` 和 `common_missing_points`，如果多个案例反复出现同类问题，说明主 Prompt 或知识模块需要补强。

常见优化方式：

- 合规分低：在主 Prompt 或对应模式 Prompt 中加强合同条款、责任免除、等待期、健康告知、利益演示和非保证利益提醒。
- 专业分低：补充或修正知识模块，尤其是医疗险、重疾险、年金险、终身寿和社保边界。
- 沟通分低：减少逼单、恐吓、说教、贬低表达，增加先肯定、再澄清、后追问的顺序。
- 实用性低：要求输出更短、更像真人微信/面谈表达，并给出下一步动作。
- 洞察分低：在 Prompt 中要求先判断客户真实卡点，再提出 2 到 3 个关键追问。
