/**
 * 本地 demo 模式：允许模拟支付、免登录解锁，仅用于在电脑/开发者工具里测试。
 * 生产环境不要设置 CHECKUP_DEMO=1。
 */
export function isCheckupDemoMode(): boolean {
  return process.env.CHECKUP_DEMO === "1" || process.env.NODE_ENV !== "production";
}
