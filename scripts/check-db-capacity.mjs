import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const DEFAULT_DATABASE_CAPACITY_BYTES = 536_870_912;

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.resolve(fileName);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      if (process.env[key]) continue;

      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getConfiguredDatabaseCapacityBytes() {
  const configured = toNumber(process.env.DATABASE_CAPACITY_BYTES);
  return configured > 0 ? configured : DEFAULT_DATABASE_CAPACITY_BYTES;
}

function getCapacityStatus(usagePercent) {
  if (usagePercent >= 95) return { label: "紧急", warning: "请尽快升级 Neon 套餐或清理历史数据。" };
  if (usagePercent >= 85) return { label: "预警", warning: "容量使用率偏高，建议本周内评估扩容。" };
  if (usagePercent >= 70) return { label: "观察", warning: "进入观察区，建议持续关注增长速度。" };
  return { label: "健康", warning: "当前数据库容量充足。" };
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

async function getDatabaseCapacityReport(sql) {
  const [meta] = await sql`
    SELECT
      current_database() AS database_name,
      pg_database_size(current_database())::bigint AS database_bytes,
      NOW() AS checked_at
  `;

  const tableRows = await sql`
    WITH public_tables AS (
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    )
    SELECT
      public_tables.table_name,
      pg_total_relation_size((quote_ident(public_tables.table_schema) || '.' || quote_ident(public_tables.table_name))::regclass)::bigint AS total_bytes,
      pg_relation_size((quote_ident(public_tables.table_schema) || '.' || quote_ident(public_tables.table_name))::regclass)::bigint AS table_bytes,
      COALESCE(pg_stat_user_tables.n_live_tup, 0)::bigint AS estimated_rows
    FROM public_tables
    LEFT JOIN pg_stat_user_tables
      ON pg_stat_user_tables.schemaname = public_tables.table_schema
     AND pg_stat_user_tables.relname = public_tables.table_name
    ORDER BY total_bytes DESC, public_tables.table_name ASC
  `;

  const [exactCounts] = await sql`
    SELECT
      (SELECT COUNT(*) FROM users)::bigint AS users,
      (SELECT COUNT(*) FROM clients)::bigint AS clients,
      (SELECT COUNT(*) FROM point_transactions)::bigint AS point_transactions,
      (SELECT COUNT(*) FROM conversations)::bigint AS conversations,
      (SELECT COUNT(*) FROM feedbacks)::bigint AS feedbacks,
      (SELECT COUNT(*) FROM payment_orders)::bigint AS payment_orders
  `;

  const databaseBytes = toNumber(meta.database_bytes);
  const capacityBytes = getConfiguredDatabaseCapacityBytes();
  const usagePercent = capacityBytes > 0 ? Math.round((databaseBytes / capacityBytes) * 1000) / 10 : 0;
  const status = getCapacityStatus(usagePercent);

  return {
    databaseName: String(meta.database_name || ""),
    checkedAt: new Date(meta.checked_at).toISOString(),
    databaseBytes,
    capacityBytes,
    usagePercent,
    statusLabel: status.label,
    warning: status.warning,
    tables: tableRows.map((table) => {
      const name = String(table.table_name || "");
      const totalBytes = toNumber(table.total_bytes);
      const tableBytes = toNumber(table.table_bytes);

      return {
        name,
        totalBytes,
        tableBytes,
        indexBytes: Math.max(0, totalBytes - tableBytes),
        rowCount: toNumber(exactCounts[name]),
        estimatedRows: toNumber(table.estimated_rows),
      };
    }),
  };
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("缺少数据库连接配置，无法生成容量监控报告。");
  process.exit(1);
}

const report = await getDatabaseCapacityReport(neon(databaseUrl));

console.log("容量监控");
console.log(`数据库：${report.databaseName}`);
console.log(`检查时间：${report.checkedAt}`);
console.log(`当前容量：${formatBytes(report.databaseBytes)} / ${formatBytes(report.capacityBytes)} (${report.usagePercent}%)`);
console.log(`状态：${report.statusLabel} - ${report.warning}`);
console.log("");
console.log("表容量：");

for (const table of report.tables) {
  const rowsLabel = table.rowCount > 0 ? table.rowCount : table.estimatedRows;
  console.log(
    `- ${table.name}: ${formatBytes(table.totalBytes)}，行数 ${rowsLabel}，索引 ${formatBytes(table.indexBytes)}`,
  );
}
