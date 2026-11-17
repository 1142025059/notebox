import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Entry, Stats, ViewKey } from './types';
import { VIEW_LABELS } from './types';
import Sidebar from './components/Sidebar';
import EntryList from './components/EntryList';
import EntryDetail from './components/EntryDetail';
import { IconSearch } from './components/icons';

const EMPTY_STATS: Stats = { notes: 0, done: 0 };

const EMPTY_HINTS: Record<ViewKey, string> = {
  notes: '还没有笔记。点左上角「新建笔记」开始记录。',
  done: '还没有已完成的笔记。',
};

interface Panel {
  key: string;
  entry: Entry | null;
}

type Notice = { text: string; error?: boolean };

export default function App() {
  const [view, setView] = useState<ViewKey>('notes');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [items, setItems] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [panel, setPanel] = useState<Panel | null>(null);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [list, nextStats] = await Promise.all([
          api.list({ view, q: debouncedQuery }),
          api.stats(),
        ]);
        setItems(list.items);
        setTotal(list.total);
        setStats(nextStats);
      } catch (err) {
        setNotice({ text: (err as Error).message, error: true });
      } finally {
        setLoading(false);
      }
    },
    [view, debouncedQuery],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (payload: { title: string; body: string }) => {
    try {
      const created = await api.create({ ...payload, kind: 'note' });

      // 新建的笔记一定属于“全部笔记”，当前若在已完成或搜索态，切回去。
      if (view !== 'notes' || debouncedQuery) {
        setQuery('');
        setDebouncedQuery('');
        setView('notes');
      } else {
        await refresh(true);
      }

      return created;
    } catch (err) {
      setNotice({ text: `保存失败：${(err as Error).message}`, error: true });
      throw err;
    }
  };

  const handlePatch = async (id: number, patch: Record<string, unknown>) => {
    try {
      const updated = await api.update(id, patch);
      await refresh(true);
      return updated;
    } catch (err) {
      setNotice({ text: `操作失败：${(err as Error).message}`, error: true });
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.remove(id);
      setPanel(null);
      await refresh(true);
      setNotice({ text: '笔记已删除' });
    } catch (err) {
      setNotice({ text: `删除失败：${(err as Error).message}`, error: true });
      throw err;
    }
  };

  const handleToggle = async (entry: Entry) => {
    try {
      await handlePatch(entry.id, { status: entry.status === 'done' ? 'inbox' : 'done' });
    } catch {
      // 文案已由 handlePatch 提示
    }
  };

  const openNew = () => setPanel({ key: `new-${Date.now()}`, entry: null });
  const openEntry = (entry: Entry) => setPanel({ key: `e-${entry.id}`, entry });

  const handleExport = async () => {
    try {
      await api.exportAll();
      setNotice({ text: '已导出 JSON 备份' });
    } catch (err) {
      setNotice({ text: `导出失败：${(err as Error).message}`, error: true });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const payload: unknown = JSON.parse(text);
      const entries = Array.isArray(payload)
        ? payload
        : (payload as { entries?: unknown })?.entries;

      if (!Array.isArray(entries)) throw new Error('文件里没有 entries 数组');

      const result = await api.importAll({ mode: 'merge', entries: entries as Entry[] });
      await refresh(true);
      setNotice({ text: `已导入 ${result.imported} 条笔记` });
    } catch (err) {
      setNotice({ text: `导入失败：${(err as Error).message}`, error: true });
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setPanel({ key: `new-${Date.now()}`, entry: null });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const emptyHint = debouncedQuery
    ? `没有匹配「${debouncedQuery}」的笔记`
    : EMPTY_HINTS[view];

  return (
    <div className="app">
      <Sidebar
        view={view}
        stats={stats}
        busy={loading}
        onView={setView}
        onCreate={openNew}
        onExport={handleExport}
        onImport={handleImport}
      />

      <main className="main">
        <div className="main-head">
          <div className="head-titles">
            <div className="main-title">{VIEW_LABELS[view]}</div>
            <div className="main-sub">{total} 条</div>
          </div>

          <div className="search">
            <IconSearch />
            <input
              id="search-input"
              value={query}
              placeholder="搜索笔记（Ctrl+K）"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {notice && (
          <div className={`notice ${notice.error ? 'is-error' : ''}`}>{notice.text}</div>
        )}

        <EntryList
          items={items}
          loading={loading}
          emptyHint={emptyHint}
          onSelect={openEntry}
          onToggle={handleToggle}
        />
      </main>

      {panel && (
        <EntryDetail
          key={panel.key}
          entry={panel.entry}
          onCreate={handleCreate}
          onPatch={handlePatch}
          onDelete={handleDelete}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
