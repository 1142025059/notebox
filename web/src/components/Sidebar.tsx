import { useRef } from 'react';
import type { Stats, TagCount, ViewKey } from '../types';
import { VIEW_LABELS } from '../types';
import { IconDownload, IconUpload } from './icons';

const MAIN_VIEWS: ViewKey[] = ['all', 'inbox', 'todo', 'today'];
const MORE_VIEWS: ViewKey[] = ['note', 'done', 'archived', 'trash'];

interface Props {
  view: ViewKey;
  stats: Stats;
  tags: TagCount[];
  activeTag: string | null;
  busy: boolean;
  onView: (view: ViewKey) => void;
  onTag: (name: string | null) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function Sidebar({
  view,
  stats,
  tags,
  activeTag,
  busy,
  onView,
  onTag,
  onExport,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">notebox</span>
      </div>

      <nav className="nav">
        {MAIN_VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            className={`nav-item ${view === item && !activeTag ? 'is-active' : ''}`}
            onClick={() => onView(item)}
          >
            <span>{VIEW_LABELS[item]}</span>
            {stats[item] > 0 && <span className="nav-count">{stats[item]}</span>}
          </button>
        ))}
      </nav>

      <div className="nav-section">
        <div className="nav-title">其他</div>
        <nav className="nav">
          {MORE_VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${view === item && !activeTag ? 'is-active' : ''}`}
              onClick={() => onView(item)}
            >
              <span>{VIEW_LABELS[item]}</span>
              {stats[item] > 0 && <span className="nav-count">{stats[item]}</span>}
            </button>
          ))}
        </nav>
      </div>

      {tags.length > 0 && (
        <div className="nav-section">
          <div className="nav-title">标签</div>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`tag-item ${activeTag === tag.name ? 'is-active' : ''}`}
              onClick={() => onTag(activeTag === tag.name ? null : tag.name)}
            >
              <span className="tag-name">{tag.name}</span>
              <span className="nav-count">{tag.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-foot">
        <button type="button" className="ghost-btn" onClick={onExport} disabled={busy}>
          <IconDownload />
          导出 JSON
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <IconUpload />
          合并导入
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}
        />
      </div>
    </aside>
  );
}
