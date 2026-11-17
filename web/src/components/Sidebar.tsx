import { useRef } from 'react';
import type { Stats, ViewKey } from '../types';
import { VIEW_LABELS } from '../types';
import { IconDownload, IconPlus, IconUpload } from './icons';

const VIEWS: ViewKey[] = ['notes', 'done'];

interface Props {
  view: ViewKey;
  stats: Stats;
  busy: boolean;
  onView: (view: ViewKey) => void;
  onCreate: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function Sidebar({
  view,
  stats,
  busy,
  onView,
  onCreate,
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

      <button type="button" className="new-note" onClick={onCreate}>
        <IconPlus size={15} />
        新建笔记
      </button>

      <nav className="nav">
        {VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            className={`nav-item ${view === item ? 'is-active' : ''}`}
            onClick={() => onView(item)}
          >
            <span>{VIEW_LABELS[item]}</span>
            {stats[item] > 0 && <span className="nav-count">{stats[item]}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="ghost-btn" onClick={onExport} disabled={busy}>
          <IconDownload />
          导出
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <IconUpload />
          导入
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
