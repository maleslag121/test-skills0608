const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchDashboard(period) {
  const res = await fetch(`${API_BASE}/api/dashboard?period=${period}`);
  if (!res.ok) throw new Error(`加载展板数据失败 (${res.status})`);
  return res.json();
}

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/api/schema`);
  if (!res.ok) throw new Error(`加载数据字典失败 (${res.status})`);
  return res.json();
}
