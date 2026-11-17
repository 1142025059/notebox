import { useEffect, useRef, useState } from 'react';
import type { Entry, Kind } from '../types';
import { IconArchive, IconClose, IconPin, IconTrash } from './icons';

interface Props {
  entry: Entry;
  onPatch: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => void;
  onClose: () => void;
}

interface Draft {
  title: string;
  body: string;
  kind: Kind;
  priority: number;
  due: string;
  tags: string;
}

const toDraft = (entry: Entry): Draft => ({
  title: entry.title,
  body: entry.body,
  kind: entry.kind,
  priority: entry.priority,
  due: entry.due_at ?? '',
  tags: entry.tags.join(', '),
});

const parseTags = (value: string) =>
  [...new Set(value.split(/[,，;；\s]+/).map((part) => part.trim()).filter(Boolean))].slice(0, 10);

export default function EntryDetail({ entry, onPatch, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // onPatch 每次 refresh 后都会换引用，用 ref 固定，避免 effect 被无意义地重跑。
  const patchRef = useRef(onPatch);
  patchRef.current = onPatch;

  useEffect(() => {
    setDraft(toDraft(entry));
    setDirty(false);
    setJustSaved(false);
    // 只在切换条目时重置草稿，避免自动保存回来的响应打断正在输入的内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
  };

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await patchRef.current(entry.id, {
          title: draft.title,
          body: draft.body,
          kind: draft.kind,
          priority: draft.priority,
          due_at: draft.due || null,
          tags: parseTags(draft.tags),
        });
        setDirty(false);
        setJustSaved(true);
      } catch {
        // 失败提示由 App 统一展示，这里不覆盖用户输入。
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [draft, dirty, entry.id]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const isDone = entry.status === 'done';
  const hint = saving ? '保存中…' : dirty ? '待保存' : justSaved ? '已保存' : '';

  return (
    <div className="detail is-open" role="dialog" aria-label="条目详情">
      <div className="detail-head">
        <div className="capture-kind" role="group" aria-label="记录类型">
          <button
            type="button"
            className={`kind-pill ${draft.kind === 'todo' ? 'is-on' : ''}`}
            onClick={() => update('kind', 'todo')}
          >
            待办
          </button>
          <button
            type="button"
            className={`kind-pill ${draft.kind === 'note' ? 'is-on' : ''}`}
            onClick={() => update('kind', 'note')}
          >
            笔记
          </button>
        </div>

        <button
          type="button"
          className="icon-btn"
          title={entry.pinned ? '取消置顶' : '置顶'}
          onClick={() => void patchRef.current(entry.id, { pinned: !entry.pinned })}
        >
          <IconPin />
        </button>

        <span className="save-hint">{hint}</span>

        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
          <IconClose />
        </button>
      </div>

      <div className="detail-body">
        <input
          className="title-input"
          value={draft.title}
          placeholder="标题"
          onChange={(event) => update('title', event.target.value)}
        />

        {draft.kind === 'todo' && (
          <div className="field-row">
            <span className="label">优先级</span>
            <div className="pri-dots">
              {[0, 1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`pri-dot ${draft.priority === level ? 'is-on' : ''}`}
                  data-p={level}
                  aria-label={`优先级 ${level}`}
                  onClick={() => update('priority', level)}
                />
              ))}
            </div>
            <span className="label">截止</span>
            <input
              className="date-input"
              type="date"
              value={draft.due}
              onChange={(event) => update('due', event.target.value)}
            />
          </div>
        )}

        <input
          className="tags-input"
          value={draft.tags}
          placeholder="标签，用逗号分隔"
          onChange={(event) => update('tags', event.target.value)}
        />

        <textarea
          className="body-input"
          value={draft.body}
          placeholder="补充内容…"
          onChange={(event) => update('body', event.target.value)}
        />
      </div>

      <div className="detail-foot">
        {draft.kind === 'todo' && (
          <button
            type="button"
            className={`btn ${isDone ? '' : 'primary'}`}
            onClick={() =>
              void patchRef.current(entry.id, { status: isDone ? 'inbox' : 'done' })
            }
          >
            {isDone ? '重新打开' : '标记完成'}
          </button>
        )}

        <button
          type="button"
          className="btn"
          onClick={() => {
            void patchRef.current(entry.id, { archived: !entry.archived_at }).then(onClose);
          }}
        >
          <IconArchive />
          {entry.archived_at ? '取消归档' : '归档'}
        </button>

        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (entry.deleted_at) void patchRef.current(entry.id, { deleted: false });
            else onDelete(entry.id);
          }}
        >
          <IconTrash />
          {entry.deleted_at ? '恢复' : '删除'}
        </button>
      </div>
    </div>
  );
}
