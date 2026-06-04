# Capacity Monitoring Design

## Goal

Add a release-ready capacity monitor so the Baojiaolian admin can see whether the database is close to its storage limit before publishing and while early users start using the mini program.

## Current Problem

The app stores user, client, conversation, feedback, point, and payment-order data in Neon PostgreSQL. Vercel hosts the stateless web/API layer, so persistent business data growth is mainly a database-capacity concern. Today there is no protected in-app view or repeatable local command that shows database size, table sizes, row counts, or warning thresholds.

## Design

Create an admin-only capacity API at `/api/admin/capacity`. It reuses the existing `x-admin-key` header and `isAdminKeyValid` timing-safe validation. The endpoint returns only operational metadata: database name, total database bytes, configured capacity bytes, usage percentage, table sizes, row counts, and a warning status. It must not return connection strings, user data, messages, customer names, or secrets.

Add a compact "容量监控" section to the existing `/admin` page. After the admin key succeeds, the page loads pending orders and capacity data. The capacity section shows current usage, configured capacity, warning state, and table-level sizes so a non-technical operator can understand whether storage is healthy.

Add a local CLI script, `npm run capacity`, that reads the same database using `DATABASE_URL` and prints a concise capacity report. This gives Codex and the owner a quick pre-release check without needing to open the admin UI.

## Configuration

Use `DATABASE_CAPACITY_BYTES` as the configurable storage ceiling. If it is not set, default to `536870912` bytes, matching a conservative 0.5 GB baseline. Warning thresholds are:

- `healthy`: below 70%
- `watch`: 70% to below 85%
- `warning`: 85% to below 95%
- `critical`: 95% and above

## Error Handling

If the admin key is missing or invalid, return `403`. If database capacity queries fail, return `500` with a generic error message and no sensitive details. The admin page should show a small error message for capacity failures while still allowing order management to work.

## Testing

Extend `scripts/check-security-regressions.mjs` to assert that the new capacity route exists, uses `isAdminKeyValid`, queries only PostgreSQL metadata functions, includes `DATABASE_CAPACITY_BYTES`, and that the admin page renders capacity monitoring without exposing secrets. Then run the security check, TypeScript check, production build, and a deployed protected-endpoint smoke test.
