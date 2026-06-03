export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initDB } = await import('@/lib/db');
      await initDB();
    } catch (error) {
      console.warn("[instrumentation] initDB failed; continuing startup", error);
    }
  }
}
