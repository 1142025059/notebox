import type { Entry } from '../types';

interface Props {
  items: Entry[];
  loading: boolean;
  emptyHint: string;
  onSelect: (entry: Entry) => void;
  onToggle: (entry: Entry) => void;
}

export default function EntryList({ items, loading, emptyHint, onSelect, onToggle }: Props) {
  if (items.length === 0) {
    return <div className="empty">{loading ? '加载中…' : emptyHint}</div>;
  }

  return (
    <div className="list">
      {items.map((entry, index) => {
        const done = entry.status === 'done';

        return (
          <div
            key={entry.id}
            className={`note-row ${done ? 'is-done' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(entry)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(entry);
              }
            }}
          >
            <span className="row-index">{index + 1}</span>
            <span className="row-title">{entry.title || '未命名笔记'}</span>

            <button
              type="button"
              className={`row-check ${done ? 'is-done' : ''}`}
              aria-label={done ? '取消完成' : '标记为已完成'}
              title={done ? '取消完成' : '标记为已完成'}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(entry);
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
