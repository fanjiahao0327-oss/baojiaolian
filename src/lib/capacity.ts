import { getDb, row, rows } from "@/lib/db";

export type CapacityStatus = "healthy" | "watch" | "warning" | "critical";

export interface CapacityTableReport {
  name: string;
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  rowCount: number;
  estimatedRows: number;
}

export interface DatabaseCapacityReport {
  databaseName: string;
  checkedAt: string;
  databaseBytes: number;
  capacityBytes: number;
  usagePercent: number;
  status: CapacityStatus;
  statusLabel: string;
  warning: string;
  tables: CapacityTableReport[];
}

const DEFAULT_DATABASE_CAPACITY_BYTES = 536_870_912;

type SqlClient = ReturnType<typeof getDb>;

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return new Date().toISOString();
}

export function getConfiguredDatabaseCapacityBytes(): number {
  const configured = toNumber(process.env.DATABASE_CAPACITY_BYTES);
  return configured > 0 ? configured : DEFAULT_DATABASE_CAPACITY_BYTES;
}

export function getCapacityStatus(usagePercent: number): {
  status: CapacityStatus;
  statusLabel: string;
  warning: string;
} {
  if (usagePercent >= 95) {
    return {
      status: "critical",
      statusLabel: "紧急",
      warning: "数据库容量接近上限，请尽快升级 Neon 套餐或清理历史数据。",
    };
  }

  if (usagePercent >= 85) {
    return {
      status: "warning",
      statusLabel: "预警",
      warning: "数据库容量使用率偏高，建议本周内评估扩容。",
    };
  }

  if (usagePercent >= 70) {
    return {
      status: "watch",
      statusLabel: "观察",
      warning: "数据库容量进入观察区，建议持续关注增长速度。",
    };
  }

  return {
    status: "healthy",
    statusLabel: "健康",
    warning: "当前数据库容量充足。",
  };
}

export async function getDatabaseCapacityReport(sql: SqlClient = getDb()): Promise<DatabaseCapacityReport> {
  const meta = row<Record<string, unknown>>(
    await sql`
      SELECT
        current_database() AS database_name,
        pg_database_size(current_database())::bigint AS database_bytes,
        NOW() AS checked_at
    `,
  );

  const tableRows = rows<Record<string, unknown>>(
    await sql`
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
    `,
  );

  const exactCounts = row<Record<string, unknown>>(
    await sql`
      SELECT
        (SELECT COUNT(*) FROM users)::bigint AS users,
        (SELECT COUNT(*) FROM clients)::bigint AS clients,
        (SELECT COUNT(*) FROM point_transactions)::bigint AS point_transactions,
        (SELECT COUNT(*) FROM conversations)::bigint AS conversations,
        (SELECT COUNT(*) FROM feedbacks)::bigint AS feedbacks,
        (SELECT COUNT(*) FROM payment_orders)::bigint AS payment_orders
    `,
  );

  const databaseBytes = toNumber(meta.database_bytes);
  const capacityBytes = getConfiguredDatabaseCapacityBytes();
  const usagePercent = capacityBytes > 0 ? Math.round((databaseBytes / capacityBytes) * 1000) / 10 : 0;
  const status = getCapacityStatus(usagePercent);

  const tables = tableRows.map((table) => {
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
  });

  return {
    databaseName: String(meta.database_name || ""),
    checkedAt: toIsoString(meta.checked_at),
    databaseBytes,
    capacityBytes,
    usagePercent,
    status: status.status,
    statusLabel: status.statusLabel,
    warning: status.warning,
    tables,
  };
}
