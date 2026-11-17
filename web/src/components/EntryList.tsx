import type { Entry } from '../types';
import { IconPin } from './icons';

interface Props {
  items: Entry[];
  selectedId: number | null;
  loading: boolean;
  emptyHint: string;
  onSelect: (entry: Entry) => void;
  onToggle: (entry: Entry) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dueInfo(due: string | null) {
  if (!due) return null;
  const today = dateStr(0);
  if (due === today) return { text: '今天', tone: 'is-today' };
  if (due === dateStr(1)) return { text: '明天', tone: '' };
  if (due < today) return { text: `${due.slice(5)} 逾期`, tone: 'is-overdue' };
  return { text: due.slice(5), tone: '' };
}

export default function EntryList({
  items,
  selectedId,
  loading,
  emptyHint,
  onSelect,
  onToggle,
}: Props) {
  if (items.length === 0) {
    return <div className="empty">{loading ? '加载中…' : emptyHint}</div>;
  }

  return (
    <div className="list">
      {items.map((entry) => {
        const due = dueInfo(entry.due_at);
        const hasMeta = entry.pinned || due !== null || entry.tags.length > 0;

        return (
          <div
            key={entry.id}
            className={[
              'entry',
              entry.status === 'done' ? 'is-done' : '',
              selectedId === entry.id ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-pri={entry.priority || 0}
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
            {entry.priority > 0 && <span className="entry-pri" aria-hidden="true" />}

            {entry.kind === 'todo' ? (
              <span
                className={`check ${entry.status === 'done' ? 'is-done' : ''}`}
                role="checkbox"
                aria-checked={entry.status === 'done'}
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(entry);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle(entry);
                  }
                }}
              />
            ) : (
              <span className="note-dot" aria-hidden="true" />
            )}

            <div className="entry-main">
              <div className="entry-title">{entry.title}</div>
              {hasMeta && (
                <div className="entry-meta">
                  {entry.pinned && (
                    <span className="pin-flag">
                      <IconPin />
                    </span>
                  )}
                  {due && <span className={`due ${due.tone}`}>{due.text}</span>}
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
