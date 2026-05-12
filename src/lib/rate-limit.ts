/**
 * 简单的内存滑动窗口速率限制器
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// 每 60 秒清理一次过期记录
const CLEANUP_INTERVAL = 60_000;
let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
  _cleanupTimer.unref?.();
}

interface RateLimitConfig {
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 窗口大小（毫秒） */
  windowMs: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  coach: { maxRequests: 6, windowMs: 60_000 },       // 1分钟6次
  "send-code": { maxRequests: 3, windowMs: 60_000 },  // 1分钟3次
  login: { maxRequests: 5, windowMs: 60_000 },        // 1分钟5次
  points: { maxRequests: 10, windowMs: 60_000 },       // 1分钟10次
};

export function rateLimit(
  key: string,
  configKey?: string
): { allowed: boolean; remaining: number; resetIn: number } {
  ensureCleanup();

  const config = DEFAULT_CONFIGS[configKey || key] || { maxRequests: 10, windowMs: 60_000 };
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // 清理窗口外的记录
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0];
    const resetIn = config.windowMs - (now - oldest);
    return { allowed: false, remaining: 0, resetIn: Math.ceil(resetIn / 1000) };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetIn: Math.ceil(config.windowMs / 1000),
  };
}
