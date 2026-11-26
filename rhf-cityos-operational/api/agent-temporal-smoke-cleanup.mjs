// Bounded cleanup for a standalone Temporal SDK smoke; handles both sync void and Promise APIs.
// This helper is used ONLY by the isolated smoke test, never by operational mission dispatch.
export async function closeSmokeResources({worker, workerLoop, core, connection} = {}) {
  const failures = [];
  const attempt = async (label, operation) => {
    try { await operation(); } catch (error) { failures.push({label, error}); }
  };
  if (worker) await attempt('worker.shutdown', () => worker.shutdown());
  if (workerLoop) await attempt('worker.run', () => workerLoop);
  if (core) await attempt('nativeConnection.close', () => core.close());
  if (connection) await attempt('clientConnection.close', () => connection.close());
  if (failures.length) {
    const aggregate = new AggregateError(failures.map(f => f.error), 'TEMPORAL_SMOKE_CLEANUP_FAILED');
    aggregate.steps = failures.map(f => f.label);
    throw aggregate;
  }
}
