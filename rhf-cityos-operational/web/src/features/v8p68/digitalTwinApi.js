/** Thin same-origin connector for existing RHF City OS RUVOS API. */
const BASE = '/api/ruvos/v8p68/digital-twin';
export async function simulateEvidenceGatedScenario(scenario, {signal} = {}) {
  const response = await fetch(`${BASE}/simulate`, {
    method: 'POST', credentials: 'same-origin',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(scenario), signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.code = data?.error || 'SIMULATION_FAILED';
    error.status = response.status;
    throw error;
  }
  return data;
}
