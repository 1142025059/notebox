import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Entry, Kind, Stats, TagCount, ViewKey } from './types';
import { VIEW_LABELS } from './types';
import Sidebar from './components/Sidebar';
import CaptureBar from './components/CaptureBar';
import EntryList from './components/EntryList';
import EntryDetail from './components/EntryDetail';
import { IconSearch } from './components/icons';

const EMPTY_STATS: Stats = {
  all: 0,
  inbox: 0,
  todo: 0,
  note: 0,
  today: 0,
  done: 0,
  archived: 0,
  trash: 0,
};

const EMPTY_HINTS: Record<ViewKey, string> = {
  all: '还没有任何记录。在上面的输入框写一句，回车即可保存。',
  inbox: '收件箱清空了。',
  todo: '没有未完成的待办。',
  note: '还没有笔记。',
  today: '今天没有到期的事。',
  done: '还没有完成的事项。',
  archived: '归档区是空的。',
  trash: '回收站是空的。',
};

type Notice = { text: string; error?: boolean };

export default function App() {
  const [view, setView] = useState<ViewKey>('inbox');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [items, setItems] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [list, nextStats, nextTags] = await Promise.all([
          api.list({ view, q: debouncedQuery, tag: activeTag }),
          api.stats(),
          api.tags(),
        ]);
        setItems(list.items);
        setTotal(list.total);
        setStats(nextStats);
        setTags(nextTags);
      } catch (err) {
        setNotice({ text: (err as Error).message, error: true });
      } finally {
        setLoading(false);
      }
    },
    [view, debouncedQuery, activeTag],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleView = (next: ViewKey) => {
    setView(next);
    setActiveTag(null);
  };

  const handleTag = (name: string | null) => {
    setActiveTag(name);
    if (name) setView('all');
  };

  const handleCreate = async ({ kind, text }: { kind: Kind; text: string }) => {
    try {
      await api.create({ kind, title: text });
      const target: ViewKey = kind === 'note' ? 'note' : 'inbox';
      const switching = view !== target || Boolean(activeTag) || Boolean(query);

      if (switching) {
        setActiveTag(null);
        setQuery('');
        setDebouncedQuery('');
        setView(target);
      } else {
        await refresh(true);
      }
      setNotice({ text: kind === 'note' ? '笔记已保存' : '已加入收件箱' });
    } catch (err) {
      setNotice({ text: `保存失败：${(err as Error).message}`, error: true });
    }
  };

  const handlePatch = useCallback(
    async (id: number, patch: Record<string, unknown>) => {
      try {
        const updated = await api.update(id, patch);
        setSelected((prev) => (prev && prev.id === id ? updated : prev));
        await refresh(true);
      } catch (err) {
        setNotice({ text: `操作失败：${(err as Error).message}`, error: true });
      }
    },
    [refresh],
  );

  const handleToggle = (entry: Entry) => {
    void handlePatch(entry.id, { status: entry.status === 'done' ? 'inbox' : 'done' });
  };

  const handleDelete = async (id: number) => {
    try {
      await api.remove(id);
      setSelected(null);
      await refresh(true);
      setNotice({ text: '已移入回收站' });
    } catch (err) {
      setNotice({ text: `删除失败：${(err as Error).message}`, error: true });
    }
  };

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
      setNotice({ text: `已导入 ${result.imported} 条记录` });
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
        document.getElementById('capture-input')?.focus();
        return;
      }
      if (event.key === 'Escape') setSelected(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const heading = activeTag ? `#${activeTag}` : VIEW_LABELS[view];
  const emptyHint = debouncedQuery ? `没有匹配「${debouncedQuery}」的记录` : EMPTY_HINTS[view];

  return (
    <div className="app">
      <Sidebar
        view={view}
        stats={stats}
        tags={tags}
        activeTag={activeTag}
        busy={loading}
        onView={handleView}
        onTag={handleTag}
        onExport={handleExport}
        onImport={handleImport}
      />

      <main className="main">
        <div className="main-head">
          <div className="head-titles">
            <div className="main-title">{heading}</div>
            <div className="main-sub">{total} 条</div>
          </div>

          <div className="search">
            <IconSearch />
            <input
              id="search-input"
              value={query}
              placeholder="搜索标题与正文（Ctrl+K）"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <CaptureBar onSubmit={handleCreate} />

        {notice && <div className={`notice ${notice.error ? 'is-error' : ''}`}>{notice.text}</div>}

        <EntryList
          items={items}
          selectedId={selected?.id ?? null}
          loading={loading}
          emptyHint={emptyHint}
          onSelect={setSelected}
          onToggle={handleToggle}
        />
      </main>

      {selected && (
        <EntryDetail
          key={selected.id}
          entry={selected}
          onPatch={handlePatch}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
