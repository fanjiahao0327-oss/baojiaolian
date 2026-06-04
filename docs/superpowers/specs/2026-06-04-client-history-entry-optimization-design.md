# Client History And Entry Optimization Design

## Goal

Make lightweight coach sessions easy to find under the right customer, and simplify the mini program entry language so agents know when to use quick follow-up tools versus deeper customer diagnosis.

## Current Problem

Customer detail history only shows conversations whose `client_id` matches that customer. The lightweight modes already save conversations, but if the agent starts from the coach page without selecting a customer, `clientId` is empty and the conversation is saved without customer ownership. This makes the record disappear from the customer's history even though it still exists globally.

The coach page also has four top-level entries, and the last one is named "完整诊断" while it contains a second quick/full toggle. That makes the interface feel heavier than it needs to be for new agents.

## Design

Lightweight modes should keep the agent fast while still creating a reliable customer record. When the agent uses customer objection follow-up, pre-meeting prep, or meeting review without selecting an existing customer, the mini program asks for a short customer name. On submit, it creates a lightweight customer profile, binds the conversation to that new customer, and then calls the coach API with the new `clientId`.

Customer pages should show richer history rows: type label, title, time, and short preview. The client list page should also show recent coach records so older unbound conversations can still be found.

The top-level "完整诊断" entry should become "客户诊断". Inside it, the fast path should be "快速诊断", while the detailed path should be "深度诊断". This keeps the mental model simple: daily follow-up tools first, full customer diagnosis when building or enriching a client profile.

## Data Flow

1. Agent chooses a lightweight mode.
2. If no customer is selected, the form asks for `lightClientName`.
3. Submit creates `/api/clients` with a minimal `kycSnapshot`.
4. The mini program stores the returned `selectedClientId`.
5. The coach request sends that `clientId`.
6. Customer detail history reads conversations by `client_id` and renders tags/previews.

## Error Handling

If no customer is selected and no customer name is entered, the mini program blocks submit with "请先选择客户或填写客户称呼". If lightweight customer creation fails, the AI request is not sent and the user sees "创建客户失败，请重试".

## Testing

Add regression checks to `scripts/check-security-regressions.mjs` for lightweight auto-create binding, recent coach history, conversation metadata, and entry naming. Then run `npm run check:security`, `node --check miniprogram/pages/coach/coach.js`, `node --check miniprogram/pages/clients/clients.js`, `npm run lint`, and `npm run build`.
