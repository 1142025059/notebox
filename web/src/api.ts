import type { Entry, Kind, StatsMap, ViewKey } from './types';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // 非 JSON 错误响应，保留默认文案。
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ListParams {
  kind: Kind;
  view: ViewKey;
  q?: string;
  limit?: number;
}

export const api = {
  list(params: ListParams) {
    const search = new URLSearchParams({
      kind: params.kind,
      view: params.view,
      limit: String(params.limit ?? 200),
    });
    if (params.q) search.set('q', params.q);
    return request<{ items: Entry[]; total: number }>(`/api/entries?${search}`);
  },

  stats: () => request<StatsMap>('/api/stats'),

  create(payload: { title?: string; body?: string; kind?: Kind }) {
    return request<Entry>('/api/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  update(id: number, patch: Record<string, unknown>) {
    return request<Entry>(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },

  remove(id: number) {
    return request<Entry>(`/api/entries/${id}`, { method: 'DELETE' });
  },

  async exportAll() {
    const res = await fetch('/api/export');
    if (!res.ok) throw new Error('导出失败');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `notebox-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  importAll(payload: { mode: 'merge' | 'replace'; entries: Entry[] }) {
    return request<{ ok: boolean; imported: number; mode: string }>('/api/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
