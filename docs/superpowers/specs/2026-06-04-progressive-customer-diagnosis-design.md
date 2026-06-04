# Progressive Customer Diagnosis Design

## Goal

Make customer diagnosis feel like one clear workflow: fill the core customer facts first, then optionally expand more KYC details if the agent wants a more accurate diagnosis.

## Product Decision

The old "quick diagnosis / deep diagnosis" switch creates an unnecessary choice before the agent has started. The quick path is still valuable, but it should become the default customer diagnosis flow rather than a separate mode. Deep information should be optional progressive disclosure.

## User Experience

The top-level entry remains "客户诊断". Inside it, the agent sees a short "核心信息" form with the current required fields:

- name
- age
- gender
- trigger scenario
- customer words/background

Other useful fields such as industry, income, children, existing protection, assets, savings insurance, family situation, and agent response live under "补充更多客户信息". This section is collapsed by default and can be expanded when the agent has more information.

## Behavior

Submitting customer diagnosis validates only the core required fields. Any optional fields the agent fills are still included in the KYC snapshot and prompt context. The AI output remains a customer-level diagnosis: current direction, missing information, next questions, and suggested wording.

## Testing

Regression checks should ensure the mini program no longer renders a quick/deep switch, no longer exposes `toggleQuickMode`, renders "补充更多客户信息", and still validates only `QUICK_REQUIRED_FIELDS`.
