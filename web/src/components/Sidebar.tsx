import { useRef } from 'react';
import type { ModuleStats, ViewKey } from '../types';
import type { ModuleDef } from '../modules';
import { IconArrowLeft, IconDownload, IconPlus, IconUpload } from './icons';

const VIEWS: ViewKey[] = ['notes', 'done'];

interface Props {
  module: ModuleDef;
  view: ViewKey;
  stats: ModuleStats;
  busy: boolean;
  onBack: () => void;
  onView: (view: ViewKey) => void;
  onCreate: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function Sidebar({
  module,
  view,
  stats,
  busy,
  onBack,
  onView,
  onCreate,
  onExport,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          title="返回模块首页"
          aria-label="返回模块首页"
        >
          <IconArrowLeft />
        </button>
        <span className="sidebar-module">{module.name}</span>
      </div>

      <button type="button" className="new-note" onClick={onCreate}>
        <IconPlus size={15} />
        {module.newLabel}
      </button>

      <nav className="nav">
        {VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            className={`nav-item ${view === item ? 'is-active' : ''}`}
            onClick={() => onView(item)}
          >
            <span>{module.listTitle[item]}</span>
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
